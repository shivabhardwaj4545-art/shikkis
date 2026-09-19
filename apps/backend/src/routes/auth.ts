import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';

import { getDb } from '../db/client.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyJWT,
} from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

/**
 * POST /api/auth/login
 * Verifies email and password, generates JWTs, sets HTTP-only cookie.
 */
authRouter.post('/login', validate(loginSchema, 'body'), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const db = getDb();

    const user = (await db
      .prepare(
        'SELECT id, email, password_hash, first_name, last_name, phone, role, is_active FROM users WHERE email = ?'
      )
      .get(email.toLowerCase())) as any;

    if (!user || !user.is_active) {
      res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
      return;
    }

    const tokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken({ sub: user.id, role: user.role });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Store refresh token
    await db.prepare(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
       VALUES (?, ?, ?, ?)`
    ).run(`rt_${Date.now()}`, user.id, refreshToken, expiresAt);

    // Set cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 mins
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  first_name: z.string().min(1),
  last_name: z.string().optional(),
  phone: z.string().optional(),
});

/**
 * POST /api/auth/register
 * Creates a new customer account (role is always 'customer').
 */
authRouter.post('/register', validate(registerSchema, 'body'), async (req, res, next) => {
  try {
    const { email, password, first_name, last_name, phone } = req.body;
    const db = getDb();

    const existing = await db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(email.toLowerCase());

    if (existing) {
      res.status(409).json({
        error: {
          code: 'EMAIL_EXISTS',
          message: 'An account with this email already exists',
        },
      });
      return;
    }

    const password_hash = await bcrypt.hash(password, 10);
    const userId = `usr_cust_${Date.now()}`;

    await db.prepare(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 'customer', 1)`
    ).run(userId, email.toLowerCase(), password_hash, first_name, last_name || null, phone || null);

    const tokenPayload = { sub: userId, email: email.toLowerCase(), role: 'customer' as const };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken({ sub: userId, role: 'customer' as const });

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.status(201).json({
      user: {
        id: userId,
        email: email.toLowerCase(),
        first_name,
        last_name: last_name || null,
        phone: phone || null,
        role: 'customer',
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

const googleAuthSchema = z.object({
  credential: z.string().min(1),
});

/**
 * POST /api/auth/google
 * Google OAuth 1-tap/sign-in verification and customer token issuance.
 */
authRouter.post('/google', validate(googleAuthSchema, 'body'), async (req, res, next) => {
  try {
    const { credential } = req.body;

    // Verify Google token with Google OAuth TokenInfo API
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!googleRes.ok) {
      res.status(401).json({
        error: {
          code: 'INVALID_GOOGLE_TOKEN',
          message: 'Google authentication failed. Invalid token.',
        },
      });
      return;
    }

    const payload = (await googleRes.json()) as any;
    const email = payload.email?.toLowerCase();
    const firstName = payload.given_name || payload.name || 'Customer';
    const lastName = payload.family_name || '';

    if (!email) {
      res.status(400).json({
        error: {
          code: 'GOOGLE_EMAIL_MISSING',
          message: 'Unable to retrieve email from Google account.',
        },
      });
      return;
    }

    const db = getDb();
    let user = (await db
      .prepare('SELECT id, email, first_name, last_name, phone, role, is_active FROM users WHERE email = ?')
      .get(email)) as any;

    if (!user) {
      const userId = `usr_google_${Date.now()}`;
      await db.prepare(
        `INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, is_active)
         VALUES (?, ?, 'google_oauth_account', ?, ?, null, 'customer', 1)`
      ).run(userId, email, firstName, lastName);

      user = {
        id: userId,
        email,
        first_name: firstName,
        last_name: lastName,
        phone: null,
        role: 'customer',
        is_active: 1,
      };
    }

    const tokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken({ sub: user.id, role: user.role });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await db.prepare(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
       VALUES (?, ?, ?, ?)`
    ).run(`rt_${Date.now()}`, user.id, refreshToken, expiresAt);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/me
 * Returns authenticated user details from verified JWT
 */
authRouter.get('/me', verifyJWT, async (req, res, next) => {
  try {
    const db = getDb();
    const user = (await db
      .prepare(
        'SELECT id, email, first_name, last_name, phone, role, is_active, created_at FROM users WHERE id = ?'
      )
      .get(req.user!.sub)) as any;

    if (!user) {
      res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
      return;
    }

    res.json({ user });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 * Clears cookie
 */
authRouter.post('/logout', (_req, res) => {
  res.clearCookie('accessToken');
  res.json({ message: 'Logged out successfully' });
});

/**
 * GET /api/auth/demo-users
 * Returns seeded test customers for quick switching during manual testing/QA
 */
authRouter.get('/demo-users', async (_req, res, next) => {
  try {
    const db = getDb();
    const users = await db
      .prepare(
        "SELECT id, email, first_name, last_name, role FROM users WHERE role = 'customer' ORDER BY id ASC"
      )
      .all();
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

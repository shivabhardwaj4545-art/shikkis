import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.ts';
import { validate } from '../middleware/validate.ts';
import { loginSchema, registerSchema } from '../../shared/schemas/auth.schema.ts';
import { generateAccessToken, verifyJWT } from '../middleware/auth.middleware.ts';

const router = Router();

router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { email, password, fullName, phone } = req.body;

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    // STRICT RULE: Registration ALWAYS sets role to 'customer'
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, phone, role)
      VALUES (?, ?, ?, ?, ?, 'customer')
    `).run(userId, email.toLowerCase(), passwordHash, fullName, phone || null);

    const user = { id: userId, email: email.toLowerCase(), fullName, phone, role: 'customer' as const, createdAt: new Date().toISOString() };
    const token = generateAccessToken({ id: userId, email: user.email, role: 'customer' });

    return res.status(201).json({
      user,
      token,
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const userRow = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as any;
    if (!userRow) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, userRow.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = {
      id: userRow.id,
      email: userRow.email,
      fullName: userRow.full_name,
      phone: userRow.phone,
      role: userRow.role as 'owner' | 'customer',
      createdAt: userRow.created_at,
    };

    const token = generateAccessToken(user);

    return res.json({
      user,
      token,
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/me', verifyJWT, (req, res) => {
  const userRow = db.prepare('SELECT id, email, full_name, phone, role, created_at FROM users WHERE id = ?').get(req.user!.id) as any;
  if (!userRow) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json({
    user: {
      id: userRow.id,
      email: userRow.email,
      fullName: userRow.full_name,
      phone: userRow.phone,
      role: userRow.role,
      createdAt: userRow.created_at,
    },
  });
});

export default router;

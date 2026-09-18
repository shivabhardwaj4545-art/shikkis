import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import type { UserRole } from '@shikkis/types';

const JWT_SECRET = process.env.JWT_SECRET ?? 'shikkis-super-secret-jwt-key-change-in-prod';
const JWT_ACCESS_EXPIRY = '15m';
const JWT_REFRESH_EXPIRY = '7d';

// ─── Token Payload ────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
}

// ─── Extend Express Request ───────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// ─── Token Factories ──────────────────────────────────────────────────────────

export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRY });
}

export function generateRefreshToken(payload: Pick<JwtPayload, 'sub' | 'role'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRY });
}

// ─── verifyJWT middleware ─────────────────────────────────────────────────────

/**
 * Extracts and verifies the Bearer token from Authorization header (or
 * cookie). Attaches the decoded payload to req.user.
 *
 * Returns 401 if no token or invalid token.
 * Does NOT enforce role — use requireRole() after this.
 */
export function verifyJWT(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken as string;
  }

  if (!token) {
    res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Authentication required',
      },
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = {
      sub: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch {
    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired access token',
      },
    });
  }
}

// ─── requireRole middleware factory ──────────────────────────────────────────

/**
 * SECURITY-CRITICAL: Server-side role enforcement.
 *
 * Must be used after verifyJWT. The frontend hiding admin UI is a
 * convenience only — this is the actual security control.
 *
 * Usage:
 *   router.delete('/products/:id', verifyJWT, requireRole('owner'), handler)
 */
export function requireRole(role: UserRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: { code: 'UNAUTHENTICATED', message: 'Authentication required' },
      });
      return;
    }

    if (req.user.role !== role) {
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
      });
      return;
    }

    next();
  };
}

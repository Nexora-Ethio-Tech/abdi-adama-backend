import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../../config/db';
import { verifyPassword } from '../../shared/passwordUtils';
import { LoginBody, JwtPayload, ALL_ROLES, UserRole } from '../../shared/types';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const JWT_EXPIRES_IN = '8h';

/**
 * POST /api/auth/login
 *
 * Accepts: { school_id, password, role }
 *
 * Logic:
 *  1. Find the silo_identities row matching school_id.
 *  2. Find the silo_users row matching (identity_id, role) — this is how a
 *     Student and a Parent with the same school_id are distinguished.
 *  3. Verify the bcrypt password.
 *  4. Return a signed JWT containing user_id, identity_id, school_id, role.
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  const { school_id, password, role } = req.body as LoginBody;

  // ── Validation ──────────────────────────────────────────────────────────────
  if (!school_id || !password || !role) {
    res.status(400).json({ message: 'school_id, password, and role are required.' });
    return;
  }

  if (!ALL_ROLES.includes(role as UserRole)) {
    res.status(400).json({ message: `Invalid role. Must be one of: ${ALL_ROLES.join(', ')}.` });
    return;
  }

  try {
    // 1. Resolve identity from school_id
    const identityResult = await pool.query<{ id: string; full_name: string }>(
      `SELECT id, full_name
         FROM silo_identities
        WHERE school_id = $1`,
      [school_id]
    );

    if (identityResult.rowCount === 0) {
      // Generic message — do not reveal whether ID or password was wrong
      res.status(401).json({ message: 'Invalid credentials.' });
      return;
    }

    const identity = identityResult.rows[0];

    // 2. Find user row matching (identity_id, role)
    const userResult = await pool.query<{
      id: string;
      password_hash: string;
      is_active: boolean;
    }>(
      `SELECT id, password_hash, is_active
         FROM silo_users
        WHERE identity_id = $1
          AND role = $2`,
      [identity.id, role]
    );

    if (userResult.rowCount === 0) {
      res.status(401).json({ message: 'Invalid credentials.' });
      return;
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      res.status(403).json({ message: 'Account is deactivated. Contact your administrator.' });
      return;
    }

    // 3. Verify password
    const passwordMatch = await verifyPassword(password, user.password_hash);
    if (!passwordMatch) {
      res.status(401).json({ message: 'Invalid credentials.' });
      return;
    }

    // 4. Sign and return JWT
    const payload: JwtPayload = {
      user_id: user.id,
      identity_id: identity.id,
      school_id,
      role,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.json({
      message: 'Login successful.',
      token,
      user: {
        user_id: user.id,
        school_id,
        full_name: identity.full_name,
        role,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ message: 'Internal server error.', detail: message });
  }
};

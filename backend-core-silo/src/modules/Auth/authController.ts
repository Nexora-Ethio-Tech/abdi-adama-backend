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
  let { school_id, password, role } = req.body as LoginBody;
  const isOldFrontend = !school_id && !!(req.body as any).identifier;

  // ── Support alternate frontend keys (identifier -> school_id) ───────────────
  if (isOldFrontend) {
    school_id = (req.body as any).identifier;
  }

  // ── Auto-detect role from school_id prefix if missing ──────────────────────
  if (!role && school_id) {
    const u = school_id.toUpperCase();
    if (u.startsWith('STU')) role = 'Student';
    else if (u.startsWith('PAR')) role = 'Parent';
    else if (u.startsWith('DRV') || u.startsWith('DR-')) role = 'Driver';
    else if (u.startsWith('LIB')) role = 'Librarian';
    else if (u.startsWith('CLN')) role = 'ClinicAdmin';
    else if (u.startsWith('TCH') || u.startsWith('TC-')) role = 'Teacher';
    else role = 'Student';
  }

  // ── Validation ──────────────────────────────────────────────────────────────
  if (!school_id || !password || !role) {
    res.status(400).json({ message: 'school_id, password, and role are required.' });
    return;
  }

  // ── PIN length guard (prevents 1-3 digit PINs from reaching bcrypt) ─────────
  if (password.length < 4) {
    res.status(400).json({ message: 'PIN must be at least 4 digits.' });
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

    // Map role to kebab-case to support the older frontend
    const mappedKebabRole: Record<string, string> = {
      'Student': 'student',
      'Parent': 'parent',
      'Driver': 'driver',
      'Librarian': 'librarian',
      'ClinicAdmin': 'clinic-admin',
      'Teacher': 'teacher',
      'Admin': 'school-admin',
      'VicePrincipal': 'vice-principal',
      'SchoolAdmin': 'school-admin',
    };

    const kebabRole = mappedKebabRole[role] || 'student';

    // Map roles to their dashboard redirect paths
    const redirectMap: Record<string, string> = {
      'Student': '/dashboard/student',
      'Parent': '/dashboard/parent',
      'Driver': '/dashboard/transport',
      'Librarian': '/dashboard/library',
      'ClinicAdmin': '/dashboard/clinic',
      'Teacher': '/dashboard/teacher',
      'Admin': '/dashboard/school-admin',
      'VicePrincipal': '/dashboard/vice-principal',
      'SchoolAdmin': '/dashboard/school-admin',
    };

    const redirectPath = redirectMap[role] || '/dashboard';

    res.json({
      message: 'Login successful.',
      token,
      redirect: redirectPath,
      user: {
        user_id: user.id,
        id: user.id,
        school_id,
        digitalId: school_id,
        full_name: identity.full_name,
        name: identity.full_name,
        email: `${school_id}@school.com`,
        role: isOldFrontend ? kebabRole : role,
      },
    });
  } catch (err: unknown) {
    console.error('[authController] login error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ message: 'Internal server error.', detail: message });
  }
};

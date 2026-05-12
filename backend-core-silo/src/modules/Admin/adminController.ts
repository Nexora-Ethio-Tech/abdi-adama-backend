import { Request, Response } from 'express';
import pool from '../../config/db';
import { hashPassword, isValidPin, generate4DigitPIN } from '../../shared/passwordUtils';
import { generateSchoolId } from '../../shared/idUtils';
import { CreateUserBody, UserRole, ALL_ROLES } from '../../shared/types';

/**
 * POST /api/admin/create-user
 *
 * Rules:
 *  - role === 'Student' → create one silo_identities row, then TWO silo_users
 *    rows under the same identity: one Student + one Parent (different passwords).
 *  - role === 'Driver' | 'Librarian' | 'ClinicAdmin' → create one identity + one user.
 *  - role === 'Parent' alone is NOT allowed via this endpoint; parents are always
 *    auto-created alongside a Student.
 */
export const createUser = async (req: Request, res: Response): Promise<void> => {
  const { fullName, role, password, parentPassword } = req.body as CreateUserBody;

  // ── Validation ──────────────────────────────────────────────────────────────
  if (!fullName || !role) {
    res.status(400).json({ message: 'fullName and role are required.' });
    return;
  }

  if (!ALL_ROLES.includes(role as UserRole)) {
    res.status(400).json({ message: `Invalid role. Must be one of: ${ALL_ROLES.join(', ')}.` });
    return;
  }

  if (role === 'Parent') {
    res.status(400).json({
      message: 'Parent accounts are created automatically when a Student is registered.',
    });
    return;
  }

  // ── Password Logic (Generate if not provided) ────────────────────────────────
  const studentPin = password || generate4DigitPIN();
  const parentPin = (role === 'Student') ? (parentPassword || generate4DigitPIN()) : null;

  if (!isValidPin(studentPin)) {
    res.status(400).json({ message: 'Password must be exactly 4 digits.' });
    return;
  }

  if (parentPin && !isValidPin(parentPin)) {
    res.status(400).json({ message: 'parentPassword must be exactly 4 digits.' });
    return;
  }

  // ── Transaction ─────────────────────────────────────────────────────────────
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Generate a unique school_id
    const school_id = generateSchoolId(role);

    // 2. Insert into silo_identities
    const identityResult = await client.query<{ id: string }>(
      `INSERT INTO silo_identities (school_id, full_name)
       VALUES ($1, $2)
       RETURNING id`,
      [school_id, fullName]
    );
    const identity_id = identityResult.rows[0].id;

    // 3a. Hash the primary (Student / Staff) password and create user row
    const primaryHash = await hashPassword(studentPin);
    const primaryUserResult = await client.query<{ id: string }>(
      `INSERT INTO silo_users (identity_id, role, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [identity_id, role, primaryHash]
    );
    const primaryUserId = primaryUserResult.rows[0].id;

    const responsePayload: Record<string, unknown> = {
      school_id,
      fullName,
      identity_id,
      password: studentPin,
      primary: { user_id: primaryUserId, role },
    };

    // 3b. If Student → also create a Parent user under the SAME identity
    if (role === 'Student' && parentPin) {
      const parentHash = await hashPassword(parentPin);
      const parentUserResult = await client.query<{ id: string }>(
        `INSERT INTO silo_users (identity_id, role, password_hash)
         VALUES ($1, 'Parent', $2)
         RETURNING id`,
        [identity_id, parentHash]
      );
      responsePayload.parentPassword = parentPin;
      responsePayload.parent = {
        user_id: parentUserResult.rows[0].id,
        role: 'Parent',
        note: 'Login with the same school_id but your parentPassword.',
      };
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'User created successfully.',
      data: responsePayload,
    });
  } catch (err: unknown) {
    await client.query('ROLLBACK');
    const message = err instanceof Error ? err.message : 'Unknown error';
    // Friendly error for duplicate school_id (extremely rare but possible)
    if (message.includes('uq_identity_role') || message.includes('unique')) {
      res.status(409).json({ message: 'Conflict: this identity/role combination already exists.' });
    } else {
      res.status(500).json({ message: 'Internal server error.', detail: message });
    }
  } finally {
    client.release();
  }
};

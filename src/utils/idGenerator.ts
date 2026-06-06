import pool from '../config/database';
import { DIGITAL_ID_PREFIX, BRANCH_CODES } from '../config/constants';
import { UserRole } from '../types';

// 1. In-memory registry to track IDs currently being checked or generated.
const reservedIds = new Set<string>();

// 2. Helper to check the actual database.
const checkDbExists = async (digitalId: string): Promise<boolean> => {
  const res = await pool.query('SELECT 1 FROM users WHERE digital_id = $1 LIMIT 1', [digitalId]);
  return res.rows.length > 0;
};

export const generateDigitalId = async (role: UserRole, branchId: string | null = null): Promise<string> => {
  const prefix = DIGITAL_ID_PREFIX[role];

  if (!prefix) {
    throw new Error('Invalid role for digital ID generation');
  }

  // Helper to build IDs with a numeric sequence and check uniqueness.
  const buildAndEnsureUnique = async (build: (seq: number) => string, startSeq = 1) => {
    let seq = startSeq;
    let candidate = build(seq);

    while (true) {
      // Synchronously check if another concurrent request has already claimed this ID.
      // Because Node.js is single-threaded, this synchronous check completely
      // eliminates the race condition locally without needing a database lock.
      if (reservedIds.has(candidate)) {
        seq += 1;
        candidate = build(seq);
        continue;
      }

      // Claim the ID synchronously BEFORE yielding to the async database query.
      reservedIds.add(candidate);

      // Now it's safe to check the database.
      const inDb = await checkDbExists(candidate);

      if (inDb) {
        // If it was already in the DB, loop again.
        seq += 1;
        candidate = build(seq);
        continue;
      }

      // We found an available ID. 
      // Clear the memory lock after 60 seconds to prevent memory leaks.
      // (60s is more than enough time for your application to finish the INSERT).
      setTimeout(() => reservedIds.delete(candidate), 60000);

      return candidate;
    }
  };

  if (role === UserRole.SUPER_ADMIN) {
    const result = await pool.query(
      `SELECT digital_id FROM users WHERE role = $1 ORDER BY created_at DESC, digital_id DESC LIMIT 1`,
      [role]
    );

    let startSeq = 1;
    if (result.rows.length > 0 && result.rows[0].digital_id) {
      const lastId = result.rows[0].digital_id;
      const match = lastId.match(/(\d+)$/);
      const lastSequence = match ? parseInt(match[1], 10) : NaN;
      startSeq = Number.isFinite(lastSequence) ? lastSequence + 1 : 1;
    }

    return await buildAndEnsureUnique((s) => `${prefix}-${String(s).padStart(3, '0')}`, startSeq);
  }

  let branchCode = 'XX';
  let branchLookupId = branchId;

  if (branchId) {
    const branchResult = await pool.query<{ name: string; code: string | null }>(
      'SELECT name, code FROM branches WHERE id = $1 LIMIT 1',
      [branchId]
    );
    const branch = branchResult.rows[0];
    branchCode = branch?.code || (branch?.name ? BRANCH_CODES[branch.name] : undefined) || 'XX';
  } else {
    branchLookupId = null;
  }

  const result = branchLookupId
    ? await pool.query(
        `SELECT digital_id FROM users WHERE role = $1 AND branch_id = $2 ORDER BY created_at DESC, digital_id DESC LIMIT 1`,
        [role, branchLookupId]
      )
    : await pool.query(
        `SELECT digital_id FROM users WHERE role = $1 ORDER BY created_at DESC, digital_id DESC LIMIT 1`,
        [role]
      );

  let startSeq = 1;
  if (result.rows.length > 0 && result.rows[0].digital_id) {
    const lastId = result.rows[0].digital_id;
    const match = lastId.match(/(\d+)$/);
    const lastSequence = match ? parseInt(match[1], 10) : NaN;
    startSeq = Number.isFinite(lastSequence) ? lastSequence + 1 : 1;
  }

  return await buildAndEnsureUnique((s) => `${prefix}-${branchCode}-${String(s).padStart(4, '0')}`, startSeq);
};
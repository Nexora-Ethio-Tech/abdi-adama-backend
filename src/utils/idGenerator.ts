import { PoolClient } from 'pg';
import { DIGITAL_ID_PREFIX, BRANCH_CODES } from '../config/constants';
import { UserRole } from '../types';

type TransactionClient = Pick<PoolClient, 'query'>;

const checkDbExists = async (client: TransactionClient, digitalId: string): Promise<boolean> => {
  const res = await client.query('SELECT 1 FROM users WHERE digital_id = $1 LIMIT 1', [digitalId]);
  return res.rows.length > 0;
};

export const generateDigitalId = async (
  role: UserRole,
  branchId: string | null,
  client: TransactionClient
): Promise<string> => {
  const prefix = DIGITAL_ID_PREFIX[role];

  if (!prefix) {
    throw new Error('Invalid role for digital ID generation');
  }

  // Serialize ID allocation for the same role/branch across every Node/PM2
  // process. Because this is a transaction-scoped lock, PostgreSQL releases it
  // automatically on COMMIT, ROLLBACK, or a lost connection.
  await client.query(
    'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
    ['digital-id', `${role}:${branchId || 'global'}`]
  );

  // Helper to build IDs with a numeric sequence and check uniqueness.
  const buildAndEnsureUnique = async (build: (seq: number) => string, startSeq = 1) => {
    let seq = startSeq;
    let candidate = build(seq);

    while (true) {
      const inDb = await checkDbExists(client, candidate);

      if (inDb) {
        seq += 1;
        candidate = build(seq);
        continue;
      }

      return candidate;
    }
  };

  if (role === UserRole.SUPER_ADMIN) {
    const result = await client.query(
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
    const branchResult = await client.query<{ name: string; code: string | null }>(
      'SELECT name, code FROM branches WHERE id = $1 LIMIT 1',
      [branchId]
    );
    const branch = branchResult.rows[0];
    branchCode = branch?.code || (branch?.name ? BRANCH_CODES[branch.name] : undefined) || 'XX';
  } else {
    branchLookupId = null;
  }

  const result = branchLookupId
    ? await client.query(
        `SELECT digital_id FROM users WHERE role = $1 AND branch_id = $2 ORDER BY created_at DESC, digital_id DESC LIMIT 1`,
        [role, branchLookupId]
      )
    : await client.query(
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

import pool from '../config/database';
import { DIGITAL_ID_PREFIX, BRANCH_CODES } from '../config/constants';
import { UserRole } from '../types';

export const generateDigitalId = async (role: UserRole, branchName: string | null = null): Promise<string> => {
  const prefix = DIGITAL_ID_PREFIX[role];
  
  if (!prefix) {
    throw new Error('Invalid role for digital ID generation');
  }

  if (role === UserRole.SUPER_ADMIN) {
    const result = await pool.query(
      `SELECT digital_id FROM users WHERE role = $1 ORDER BY created_at DESC LIMIT 1`,
      [role]
    );
    
    let sequence = 1;
    if (result.rows.length > 0 && result.rows[0].digital_id) {
      const lastId = result.rows[0].digital_id;
      const lastSequence = parseInt(lastId.split('-')[1]);
      sequence = lastSequence + 1;
    }
    
    return `${prefix}-${String(sequence).padStart(3, '0')}`;
  }

  const branchCode = branchName ? (BRANCH_CODES[branchName] || 'XX') : 'XX';
  
  const result = await pool.query(
    `SELECT digital_id FROM users WHERE role = $1 AND branch_id = (
      SELECT id FROM branches WHERE name = $2
    ) ORDER BY created_at DESC LIMIT 1`,
    [role, branchName]
  );
  
  let sequence = 1;
  if (result.rows.length > 0 && result.rows[0].digital_id) {
    const lastId = result.rows[0].digital_id;
    const parts = lastId.split('-');
    const lastSequence = parseInt(parts[parts.length - 1]);
    sequence = lastSequence + 1;
  }
  
  return `${prefix}-${branchCode}-${String(sequence).padStart(4, '0')}`;
};

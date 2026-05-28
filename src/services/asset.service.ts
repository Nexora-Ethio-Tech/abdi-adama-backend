import pool from '../config/database';
import { AuthRequest } from '../types';

export interface Asset {
  id: string;
  name: string;
  description?: string;
  value: number;
  branch_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAssetDTO {
  name: string;
  description?: string;
  value: number;
  branch_id: string;
}

class AssetService {
  async getAssets(branchId?: string): Promise<Asset[]> {
    if (branchId) {
      const result = await pool.query(
        `SELECT * FROM assets WHERE branch_id = $1 ORDER BY created_at DESC`,
        [branchId]
      );
      return result.rows;
    }
    const result = await pool.query(`SELECT * FROM assets ORDER BY created_at DESC`);
    return result.rows;
  }

  async createAsset(data: CreateAssetDTO): Promise<Asset> {
    const { name, description, value, branch_id } = data;
    const result = await pool.query(
      `INSERT INTO assets (name, description, value, branch_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, description || null, value, branch_id]
    );
    return result.rows[0];
  }

  async updateAsset(id: string, data: Partial<CreateAssetDTO>): Promise<Asset> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex}`);
      values.push(data.name);
      paramIndex++;
    }

    if (data.description !== undefined) {
      fields.push(`description = $${paramIndex}`);
      values.push(data.description);
      paramIndex++;
    }

    if (data.value !== undefined) {
      fields.push(`value = $${paramIndex}`);
      values.push(data.value);
      paramIndex++;
    }

    if (data.branch_id !== undefined) {
      fields.push(`branch_id = $${paramIndex}`);
      values.push(data.branch_id);
      paramIndex++;
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE assets SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Asset not found');
    }

    return result.rows[0];
  }

  async deleteAsset(id: string): Promise<void> {
    const result = await pool.query(`DELETE FROM assets WHERE id = $1`, [id]);
    if (result.rowCount === 0) {
      throw new Error('Asset not found');
    }
  }
}

export default new AssetService();

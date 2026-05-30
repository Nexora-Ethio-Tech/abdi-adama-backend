import pool from '../config/database';
import { AuthRequest } from '../types';

export interface Asset {
  id: string;
  name: string;
  description?: string;
  amount: number;
  value: number;
  branch_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAssetDTO {
  name: string;
  description?: string;
  amount: number;
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
    const { name, description, amount, value, branch_id } = data;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const insertRes = await client.query(
        `INSERT INTO assets (name, description, amount, value, branch_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [name, description || null, amount, value, branch_id]
      );
      const asset = insertRes.rows[0];

      // Record initial addition in adjustments
      await client.query(
        `INSERT INTO asset_adjustments (asset_id, branch_id, change_type, quantity_changed, previous_quantity, new_quantity, cost, reason, reported_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [asset.id, asset.branch_id, 'addition', amount, null, amount, amount * Number(value || 0), 'Initial asset creation', null]
      );

      await client.query('COMMIT');
      return asset;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async updateAsset(id: string, data: Partial<CreateAssetDTO> & { reason?: string }): Promise<Asset> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get existing asset
      const existingRes = await client.query(`SELECT * FROM assets WHERE id = $1`, [id]);
      if (existingRes.rows.length === 0) {
        throw new Error('Asset not found');
      }
      const existing = existingRes.rows[0];

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

      if (data.amount !== undefined) {
        fields.push(`amount = $${paramIndex}`);
        values.push(data.amount);
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
      const updateRes = await client.query(
        `UPDATE assets SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      const updated = updateRes.rows[0];

      // If amount changed, record adjustment
      if (data.amount !== undefined && Number(data.amount) !== Number(existing.amount)) {
        const delta = Number(data.amount) - Number(existing.amount);
        const changeType = delta > 0 ? 'addition' : 'reduction';
        await client.query(
          `INSERT INTO asset_adjustments (asset_id, branch_id, change_type, quantity_changed, previous_quantity, new_quantity, cost, reason, reported_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [id, updated.branch_id, changeType, Math.abs(delta), existing.amount, updated.amount, (
            data.value !== undefined ? Number(data.value) * Math.abs(delta) : null
          ), data.reason || null, null]
        );
      }

      await client.query('COMMIT');
      return updated;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async deleteAsset(id: string): Promise<void> {
    const result = await pool.query(`DELETE FROM assets WHERE id = $1`, [id]);
    if (result.rowCount === 0) {
      throw new Error('Asset not found');
    }
  }
}

export default new AssetService();

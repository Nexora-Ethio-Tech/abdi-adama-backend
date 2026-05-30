import { Response } from 'express';
import { AuthRequest } from '../types';
import assetService from '../services/asset.service';
import pool from '../config/database';
import { sendEmail } from '../utils/emailService';

async function sendAuditorNotification(asset: any, updatedBy: string, reason: string) {
  const auditorResult = await pool.query(
    `SELECT email FROM users WHERE role = $1 AND email IS NOT NULL`,
    ['auditor']
  );
  const auditorEmails = auditorResult.rows.map((row) => row.email).filter(Boolean);
  if (auditorEmails.length === 0) {
    return;
  }

  const branchResult = await pool.query(`SELECT name FROM branches WHERE id = $1`, [asset.branch_id]);
  const branchName = branchResult.rows[0]?.name || asset.branch_id;
  const subject = `Inventory update on ${asset.name}`;
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6; max-width: 600px; margin: auto;">
      <h2 style="color: #0f172a;">Inventory Update Notification</h2>
      <p><strong>${updatedBy}</strong> updated the inventory item <strong>${asset.name}</strong> in branch <strong>${branchName}</strong>.</p>
      <ul>
        <li><strong>New quantity:</strong> ${asset.amount}</li>
        <li><strong>Value:</strong> ${asset.value} ETB</li>
        <li><strong>Description:</strong> ${asset.description || 'No description provided'}</li>
      </ul>
      ${reason ? `<p><strong>Reason / note:</strong> ${reason}</p>` : ''}
      <p style="color: #475569; font-size: 14px;">This update is being shared with auditor review so the branch inventory change is visible to the audit team.</p>
    </div>
  `;

  await Promise.all(
    auditorEmails.map((email: string) => sendEmail(email, subject, htmlBody))
  );
}

class AssetController {
  async getAssets(req: AuthRequest, res: Response) {
    try {
      const branchId = req.query.branchId ? String(req.query.branchId) : undefined;
      const assets = await assetService.getAssets(branchId);
      res.json(assets);
    } catch (err) {
      console.error('Error fetching assets:', err);
      res.status(500).json({ error: 'Failed to fetch assets' });
    }
  }

  async createAsset(req: AuthRequest, res: Response) {
    try {
      const asset = await assetService.createAsset(req.body);
      res.status(201).json(asset);
    } catch (err) {
      console.error('Error creating asset:', err);
      res.status(500).json({ error: 'Failed to create asset' });
    }
  }

  async updateAsset(req: AuthRequest, res: Response) {
    try {
      const asset = await assetService.updateAsset(req.params.id, req.body);
      const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
      // call module-level notifier to avoid unbound `this` when used as Express handler
      sendAuditorNotification(asset, req.user?.name || 'Unknown user', reason).catch((err) => {
        console.error('Failed to notify auditors about asset update:', err);
      });
      res.json(asset);
    } catch (err: any) {
      console.error('Error updating asset:', err);
      res.status(err.message === 'Asset not found' ? 404 : 500).json({ error: err.message || 'Failed to update asset' });
    }
  }

  async deleteAsset(req: AuthRequest, res: Response) {
    try {
      await assetService.deleteAsset(req.params.id);
      res.status(204).send();
    } catch (err: any) {
      console.error('Error deleting asset:', err);
      res.status(err.message === 'Asset not found' ? 404 : 500).json({ error: err.message || 'Failed to delete asset' });
    }
  }

  private async sendAuditorNotification(asset: any, updatedBy: string, reason: string) {
    const auditorResult = await pool.query(
      `SELECT email FROM users WHERE role = $1 AND email IS NOT NULL`,
      ['auditor']
    );
    const auditorEmails = auditorResult.rows.map((row) => row.email).filter(Boolean);
    if (auditorEmails.length === 0) {
      return;
    }

    const branchResult = await pool.query(`SELECT name FROM branches WHERE id = $1`, [asset.branch_id]);
    const branchName = branchResult.rows[0]?.name || asset.branch_id;
    const subject = `Inventory update on ${asset.name}`;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6; max-width: 600px; margin: auto;">
        <h2 style="color: #0f172a;">Inventory Update Notification</h2>
        <p><strong>${updatedBy}</strong> updated the inventory item <strong>${asset.name}</strong> in branch <strong>${branchName}</strong>.</p>
        <ul>
          <li><strong>New quantity:</strong> ${asset.amount}</li>
          <li><strong>Value:</strong> ${asset.value} ETB</li>
          <li><strong>Description:</strong> ${asset.description || 'No description provided'}</li>
        </ul>
        ${reason ? `<p><strong>Reason / note:</strong> ${reason}</p>` : ''}
        <p style="color: #475569; font-size: 14px;">This update is being shared with auditor review so the branch inventory change is visible to the audit team.</p>
      </div>
    `;

    await Promise.all(
      auditorEmails.map((email: string) => sendEmail(email, subject, htmlBody))
    );
  }
}

export default new AssetController();

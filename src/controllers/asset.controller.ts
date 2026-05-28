import { Request, Response } from 'express';
import assetService from '../services/asset.service';

class AssetController {
  async getAssets(req: Request, res: Response) {
    try {
      const branchId = req.query.branchId ? String(req.query.branchId) : undefined;
      const assets = await assetService.getAssets(branchId);
      res.json(assets);
    } catch (err) {
      console.error('Error fetching assets:', err);
      res.status(500).json({ error: 'Failed to fetch assets' });
    }
  }

  async createAsset(req: Request, res: Response) {
    try {
      const asset = await assetService.createAsset(req.body);
      res.status(201).json(asset);
    } catch (err) {
      console.error('Error creating asset:', err);
      res.status(500).json({ error: 'Failed to create asset' });
    }
  }

  async updateAsset(req: Request, res: Response) {
    try {
      const asset = await assetService.updateAsset(req.params.id, req.body);
      res.json(asset);
    } catch (err: any) {
      console.error('Error updating asset:', err);
      res.status(err.message === 'Asset not found' ? 404 : 500).json({ error: err.message || 'Failed to update asset' });
    }
  }

  async deleteAsset(req: Request, res: Response) {
    try {
      await assetService.deleteAsset(req.params.id);
      res.status(204).send();
    } catch (err: any) {
      console.error('Error deleting asset:', err);
      res.status(err.message === 'Asset not found' ? 404 : 500).json({ error: err.message || 'Failed to delete asset' });
    }
  }
}

export default new AssetController();

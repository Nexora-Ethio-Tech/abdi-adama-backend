import { Router, Request, Response, NextFunction } from 'express';
import superAdminService from '../services/superAdmin.service';

const router = Router();

router.get('/system-settings', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await superAdminService.getPublicSystemSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});

export default router;

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

router.get('/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId } = req.query;
    const events = await superAdminService.getEvents(branchId ? String(branchId) : null);
    res.json({ success: true, data: events });
  } catch (error) {
    next(error);
  }
});

export default router;

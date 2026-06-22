import { Router } from 'express';
import machineController from '../controllers/machine.controller';

const router = Router();

router.post('/attendance', machineController.syncAttendance);
router.get('/sms/pending', machineController.getPendingSMS);
router.post('/sms/update', machineController.updateSMSStatus);

export default router;
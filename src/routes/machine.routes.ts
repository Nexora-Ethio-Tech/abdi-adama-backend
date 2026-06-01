import { Router } from 'express';
import machineController from '../controllers/machine.controller';

const router = Router();

router.post('/attendance', machineController.syncAttendance);

export default router;
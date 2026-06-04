// guest.routes.ts

import { Router } from 'express';
import authController from '../controllers/auth.controller';
import { validate, schemas } from '../middleware/validator';
import superAdminController from '../controllers/superAdmin.controller';

const router = Router();

router.get('/branches', superAdminController.getBranches);
router.get('/users', superAdminController.getAllUsers);

export default router;
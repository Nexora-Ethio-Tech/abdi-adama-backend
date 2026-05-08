import { Router } from 'express';
import superAdminController from '../controllers/superAdmin.controller';
import { authenticate } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import { validate, schemas } from '../middleware/validator';
import { UserRole } from '../types';

const router = Router();

router.use(authenticate);
router.use(roleGuard([UserRole.SUPER_ADMIN]));

router.post('/create-school-admin', validate(schemas.createUser), superAdminController.createSchoolAdmin);
router.post('/create-vice-principal', validate(schemas.createUser), superAdminController.createVicePrincipal);
router.post('/create-auditor', validate(schemas.createUser), superAdminController.createAuditor);
router.get('/users', superAdminController.getAllUsers);
router.get('/users/:id', superAdminController.getUserById);
router.patch('/users/:id/status', validate(schemas.updateUserStatus), superAdminController.updateUserStatus);
router.delete('/users/:id', superAdminController.deleteUser);

export default router;

import { Router } from 'express';
import schoolAdminController from '../controllers/schoolAdmin.controller';
import { authenticate } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import { validate, schemas } from '../middleware/validator';
import { UserRole } from '../types';

const router = Router();

router.use(authenticate);
router.use(roleGuard([UserRole.SCHOOL_ADMIN]));

router.post('/register-user', validate(schemas.createUser), schoolAdminController.registerUser);
router.get('/users', schoolAdminController.getBranchUsers);
router.get('/users/:id', schoolAdminController.getUserById);

export default router;

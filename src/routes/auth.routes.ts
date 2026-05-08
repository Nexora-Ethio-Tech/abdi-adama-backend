import { Router } from 'express';
import authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate, schemas } from '../middleware/validator';

const router = Router();

router.post('/login', validate(schemas.login), authController.login);
router.post('/refresh-token', authController.refreshToken);
router.get('/me', authenticate, authController.getCurrentUser);
router.post('/change-password', authenticate, validate(schemas.changePassword), authController.changePassword);
router.post('/logout', authenticate, authController.logout);

export default router;

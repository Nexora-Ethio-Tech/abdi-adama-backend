import { Router } from 'express';
import { login } from './authController';

const router = Router();

/**
 * POST /api/auth/login
 * Body: { school_id, password, role }
 */
router.post('/login', login);

export default router;

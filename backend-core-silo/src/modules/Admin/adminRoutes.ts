import { Router } from 'express';
import { createUser } from './adminController';

const router = Router();

/**
 * POST /api/admin/create-user
 * Body: { full_name, role, password, parent_password? }
 *
 * Note: In production this route should be protected by an Admin JWT.
 * For now it is open so you can test via Swagger without a token.
 */
router.post('/create-user', createUser);

export default router;

import { Router } from 'express';
import auditorController from '../controllers/auditor.controller';
import { authenticate } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import { UserRole } from '../types';
import Joi from 'joi';
import { validate } from '../middleware/validator';

const router = Router();

router.use(authenticate);
router.use(roleGuard([UserRole.AUDITOR]));

// Validation schemas
const feeReductionStatusSchema = Joi.object({
  status: Joi.string().valid('Pending', 'Approved', 'Rejected').required()
});

// View payments (READ ONLY)
router.get('/payments', auditorController.getPayments);

// View fee reduction requests
router.get('/fee-reductions', auditorController.getFeeReductionRequests);

// Approve/Reject fee reduction (ONLY write permission)
router.patch('/fee-reductions/:id/status', validate(feeReductionStatusSchema), auditorController.updateFeeReductionStatus);

// View financial reports
router.get('/financial-report', auditorController.getFinancialReport);

// View audit trail
router.get('/audit-trail', auditorController.getAuditTrail);

// Dashboard
router.get('/dashboard', auditorController.getDashboard);

export default router;

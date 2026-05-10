import { Router } from 'express';
import financeClerkController from '../controllers/financeClerk.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleGuard';
import { validate } from '../middleware/validator';
import Joi from 'joi';

const router = Router();

// All routes require authentication and finance-clerk role
router.use(authenticate);
router.use(requireRole(['finance-clerk']));

// Validation schemas
const recordPaymentSchema = Joi.object({
  studentId: Joi.string().uuid().required(),
  amount: Joi.number().positive().required(),
  type: Joi.string().required(),
  date: Joi.date().iso().required()
});

const updateFeeStatusSchema = Joi.object({
  feeStatus: Joi.string().valid('standard', 'reduced'),
  monthlyFee: Joi.number().min(0),
  busFee: Joi.number().min(0),
  penaltyFee: Joi.number().min(0),
  feeNotes: Joi.string().allow('')
});

// Routes
router.post('/payments', validate(recordPaymentSchema), financeClerkController.recordPayment);
router.get('/payments/:studentId', financeClerkController.getPaymentHistory);
router.get('/students/fees', financeClerkController.getStudentsWithFees);
router.patch('/students/:id/fee-status', validate(updateFeeStatusSchema), financeClerkController.updateFeeStatus);
router.get('/dashboard', financeClerkController.getDashboard);
router.get('/overdue-payments', financeClerkController.getOverduePayments);
router.get('/reports/daily', financeClerkController.getDailyReport);

export default router;

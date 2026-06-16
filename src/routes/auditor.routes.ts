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
  status: Joi.string().valid('pending', 'approved', 'rejected', 'Pending', 'Approved', 'Rejected').required()
});

// List all branches (for branch selector on Auditor dashboard)
router.get('/branches', auditorController.getBranches);

// Dashboard (accepts ?branchId= for auditor)
router.get('/dashboard', auditorController.getDashboard);

// Student payments (READ ONLY) — accepts ?branchId=
router.get('/payments', auditorController.getPayments);

// Fee reduction requests — accepts ?branchId=
router.get('/fee-reductions', auditorController.getFeeReductionRequests);

// Approve/Reject fee reduction (ONLY write permission)
router.post('/fee-reductions/:id/status', validate(feeReductionStatusSchema), auditorController.updateFeeReductionStatus);

// Financial report — accepts ?branchId=
router.get('/financial-report', auditorController.getFinancialReport);

// Audit trail — accepts ?branchId=
router.get('/audit-trail', auditorController.getAuditTrail);

// Student fee collections (pending + overdue) — accepts ?branchId=
router.get('/collections', auditorController.getCollections);

// Staff payroll runs summary — accepts ?branchId=
router.get('/payroll-summary', auditorController.getPayrollSummary);

// Staff loans — accepts ?branchId=
router.get('/loans-summary', auditorController.getLoansSummary);

// Other (non-student) transactions: expenses, income — accepts ?branchId=
router.get('/other-transactions', auditorController.getOtherTransactions);

// Net profit summary (Money In, Money Out, Net Profit) — accepts ?branchId=, ?startDate=, ?endDate=
router.get('/net-profit', auditorController.getNetProfit);

export default router;

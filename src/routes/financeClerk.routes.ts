import { Router } from 'express';
import financeClerkController from '../controllers/financeClerk.controller';
import employeeProfileController from '../controllers/employeeProfile.controller';
import assetController from '../controllers/asset.controller';
import { authenticate } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import { validate } from '../middleware/validator';
import { UserRole } from '../types';
import Joi from 'joi';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation schemas
const recordPaymentSchema = Joi.object({
  studentId: Joi.string().uuid().required(),
  items: Joi.array().items(Joi.object({
    feeType: Joi.string().required(),
    amount: Joi.number().positive().required()
  })).min(1).required(),
  month: Joi.string().pattern(/^\d{4}-\d{2}$/).required(),
  date: Joi.date().iso().optional(),
  reference: Joi.string().allow('', null).optional()
});

const assignTransportSchema = Joi.object({
  studentId: Joi.string().uuid().required(),
  driverId: Joi.string().uuid().required(),
  transportFee: Joi.number().positive().required()
});

const stopTransportSchema = Joi.object({
  studentId: Joi.string().uuid().required(),
  daysUsed: Joi.number().integer().min(0).max(30).required()
});

const approveApplicationSchema = Joi.object({
  amount: Joi.number().min(0).optional(),
  reference: Joi.string().allow('', null).optional(),
  parentDigitalId: Joi.string().trim().optional()
});

const updateFeeStatusSchema = Joi.object({
  feeStatus: Joi.string().valid('standard', 'reduced'),
  monthlyFee: Joi.number().min(0),
  busFee: Joi.number().min(0),
  penaltyFee: Joi.number().min(0),
  feeNotes: Joi.string().allow(''),
  requestedAidAmount: Joi.number().min(0).optional()
});

// Role Guard segments
const readOnlyInventory = roleGuard([UserRole.FINANCE_CLERK, UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN]);
const readWriteFinance = roleGuard([UserRole.FINANCE_CLERK, UserRole.SUPER_ADMIN, UserRole.AUDITOR]);
const readOnlyFinance = roleGuard([UserRole.FINANCE_CLERK, UserRole.SUPER_ADMIN, UserRole.AUDITOR]);
const clerkOnly = roleGuard([UserRole.FINANCE_CLERK, UserRole.SUPER_ADMIN]);

// Clerk-only Student Payment & Fee Routes
router.post('/payments', clerkOnly, validate(recordPaymentSchema), financeClerkController.recordPayment);
router.get('/payments/:studentId', clerkOnly, financeClerkController.getPaymentHistory);
router.get('/students/:id/outstanding', clerkOnly, financeClerkController.getStudentOutstanding);
router.get('/students/fees', clerkOnly, financeClerkController.getStudentsWithFees);
router.patch('/students/:id/fee-status', clerkOnly, validate(updateFeeStatusSchema), financeClerkController.updateFeeStatus);
router.get('/transport/students', clerkOnly, financeClerkController.getTransportStudents);
router.get('/transport/routes', clerkOnly, financeClerkController.getTransportRoutes);
router.get('/transport/drivers', clerkOnly, financeClerkController.getTransportDrivers);
router.get('/transport/policies', clerkOnly, financeClerkController.getTransportPolicies);
router.get('/registration-fee', clerkOnly, financeClerkController.getGlobalRegistrationFee);
router.post('/transport/assign', clerkOnly, validate(assignTransportSchema), financeClerkController.assignTransportStudent);
router.post('/transport/stop', clerkOnly, validate(stopTransportSchema), financeClerkController.stopTransportStudent);
router.get('/dashboard', clerkOnly, financeClerkController.getDashboard);
router.get('/assets', readOnlyInventory, assetController.getAssets);
router.post('/assets', clerkOnly, assetController.createAsset);
router.patch('/assets/:id', clerkOnly, assetController.updateAsset);
router.delete('/assets/:id', clerkOnly, assetController.deleteAsset);
router.get('/overdue-payments', clerkOnly, financeClerkController.getOverduePayments);
router.get('/reports/daily', clerkOnly, financeClerkController.getDailyReport);
router.get('/applications', clerkOnly, financeClerkController.getPendingApplications);
router.patch('/applications/:id/approve', clerkOnly, validate(approveApplicationSchema), financeClerkController.approveApplication);
// Reject / Return application to school admin with reason
router.patch('/applications/:id/remove', clerkOnly, financeClerkController.rejectApplication);
// Legacy: allow delete route (will now mark as returned instead of deleting)
router.delete('/applications/:id', clerkOnly, financeClerkController.rejectApplication);

// Shared Employee Payroll Profiles & Attendance Management
router.post('/employee-profiles', readWriteFinance, employeeProfileController.createOrUpdateProfile);
router.get('/employee-profiles', readOnlyFinance, employeeProfileController.getAllProfiles);
router.get('/employee-profiles/:userId', readOnlyFinance, employeeProfileController.getProfile);
router.post('/employee-attendance', readWriteFinance, employeeProfileController.recordAttendance);
router.get('/employee-attendance/:userId', readOnlyFinance, employeeProfileController.getAttendance);

export default router;

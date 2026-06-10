import { Router } from 'express';
import payrollController from '../controllers/payroll.controller';
import employeeProfileController from '../controllers/employeeProfile.controller';
import { authenticate } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import { UserRole } from '../types';

const router = Router();

// All payroll routes require authentication
router.use(authenticate);

// Staff self-service routes (any authenticated staff role)
router.get('/my-payslip', payrollController.getMyPayslip);
router.get('/my-payslips', payrollController.getMyPayslips);
router.get('/notifications', employeeProfileController.getMyNotifications);
router.post('/notifications/:id/read', employeeProfileController.markNotificationRead);

// Liability and report routes (super-admin and auditor)
router.get('/liability', roleGuard([UserRole.SUPER_ADMIN, UserRole.AUDITOR]), payrollController.getSchoolLiability);
router.get('/export/:id', roleGuard([UserRole.SUPER_ADMIN, UserRole.AUDITOR]), payrollController.exportPayroll);
router.get('/custom-export', roleGuard([UserRole.SUPER_ADMIN, UserRole.AUDITOR]), payrollController.customExport);

// Payroll generation, deletion, and finalization — Auditor role only
// (Super admin is read-only on the payroll ledger)
router.post('/generate', roleGuard([UserRole.AUDITOR]), payrollController.generatePayroll);
router.get('/runs', roleGuard([UserRole.FINANCE_CLERK, UserRole.SUPER_ADMIN, UserRole.AUDITOR]), payrollController.getPayrollRuns);
router.get('/runs/:id', roleGuard([UserRole.FINANCE_CLERK, UserRole.SUPER_ADMIN, UserRole.AUDITOR]), payrollController.getPayrollRun);
router.delete('/runs/:id', roleGuard([UserRole.AUDITOR]), payrollController.deletePayrollRun);
router.post('/runs/:id/finalize', roleGuard([UserRole.AUDITOR]), payrollController.finalizePayroll);

export default router;

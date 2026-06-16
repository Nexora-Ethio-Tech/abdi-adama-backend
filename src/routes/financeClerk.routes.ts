import { Router, Response } from 'express';
import financeClerkController from '../controllers/financeClerk.controller';
import employeeProfileController from '../controllers/employeeProfile.controller';
import { AuthRequest } from '../types';
import pool from '../config/database';
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
  transportFee: Joi.number().positive().required(),
  busStartDay: Joi.number().integer().min(1).max(30).optional() // Optional: day of month when bus use starts
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

const sendSmsSchema = Joi.object({
  studentId: Joi.string().uuid().required(),
  message: Joi.string().min(1).max(160).required()
});

const recordManualTransactionSchema = Joi.object({
  category: Joi.string().valid('expense', 'income', 'other').required(),
  type: Joi.string().required(),
  amount: Joi.number().positive().required(),
  details: Joi.string().allow('').required(),
  date: Joi.string().required()
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
router.post('/students/:id/fee-status', clerkOnly, validate(updateFeeStatusSchema), financeClerkController.updateFeeStatus);
router.post('/students/sms/send', clerkOnly, validate(sendSmsSchema), financeClerkController.sendSms);
router.get('/transport/students', clerkOnly, financeClerkController.getTransportStudents);
router.get('/transport/routes', clerkOnly, financeClerkController.getTransportRoutes);
router.get('/transport/drivers', clerkOnly, financeClerkController.getTransportDrivers);
router.get('/transport/policies', clerkOnly, financeClerkController.getTransportPolicies);
router.get('/registration-fee', clerkOnly, financeClerkController.getGlobalRegistrationFee);
router.get('/registration-fee-transactions', clerkOnly, async (req: AuthRequest, res: Response) => {
  try {
    const branchId = req.user!.branch_id;
    const result = await pool.query(
      `SELECT
         ft.id,
         ft.student_id,
         ft.student_name,
         ft.amount,
         ft.type,
         ft.date,
         ft.verified_by,
         ft.ethiopic_month,
         ft.ethiopic_year,
         ft.created_at
       FROM finance_transactions ft
       WHERE ft.branch_id = $1
         AND (ft.type = 'Registration Fee' OR ft.type ILIKE '%registration%')
       ORDER BY ft.created_at DESC`,
      [branchId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch registration fee transactions' } });
  }
});
router.post('/transport/assign', clerkOnly, validate(assignTransportSchema), financeClerkController.assignTransportStudent);
router.post('/transport/stop', clerkOnly, validate(stopTransportSchema), financeClerkController.stopTransportStudent);
router.get('/dashboard', clerkOnly, financeClerkController.getDashboard);
router.get('/assets', readOnlyInventory, assetController.getAssets);
router.post('/assets', clerkOnly, assetController.createAsset);
router.post('/assets/:id', clerkOnly, assetController.updateAsset);
router.delete('/assets/:id', clerkOnly, assetController.deleteAsset);
router.get('/overdue-payments', clerkOnly, financeClerkController.getOverduePayments);
router.get('/reports/daily', clerkOnly, financeClerkController.getDailyReport);
router.get('/applications', clerkOnly, financeClerkController.getPendingApplications);
router.post('/applications/:id/approve', clerkOnly, validate(approveApplicationSchema), financeClerkController.approveApplication);
// Reject / Return application to school admin with reason
router.post('/applications/:id/remove', clerkOnly, financeClerkController.rejectApplication);
// Legacy: allow delete route (will now mark as returned instead of deleting)
router.delete('/applications/:id', clerkOnly, financeClerkController.rejectApplication);

// Shared Employee Payroll Profiles & Attendance Management
router.post('/employee-profiles', readWriteFinance, employeeProfileController.createOrUpdateProfile);
router.get('/employee-profiles', readOnlyFinance, employeeProfileController.getAllProfiles);
router.get('/employee-profiles/:userId', readOnlyFinance, employeeProfileController.getProfile);
router.post('/employee-attendance', readWriteFinance, employeeProfileController.recordAttendance);
router.get('/employee-attendance/:userId', readOnlyFinance, employeeProfileController.getAttendance);

// Audit Logs (finance-clerk scoped to own branch)
router.get('/audit-logs', clerkOnly, async (req: AuthRequest, res: Response) => {
  try {
    const branchId = req.user!.branch_id;
    const { page = 1, limit = 20, direction, category, minAmount, maxAmount, startDate, endDate } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const conditions: string[] = ['ft.branch_id = $1'];
    const params: any[] = [branchId];
    let idx = 2;

    if (direction) { conditions.push(`ft.type = $${idx++}`); params.push(direction); }
    if (category) { conditions.push(`ft.type ILIKE $${idx++}`); params.push(`%${category}%`); }
    if (minAmount) { conditions.push(`ft.amount >= $${idx++}`); params.push(Number(minAmount)); }
    if (maxAmount) { conditions.push(`ft.amount <= $${idx++}`); params.push(Number(maxAmount)); }
    if (startDate) { conditions.push(`ft.date >= $${idx++}`); params.push(startDate); }
    if (endDate) { conditions.push(`ft.date <= $${idx++}`); params.push(endDate); }

    const where = conditions.join(' AND ');

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM finance_transactions ft WHERE ${where}`,
      params
    );
    const totalRecords = parseInt(countResult.rows[0].count, 10);

    const logsResult = await pool.query(
      `SELECT
         ft.id,
         ft.created_at AS timestamp,
         COALESCE(ft.type, 'Payment') AS action,
         CASE WHEN ft.amount >= 0 THEN 'Money In' ELSE 'Money Out' END AS "actionType",
         'Fees' AS category,
         ft.verified_by AS performed_by_name,
         ABS(ft.amount) AS amount,
         COALESCE(ft.student_name, ft.type, '') AS description
       FROM finance_transactions ft
       WHERE ${where}
       ORDER BY ft.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, Number(limit), offset]
    );

    const logs = logsResult.rows.map((row: any) => ({
      id: row.id,
      timestamp: row.timestamp,
      action: row.action,
      actionType: row.actionType,
      category: row.category,
      performedBy: { name: row.performed_by_name || 'Finance Clerk', role: 'finance_clerk' },
      amount: parseFloat(row.amount) || undefined,
      description: row.description,
    }));

    const totalPages = Math.max(1, Math.ceil(totalRecords / Number(limit)));
    res.json({
      success: true,
      data: {
        logs,
        pagination: { currentPage: Number(page), totalPages, totalRecords }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch audit logs' } });
  }
});

router.get('/audit-logs/export', clerkOnly, async (req: AuthRequest, res: Response) => {
  try {
    const branchId = req.user!.branch_id;
    const { direction, category, minAmount, maxAmount, startDate, endDate } = req.query;

    const conditions: string[] = ['ft.branch_id = $1'];
    const params: any[] = [branchId];
    let idx = 2;

    if (direction) { conditions.push(`ft.type = $${idx++}`); params.push(direction); }
    if (category) { conditions.push(`ft.type ILIKE $${idx++}`); params.push(`%${category}%`); }
    if (minAmount) { conditions.push(`ft.amount >= $${idx++}`); params.push(Number(minAmount)); }
    if (maxAmount) { conditions.push(`ft.amount <= $${idx++}`); params.push(Number(maxAmount)); }
    if (startDate) { conditions.push(`ft.date >= $${idx++}`); params.push(startDate); }
    if (endDate) { conditions.push(`ft.date <= $${idx++}`); params.push(endDate); }

    const where = conditions.join(' AND ');
    const result = await pool.query(
      `SELECT
         ft.id, ft.created_at AS timestamp, ft.type AS action,
         CASE WHEN ft.amount >= 0 THEN 'Money In' ELSE 'Money Out' END AS action_type,
         'Fees' AS category,
         ft.verified_by AS performed_by, ABS(ft.amount) AS amount,
         COALESCE(ft.student_name, ft.type, '') AS description
       FROM finance_transactions ft
       WHERE ${where}
       ORDER BY ft.created_at DESC`,
      params
    );

    const header = 'ID,Timestamp,Action,Type,Category,Performed By,Amount,Description\n';
    const rows = result.rows.map((r: any) =>
      `"${r.id}","${r.timestamp}","${r.action || ''}","${r.action_type}","${r.category}","${r.performed_by || ''}","${r.amount || ''}","${(r.description || '').replace(/"/g, '""')}"`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
    res.send(header + rows);
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to export audit logs' } });
  }
});

// Manual/Custom Transactions (Income, Expense, Other)
router.post('/transactions', clerkOnly, validate(recordManualTransactionSchema), financeClerkController.recordManualTransaction);
router.get('/transactions', readOnlyFinance, financeClerkController.getManualTransactions);

export default router;

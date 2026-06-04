import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import { UserRole, AuthRequest } from '../types';
import pool from '../config/database';
import { gregorianToEthiopian } from '../shared/ethiopianCalendar';

const router = Router();

router.use(authenticate);
router.use(roleGuard([UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.FINANCE_CLERK, UserRole.AUDITOR]));

const ETHIOPIAN_MONTH_NAMES = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
  'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
];

// GET /api/finance/summary
router.get('/summary', async (req: AuthRequest, res, next) => {
  try {
    // 1. Total revenue: sum of all finance_transactions where type = 'Income' or starts with 'Payment'
    const totalRevRes = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM finance_transactions
       WHERE type = 'Income' OR type LIKE 'Payment%'`
    );
    const totalRevenue = Number(totalRevRes.rows[0]?.total || 0);

    // 2. Monthly revenue: sum of all finance_transactions in the current Ethiopian month
    const today = new Date();
    const ethToday = gregorianToEthiopian(today);
    const ethMonthLabel = ETHIOPIAN_MONTH_NAMES[ethToday.month - 1] || 'Meskerem';
    
    const monthlyRevRes = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM finance_transactions
       WHERE (type = 'Income' OR type LIKE 'Payment%')
         AND LOWER(ethiopic_month) = LOWER($1)
         AND ethiopic_year = $2`,
      [ethMonthLabel, ethToday.year]
    );
    const monthlyRevenue = Number(monthlyRevRes.rows[0]?.total || 0);

    // 3. Pending fees: sum of outstanding fees for all students in the current Ethiopian month (YYYY-MM format)
    const currentMonthStr = `${ethToday.year}-${String(ethToday.month).padStart(2, '0')}`;
    const pendingFeesRes = await pool.query(
      `SELECT COALESCE(SUM(
        COALESCE(s.monthly_fee, 0) + 
        COALESCE(s.bus_fee, 0) + 
        COALESCE(s.penalty_fee, 0) - 
        COALESCE((
          SELECT SUM(pi.amount)
          FROM payments p
          JOIN payment_items pi ON pi.payment_id = p.id
          WHERE p.student_id = s.id
            AND p.month = $1
        ), 0)
       ), 0) AS total
       FROM students s
       WHERE s.is_scholarship = false AND s.status = 'active'`,
      [currentMonthStr]
    );
    const pendingFees = Math.max(0, Number(pendingFeesRes.rows[0]?.total || 0));

    res.json({
      total_revenue: totalRevenue,
      pending_fees: pendingFees,
      monthly_revenue: monthlyRevenue
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/finance/transactions
router.get('/transactions', async (req: AuthRequest, res, next) => {
  try {
    const branchId = req.user!.branch_id;
    const role = req.user!.role;

    let query = `
      SELECT ft.*, b.name AS branch_name
      FROM finance_transactions ft
      LEFT JOIN branches b ON ft.branch_id = b.id
    `;
    const params: any[] = [];

    // If school admin or finance clerk, restrict to their branch
    if (role === UserRole.SCHOOL_ADMIN || role === UserRole.FINANCE_CLERK) {
      query += ` WHERE ft.branch_id = $1`;
      params.push(branchId);
    }

    query += ` ORDER BY ft.date DESC, ft.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// POST /api/finance/transactions
router.post('/transactions', async (req: AuthRequest, res, next) => {
  try {
    const { student_name, amount, type, date, verified_by, branch_id, student_id } = req.body;
    
    // Resolve ethiopic month and year from the date
    const txDate = date ? new Date(date) : new Date();
    const ethParts = gregorianToEthiopian(txDate);
    const ethiopicMonth = ETHIOPIAN_MONTH_NAMES[ethParts.month - 1] || 'Meskerem';
    const ethiopicYear = ethParts.year;

    const result = await pool.query(
      `INSERT INTO finance_transactions (
        student_id, student_name, amount, type, date, verified_by, branch_id, ethiopic_month, ethiopic_year, created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING *`,
      [
        student_id || null,
        student_name,
        amount,
        type,
        txDate.toISOString().split('T')[0],
        verified_by || req.user!.name,
        branch_id || req.user!.branch_id,
        ethiopicMonth,
        ethiopicYear
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/finance/audit
router.get('/audit', async (req: AuthRequest, res, next) => {
  try {
    const branchId = req.user!.branch_id;
    const role = req.user!.role;

    // 1. Fetch Student fee payment status logs
    let feeLogsQuery = `
      SELECT 
        psl.status,
        psl.modified_by AS "modifiedBy",
        psl.approver_name AS "approverName",
        psl.timestamp,
        u.name AS "studentName",
        u.digital_id AS "studentId",
        COALESCE(asec.section_name, 'N/A') AS "section",
        'Fees' AS "category",
        CASE WHEN psl.status = true THEN 'In' ELSE 'Out' END AS "direction",
        CASE WHEN psl.status = true THEN 'Paid' ELSE 'Pending' END AS "actionLabel"
      FROM payment_status_logs psl
      JOIN students s ON psl.student_id = s.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN academic_sections asec ON s.section_id = asec.id
    `;
    const feeParams: any[] = [];
    if (role === UserRole.SCHOOL_ADMIN || role === UserRole.FINANCE_CLERK) {
      feeLogsQuery += ` WHERE s.branch_id = $1`;
      feeParams.push(branchId);
    }
    const feeLogsResult = await pool.query(feeLogsQuery, feeParams);

    // 2. Fetch Staff payroll items as operational/staff payout audit logs
    let staffLogsQuery = `
      SELECT 
        true AS "status",
        u_gen.name AS "modifiedBy",
        u_fin.name AS "approverName",
        COALESCE(pr.finalized_at, pr.created_at) AS "timestamp",
        pi.employee_name AS "studentName",
        u_emp.digital_id AS "studentId",
        COALESCE(epp.role, 'Staff') AS "section",
        'Staff' AS "category",
        'Out' AS "direction",
        'Paid' AS "actionLabel"
      FROM payroll_items pi
      JOIN payroll_runs pr ON pi.payroll_run_id = pr.id
      LEFT JOIN users u_gen ON pr.generated_by = u_gen.id
      LEFT JOIN users u_fin ON pr.finalized_by = u_fin.id
      LEFT JOIN users u_emp ON pi.employee_id = u_emp.id
      LEFT JOIN employee_payroll_profiles epp ON pi.employee_id = epp.user_id
      WHERE pr.status IN ('finalized', 'exported')
    `;
    const staffParams: any[] = [];
    if (role === UserRole.SCHOOL_ADMIN || role === UserRole.FINANCE_CLERK) {
      staffLogsQuery += ` AND pr.branch_id = $1`;
      staffParams.push(branchId);
    }
    const staffLogsResult = await pool.query(staffLogsQuery, staffParams);

    const allAuditLogs = [...feeLogsResult.rows, ...staffLogsResult.rows].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    res.json(allAuditLogs);
  } catch (error) {
    next(error);
  }
});

export default router;

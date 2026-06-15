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
    // 1. Total revenue: sum of all finance_transactions where type is not 'Expense'
    const totalRevRes = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM finance_transactions
       WHERE type != 'Expense'`
    );
    const totalRevenue = Number(totalRevRes.rows[0]?.total || 0);

    // 2. Monthly revenue: sum of all finance_transactions in the current Ethiopian month where type is not 'Expense'
    const today = new Date();
    const ethToday = gregorianToEthiopian(today);
    const ethMonthLabel = ETHIOPIAN_MONTH_NAMES[ethToday.month - 1] || 'Meskerem';
    
    const monthlyRevRes = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM finance_transactions
       WHERE type != 'Expense'
         AND LOWER(ethiopic_month) = LOWER($1)
         AND ethiopic_year = $2`,
      [ethMonthLabel, ethToday.year]
    );
    const monthlyRevenue = Number(monthlyRevRes.rows[0]?.total || 0);

    // 3. Pending fees: calculate number of active non-scholarship students who have not paid their Monthly Fee yet
    const currentMonthStr = `${ethToday.year}-${String(ethToday.month).padStart(2, '0')}`;
    let countsRes;
    try {
      countsRes = await pool.query(
        `WITH student_status AS (
          SELECT 
            s.id,
            COALESCE(
              (SELECT status FROM student_collections WHERE student_id = s.id AND month = $1),
              'in_collections'
            ) AS collection_status
          FROM students s
          WHERE s.is_scholarship = false AND LOWER(s.status) IN ('active', 'suspended')
        )
        SELECT 
          COUNT(CASE WHEN collection_status != 'cleared' THEN 1 END) AS unpaid_count,
          COUNT(CASE WHEN collection_status = 'cleared' THEN 1 END) AS paid_count
        FROM student_status`,
        [currentMonthStr]
      );
    } catch (err) {
      // Fallback: calculate based on dues minus paid
      countsRes = await pool.query(
        `WITH student_monthly_status AS (
          SELECT 
            s.id,
            COALESCE(
              NULLIF(s.monthly_fee, 0),
              (
                SELECT monthly_fee FROM branch_grade_fees 
                WHERE branch_id = s.branch_id 
                  AND REPLACE(REPLACE(LOWER(grade_level), 'grade', ''), ' ', '') = REPLACE(REPLACE(LOWER(s.grade), 'grade', ''), ' ', '')
                LIMIT 1
              ),
              0
            ) AS monthly_due,
            COALESCE((
              SELECT SUM(pi.amount)
              FROM payments p
              JOIN payment_items pi ON pi.payment_id = p.id
              WHERE p.student_id = s.id AND p.month = $1 AND pi.fee_type = 'monthly'
            ), 0) AS monthly_paid
          FROM students s
          WHERE s.is_scholarship = false AND LOWER(s.status) IN ('active', 'suspended')
        )
        SELECT 
          COUNT(CASE WHEN monthly_paid < monthly_due THEN 1 END) AS unpaid_count,
          COUNT(CASE WHEN monthly_paid >= monthly_due THEN 1 END) AS paid_count
        FROM student_monthly_status`,
        [currentMonthStr]
      );
    }
    const pendingFeesCount = Number(countsRes.rows[0]?.unpaid_count || 0);
    const monthlyFeesPaidCount = Number(countsRes.rows[0]?.paid_count || 0);

    // 4. Monthly fees collected: total money collected from Monthly Fees, Bus Fees, Penalty Fees (excluding Registration Fees)
    const monthlyFeesCollectedRes = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM finance_transactions
       WHERE type != 'Expense'
         AND type != 'Registration Fee'
         AND type NOT ILIKE '%registration%'`
    );
    const monthlyFeesCollected = Number(monthlyFeesCollectedRes.rows[0]?.total || 0);

    // 5. Registration fees: sum of all finance_transactions where type = 'Registration Fee' or includes 'registration'
    const regFeesRes = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM finance_transactions
       WHERE type = 'Registration Fee' OR type ILIKE '%registration%'`
    );
    const registrationFees = Number(regFeesRes.rows[0]?.total || 0);

    res.json({
      total_revenue: totalRevenue,
      pending_fees: pendingFeesCount,
      pending_fees_count: pendingFeesCount,
      monthly_revenue: monthlyRevenue,
      monthly_fees: monthlyFeesCollected,
      monthly_fees_paid_count: monthlyFeesPaidCount,
      monthly_fees_collected: monthlyFeesCollected,
      registration_fees: registrationFees
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
    
    // Use the date as-is if already a plain YYYY-MM-DD string (preserves local date from client).
    // For ISO datetime strings, extract just the date portion in local time to avoid UTC shift.
    let txDateStr: string;
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      // Already a plain local date — use directly
      txDateStr = date;
    } else if (date) {
      // ISO or other format — extract local date via parsing
      const parsed = new Date(date);
      txDateStr = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
    } else {
      // No date provided — use today's local server date
      const now = new Date();
      txDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    // Resolve ethiopic month and year from the local date
    const [txYear, txMonth, txDay] = txDateStr.split('-').map(Number);
    const txDate = new Date(txYear, txMonth - 1, txDay);
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
        txDateStr,
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

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
    const today = new Date();
    const ethToday = gregorianToEthiopian(today);
    const ethMonthLabel = ETHIOPIAN_MONTH_NAMES[ethToday.month - 1] || 'Meskerem';
    const currentMonthStr = `${ethToday.year}-${String(ethToday.month).padStart(2, '0')}`;

    // 1. Schema check: Determine if ethiopic_month/ethiopic_year exist on finance_transactions table
    let hasEthioColumns = false;
    try {
      const columnsRes = await pool.query(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_name = 'finance_transactions'`
      );
      const columns = columnsRes.rows.map(r => r.column_name.toLowerCase());
      hasEthioColumns = columns.includes('ethiopic_month') && columns.includes('ethiopic_year');
    } catch (err) {
      console.warn('Failed to inspect finance_transactions columns, defaulting to fallback.', err);
    }

    // 2. Safely fetch all transactions
    let allRows: any[] = [];
    try {
      const selectFields = hasEthioColumns 
        ? 'student_id, amount, type, date, ethiopic_month, ethiopic_year'
        : 'student_id, amount, type, date';
      const allRes = await pool.query(
        `SELECT ${selectFields} FROM finance_transactions`
      );
      allRows = allRes.rows;
    } catch (err) {
      console.error('Failed to query finance_transactions, using fallback empty list.', err);
    }

    // Helper to calculate signed net amount
    const getNetAmount = (r: any) => {
      const isExpense = r.type === 'Expense' || r.type?.toLowerCase() === 'expense';
      return isExpense ? -Math.abs(Number(r.amount || 0)) : Number(r.amount || 0);
    };

    const isRegistrationType = (type: string) => {
      const t = (type || '').toLowerCase();
      return t.includes('registration');
    };

    const isStudentFeeType = (type: string) => {
      const t = (type || '').toLowerCase();
      return t.includes('monthly') ||
             t.includes('tuition') ||
             t.includes('bus') ||
             t.includes('penalty') ||
             t.includes('payment');
    };

    // Calculate revenues based on transaction types and dates
    const totalRevenue = allRows.reduce((sum, r) => sum + getNetAmount(r), 0);
    
    const monthlyRevenue = allRows.reduce((sum, r) => {
      let isCurrentMonth = false;
      if (hasEthioColumns && r.ethiopic_month && r.ethiopic_year) {
        isCurrentMonth = (r.ethiopic_month.toLowerCase() === ethMonthLabel.toLowerCase()) && 
                         (Number(r.ethiopic_year) === ethToday.year);
      } else if (r.date) {
        try {
          const txDate = new Date(r.date);
          if (!isNaN(txDate.getTime())) {
            const txEth = gregorianToEthiopian(txDate);
            isCurrentMonth = (txEth.month === ethToday.month) && (txEth.year === ethToday.year);
          }
        } catch (e) {}
      }
      return isCurrentMonth ? sum + getNetAmount(r) : sum;
    }, 0);

    const monthlyFeesCollected = allRows
      .filter(r => (r.student_id !== null || isStudentFeeType(r.type)) && !isRegistrationType(r.type))
      .reduce((sum, r) => sum + getNetAmount(r), 0);

    const registrationFees = allRows
      .filter(r => (r.student_id !== null || isRegistrationType(r.type)) && isRegistrationType(r.type))
      .reduce((sum, r) => sum + getNetAmount(r), 0);

    const otherTransactionsCollected = allRows
      .filter(r => r.student_id === null && !isStudentFeeType(r.type) && !isRegistrationType(r.type))
      .reduce((sum, r) => sum + getNetAmount(r), 0);

    // 3. Unpaid vs Paid counts with nested fail-safes
    let countsRes;
    try {
      // Level 1: query from student_collections
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
      console.warn('Level 1 student counts failed, falling back to Level 2 (dues vs paid).', err);
      try {
        // Level 2: dues vs paid
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
      } catch (err2) {
        console.warn('Level 2 student counts failed, falling back to Level 3 (basic student counts).', err2);
        try {
          // Level 3: basic student count on students table
          const simpleCountRes = await pool.query(
            `SELECT COUNT(*) AS total 
             FROM students 
             WHERE is_scholarship = false AND LOWER(status) IN ('active', 'suspended')`
          );
          const totalStudentsCount = Number(simpleCountRes.rows[0]?.total || 0);
          countsRes = {
            rows: [{
              unpaid_count: totalStudentsCount,
              paid_count: 0
            }]
          };
        } catch (err3) {
          console.error('All student count queries failed.', err3);
          countsRes = {
            rows: [{
              unpaid_count: 0,
              paid_count: 0
            }]
          };
        }
      }
    }

    const pendingFeesCount = Number(countsRes.rows[0]?.unpaid_count || 0);
    const monthlyFeesPaidCount = Number(countsRes.rows[0]?.paid_count || 0);

    res.json({
      total_revenue: totalRevenue,
      pending_fees: pendingFeesCount,
      pending_fees_count: pendingFeesCount,
      monthly_revenue: monthlyRevenue,
      monthly_fees: monthlyFeesCollected,
      monthly_fees_paid_count: monthlyFeesPaidCount,
      monthly_fees_collected: monthlyFeesCollected,
      registration_fees: registrationFees,
      other_transactions_collected: otherTransactionsCollected
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
        CASE WHEN psl.status = true THEN 'Paid' ELSE 'Pending' END AS "actionLabel",
        COALESCE(s.monthly_fee, 0) AS "amount",
        CASE WHEN psl.status = true THEN 'Created' ELSE 'Updated' END AS "actionType",
        CASE 
          WHEN u_mod.role::text IN ('super-admin', 'school-admin') THEN 'Admin'
          WHEN u_mod.role::text = 'vice-principal' THEN 'Vice Principal'
          ELSE 'Accountant'
        END AS "userRole"
      FROM payment_status_logs psl
      JOIN students s ON psl.student_id = s.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN academic_sections asec ON s.section_id = asec.id
      LEFT JOIN users u_mod ON (u_mod.name = psl.modified_by OR u_mod.email = psl.modified_by)
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
        COALESCE(u_emp.role::text, 'Staff') AS "section",
        'Staff' AS "category",
        'Out' AS "direction",
        'Paid' AS "actionLabel",
        COALESCE(pi.net_pay, 0) AS "amount",
        'Created' AS "actionType",
        CASE 
          WHEN u_fin.role::text IN ('super-admin', 'school-admin') THEN 'Admin'
          WHEN u_fin.role::text = 'vice-principal' THEN 'Vice Principal'
          ELSE 'Accountant'
        END AS "userRole"
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

// GET /api/finance/net-profit
router.get('/net-profit', async (req: AuthRequest, res, next) => {
  try {
    const role = req.user!.role;
    let targetBranchId: string | null = null;

    if (role === UserRole.SCHOOL_ADMIN || role === UserRole.FINANCE_CLERK) {
      targetBranchId = req.user!.branch_id;
    } else if (role === UserRole.SUPER_ADMIN || role === UserRole.AUDITOR) {
      targetBranchId = (req.query.branchId as string) || null;
    }

    const { startDate, endDate } = req.query;

    // 1. Money In from finance_transactions
    let inQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN type = 'Expense' OR LOWER(type) = 'expense' OR amount < 0 THEN 0 ELSE ABS(amount) END), 0) AS total_in
      FROM finance_transactions
      WHERE 1=1
    `;
    const inParams: any[] = [];
    let inIdx = 1;
    if (targetBranchId) {
      inQuery += ` AND branch_id = $${inIdx++}`;
      inParams.push(targetBranchId);
    }
    if (startDate) {
      inQuery += ` AND date >= $${inIdx++}`;
      inParams.push(startDate);
    }
    if (endDate) {
      inQuery += ` AND date <= $${inIdx++}`;
      inParams.push(endDate);
    }
    const inResult = await pool.query(inQuery, inParams);
    const totalIn = parseFloat(inResult.rows[0]?.total_in || 0);

    // 2. Money Out (Expenses) from finance_transactions
    let outQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN type = 'Expense' OR LOWER(type) = 'expense' OR amount < 0 THEN ABS(amount) ELSE 0 END), 0) AS total_expenses
      FROM finance_transactions
      WHERE 1=1
    `;
    const outParams: any[] = [];
    let outIdx = 1;
    if (targetBranchId) {
      outQuery += ` AND branch_id = $${outIdx++}`;
      outParams.push(targetBranchId);
    }
    if (startDate) {
      outQuery += ` AND date >= $${outIdx++}`;
      outParams.push(startDate);
    }
    if (endDate) {
      outQuery += ` AND date <= $${outIdx++}`;
      outParams.push(endDate);
    }
    const outResult = await pool.query(outQuery, outParams);
    const totalExpenses = parseFloat(outResult.rows[0]?.total_expenses || 0);

    // 3. Staff Payments (Payroll) from payroll_runs
    let payrollQuery = `
      SELECT
        COALESCE(SUM(total_net + total_pension_employer), 0) AS total_payroll
      FROM payroll_runs
      WHERE status IN ('finalized', 'exported')
    `;
    const payrollParams: any[] = [];
    let payrollIdx = 1;
    if (targetBranchId) {
      payrollQuery += ` AND branch_id = $${payrollIdx++}`;
      payrollParams.push(targetBranchId);
    }
    if (startDate) {
      payrollQuery += ` AND created_at >= $${payrollIdx++}`;
      payrollParams.push(startDate);
    }
    if (endDate) {
      payrollQuery += ` AND created_at <= $${payrollIdx++}`;
      payrollParams.push(endDate);
    }
    const payrollResult = await pool.query(payrollQuery, payrollParams);
    const totalPayroll = parseFloat(payrollResult.rows[0]?.total_payroll || 0);

    // 4. Loan Disbursements (Out) from loans
    let loansQuery = `
      SELECT
        COALESCE(SUM(l.amount), 0) AS total_loans
      FROM loans l
      JOIN users u ON l.employee_id = u.id
      WHERE l.status IN ('active', 'completed')
    `;
    const loansParams: any[] = [];
    let loansIdx = 1;
    if (targetBranchId) {
      loansQuery += ` AND u.branch_id = $${loansIdx++}`;
      loansParams.push(targetBranchId);
    }
    if (startDate) {
      loansQuery += ` AND l.paid_at >= $${loansIdx++}`;
      loansParams.push(startDate);
    }
    if (endDate) {
      loansQuery += ` AND l.paid_at <= $${loansIdx++}`;
      loansParams.push(endDate);
    }
    const loansResult = await pool.query(loansQuery, loansParams);
    const totalLoans = parseFloat(loansResult.rows[0]?.total_loans || 0);

    const totalOut = totalExpenses + totalPayroll + totalLoans;

    res.json({
      success: true,
      data: {
        totalIn,
        totalOut,
        netProfit: totalIn - totalOut,
        breakdown: {
          totalIn,
          totalExpenses,
          totalPayroll,
          totalLoans,
          totalOut
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;

import pool from '../config/database';
import { todayEthiopic } from '../utils/ethiopicUtils';

class AuditorService {
  // View all payments (READ ONLY)
  async getPayments(branchId: string, filters?: { studentId?: string; startDate?: string; endDate?: string }) {
    let query = `
      SELECT ft.*
      FROM finance_transactions ft
      WHERE ft.branch_id = $1
    `;
    const params: any[] = [branchId];
    let paramIndex = 2;

    if (filters?.studentId) {
      query += ` AND ft.student_id = $${paramIndex}`;
      params.push(filters.studentId);
      paramIndex++;
    }

    if (filters?.startDate) {
      query += ` AND ft.date >= $${paramIndex}`;
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters?.endDate) {
      query += ` AND ft.date <= $${paramIndex}`;
      params.push(filters.endDate);
      paramIndex++;
    }

    query += ` ORDER BY ft.date DESC, ft.created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  // View fee reduction requests
  async getFeeReductionRequests(branchId: string, status?: string) {
    let query = `
      SELECT 
        s.id, s.grade, s.monthly_fee, s.bus_fee, s.penalty_fee,
        s.fee_status, s.fee_approval_status, s.fee_notes, s.requested_aid_amount,
        u.name, u.email, u.digital_id
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE s.branch_id = $1 AND s.fee_status = 'reduced'
    `;
    const params: any[] = [branchId];

    if (status) {
      query += ` AND s.fee_approval_status = $2`;
      params.push(status);
    }

    query += ` ORDER BY s.updated_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Approve/Reject fee reduction (ONLY write permission)
  async updateFeeReductionStatus(studentId: string, branchId: string, status: string, auditorId: string) {
    const normalized = String(status).toLowerCase();
    if (!['pending', 'approved', 'rejected'].includes(normalized)) {
      throw new Error('Invalid fee approval status. Use pending, approved, or rejected.');
    }

    // Ensure fee_deductions table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS fee_deductions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        month VARCHAR(20) NOT NULL,
        requested_amount NUMERIC(10,2) NOT NULL,
        approved_amount NUMERIC(10,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'pending',
        approved_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(student_id, month)
      )
    `);

    // Ensure month column is large enough (in case table already exists with old schema)
    await pool.query(`
      ALTER TABLE fee_deductions 
      ALTER COLUMN month TYPE VARCHAR(20)
    `).catch(() => {}); // Ignore error if column already correct size

    // Get the student to find their requested aid amount and current fee status
    const studentRes = await pool.query(
      `SELECT s.id, s.branch_id, s.grade, s.monthly_fee, s.requested_aid_amount, s.fee_approval_status 
       FROM students s WHERE s.id = $1 AND s.branch_id = $2`,
      [studentId, branchId]
    );

    if (studentRes.rows.length === 0) {
      throw new Error('Student not found in your branch');
    }

    const student = studentRes.rows[0];
    const requestedAmount = student.requested_aid_amount || 0;
    const approvedAmount = normalized === 'approved' ? requestedAmount : 0;

    // Get the current month in Ethiopian calendar
    const now = new Date();
    const eatMs = now.getTime() + (now.getTimezoneOffset() * 60 * 1000) + (3 * 60 * 60 * 1000);
    const eatDate = new Date(eatMs);
    const ethDate = require('../utils/ethiopicUtils').gregorianToEthiopic(eatDate);
    const currentMonth = `${ethDate.year}-${String(ethDate.month).padStart(2, '0')}`;

    // Insert or update fee_deductions table
    await pool.query(
      `INSERT INTO fee_deductions (student_id, month, requested_amount, approved_amount, status, approved_by, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (student_id, month) DO UPDATE SET 
         approved_amount = $4,
         status = $5,
         approved_by = $6,
         updated_at = NOW()`,
      [studentId, currentMonth, requestedAmount, approvedAmount, normalized, auditorId || null]
    );

    // Update students table for UI display (showing reduced status when approved)
    const feeStatus = normalized === 'rejected' ? 'standard' : (approvedAmount > 0 ? 'reduced' : 'standard');

    const result = await pool.query(
      `UPDATE students 
       SET 
           fee_approval_status = $1,
           fee_status = $2,
           updated_at = NOW()
       WHERE id = $3 AND branch_id = $4
       RETURNING id, grade, monthly_fee, bus_fee, penalty_fee, fee_status, fee_approval_status, fee_notes, requested_aid_amount`,
      [normalized, feeStatus, studentId, branchId]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to update fee reduction status');
    }

    return result.rows[0];
  }

  // View financial reports
  async getFinancialReport(branchId: string, startDate: string, endDate: string) {
    const transactionsResult = await pool.query(
      `SELECT ft.*
       FROM finance_transactions ft
       WHERE ft.branch_id = $1 AND ft.date BETWEEN $2 AND $3
       ORDER BY ft.date DESC, ft.created_at DESC`,
      [branchId, startDate, endDate]
    );

    const summaryResult = await pool.query(
      `SELECT 
         COUNT(*) as total_transactions,
         COALESCE(SUM(amount), 0) as total_collected
       FROM finance_transactions
       WHERE branch_id = $1 AND date BETWEEN $2 AND $3`,
      [branchId, startDate, endDate]
    );

    const byTypeResult = await pool.query(
      `SELECT 
         type,
         COUNT(*) as count,
         COALESCE(SUM(amount), 0) as total
       FROM finance_transactions
       WHERE branch_id = $1 AND date BETWEEN $2 AND $3
       GROUP BY type
       ORDER BY total DESC`,
      [branchId, startDate, endDate]
    );

    const dailyResult = await pool.query(
      `SELECT 
         date,
         COUNT(*) as transactions,
         COALESCE(SUM(amount), 0) as total
       FROM finance_transactions
       WHERE branch_id = $1 AND date BETWEEN $2 AND $3
       GROUP BY date
       ORDER BY date DESC`,
      [branchId, startDate, endDate]
    );

    return {
      period: { startDate, endDate },
      summary: {
        totalTransactions: parseInt(summaryResult.rows[0].total_transactions),
        totalCollected: parseFloat(summaryResult.rows[0].total_collected)
      },
      transactions: transactionsResult.rows,
      byType: byTypeResult.rows,
      dailyBreakdown: dailyResult.rows
    };
  }


  // View audit trail — combines finance_transactions + payment_status_logs for real data
  async getAuditTrail(branchId: string, filters?: { userId?: string; action?: string; category?: string; direction?: string; startDate?: string; endDate?: string }) {
    const params1: any[] = [branchId];
    let paramIdx1 = 2;
    let ftWhere = '';

    if (filters?.startDate) {
      ftWhere += ` AND ft.date >= $${paramIdx1}`;
      params1.push(filters.startDate);
      paramIdx1++;
    }
    if (filters?.endDate) {
      ftWhere += ` AND ft.date <= $${paramIdx1}`;
      params1.push(filters.endDate);
      paramIdx1++;
    }

    // Restrict by category
    const wantFees   = !filters?.category || filters.category === 'Fees';
    const wantStaff  = !filters?.category || filters.category === 'Staff';
    const wantOther  = !filters?.category || filters.category === 'Other';
    const wantIn     = !filters?.direction || filters.direction === 'In';
    const wantOut    = !filters?.direction || filters.direction === 'Out';

    // 1. Student payment transactions (category=Fees, direction=In)
    const ftStudentRows = (wantFees && wantIn) ? await pool.query(`
      SELECT
        ft.id,
        ft.student_id,
        ft.student_name,
        'N/A' AS section,
        'Fees' AS category,
        'In' AS direction,
        ft.type AS action_label,
        ft.verified_by AS modified_by,
        ft.verified_by AS approver_name,
        NULL AS old_value,
        NULL AS new_value,
        true AS status,
        ft.date AS timestamp,
        ft.amount AS amount
      FROM finance_transactions ft
      WHERE ft.branch_id = $1
        AND ft.student_id IS NOT NULL
        ${ftWhere}
      ORDER BY ft.date DESC
    `, params1) : { rows: [] };

    // 2. Other finance transactions (expenses/income) — category=Other
    const params2: any[] = [branchId];
    let paramIdx2 = 2;
    let ftOtherWhere = '';
    if (filters?.startDate) { ftOtherWhere += ` AND ft.date >= $${paramIdx2}`; params2.push(filters.startDate); paramIdx2++; }
    if (filters?.endDate)   { ftOtherWhere += ` AND ft.date <= $${paramIdx2}`; params2.push(filters.endDate);   paramIdx2++; }

    const ftOtherRows = (wantOther) ? await pool.query(`
      SELECT
        ft.id,
        ft.student_id,
        ft.student_name,
        'N/A' AS section,
        'Other' AS category,
        CASE WHEN ft.type ILIKE '%income%' OR ft.type ILIKE '%payment%' THEN 'In' ELSE 'Out' END AS direction,
        ft.type AS action_label,
        ft.verified_by AS modified_by,
        ft.verified_by AS approver_name,
        NULL AS old_value,
        NULL AS new_value,
        true AS status,
        ft.date AS timestamp,
        ft.amount AS amount
      FROM finance_transactions ft
      WHERE ft.branch_id = $1
        AND ft.student_id IS NULL
        ${ftOtherWhere}
      ORDER BY ft.date DESC
    `, params2) : { rows: [] };

    // 3. Payroll (staff salary) entries — category=Staff, direction=Out
    const params3: any[] = [branchId];
    let paramIdx3 = 2;
    let prWhere = '';
    if (filters?.startDate) { prWhere += ` AND pr.created_at >= $${paramIdx3}`; params3.push(filters.startDate); paramIdx3++; }
    if (filters?.endDate)   { prWhere += ` AND pr.created_at <= $${paramIdx3}`; params3.push(filters.endDate);   paramIdx3++; }

    const prRows = (wantStaff && wantOut) ? await pool.query(`
      SELECT
        pi.id,
        NULL AS student_id,
        pi.employee_name AS student_name,
        COALESCE(u_emp.role::text, 'Staff') AS section,
        'Staff' AS category,
        'Out' AS direction,
        CONCAT('Salary - ', pr.month, '/', pr.year) AS action_label,
        COALESCE(ug.name, 'System') AS modified_by,
        COALESCE(uf.name, 'System') AS approver_name,
        NULL AS old_value,
        json_build_object('gross', pi.gross_salary, 'net', pi.net_pay, 'deductions', pi.total_deductions) AS new_value,
        true AS status,
        COALESCE(pr.finalized_at, pr.created_at) AS timestamp,
        pi.net_pay AS amount
      FROM payroll_items pi
      JOIN payroll_runs pr ON pi.payroll_run_id = pr.id
      LEFT JOIN users ug ON pr.generated_by = ug.id
      LEFT JOIN users uf ON pr.finalized_by = uf.id
      LEFT JOIN users u_emp ON pi.employee_id = u_emp.id
      WHERE pr.branch_id = $1
        AND pr.status IN ('finalized', 'exported')
        ${prWhere}
      ORDER BY pr.created_at DESC
    `, params3) : { rows: [] };

    // Merge and sort all
    const allRows = [...ftStudentRows.rows, ...ftOtherRows.rows, ...prRows.rows]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 200);

    return allRows;
  }

  // Dashboard
  async getDashboard(branchId: string) {
    const totalResult = await pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
       FROM finance_transactions
       WHERE branch_id = $1`,
      [branchId]
    );

    const ethToday = todayEthiopic();
    const monthlyResult = await pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
       FROM finance_transactions
       WHERE branch_id = $1
       AND LOWER(ethiopic_month) = $2
       AND ethiopic_year = $3`,
      [branchId, ethToday.month.toLowerCase(), ethToday.year]
    );

    // Count pending fee reduction requests for this branch
    const pendingFeeResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM students
       WHERE branch_id = $1 AND fee_approval_status = 'pending'`,
      [branchId]
    );

    // Count pending employee loan requests (not scoped to branch — loans are system-wide for auditor review)
    const pendingLoansResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM loans
       WHERE status = 'pending'`
    );

    const recentResult = await pool.query(
      `SELECT * FROM finance_transactions
       WHERE branch_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [branchId]
    );

    // Registration fee stats: count students with a cleared registration-fee and sum the amounts paid
    const regFeeResult = await pool.query(
      `SELECT
         COUNT(DISTINCT p.student_id) AS count,
         COALESCE(SUM(pi.amount), 0) AS total
       FROM payments p
       JOIN payment_items pi ON pi.payment_id = p.id
       JOIN students s ON s.id = p.student_id
       WHERE s.branch_id = $1
         AND pi.fee_type = 'registration'`,
      [branchId]
    );

    const pendingFeeReductions = parseInt(pendingFeeResult.rows[0].count);
    const pendingLoans = parseInt(pendingLoansResult.rows[0].count);
    const regFeeCount = regFeeResult.rows.length > 0 ? parseInt(regFeeResult.rows[0].count) : 0;
    const regFeeTotal = regFeeResult.rows.length > 0 ? parseFloat(regFeeResult.rows[0].total) : 0;

    return {
      totalPayments: {
        count: parseInt(totalResult.rows[0].count),
        total: parseFloat(totalResult.rows[0].total)
      },
      monthlyPayments: {
        count: parseInt(monthlyResult.rows[0].count),
        total: parseFloat(monthlyResult.rows[0].total)
      },
      registrationFees: {
        count: regFeeCount,
        total: regFeeTotal
      },
      pendingFeeReductions,
      pendingLoans,
      pendingApprovals: pendingFeeReductions + pendingLoans,
      recentTransactions: recentResult.rows
    };
  }
}

export default new AuditorService();

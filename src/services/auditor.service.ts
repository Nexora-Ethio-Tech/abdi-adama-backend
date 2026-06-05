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
  async updateFeeReductionStatus(studentId: string, branchId: string, status: string, _auditorId: string) {
    const normalized = String(status).toLowerCase();
    if (!['pending', 'approved', 'rejected'].includes(normalized)) {
      throw new Error('Invalid fee approval status. Use pending, approved, or rejected.');
    }

    const feeStatus = normalized === 'rejected' ? 'standard' : 'reduced';

    const result = await pool.query(
      `UPDATE students 
       SET fee_approval_status = $1,
           fee_status = $2,
           updated_at = NOW()
       WHERE id = $3 AND branch_id = $4
       RETURNING id, grade, monthly_fee, bus_fee, penalty_fee, fee_status, fee_approval_status, fee_notes, requested_aid_amount`,
      [normalized, feeStatus, studentId, branchId]
    );

    if (result.rows.length === 0) {
      throw new Error('Student not found in your branch');
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

    const pendingFeeReductions = parseInt(pendingFeeResult.rows[0].count);
    const pendingLoans = parseInt(pendingLoansResult.rows[0].count);

    return {
      totalPayments: {
        count: parseInt(totalResult.rows[0].count),
        total: parseFloat(totalResult.rows[0].total)
      },
      monthlyPayments: {
        count: parseInt(monthlyResult.rows[0].count),
        total: parseFloat(monthlyResult.rows[0].total)
      },
      pendingFeeReductions,
      pendingLoans,
      pendingApprovals: pendingFeeReductions + pendingLoans,
      recentTransactions: recentResult.rows
    };
  }
}

export default new AuditorService();

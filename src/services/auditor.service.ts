import pool from '../config/database';

class AuditorService {
  // View all payments (READ ONLY)
  async getPayments(branchId: string, filters?: { studentId?: string; startDate?: string; endDate?: string }) {
    let query = `
      SELECT p.*, s.name as student_name, s.digital_id as student_digital_id, 
             u.name as recorded_by_name
      FROM payments p
      JOIN students s ON p.student_id = s.id
      JOIN users u ON p.recorded_by = u.id
      WHERE s.branch_id = $1
    `;
    const params: any[] = [branchId];
    let paramIndex = 2;

    if (filters?.studentId) {
      query += ` AND p.student_id = $${paramIndex}`;
      params.push(filters.studentId);
      paramIndex++;
    }

    if (filters?.startDate) {
      query += ` AND p.payment_date >= $${paramIndex}`;
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters?.endDate) {
      query += ` AND p.payment_date <= $${paramIndex}`;
      params.push(filters.endDate);
      paramIndex++;
    }

    query += ` ORDER BY p.payment_date DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  // View fee reduction requests
  async getFeeReductionRequests(branchId: string, status?: string) {
    let query = `
      SELECT s.id, s.digital_id, s.name, s.grade, s.fee_reduction_percentage,
             s.fee_approval_status, s.fee_reduction_reason, s.fee_reduction_reviewed_by,
             s.fee_reduction_reviewed_at, u.name as reviewed_by_name
      FROM students s
      LEFT JOIN users u ON s.fee_reduction_reviewed_by = u.id
      WHERE s.branch_id = $1 AND s.fee_reduction_percentage > 0
    `;
    const params: any[] = [branchId];

    if (status) {
      query += ` AND s.fee_approval_status = $2`;
      params.push(status);
    }

    query += ` ORDER BY s.created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Approve/Reject fee reduction (ONLY write permission)
  async updateFeeReductionStatus(studentId: string, branchId: string, status: string, auditorId: string) {
    const validStatuses = ['Pending', 'Approved', 'Rejected'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status. Must be Pending, Approved, or Rejected');
    }

    const result = await pool.query(
      `UPDATE students 
       SET fee_approval_status = $1, 
           fee_reduction_reviewed_by = $2,
           fee_reduction_reviewed_at = NOW()
       WHERE id = $3 AND branch_id = $4
       RETURNING *`,
      [status, auditorId, studentId, branchId]
    );

    if (result.rows.length === 0) {
      throw new Error('Student not found in your branch');
    }

    return result.rows[0];
  }

  // View financial reports
  async getFinancialReport(branchId: string, startDate: string, endDate: string) {
    const paymentsResult = await pool.query(
      `SELECT 
         COUNT(*) as total_transactions,
         SUM(amount) as total_collected,
         SUM(CASE WHEN payment_type = 'Tuition' THEN amount ELSE 0 END) as tuition_collected,
         SUM(CASE WHEN payment_type = 'Registration' THEN amount ELSE 0 END) as registration_collected,
         SUM(CASE WHEN payment_type = 'Bus Fee' THEN amount ELSE 0 END) as bus_collected,
         SUM(CASE WHEN payment_type = 'Penalty' THEN amount ELSE 0 END) as penalty_collected
       FROM payments p
       JOIN students s ON p.student_id = s.id
       WHERE s.branch_id = $1 AND p.payment_date BETWEEN $2 AND $3`,
      [branchId, startDate, endDate]
    );

    const expensesResult = await pool.query(
      `SELECT 
         COUNT(*) as total_expenses,
         SUM(amount) as total_spent
       FROM expenses
       WHERE branch_id = $1 AND expense_date BETWEEN $2 AND $3`,
      [branchId, startDate, endDate]
    );

    const revenueTargetResult = await pool.query(
      `SELECT target_amount, achieved_amount
       FROM revenue_targets
       WHERE branch_id = $1 AND target_month BETWEEN $2 AND $3
       ORDER BY target_month DESC LIMIT 1`,
      [branchId, startDate, endDate]
    );

    return {
      period: { startDate, endDate },
      income: paymentsResult.rows[0],
      expenses: expensesResult.rows[0],
      revenueTarget: revenueTargetResult.rows[0] || null
    };
  }

  // View audit trail
  async getAuditTrail(branchId: string, filters?: { userId?: string; action?: string; startDate?: string; endDate?: string }) {
    let query = `
      SELECT al.*, u.name as user_name, u.digital_id as user_digital_id
      FROM audit_logs al
      JOIN users u ON al.user_id = u.id
      WHERE u.branch_id = $1
    `;
    const params: any[] = [branchId];
    let paramIndex = 2;

    if (filters?.userId) {
      query += ` AND al.user_id = $${paramIndex}`;
      params.push(filters.userId);
      paramIndex++;
    }

    if (filters?.action) {
      query += ` AND al.action = $${paramIndex}`;
      params.push(filters.action);
      paramIndex++;
    }

    if (filters?.startDate) {
      query += ` AND al.created_at >= $${paramIndex}`;
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters?.endDate) {
      query += ` AND al.created_at <= $${paramIndex}`;
      params.push(filters.endDate);
      paramIndex++;
    }

    query += ` ORDER BY al.created_at DESC LIMIT 100`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Dashboard
  async getDashboard(branchId: string) {
    const totalPaymentsResult = await pool.query(
      `SELECT COUNT(*) as count, SUM(amount) as total
       FROM payments p
       JOIN students s ON p.student_id = s.id
       WHERE s.branch_id = $1`,
      [branchId]
    );

    const monthlyPaymentsResult = await pool.query(
      `SELECT COUNT(*) as count, SUM(amount) as total
       FROM payments p
       JOIN students s ON p.student_id = s.id
       WHERE s.branch_id = $1 AND p.payment_date >= DATE_TRUNC('month', CURRENT_DATE)`,
      [branchId]
    );

    const pendingReductionsResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM students
       WHERE branch_id = $1 AND fee_approval_status = 'Pending' AND fee_reduction_percentage > 0`,
      [branchId]
    );

    const revenueTargetResult = await pool.query(
      `SELECT target_amount, achieved_amount
       FROM revenue_targets
       WHERE branch_id = $1 AND target_month = DATE_TRUNC('month', CURRENT_DATE)`,
      [branchId]
    );

    return {
      totalPayments: totalPaymentsResult.rows[0],
      monthlyPayments: monthlyPaymentsResult.rows[0],
      pendingFeeReductions: parseInt(pendingReductionsResult.rows[0].count),
      revenueTarget: revenueTargetResult.rows[0] || null
    };
  }
}

export default new AuditorService();

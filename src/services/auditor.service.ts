import pool from '../config/database';

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
        s.fee_status, s.fee_approval_status, s.fee_notes,
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
    const result = await pool.query(
      `UPDATE students 
       SET fee_approval_status = $1, updated_at = NOW()
       WHERE id = $2 AND branch_id = $3
       RETURNING id, grade, monthly_fee, bus_fee, penalty_fee, fee_status, fee_approval_status, fee_notes`,
      [status, studentId, branchId]
    );

    if (result.rows.length === 0) {
      throw new Error('Student not found in your branch');
    }

    return result.rows[0];
  }

  // View financial reports
  async getFinancialReport(branchId: string, startDate: string, endDate: string) {
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
      byType: byTypeResult.rows,
      dailyBreakdown: dailyResult.rows
    };
  }

  // View audit trail
  async getAuditTrail(branchId: string, filters?: { userId?: string; action?: string; startDate?: string; endDate?: string }) {
    let query = `
      SELECT al.*
      FROM audit_log al
      WHERE al.student_id IN (
        SELECT id FROM students WHERE branch_id = $1
      )
    `;
    const params: any[] = [branchId];
    let paramIndex = 2;

    if (filters?.startDate) {
      query += ` AND al.timestamp >= $${paramIndex}`;
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters?.endDate) {
      query += ` AND al.timestamp <= $${paramIndex}`;
      params.push(filters.endDate);
      paramIndex++;
    }

    query += ` ORDER BY al.timestamp DESC LIMIT 100`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Dashboard
  async getDashboard(branchId: string) {
    const totalResult = await pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
       FROM finance_transactions
       WHERE branch_id = $1`,
      [branchId]
    );

    const monthlyResult = await pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
       FROM finance_transactions
       WHERE branch_id = $1
       AND EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM CURRENT_DATE)
       AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE)`,
      [branchId]
    );

    const pendingResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM students
       WHERE branch_id = $1 AND fee_approval_status = 'pending'`,
      [branchId]
    );

    const recentResult = await pool.query(
      `SELECT * FROM finance_transactions
       WHERE branch_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [branchId]
    );

    return {
      totalPayments: {
        count: parseInt(totalResult.rows[0].count),
        total: parseFloat(totalResult.rows[0].total)
      },
      monthlyPayments: {
        count: parseInt(monthlyResult.rows[0].count),
        total: parseFloat(monthlyResult.rows[0].total)
      },
      pendingFeeReductions: parseInt(pendingResult.rows[0].count),
      recentTransactions: recentResult.rows
    };
  }
}

export default new AuditorService();

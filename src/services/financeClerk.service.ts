import pool from '../config/database';

class FinanceClerkService {
  // Record payment
  async recordPayment(data: {
    studentId: string;
    amount: number;
    type: string;
    date: string;
    verifiedBy: string;
    branchId: string;
  }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get student name
      const studentResult = await client.query(
        'SELECT u.name FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = $1',
        [data.studentId]
      );

      if (studentResult.rows.length === 0) {
        throw new Error('Student not found');
      }

      const studentName = studentResult.rows[0].name;

      // Insert transaction
      const result = await client.query(
        `INSERT INTO finance_transactions 
        (student_id, student_name, amount, type, date, verified_by, branch_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [data.studentId, studentName, data.amount, data.type, data.date, data.verifiedBy, data.branchId]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get payment history
  async getPaymentHistory(studentId: string) {
    const result = await pool.query(
      `SELECT * FROM finance_transactions 
       WHERE student_id = $1 
       ORDER BY date DESC, created_at DESC`,
      [studentId]
    );
    return result.rows;
  }

  // Get students with fee information
  async getStudentsWithFees(branchId: string, search?: string, feeStatus?: string) {
    let query = `
      SELECT 
        s.id, s.grade, s.monthly_fee, s.bus_fee, s.penalty_fee,
        s.fee_status, s.fee_approval_status, s.fee_notes,
        u.name, u.email, u.digital_id
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE s.branch_id = $1
    `;

    const params: any[] = [branchId];
    let paramCount = 1;

    if (feeStatus) {
      paramCount++;
      query += ` AND s.fee_status = $${paramCount}`;
      params.push(feeStatus);
    }

    if (search) {
      paramCount++;
      query += ` AND (u.name ILIKE $${paramCount} OR u.digital_id ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY u.name';

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Update fee status
  async updateFeeStatus(studentId: string, data: {
    feeStatus?: string;
    monthlyFee?: number;
    busFee?: number;
    penaltyFee?: number;
    feeNotes?: string;
  }) {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (data.feeStatus) {
      paramCount++;
      fields.push(`fee_status = $${paramCount}`);
      values.push(data.feeStatus);

      // If setting to reduced, set approval status to pending
      if (data.feeStatus === 'reduced') {
        paramCount++;
        fields.push(`fee_approval_status = $${paramCount}`);
        values.push('pending');
      }
    }

    if (data.monthlyFee !== undefined) {
      paramCount++;
      fields.push(`monthly_fee = $${paramCount}`);
      values.push(data.monthlyFee);
    }

    if (data.busFee !== undefined) {
      paramCount++;
      fields.push(`bus_fee = $${paramCount}`);
      values.push(data.busFee);
    }

    if (data.penaltyFee !== undefined) {
      paramCount++;
      fields.push(`penalty_fee = $${paramCount}`);
      values.push(data.penaltyFee);
    }

    if (data.feeNotes) {
      paramCount++;
      fields.push(`fee_notes = $${paramCount}`);
      values.push(data.feeNotes);
    }

    paramCount++;
    values.push(studentId);

    const result = await pool.query(
      `UPDATE students SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Student not found');
    }

    return result.rows[0];
  }

  // Get dashboard statistics
  async getDashboardStats(branchId: string) {
    // Today's collection
    const todayResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM finance_transactions
       WHERE branch_id = $1 AND date = CURRENT_DATE`,
      [branchId]
    );

    // This month's revenue
    const monthResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM finance_transactions
       WHERE branch_id = $1 
       AND EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM CURRENT_DATE)
       AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE)`,
      [branchId]
    );

    // Pending fee reductions
    const pendingResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM students
       WHERE branch_id = $1 AND fee_approval_status = 'pending'`,
      [branchId]
    );

    // Recent transactions
    const recentResult = await pool.query(
      `SELECT * FROM finance_transactions
       WHERE branch_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [branchId]
    );

    return {
      todayCollection: parseFloat(todayResult.rows[0].total),
      monthlyRevenue: parseFloat(monthResult.rows[0].total),
      pendingApprovals: parseInt(pendingResult.rows[0].count),
      recentTransactions: recentResult.rows
    };
  }

  // Get overdue payments
  async getOverduePayments(branchId: string) {
    // Students who haven't paid this month
    const result = await pool.query(
      `SELECT 
        s.id, s.grade, s.monthly_fee, s.bus_fee, s.penalty_fee,
        u.name, u.email, u.digital_id, s.parent_phone
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN finance_transactions ft ON s.id = ft.student_id 
        AND EXTRACT(MONTH FROM ft.date) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM ft.date) = EXTRACT(YEAR FROM CURRENT_DATE)
      WHERE s.branch_id = $1 AND ft.id IS NULL
      ORDER BY u.name`,
      [branchId]
    );

    return result.rows;
  }

  // Get daily collection report
  async getDailyReport(branchId: string, date?: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `SELECT 
        ft.*,
        COUNT(*) OVER() as total_transactions,
        SUM(amount) OVER() as total_amount
      FROM finance_transactions ft
      WHERE branch_id = $1 AND date = $2
      ORDER BY created_at DESC`,
      [branchId, targetDate]
    );

    return {
      date: targetDate,
      transactions: result.rows,
      summary: {
        totalTransactions: result.rows.length > 0 ? parseInt(result.rows[0].total_transactions) : 0,
        totalAmount: result.rows.length > 0 ? parseFloat(result.rows[0].total_amount) : 0
      }
    };
  }
}

export default new FinanceClerkService();

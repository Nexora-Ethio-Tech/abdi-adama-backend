import pool from '../config/database';
import schoolAdminService from './schoolAdmin.service';
import { generateCredentials } from '../utils/credentialGenerator';

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

  // Get transport students with current route/driver assignment
  async getTransportStudents(branchId: string, search?: string, status: 'assigned' | 'unassigned' | 'all' = 'assigned') {
    let query = `
      SELECT
        s.id,
        s.grade,
        s.bus_fee,
        s.is_bus_user,
        u.name,
        u.email,
        u.digital_id,
        r.id AS route_id,
        r.name AS route_name,
        drv.id AS driver_id,
        drv.name AS driver_name,
        drv.digital_id AS driver_digital_id
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT sr.route_id
        FROM student_routes sr
        WHERE sr.student_id = s.id
        LIMIT 1
      ) sr ON TRUE
      LEFT JOIN routes r ON r.id = sr.route_id
      LEFT JOIN users drv ON drv.id = r.driver_id
      WHERE s.branch_id = $1
    `;

    const params: any[] = [branchId];
    let paramCount = 1;

    if (status !== 'all') {
      query += status === 'assigned' ? ' AND sr.route_id IS NOT NULL' : ' AND sr.route_id IS NULL';
    }

    if (search) {
      paramCount++;
      query += ` AND (
        u.name ILIKE $${paramCount}
        OR u.digital_id ILIKE $${paramCount}
        OR COALESCE(r.name, '') ILIKE $${paramCount}
        OR COALESCE(drv.name, '') ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY u.name';

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Get routes with assigned drivers for transport management
  async getTransportRoutes(branchId: string, search?: string) {
    let query = `
      SELECT
        r.id AS route_id,
        r.name AS route_name,
        r.driver_id,
        drv.name AS driver_name,
        drv.digital_id AS driver_digital_id,
        COUNT(sr.student_id)::int AS student_count
      FROM routes r
      JOIN users drv ON drv.id = r.driver_id
      LEFT JOIN student_routes sr ON sr.route_id = r.id
      WHERE r.branch_id = $1
    `;

    const params: any[] = [branchId];
    let paramCount = 1;

    if (search) {
      paramCount++;
      query += ` AND (
        r.name ILIKE $${paramCount}
        OR drv.name ILIKE $${paramCount}
        OR drv.digital_id ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }

    query += `
      GROUP BY r.id, drv.id
      ORDER BY r.name
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Get financial policies for transport fee lookup
  async getTransportPolicies(branchId: string) {
    const result = await pool.query(
      `SELECT grade_level, monthly_tuition, registration_fee, bus_fee, penalty_rate, academic_year, branch_id
       FROM financial_policies
       WHERE branch_id = $1
       ORDER BY academic_year DESC, grade_level`,
      [branchId]
    );

    return result.rows;
  }

  // Assign or change a student's transport route and fee
  async assignTransportStudent(data: {
    branchId: string;
    studentId: string;
    driverId: string;
    transportFee: number;
    verifiedBy: string;
  }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const studentResult = await client.query(
        `SELECT s.id, u.name
         FROM students s
         JOIN users u ON s.user_id = u.id
         WHERE s.id = $1 AND s.branch_id = $2
         FOR UPDATE`,
        [data.studentId, data.branchId]
      );

      if (studentResult.rows.length === 0) {
        throw new Error('Student not found');
      }

      const driverResult = await client.query(
        `SELECT id, name, digital_id
         FROM users
         WHERE id = $1 AND branch_id = $2 AND role = 'driver'`,
        [data.driverId, data.branchId]
      );

      if (driverResult.rows.length === 0) {
        throw new Error('Driver not found');
      }

      let routeResult = await client.query(
        `SELECT id, name
         FROM routes
         WHERE driver_id = $1 AND branch_id = $2
         LIMIT 1`,
        [data.driverId, data.branchId]
      );

      if (routeResult.rows.length === 0) {
        routeResult = await client.query(
          `INSERT INTO routes (name, driver_id, branch_id)
           VALUES ($1, $2, $3)
           RETURNING id, name`,
          [`Transport - ${driverResult.rows[0].name}`, data.driverId, data.branchId]
        );
      }

      await client.query('DELETE FROM student_routes WHERE student_id = $1', [data.studentId]);
      await client.query(
        'INSERT INTO student_routes (student_id, route_id) VALUES ($1, $2)',
        [data.studentId, routeResult.rows[0].id]
      );

      await client.query(
        `UPDATE students
         SET bus_fee = $1,
             is_bus_user = TRUE,
             updated_at = NOW()
         WHERE id = $2`,
        [data.transportFee, data.studentId]
      );

      await client.query('COMMIT');

      return {
        studentId: data.studentId,
        studentName: studentResult.rows[0].name,
        routeId: routeResult.rows[0].id,
        routeName: routeResult.rows[0].name,
        driverName: driverResult.rows[0].name,
        transportFee: Number(data.transportFee),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Stop transport and create a prorated settlement transaction
  async stopTransportStudent(data: {
    branchId: string;
    studentId: string;
    daysUsed: number;
    verifiedBy: string;
  }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const studentResult = await client.query(
        `SELECT s.id, s.bus_fee, u.name
         FROM students s
         JOIN users u ON s.user_id = u.id
         WHERE s.id = $1 AND s.branch_id = $2
         FOR UPDATE`,
        [data.studentId, data.branchId]
      );

      if (studentResult.rows.length === 0) {
        throw new Error('Student not found');
      }

      const student = studentResult.rows[0];
      const transportFee = Number(student.bus_fee || 0);
      if (transportFee <= 0) {
        throw new Error('This student does not have an active transport fee');
      }

      const clampedDaysUsed = Math.min(30, Math.max(0, Number(data.daysUsed)));
      const amountDue = Number((((30 - clampedDaysUsed) * transportFee) / 30).toFixed(2));

      await client.query('DELETE FROM student_routes WHERE student_id = $1', [data.studentId]);
      await client.query(
        `UPDATE students
         SET bus_fee = 0,
             is_bus_user = FALSE,
             updated_at = NOW()
         WHERE id = $1`,
        [data.studentId]
      );

      await client.query(
        `INSERT INTO finance_transactions
          (student_id, student_name, amount, type, date, verified_by, branch_id)
         VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6)`,
        [
          data.studentId,
          student.name,
          amountDue,
          'Transport Stop Settlement',
          data.verifiedBy,
          data.branchId,
        ]
      );

      await client.query('COMMIT');

      return {
        studentId: data.studentId,
        studentName: student.name,
        daysUsed: clampedDaysUsed,
        transportFee,
        amountDue,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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

      // If setting to reduced, set approval status to pending.
      // If setting back to standard, clear any previous fee reduction state.
      paramCount++;
      fields.push(`fee_approval_status = $${paramCount}`);
      values.push(data.feeStatus === 'reduced' ? 'pending' : 'none');
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

  // Applications for finance
  async getPendingApplications(branchId: string, status?: string) {
    return await schoolAdminService.getApplicationsForFinance(branchId, status);
  }

  // Approve an application (delegate to schoolAdminService)
  async approveApplication(applicationId: string, payment: { amount: number; reference?: string }, financeUserId: string) {
    return await schoolAdminService.financeApproveApplication(applicationId, payment, financeUserId);
  }
}

export default new FinanceClerkService();

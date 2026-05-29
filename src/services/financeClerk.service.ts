import pool from '../config/database';
import schoolAdminService from './schoolAdmin.service';
import { generateCredentials } from '../utils/credentialGenerator';

class FinanceClerkService {
  private async getRegistrationDueForMonth(client: any, studentId: string, branchId: string, targetMonth: string): Promise<number> {
    const regPaidRes = await client.query(
      `SELECT 1
       FROM payments p
       JOIN payment_items pi ON pi.payment_id = p.id
       WHERE p.student_id = $1
         AND pi.fee_type = 'registration'
         AND COALESCE(p.month, '') <= $2
       LIMIT 1`,
      [studentId, targetMonth]
    );

    if (regPaidRes.rows.length > 0) {
      return 0;
    }

    const reg = await this.getGlobalRegistrationFee(branchId).catch(() => ({ amount: 0 }));
    return Number(reg.amount || 0);
  }

  private async computeMonthlyOutstanding(client: any, student: any, branchId: string, month: string) {
    const feeTypes = ['monthly', 'bus', 'penalty', 'registration'];
    let outstandingTotal = 0;

    for (const ft of feeTypes) {
      let due = 0;
      if (ft === 'monthly') due = Number(student.monthly_fee || 0);
      else if (ft === 'bus') due = Number(student.bus_fee || 0);
      else if (ft === 'penalty') due = Number(student.penalty_fee || 0);
      else if (ft === 'registration') due = await this.getRegistrationDueForMonth(client, student.id, branchId, month);

      const paidRes = await client.query(
        `SELECT COALESCE(SUM(pi.amount),0) as paid
         FROM payments p JOIN payment_items pi ON pi.payment_id = p.id
         WHERE p.student_id = $1 AND p.month = $2 AND pi.fee_type = $3`,
        [student.id, month, ft]
      );

      const paid = Number(paidRes.rows[0].paid || 0);
      outstandingTotal += Math.max(0, due - paid);
    }

    return outstandingTotal;
  }

  // Record an itemized payment and update collections status
  async recordPayment(data: {
    studentId: string;
    items: { feeType: string; amount: number }[];
    month: string; // YYYY-MM
    date?: string;
    reference?: string;
    verifiedBy: string;
    branchId: string;
  }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock student row
      const studentRes = await client.query(
        `SELECT s.id, s.monthly_fee, s.bus_fee, s.penalty_fee, s.branch_id, u.name
         FROM students s JOIN users u ON s.user_id = u.id
         WHERE s.id = $1 FOR UPDATE`,
        [data.studentId]
      );

      if (studentRes.rows.length === 0) {
        throw new Error('Student not found');
      }

      const student = studentRes.rows[0];

      // Validate and compute totals
      let total = 0;
      const toInsertItems: { feeType: string; amount: number }[] = [];

      for (const it of data.items) {
        const feeType = it.feeType;
        const amt = Number(it.amount) || 0;

        // Determine amount due for fee type
        let dueForType = 0;
        if (feeType === 'monthly') dueForType = Number(student.monthly_fee || 0);
        else if (feeType === 'bus') dueForType = Number(student.bus_fee || 0);
        else if (feeType === 'penalty') dueForType = Number(student.penalty_fee || 0);
        else if (feeType === 'registration') {
          dueForType = await this.getRegistrationDueForMonth(client, data.studentId, data.branchId, data.month);
        } else {
          // Unknown fee type — accept provided amount as a custom charge
          dueForType = amt;
        }

        // Amount already paid for this fee type in the same month
        const paidRes = await client.query(
          `SELECT COALESCE(SUM(pi.amount),0) AS paid
           FROM payments p JOIN payment_items pi ON pi.payment_id = p.id
           WHERE p.student_id = $1 AND p.month = $2 AND pi.fee_type = $3`,
          [data.studentId, data.month, feeType]
        );

        const alreadyPaid = Number(paidRes.rows[0].paid || 0);
        const remaining = Math.max(0, dueForType - alreadyPaid);

        if (remaining <= 0) {
          throw new Error(`Fee type already fully paid: ${feeType}`);
        }

        const payAmount = Math.min(amt, remaining);
        if (payAmount <= 0) continue;

        total += payAmount;
        toInsertItems.push({ feeType, amount: payAmount });
      }

      if (toInsertItems.length === 0) {
        throw new Error('No payable items provided');
      }

      // Create payment
      const paymentRes = await client.query(
        `INSERT INTO payments (student_id, payer_id, branch_id, month, date, total_amount, reference)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [data.studentId, null, data.branchId, data.month, data.date || new Date().toISOString().slice(0, 10), total, data.reference || null]
      );

      const payment = paymentRes.rows[0];

      // Insert items
      for (const it of toInsertItems) {
        await client.query(
          `INSERT INTO payment_items (payment_id, fee_type, amount) VALUES ($1, $2, $3)`,
          [payment.id, it.feeType, it.amount]
        );
      }

      // Also record a finance_transactions summary (backwards compatibility)
      await client.query(
        `INSERT INTO finance_transactions (student_id, student_name, amount, type, date, verified_by, branch_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [data.studentId, student.name, total, `Payment (${data.month})`, data.date || new Date().toISOString().slice(0, 10), data.verifiedBy, data.branchId]
      );

      // Recompute outstanding and update student_collections
      const outstandingTotal = await this.computeMonthlyOutstanding(client, student, data.branchId, data.month);

      // Determine due_date (simple heuristic: 10th of month) and status
      const dueDate = new Date(`${data.month}-10`);
      const now = new Date();
      let status = 'in_collections';
      if (outstandingTotal <= 0) status = 'cleared';
      else if (now > dueDate) status = 'overdue';

      await client.query(
        `INSERT INTO student_collections (student_id, month, due_date, status, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (student_id, month) DO UPDATE SET status = EXCLUDED.status, due_date = EXCLUDED.due_date, updated_at = NOW()`,
        [data.studentId, data.month, dueDate.toISOString().slice(0, 10), status]
      );

      await client.query('COMMIT');

      return {
        payment: {
          ...payment,
          items: toInsertItems
        },
        outstanding: outstandingTotal,
        collectionStatus: status
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get itemized payment history for a student
  async getPaymentHistory(studentId: string) {
    const result = await pool.query(
      `SELECT p.*, 
        COALESCE(json_agg(json_build_object('feeType', pi.fee_type, 'amount', pi.amount)) FILTER (WHERE pi.id IS NOT NULL), '[]') AS items
       FROM payments p
       LEFT JOIN payment_items pi ON pi.payment_id = p.id
       WHERE p.student_id = $1
       GROUP BY p.id
       ORDER BY p.date DESC, p.created_at DESC`,
      [studentId]
    );
    return result.rows;
  }

  // Get outstanding amounts per fee type for a student for a given month
  async getStudentOutstanding(studentId: string, month?: string) {
    const targetMonth = month || new Date().toISOString().slice(0, 7);

    // Fetch student fees
    const studentRes = await pool.query(
      `SELECT s.id, s.monthly_fee, s.bus_fee, s.penalty_fee, s.branch_id, u.name, u.parent_phone
       FROM students s JOIN users u ON s.user_id = u.id
       WHERE s.id = $1`,
      [studentId]
    );

    if (studentRes.rows.length === 0) throw new Error('Student not found');
    const student = studentRes.rows[0];

    // Fee types to report
    const feeTypes = [
      { key: 'monthly', label: 'Monthly Tuition', due: Number(student.monthly_fee || 0) },
      { key: 'registration', label: 'Registration Fee', due: 0 },
      { key: 'bus', label: 'Bus Fee', due: Number(student.bus_fee || 0) },
      { key: 'penalty', label: 'Penalty Fee', due: Number(student.penalty_fee || 0) }
    ];

    const registrationDue = await this.getRegistrationDueForMonth(pool, studentId, student.branch_id, targetMonth);
    feeTypes.find((f) => f.key === 'registration')!.due = registrationDue;

    const feesWithPaid: any[] = [];
    let totalDue = 0;
    let totalPaid = 0;

    for (const ft of feeTypes) {
      totalDue += Number(ft.due || 0);
      const paidRes = await pool.query(
        `SELECT COALESCE(SUM(pi.amount),0) as paid
         FROM payments p JOIN payment_items pi ON pi.payment_id = p.id
         WHERE p.student_id = $1 AND p.month = $2 AND pi.fee_type = $3`,
        [studentId, targetMonth, ft.key]
      );
      const paid = Number(paidRes.rows[0].paid || 0);
      totalPaid += paid;
      feesWithPaid.push({ feeType: ft.key, label: ft.label, due: Number(ft.due || 0), paid, remaining: Math.max(0, Number(ft.due || 0) - paid) });
    }

    // Also pull collection status
    const collRes = await pool.query(`SELECT status, due_date FROM student_collections WHERE student_id = $1 AND month = $2`, [studentId, targetMonth]);
    const collection = collRes.rows[0] || null;

    return {
      student: { id: student.id, name: student.name, parent_phone: student.parent_phone },
      month: targetMonth,
      fees: feesWithPaid,
      totalDue,
      totalPaid,
      totalRemaining: Math.max(0, totalDue - totalPaid),
      collection
    };
  }

  // Get students with fee information
  async getStudentsWithFees(branchId: string, search?: string, feeStatus?: string) {
    let query = `
      SELECT 
        s.id, s.grade, s.monthly_fee, s.bus_fee, s.penalty_fee,
        s.fee_status, s.fee_approval_status, s.fee_notes, s.requested_aid_amount,
        u.name, u.email, u.digital_id
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE s.branch_id = $1
    `;

    const params: any[] = [branchId];
    let paramCount = 1;

    if (feeStatus && feeStatus !== 'all') {
      paramCount++;
      query += ` AND s.fee_status::text = $${paramCount}`;
      params.push(feeStatus);
    }

    if (search && search.trim()) {
      paramCount++;
      const searchTerm = `%${search.trim()}%`;
      query += ` AND (u.name::text ILIKE $${paramCount} OR u.digital_id::text ILIKE $${paramCount})`;
      params.push(searchTerm);
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

  // Get the global registration fee assigned by super admin
  async getGlobalRegistrationFee(branchId: string): Promise<{ amount: number; source: string }> {
    const settingsResult = await pool.query(
      `SELECT key, value
       FROM finance_settings
       WHERE key IN ('student_registration_fee', 'registration_fee')
       ORDER BY CASE key WHEN 'student_registration_fee' THEN 1 ELSE 2 END
       LIMIT 1`
    );

    if (settingsResult.rows.length > 0) {
      const setting = settingsResult.rows[0];
      return {
        amount: Number(setting.value) || 0,
        source: setting.key
      };
    }

    const policyResult = await pool.query(
      `SELECT registration_fee
       FROM financial_policies
       WHERE branch_id = $1
       ORDER BY academic_year DESC, grade_level NULLS FIRST
       LIMIT 1`,
      [branchId]
    );

    return {
      amount: Number(policyResult.rows[0]?.registration_fee || 0),
      source: 'financial_policies.registration_fee'
    };
  }

  // Assign or change a student's transport route and fee
  // Fee is determined by the Super Admin's financial policy for the student's grade
  async assignTransportStudent(data: {
    branchId: string;
    studentId: string;
    driverId: string;
    transportFee: number; // Ignored; fetched from policy
    verifiedBy: string;
  }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const studentResult = await client.query(
        `SELECT s.id, s.grade, u.name
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

      // Fetch the Super Admin's financial policy fee for this student's grade
      const policyResult = await client.query(
        `SELECT bus_fee
         FROM financial_policies
         WHERE branch_id = $1
           AND (grade_level = $2 OR grade_level IS NULL)
         ORDER BY grade_level DESC NULLS LAST
         LIMIT 1`,
        [data.branchId, student.grade]
      );

      let policyFee = Number(policyResult.rows[0]?.bus_fee || 0);
      if (policyFee <= 0) {
        throw new Error('No valid transport fee policy configured for this student grade');
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
        [policyFee, data.studentId]
      );

      await client.query('COMMIT');

      return {
        studentId: data.studentId,
        studentName: student.name,
        routeId: routeResult.rows[0].id,
        routeName: routeResult.rows[0].name,
        driverName: driverResult.rows[0].name,
        transportFee: policyFee,
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

      // Check whether student has paid their transport fee for the current month.
      // If the student has outstanding transport payments (paid < transportFee), do not allow stop.
      const paidRes = await client.query(
        `SELECT COALESCE(SUM(amount),0) as total_paid
         FROM finance_transactions
         WHERE student_id = $1
           AND (type ILIKE '%transport%' OR type ILIKE '%bus%')
           AND EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM CURRENT_DATE)
           AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE)`,
        [data.studentId]
      );

      const paidThisMonth = Number(paidRes.rows[0]?.total_paid || 0);
      if (paidThisMonth < transportFee) {
        const err: any = new Error('Student has overdue transport payments; cannot stop transport until settled');
        err.code = 'TRANSPORT_OVERDUE';
        throw err;
      }

      const clampedDaysUsed = Math.min(30, Math.max(0, Number(data.daysUsed)));
      // Charge the student for the days used this month (prorated)
      const amountDue = Number(((clampedDaysUsed * transportFee) / 30).toFixed(2));

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
          'Transport Stop Charge',
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
    requestedAidAmount?: number;
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

    if (data.requestedAidAmount !== undefined) {
      paramCount++;
      fields.push(`requested_aid_amount = $${paramCount}`);
      values.push(data.requestedAidAmount);
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
    const month = new Date().toISOString().slice(0, 7);
    await this.syncCollectionStatusesForMonth(month, branchId);

    const result = await pool.query(
      `SELECT 
        s.id, s.grade, s.monthly_fee, s.bus_fee, s.penalty_fee,
        u.name, u.email, u.digital_id, s.parent_phone
      FROM student_collections sc
      JOIN students s ON s.id = sc.student_id
      JOIN users u ON s.user_id = u.id
      WHERE s.branch_id = $1 AND sc.month = $2 AND sc.status = 'overdue'
      ORDER BY u.name`,
      [branchId, month]
    );

    return result.rows;
  }

  async syncCollectionStatusesForMonth(month: string, branchId?: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const params: any[] = [];
      let where = '';
      if (branchId) {
        params.push(branchId);
        where = ` AND s.branch_id = $${params.length}`;
      }

      const studentsRes = await client.query(
        `SELECT s.id, s.monthly_fee, s.bus_fee, s.penalty_fee, s.branch_id
         FROM students s
         WHERE 1=1 ${where}`,
        params
      );

      for (const student of studentsRes.rows) {
        const outstandingTotal = await this.computeMonthlyOutstanding(client, student, student.branch_id, month);
        const dueDate = new Date(`${month}-10`);
        const now = new Date();
        let status = 'in_collections';
        if (outstandingTotal <= 0) status = 'cleared';
        else if (now > dueDate) status = 'overdue';

        await client.query(
          `INSERT INTO student_collections (student_id, month, due_date, status, updated_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (student_id, month)
           DO UPDATE SET status = EXCLUDED.status, due_date = EXCLUDED.due_date, updated_at = NOW()`,
          [student.id, month, dueDate.toISOString().slice(0, 10), status]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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

  // Reject an application and remove pending application record
  async rejectApplication(applicationId: string, financeUserId: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Ensure application exists and belongs to branch of finance user? For now just attempt delete
      const res = await client.query(
        `DELETE FROM pending_applications WHERE id = $1 RETURNING *`,
        [applicationId]
      );

      if (res.rows.length === 0) {
        throw new Error('Application not found');
      }

      await client.query('COMMIT');
      return res.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

export default new FinanceClerkService();

import pool from '../config/database';
import { hashPassword, generateRandomPassword } from '../utils/password';
import { sendWelcomeEmail } from '../utils/emailService';
import { todayEthiopic } from '../utils/ethiopicUtils';
import { syncSchoolCalendarForEvent } from './schoolAdmin.service';

// Roles that receive a welcome email on creation — must match user.service.ts
const EMAIL_ON_CREATE_ROLES = ['school-admin', 'vice-principal', 'auditor'];

class SuperAdminService {
  async getAnalytics(branchId?: string) {
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);

    const lastMonthStart = new Date(currentMonthStart);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

    const staffRoles = ['school-admin', 'vice-principal', 'teacher', 'finance-clerk', 'librarian', 'clinic-admin', 'driver', 'auditor'];
    const branchParams = branchId ? [branchId] : [];
    const branchWhere = branchId ? 'WHERE b.id = $1' : '';

    const branchLocationColumnResult = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'branches'
         AND column_name IN ('location', 'address')
       ORDER BY CASE column_name WHEN 'location' THEN 1 ELSE 2 END
       LIMIT 1`
    );
    const branchLocationColumn = branchLocationColumnResult.rows[0]?.column_name;
    const branchLocationSelect = branchLocationColumn ? `b.${branchLocationColumn}` : 'NULL';

    const branchesResult = await pool.query(
      `SELECT b.id, b.name, ${branchLocationSelect} AS location
       FROM branches b
       ${branchWhere}
       ORDER BY b.name`,
      branchParams
    );

    const studentsResult = await pool.query(
      `SELECT COUNT(*)::int AS total_students
       FROM students s
       ${branchId ? 'WHERE s.branch_id = $1' : ''}`,
      branchParams
    );

    const lastMonthStudentsResult = await pool.query(
      `SELECT COUNT(*)::int AS total_students
       FROM students s
       WHERE s.created_at < $1${branchId ? ' AND s.branch_id = $2' : ''}`,
      branchId ? [currentMonthStart, branchId] : [currentMonthStart]
    );

    // Fetch yearly collections: total amount collected in current Ethiopian Year (Pagume of Y-1 to Nehase of Y)
    const ethTodayForYear = todayEthiopic();
    const currentEthYearForYear = ethTodayForYear.year;

    const branchCollectedResult = await pool.query(
      `SELECT ft.branch_id, COALESCE(SUM(ft.amount), 0)::numeric AS collected
       FROM finance_transactions ft
       WHERE ((ft.ethiopic_year = $1 AND LOWER(ft.ethiopic_month) = 'pagume')
          OR (ft.ethiopic_year = $2 AND LOWER(ft.ethiopic_month) IN ('meskerem', 'tikimt', 'hidar', 'tahsas', 'tir', 'yekatit', 'megabit', 'miazia', 'ginbot', 'sene')))
         ${branchId ? 'AND ft.branch_id = $3' : ''}
       GROUP BY ft.branch_id`,
      branchId ? [currentEthYearForYear - 1, currentEthYearForYear, branchId] : [currentEthYearForYear - 1, currentEthYearForYear]
    );

    // Expected profit targets configured by super admin for the current year
    const currentYear = new Date().getFullYear();
    const profitTargetsRes = await pool.query(
      `SELECT branch_id, COALESCE(SUM(target_amount), 0)::numeric AS expected
       FROM monthly_profit_targets
       WHERE target_year = $1
       GROUP BY branch_id`,
      [currentYear]
    );
    const profitTargetsMap = new Map<string, number>();
    for (const row of profitTargetsRes.rows) {
      if (row.branch_id) {
        profitTargetsMap.set(row.branch_id, Number(row.expected));
      }
    }

    // Fallback expected targets: sum of monthly fees for active students * 10 (yearly billing estimate for 10 teaching months)
    const fallbackExpectedResult = await pool.query(
      `SELECT s.branch_id, COALESCE(SUM(COALESCE(s.monthly_fee, 0) + COALESCE(s.bus_fee, 0) + COALESCE(s.penalty_fee, 0)), 0)::numeric * 10 AS expected,
              COUNT(*)::int AS students
       FROM students s
       ${branchId ? 'WHERE s.branch_id = $1' : ''}
       GROUP BY s.branch_id`,
      branchParams
    );

    const fallbackMap = new Map<string, number>();
    const studentsMap = new Map<string, number>();
    for (const row of fallbackExpectedResult.rows) {
      fallbackMap.set(row.branch_id, Number(row.expected));
      studentsMap.set(row.branch_id, Number(row.students));
    }

    const studentAttendanceResult = await pool.query(
      `SELECT COUNT(DISTINCT s.id)::int AS total_students,
              COUNT(DISTINCT CASE WHEN sa.status = 'present' THEN sa.student_id END)::int AS present_students
       FROM students s
       LEFT JOIN student_attendance sa ON sa.student_id = s.id AND sa.date = $1
       ${branchId ? 'WHERE s.branch_id = $2' : ''}`,
      branchId ? [new Date().toISOString().slice(0, 10), branchId] : [new Date().toISOString().slice(0, 10)]
    );

    // Overdue payments using student_collections table and partial payment calculations
    const overdueResult = await pool.query(
      `SELECT COUNT(DISTINCT sc.student_id)::int AS overdue_count,
              COALESCE(SUM(
                GREATEST(0, (COALESCE(s.monthly_fee, 0) + COALESCE(s.bus_fee, 0) + COALESCE(s.penalty_fee, 0)) - COALESCE(p.paid_amount, 0))
              ), 0)::numeric AS overdue_amount
       FROM student_collections sc
       JOIN students s ON sc.student_id = s.id
       LEFT JOIN (
         SELECT p.student_id, p.month, COALESCE(SUM(pi.amount), 0) AS paid_amount
         FROM payments p
         JOIN payment_items pi ON pi.payment_id = p.id
         GROUP BY p.student_id, p.month
       ) p ON p.student_id = sc.student_id AND p.month = sc.month
       WHERE sc.status = 'overdue'
         AND ($1::UUID IS NULL OR s.branch_id = $1::UUID)`,
      [branchId || null]
    );

    const staffAttendanceResult = await pool.query(
      `SELECT COUNT(DISTINCT u.id)::int AS total_staff,
              COUNT(DISTINCT CASE WHEN ea.status = 'present' THEN ea.user_id END)::int AS present_staff
       FROM users u
       LEFT JOIN employee_attendance ea ON ea.user_id = u.id AND ea.date = $1
       WHERE u.role <> 'super-admin'
         AND u.role <> 'student'
         AND u.role <> 'parent'
         ${branchId ? 'AND u.branch_id = $2' : 'AND u.branch_id IS NOT NULL'}`,
      branchId ? [new Date().toISOString().slice(0, 10), branchId] : [new Date().toISOString().slice(0, 10)]
    );

    // Get current Ethiopian year
    const ethToday = todayEthiopic();
    const currentEthYear = ethToday.year;

    // Daily Pulse Section: Yearly total student collections received (all 12/13 months of current Ethiopian year)
    const studentCollectionsRes = await pool.query(
      `SELECT COALESCE(SUM(amount), 0)::numeric AS total
       FROM finance_transactions
       WHERE student_id IS NOT NULL
         AND ethiopic_year = $1
         AND ($2::UUID IS NULL OR branch_id = $2::UUID)`,
      [currentEthYear, branchId || null]
    );
    const yearlyStudentCollections = Number(studentCollectionsRes.rows[0]?.total || 0);

    // Daily Pulse Section: Yearly total staff payroll payments finalized (all 12/13 months of current Ethiopian year)
    const staffPaymentsRes = await pool.query(
      `SELECT COALESCE(SUM(pi.net_pay), 0)::numeric AS total
       FROM payroll_items pi
       JOIN payroll_runs pr ON pi.payroll_run_id = pr.id
       WHERE pr.year = $1
         AND pr.status = 'finalized'
         AND ($2::UUID IS NULL OR pr.branch_id = $2::UUID)`,
      [currentEthYear, branchId || null]
    );
    const yearlyStaffPayments = Number(staffPaymentsRes.rows[0]?.total || 0);

    const monthlyStudents = parseInt(studentsResult.rows[0]?.total_students || '0', 10);
    const previousMonthStudents = parseInt(lastMonthStudentsResult.rows[0]?.total_students || '0', 10);
    const studentAttendanceTotal = parseInt(studentAttendanceResult.rows[0]?.total_students || '0', 10);
    const studentAttendancePresent = parseInt(studentAttendanceResult.rows[0]?.present_students || '0', 10);
    const staffAttendanceTotal = parseInt(staffAttendanceResult.rows[0]?.total_staff || '0', 10);
    const staffAttendancePresent = parseInt(staffAttendanceResult.rows[0]?.present_staff || '0', 10);

    const branchMap = new Map<string, { collected: number; expected: number; students: number }>();
    for (const branch of branchesResult.rows) {
      const target = profitTargetsMap.get(branch.id) || fallbackMap.get(branch.id) || 0;
      branchMap.set(branch.id, {
        collected: 0,
        expected: target,
        students: studentsMap.get(branch.id) || 0
      });
    }

    for (const row of branchCollectedResult.rows) {
      const current = branchMap.get(row.branch_id) || { collected: 0, expected: 0, students: 0 };
      current.collected = Number(row.collected || 0);
      branchMap.set(row.branch_id, current);
    }

    const branchPerformance = branchesResult.rows.map((branch) => {
      const metrics = branchMap.get(branch.id) || { collected: 0, expected: 0, students: 0 };
      const percent = metrics.expected > 0 ? Math.round((metrics.collected / metrics.expected) * 100) : 0;

      return {
        id: branch.id,
        name: branch.name,
        location: branch.location,
        collected: metrics.collected,
        expected: metrics.expected,
        percent,
        students: metrics.students
      };
    });

    const branchSummary = branchId
      ? branchPerformance[0] || null
      : null;

    const feeCollected = branchId
      ? branchSummary?.collected || 0
      : branchPerformance.reduce((sum, item) => sum + item.collected, 0);

    const feeExpected = branchId
      ? branchSummary?.expected || 0
      : branchPerformance.reduce((sum, item) => sum + item.expected, 0);

    const overview = {
      feeCollected,
      feeExpected,
      feePercent: feeExpected > 0 ? Math.round((feeCollected / feeExpected) * 100) : 0,
      studentAttendance: studentAttendanceTotal > 0 ? Number(((studentAttendancePresent / studentAttendanceTotal) * 100).toFixed(1)) : 0,
      staffAttendance: staffAttendanceTotal > 0 ? Number(((staffAttendancePresent / staffAttendanceTotal) * 100).toFixed(1)) : 0,
      currentStudents: monthlyStudents,
      lastMonthStudents: previousMonthStudents,
      enrollmentGrowth: previousMonthStudents > 0
        ? Number((((monthlyStudents - previousMonthStudents) / previousMonthStudents) * 100).toFixed(1))
        : 0,
      yearlyStudentCollections,
      yearlyStaffPayments
    };

    // Attach overdue metrics
    (overview as any).overdueCount = overdueResult.rows[0]?.overdue_count || 0;
    (overview as any).overdueAmount = Number(overdueResult.rows[0]?.overdue_amount || 0);

    return {
      scope: branchId ? 'branch' : 'global',
      selectedBranch: branchSummary,
      overview,
      branchPerformance
    };
  }

  // Branch Management
  async createBranch(data: { name: string; code: string; logoUrl?: string; phone?: string; email?: string; address?: string }) {
    const result = await pool.query(
      `INSERT INTO branches (name, code, logo_url, phone, email, address)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.name, data.code, data.logoUrl || null, data.phone || null, data.email || null, data.address || null]
    );
    return result.rows[0];
  }

  async getBranches() {
    const result = await pool.query(`SELECT * FROM branches ORDER BY name`);
    return result.rows;
  }

  async getBranchById(id: string) {
    const result = await pool.query(`SELECT * FROM branches WHERE id = $1`, [id]);
    if (result.rows.length === 0) {
      throw new Error('Branch not found');
    }
    return result.rows[0];
  }

  async updateBranch(id: string, data: any) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (data.name) {
      fields.push(`name = $${paramIndex}`);
      values.push(data.name);
      paramIndex++;
    }
    if (data.code) {
      fields.push(`code = $${paramIndex}`);
      values.push(data.code);
      paramIndex++;
    }
    if (data.logoUrl !== undefined) {
      fields.push(`logo_url = $${paramIndex}`);
      values.push(data.logoUrl);
      paramIndex++;
    }
    if (data.phone !== undefined) {
      fields.push(`phone = $${paramIndex}`);
      values.push(data.phone);
      paramIndex++;
    }
    if (data.email !== undefined) {
      fields.push(`email = $${paramIndex}`);
      values.push(data.email);
      paramIndex++;
    }
    if (data.address !== undefined) {
      fields.push(`address = $${paramIndex}`);
      values.push(data.address);
      paramIndex++;
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE branches SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Branch not found');
    }
    return result.rows[0];
  }

  async deleteBranch(id: string) {
    // Verify branch exists
    const branchCheck = await pool.query(`SELECT id, name FROM branches WHERE id = $1`, [id]);
    if (branchCheck.rows.length === 0) {
      throw new Error('Branch not found');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete students in this branch first (students table may not cascade from branches)
      await client.query(`DELETE FROM students WHERE branch_id = $1`, [id]);

      // Delete all users in this branch (ON DELETE CASCADE handles their related records:
      // employee_attendance, employee_payroll_profiles, credential_logs, etc.)
      await client.query(`DELETE FROM users WHERE branch_id = $1`, [id]);

      // Delete other branch-level records that may not cascade
      await client.query(`DELETE FROM classes WHERE branch_id = $1`, [id]);
      await client.query(`DELETE FROM academic_years WHERE branch_id = $1`, [id]);
      await client.query(`DELETE FROM branch_grade_fees WHERE branch_id = $1`, [id]);
      await client.query(`DELETE FROM finance_transactions WHERE branch_id = $1`, [id]);
      await client.query(`DELETE FROM events WHERE branch_id = $1`, [id]);

      // Finally delete the branch itself
      await client.query(`DELETE FROM branches WHERE id = $1`, [id]);

      await client.query('COMMIT');
      return { message: `Branch "${branchCheck.rows[0].name}" deleted successfully` };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ─── User Management ──────────────────────────────────────────────────────

  async createUser(data: {
    name: string;
    email: string;
    role: string;
    branchId?: string;
    phone?: string;
    profileImage?: string;
  }) {
    // 1. Check if email is already taken
    const existing = await pool.query(
      `SELECT id FROM users WHERE email = $1`,
      [data.email]
    );
    if (existing.rows.length > 0) {
      throw new Error('A user with this email already exists');
    }

    // 2. Generate plain-text password (for email) and hash it for DB storage
    const plainPassword = generateRandomPassword();
    const hashedPassword = await hashPassword(plainPassword);

    // 3. Generate a unique digital ID  e.g. USR-20260527-48291
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const randomPart = Math.floor(10000 + Math.random() * 90000);
    const digitalId = `USR-${dateStr}-${randomPart}`;

    // 4. Insert the new user into the database
    const result = await pool.query(
      `INSERT INTO users (digital_id, name, email, password_hash, role, branch_id, phone, profile_image, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Active')
       RETURNING id, digital_id, name, email, role, branch_id, phone, profile_image, status, created_at`,
      [
        digitalId,
        data.name,
        data.email,
        hashedPassword,
        data.role,
        data.branchId || null,
        data.phone || null,
        data.profileImage || null,
      ]
    );

    const newUser = result.rows[0];

    // 5. Send welcome email — only for roles that warrant email delivery (non-blocking)
    if (EMAIL_ON_CREATE_ROLES.includes(data.role)) {
      sendWelcomeEmail(data.name, data.email, plainPassword, data.role).catch((err) => {
        console.error(`[createUser] Welcome email failed for ${data.email}:`, err);
      });
    }

    // 6. Return the new user — password is never included in the response
    return newUser;
  }

  // ─── System-wide Reports ──────────────────────────────────────────────────

  async getSystemReport() {
    const branchesResult = await pool.query(`SELECT COUNT(*) as count FROM branches`);

    const usersResult = await pool.query(`
      SELECT role, COUNT(*) as count
      FROM users
      GROUP BY role
    `);

    const studentsResult = await pool.query(`SELECT COUNT(*) as count FROM students`);

    const paymentsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_transactions,
        SUM(amount) as total_collected
      FROM finance_transactions
    `);

    const monthlyPaymentsResult = await pool.query(`
      SELECT 
        COUNT(*) as count,
        SUM(amount) as total
      FROM finance_transactions
      WHERE date >= DATE_TRUNC('month', CURRENT_DATE)
    `);

    // Teacher attendance rate using latest recorded date
    const teacherAttendanceResult = await pool.query(`
      WITH latest_date AS (
        SELECT MAX(ea.date) as d
        FROM employee_attendance ea
        JOIN users u ON ea.user_id = u.id
        WHERE u.role = 'teacher'
      ),
      totals AS (
        SELECT COUNT(*)::numeric as total FROM users WHERE role = 'teacher'
      ),
      present AS (
        SELECT COUNT(DISTINCT ea.user_id)::numeric as cnt
        FROM employee_attendance ea
        JOIN users u ON ea.user_id = u.id
        CROSS JOIN latest_date ld
        WHERE u.role = 'teacher' AND ea.date = ld.d AND LOWER(ea.status) = 'present'
      )
      SELECT
        CASE WHEN (SELECT total FROM totals) = 0 OR (SELECT d FROM latest_date) IS NULL THEN 0
        ELSE ROUND(((SELECT cnt FROM present) / (SELECT total FROM totals)) * 100, 1)
        END as rate
    `);

    // Student attendance rate using latest recorded date
    const studentAttendanceResult = await pool.query(`
      WITH latest_date AS (
        SELECT MAX(date) as d FROM student_attendance
      ),
      totals AS (
        SELECT COUNT(*)::numeric as total FROM students
      ),
      present AS (
        SELECT COUNT(DISTINCT sa.student_id)::numeric as cnt
        FROM student_attendance sa
        CROSS JOIN latest_date ld
        WHERE sa.date = ld.d AND LOWER(sa.status::text) = 'present'
      )
      SELECT
        CASE WHEN (SELECT total FROM totals) = 0 OR (SELECT d FROM latest_date) IS NULL THEN 0
        ELSE ROUND(((SELECT cnt FROM present) / (SELECT total FROM totals)) * 100, 1)
        END as rate
    `);

    return {
      totalBranches: parseInt(branchesResult.rows[0].count),
      usersByRole: usersResult.rows,
      totalStudents: parseInt(studentsResult.rows[0].count),
      allTimePayments: paymentsResult.rows[0],
      monthlyPayments: monthlyPaymentsResult.rows[0],
      teacherAttendanceRate: parseFloat(teacherAttendanceResult.rows[0]?.rate ?? '0'),
      studentAttendanceRate: parseFloat(studentAttendanceResult.rows[0]?.rate ?? '0'),
    };
  }

  async getBranchReport(branchId: string) {
    const branchResult = await pool.query(`SELECT * FROM branches WHERE id = $1`, [branchId]);
    if (branchResult.rows.length === 0) {
      throw new Error('Branch not found');
    }

    const usersResult = await pool.query(`
      SELECT role, COUNT(*) as count
      FROM users
      WHERE branch_id = $1
      GROUP BY role
    `, [branchId]);

    const studentsResult = await pool.query(`SELECT COUNT(*) as count FROM students WHERE branch_id = $1`, [branchId]);

    const paymentsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(amount), 0) as total_collected
      FROM finance_transactions
      WHERE branch_id = $1
    `, [branchId]);

    // Teacher count for branch
    const teacherCountResult = await pool.query(
      `SELECT COUNT(*)::int as count FROM users WHERE branch_id = $1 AND role = 'teacher'`,
      [branchId]
    );

    // Teacher attendance rate for this branch (latest recorded date)
    const teacherAttendanceResult = await pool.query(`
      WITH latest_date AS (
        SELECT MAX(ea.date) as d
        FROM employee_attendance ea
        JOIN users u ON ea.user_id = u.id
        WHERE u.role = 'teacher' AND u.branch_id = $1
      ),
      totals AS (
        SELECT COUNT(*)::numeric as total FROM users WHERE role = 'teacher' AND branch_id = $1
      ),
      present AS (
        SELECT COUNT(DISTINCT ea.user_id)::numeric as cnt
        FROM employee_attendance ea
        JOIN users u ON ea.user_id = u.id
        CROSS JOIN latest_date ld
        WHERE u.role = 'teacher' AND u.branch_id = $1
          AND ea.date = ld.d AND LOWER(ea.status) = 'present'
      )
      SELECT
        CASE WHEN (SELECT total FROM totals) = 0 OR (SELECT d FROM latest_date) IS NULL THEN 0
        ELSE ROUND(((SELECT cnt FROM present) / (SELECT total FROM totals)) * 100, 1)
        END as rate
    `, [branchId]);

    // Financial health: yearly target vs yearly collection
    const financialHealthResult = await pool.query(`
      WITH target_year AS (
        SELECT COALESCE(MAX(target_year), EXTRACT(YEAR FROM CURRENT_DATE)::int) as yr
        FROM monthly_profit_targets WHERE branch_id = $1
      ),
      yearly_target AS (
        SELECT COALESCE(SUM(target_amount), 0)::numeric as total
        FROM monthly_profit_targets
        WHERE branch_id = $1 AND target_year = (SELECT yr FROM target_year)
      ),
      yearly_collection AS (
        SELECT COALESCE(SUM(amount), 0)::numeric as total
        FROM finance_transactions
        WHERE branch_id = $1
          AND EXTRACT(YEAR FROM date)::int = (SELECT yr FROM target_year)
      )
      SELECT
        (SELECT total FROM yearly_target) as yearly_target,
        (SELECT total FROM yearly_collection) as yearly_collection,
        CASE WHEN (SELECT total FROM yearly_target) = 0 THEN 100
        ELSE ROUND(((SELECT total FROM yearly_collection) / (SELECT total FROM yearly_target)) * 100, 1)
        END as health_pct,
        (SELECT yr FROM target_year) as target_year
    `, [branchId]);

    const fh = financialHealthResult.rows[0];
    const yearlyTarget = parseFloat(fh.yearly_target ?? '0');
    const yearlyCollection = parseFloat(fh.yearly_collection ?? '0');
    const financialHealthPct = parseFloat(fh.health_pct ?? '100');
    const totalTeachers = teacherCountResult.rows[0].count;
    const attendanceRate = parseFloat(teacherAttendanceResult.rows[0]?.rate ?? '0');

    return {
      branchId,
      branchName: branchResult.rows[0].name,
      branch: branchResult.rows[0],
      usersByRole: usersResult.rows,
      totalStudents: parseInt(studentsResult.rows[0].count),
      totalTeachers,
      totalStaff: usersResult.rows.reduce((sum: number, r: any) => sum + parseInt(r.count), 0),
      revenue: yearlyCollection,
      expenses: 0,
      netProfit: yearlyCollection - yearlyTarget,
      yearlyTarget,
      yearlyCollection,
      financialHealthPct,
      attendanceRate,
      payments: paymentsResult.rows[0],
      isHighRisk: financialHealthPct < 70,
    };
  }

  // ─── Academic Year Management (Global) ───────────────────────────────────

  async createGlobalAcademicYear(data: { yearName: string; startDate: string; endDate: string }) {
    const result = await pool.query(
      `INSERT INTO academic_years (year_name, start_date, end_date, is_active)
       VALUES ($1, $2, $3, false)
       RETURNING *`,
      [data.yearName, data.startDate, data.endDate]
    );
    return result.rows[0];
  }

  async activateGlobalAcademicYear(yearId: string) {
    await pool.query(`UPDATE academic_years SET is_active = false WHERE is_active = true`);

    const result = await pool.query(
      `UPDATE academic_years SET is_active = true WHERE id = $1 RETURNING *`,
      [yearId]
    );

    if (result.rows.length === 0) {
      throw new Error('Academic year not found');
    }
    return result.rows[0];
  }

  async getGlobalAcademicYears() {
    const result = await pool.query(`SELECT * FROM academic_years ORDER BY start_date DESC`);
    return result.rows;
  }

  // ─── Class Capacity ───────────────────────────────────────────────────────

  async setClassCapacity(classId: string, capacity: number) {
    const result = await pool.query(
      `UPDATE classes SET capacity = $1 WHERE id = $2 RETURNING *`,
      [capacity, classId]
    );

    if (result.rows.length === 0) {
      throw new Error('Class not found');
    }
    return result.rows[0];
  }

  // ─── Dashboard ────────────────────────────────────────────────────────────

  async getDashboard() {
    const systemReport = await this.getSystemReport();

    const recentUsersResult = await pool.query(`
      SELECT id, digital_id, name, email, role, status, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `);

    // Full pending breakdown
    const pendingStudentsResult = await pool.query(`
      SELECT COUNT(*)::int as count FROM users
      WHERE role = 'student' AND status = 'Pending'
    `);
    const pendingStaffResult = await pool.query(`
      SELECT COUNT(*)::int as count FROM users
      WHERE role NOT IN ('student', 'parent', 'super-admin') AND status = 'Pending'
    `);
    const pendingFeeResult = await pool.query(`
      SELECT COUNT(*)::int as count FROM students WHERE fee_approval_status = 'pending'
    `);
    const pendingLoansResult = await pool.query(`
      SELECT COUNT(*)::int as count FROM loans WHERE status = 'pending'
    `);

    const pendingStudents = pendingStudentsResult.rows[0].count;
    const pendingStaff = pendingStaffResult.rows[0].count;
    const pendingFeeApprovals = pendingFeeResult.rows[0].count;
    const pendingLoans = pendingLoansResult.rows[0].count;
    const pendingApprovalsTotal = pendingStudents + pendingStaff + pendingFeeApprovals + pendingLoans;

    return {
      ...systemReport,
      recentUsers: recentUsersResult.rows,
      pendingUsers: pendingApprovalsTotal,
      pendingApprovalsTotal,
      pendingStudents,
      pendingStaff,
      pendingFeeApprovals,
      pendingLoans,
    };
  }

  // ─── System Settings (branding, contact, global flags) ─────────────────

  private static readonly SYSTEM_SETTING_KEYS = [
    'school_name_oromic', 'school_name_amharic', 'school_name_english',
    'school_motto_oromic', 'school_motto_amharic', 'school_motto_english',
    'system_email', 'phone', 'address',
    'grades_locked', 'registration_open', 'active_academic_year_id',
  ] as const;

  private static readonly PUBLIC_SETTING_KEYS = [
    'school_name_oromic', 'school_name_amharic', 'school_name_english',
    'school_motto_oromic', 'school_motto_amharic', 'school_motto_english',
    'system_email', 'phone', 'address',
    'grades_locked', 'registration_open',
  ] as const;

  async getSystemSettings(): Promise<Record<string, string>> {
    const result = await pool.query(`SELECT key, value FROM system_settings ORDER BY key`);
    const settings: Record<string, string> = {};
    for (const row of result.rows) {
      settings[row.key] = row.value;
    }
    return settings;
  }

  async getPublicSystemSettings(): Promise<Record<string, string>> {
    const result = await pool.query(
      `SELECT key, value FROM system_settings WHERE key = ANY($1)`,
      [SuperAdminService.PUBLIC_SETTING_KEYS]
    );
    const settings: Record<string, string> = {};
    for (const row of result.rows) {
      settings[row.key] = row.value;
    }
    return settings;
  }

  async updateSystemSettings(
    data: Record<string, string>,
    userId: string
  ): Promise<Record<string, string>> {
    for (const key of SuperAdminService.SYSTEM_SETTING_KEYS) {
      const value = data[key];
      if (value === undefined || value === null) continue;

      await pool.query(
        `INSERT INTO system_settings (key, value, updated_by, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (key) DO UPDATE
         SET value = $2, updated_by = $3, updated_at = NOW()`,
        [key, String(value), userId]
      );
    }
    return this.getSystemSettings();
  }

  async isRegistrationOpen(): Promise<boolean> {
    const result = await pool.query(
      `SELECT value FROM system_settings WHERE key = 'registration_open'`
    );
    if (result.rows.length === 0) return true;
    return result.rows[0].value !== 'false';
  }

  async isGradesGloballyLocked(): Promise<boolean> {
    const result = await pool.query(
      `SELECT value FROM system_settings WHERE key = 'grades_locked'`
    );
    if (result.rows.length === 0) return false;
    return result.rows[0].value === 'true';
  }

  // ─── Branch fee structure ───────────────────────────────────────────────

  async getBranchGradeFees(branchId?: string) {
    const params: Array<string> = [];
    const branchFilter = branchId ? `WHERE f.branch_id = $1` : '';
    if (branchId) params.push(branchId);

    const result = await pool.query(
      `SELECT f.*, b.name AS branch_name
       FROM branch_grade_fees f
       JOIN branches b ON b.id = f.branch_id
       ${branchFilter}
       ORDER BY b.name, f.grade_level`,
      params
    );
    return result.rows;
  }

  async upsertBranchGradeFee(
    data: {
      branchId: string;
      gradeLevel: string;
      monthlyFee: number;
      registrationFee: number;
      busFee: number;
    },
    userId: string
  ) {
    const result = await pool.query(
      `INSERT INTO branch_grade_fees (branch_id, grade_level, monthly_fee, registration_fee, bus_fee, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (branch_id, grade_level) DO UPDATE
       SET monthly_fee = EXCLUDED.monthly_fee,
           registration_fee = EXCLUDED.registration_fee,
           bus_fee = EXCLUDED.bus_fee,
           updated_by = EXCLUDED.updated_by,
           updated_at = NOW()
       RETURNING *`,
      [
        data.branchId,
        data.gradeLevel,
        data.monthlyFee,
        data.registrationFee,
        data.busFee,
        userId,
      ]
    );
    return result.rows[0];
  }

  async deleteBranchGradeFee(id: string) {
    const result = await pool.query(
      `DELETE FROM branch_grade_fees WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rows.length === 0) {
      const err: any = new Error('Fee configuration not found. It may have already been deleted.');
      err.statusCode = 404;
      throw err;
    }
    return { id };
  }

  // ─── Monthly profit targets (per branch) ─────────────────────────────────

  private static readonly ETHIOPIAN_TO_GREGORIAN_MONTH: Record<number, number> = {
    1: 9, 2: 10, 3: 11, 4: 12, 5: 1, 6: 2, 7: 3, 8: 4, 9: 5, 10: 6, 11: 7, 12: 8, 13: 9,
  };

  private static readonly GREGORIAN_MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  private resolveEthiopianGregorianPeriod(ethiopianMonth: number, targetYear: number) {
    const gregMonth = SuperAdminService.ETHIOPIAN_TO_GREGORIAN_MONTH[ethiopianMonth] ?? 1;
    // targetYear is the current Gregorian year (e.g. 2026).
    // Ethiopian months 1-4 (Meskerem–Tahsas = Sep–Dec) fall in the *previous* Gregorian year.
    // Ethiopian months 5-13 (Tir–Pagume = Jan–Sep) fall in the *current* Gregorian year.
    const gregYear = ethiopianMonth <= 4 ? targetYear - 1 : targetYear;
    const monthName = SuperAdminService.GREGORIAN_MONTH_NAMES[gregMonth - 1] ?? 'January';
    return { gregMonth, gregYear, monthName };
  }

  private async getBranchPeriodFinancials(
    branchId: string,
    ethiopianMonth: number,
    targetYear: number
  ) {
    const { gregMonth, gregYear, monthName } = this.resolveEthiopianGregorianPeriod(
      ethiopianMonth,
      targetYear
    );

    // ── Student Income ─────────────────────────────────────────────────────────
    // Sum all finance_transactions (fees, registration, bus, penalties) for the period
    const studentResult = await pool.query(
      `SELECT
         COALESCE(SUM(ft.amount), 0) AS ft_total,
         COUNT(ft.id)::int AS ft_count,
         COALESCE((
           SELECT SUM(p.total_amount)
           FROM payments p
           WHERE p.branch_id = $1
             AND EXTRACT(MONTH FROM COALESCE(p.date, p.created_at::date)) = $2
             AND EXTRACT(YEAR FROM COALESCE(p.date, p.created_at::date)) = $3
         ), 0) AS payments_total
       FROM finance_transactions ft
       WHERE ft.branch_id = $1
         AND EXTRACT(MONTH FROM ft.date) = $2
         AND EXTRACT(YEAR FROM ft.date) = $3`,
      [branchId, gregMonth, gregYear]
    );

    const ftTotal = Number(studentResult.rows[0]?.ft_total ?? 0);
    const paymentsTotal = Number(studentResult.rows[0]?.payments_total ?? 0);
    const studentIncome = ftTotal > 0 ? ftTotal : paymentsTotal;
    const txCount = Number(studentResult.rows[0]?.ft_count ?? 0);

    // ── Staff Payout ───────────────────────────────────────────────────────────
    // Primary: use finalized or exported payroll runs (includes net_pay + employer pension)
    const payrollResult = await pool.query(
      `SELECT
         COALESCE(SUM(total_net), 0) AS total_net,
         COALESCE(SUM(total_pension_employer), 0) AS total_pension_employer,
         MAX(status) AS run_status
       FROM payroll_runs
       WHERE branch_id = $1
         AND year = $2
         AND month = $3
         AND status IN ('finalized', 'exported', 'draft')`,
      [branchId, gregYear, monthName]
    );

    let staffPayout = 0;
    let payrollStatus = payrollResult.rows[0]?.run_status ?? null;
    let isProjected = false;

    const payrollNet = Number(payrollResult.rows[0]?.total_net ?? 0);
    const payrollPension = Number(payrollResult.rows[0]?.total_pension_employer ?? 0);

    if (payrollNet > 0 || payrollStatus != null) {
      // Finalized payroll exists — use real data
      staffPayout = payrollNet + payrollPension;
    } else {
      // No payroll run yet — project from employee_payroll_profiles for ALL staff
      // Gross cost to school = (basic + transport + housing + position) + employer_pension (11% of basic)
      const profileResult = await pool.query(
        `SELECT
           COALESCE(SUM(
             epp.basic_salary
             + COALESCE(epp.transport_allowance, 0)
             + COALESCE(epp.housing_allowance, 0)
             + COALESCE(epp.position_allowance, 0)
             + (epp.basic_salary * 0.11)
           ), 0)::numeric AS projected_payout
         FROM employee_payroll_profiles epp
         JOIN users u ON u.id = epp.user_id
         WHERE u.branch_id = $1
           AND u.status = 'Approved'
           AND u.role NOT IN ('student', 'parent', 'super-admin')`,
        [branchId]
      );
      staffPayout = Number(profileResult.rows[0]?.projected_payout ?? 0);
      isProjected = true;
    }

    // Suggested Target = Student Income + Staff Payout (total monthly school financial obligation)
    const suggestedTarget = studentIncome + staffPayout;

    return {
      gregMonth,
      gregYear,
      monthName,
      student_income: studentIncome,
      student_transaction_count: txCount,
      staff_payout: staffPayout,
      payroll_status: payrollStatus,
      staff_payout_is_projected: isProjected,
      suggested_target: suggestedTarget,
      actual_net_profit: studentIncome - staffPayout,
    };
  }


  async getBranchProfitSummary(
    branchId: string,
    ethiopianMonth: number,
    year?: number
  ) {
    const targetYear = year ?? new Date().getFullYear();
    const branchResult = await pool.query(`SELECT id, name FROM branches WHERE id = $1`, [branchId]);
    if (branchResult.rows.length === 0) {
      throw new Error('Branch not found');
    }

    const finances = await this.getBranchPeriodFinancials(branchId, ethiopianMonth, targetYear);

    const targetResult = await pool.query(
      `SELECT * FROM monthly_profit_targets
       WHERE branch_id = $1 AND ethiopian_month = $2 AND target_year = $3`,
      [branchId, ethiopianMonth, targetYear]
    );

    return {
      branch_id: branchId,
      branch_name: branchResult.rows[0].name,
      ethiopian_month: ethiopianMonth,
      target_year: targetYear,
      ...finances,
      saved_target: targetResult.rows[0]
        ? Number(targetResult.rows[0].target_amount)
        : null,
    };
  }

  async getMonthlyProfitTargets(branchId?: string, year?: number) {
    const targetYear = year ?? new Date().getFullYear();
    const params: Array<string | number> = [targetYear];
    let branchFilter = '';
    if (branchId) {
      branchFilter = ' AND t.branch_id = $2';
      params.push(branchId);
    }

    const targetsResult = await pool.query(
      `SELECT t.*, b.name AS branch_name
       FROM monthly_profit_targets t
       LEFT JOIN branches b ON b.id = t.branch_id
       WHERE t.target_year = $1
         AND t.branch_id IS NOT NULL
         ${branchFilter}
       ORDER BY b.name, t.ethiopian_month`,
      params
    );

    const rows = [];
    for (const row of targetsResult.rows) {
      if (!row.branch_id) continue;
      const finances = await this.getBranchPeriodFinancials(
        row.branch_id,
        row.ethiopian_month,
        targetYear
      );
      rows.push({
        ...row,
        branch_name: row.branch_name,
        student_income: finances.student_income,
        staff_payout: finances.staff_payout,
        actual_net_profit: finances.actual_net_profit,
        actual_amount: finances.actual_net_profit,
      });
    }
    return rows;
  }

  async upsertMonthlyProfitTarget(
    branchId: string,
    ethiopianMonth: number,
    targetAmount: number,
    userId: string,
    year?: number
  ) {
    const targetYear = year ?? new Date().getFullYear();
    const result = await pool.query(
      `INSERT INTO monthly_profit_targets (branch_id, ethiopian_month, target_year, target_amount, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (branch_id, ethiopian_month, target_year)
       DO UPDATE
       SET target_amount = EXCLUDED.target_amount,
           updated_by = EXCLUDED.updated_by,
           updated_at = NOW()
       RETURNING *`,
      [branchId, ethiopianMonth, targetYear, targetAmount, userId]
    );
    return result.rows[0];
  }

  // ─── SMTP / Email Settings Management (email_config table) ──────────────

  async getSmtpSettings() {
    const SMTP_KEYS = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_from'];
    const result = await pool.query(
      `SELECT key, value, updated_by, updated_at FROM email_config WHERE key = ANY($1) ORDER BY key`,
      [SMTP_KEYS]
    );

    const settings: Record<string, string> = {
      smtp_host: process.env.SMTP_HOST || 'smtp.gmail.com',
      smtp_port: process.env.SMTP_PORT || '587',
      smtp_user: process.env.SMTP_USER || 'abdiadamaschooloffice@gmail.com',
      smtp_from: process.env.SMTP_FROM || 'abdiadamaschooloffice@gmail.com',
    };
    for (const row of result.rows) {
      settings[row.key] = row.value;
    }
    return settings;
  }

  async updateSmtpSettings(
    data: {
      smtp_host?: string;
      smtp_port?: string;
      smtp_user?: string;
      smtp_pass?: string;
      smtp_from?: string;
    },
    userId: string,
    userName: string
  ) {
    const ALLOWED_KEYS = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from'];
    const updated: string[] = [];

    for (const key of ALLOWED_KEYS) {
      const value = (data as Record<string, string | undefined>)[key];
      if (value === undefined || value === null) continue;

      const currentResult = await pool.query(
        `SELECT value FROM email_config WHERE key = $1`,
        [key]
      );
      const oldValue = currentResult.rows[0]?.value ?? null;

      await pool.query(
        `INSERT INTO email_config (key, value, updated_by, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (key) DO UPDATE
         SET value = $2, updated_by = $3, updated_at = NOW()`,
        [key, value, userId]
      );

      const auditValue = key === 'smtp_pass' ? '••••••••' : value;
      const auditOld = key === 'smtp_pass' ? '••••••••' : oldValue;
      await pool.query(
        `INSERT INTO email_config_audit (config_key, old_value, new_value, changed_by, changed_by_name)
         VALUES ($1, $2, $3, $4, $5)`,
        [key, auditOld, auditValue, userId, userName]
      );

      const envKey = key === 'smtp_from' ? 'SMTP_FROM' : key.toUpperCase();
      process.env[envKey] = value;

      updated.push(key);
    }

    const emailService = require('../utils/emailService');
    if (typeof emailService.resetTransporter === 'function') {
      emailService.resetTransporter();
    }

    return { updated };
  }

  async testSmtpSettings(toEmail: string): Promise<{ success: boolean; message: string }> {
    const { sendEmail } = require('../utils/emailService');
    const sent = await sendEmail(
      toEmail,
      'SMTP Test – Abdi Adama School IMS',
      `<div style="font-family:Arial,sans-serif;padding:20px;max-width:500px;margin:auto;border:1px solid #e2e8f0;border-radius:8px;">
        <h2 style="color:#4f46e5;">✅ SMTP Configuration Test</h2>
        <p>This is a test email sent from the <strong>Abdi Adama School IMS</strong> Super Admin panel.</p>
        <p>If you received this, your SMTP settings are configured correctly.</p>
        <p style="font-size:12px;color:#64748b;margin-top:20px;">Sent at: ${new Date().toISOString()}</p>
      </div>`
    );
    if (sent) {
      return { success: true, message: `Test email sent successfully to ${toEmail}` };
    }
    return { success: false, message: 'Failed to send test email. Check your SMTP credentials and try again.' };
  }

  // ─── Finance Settings Management ─────────────────────────────────────────

  async getFinanceSettings() {
    const result = await pool.query(`SELECT * FROM finance_settings ORDER BY key`);
    return result.rows;
  }

  async updateFinanceSetting(key: string, value: number, userId: string, userName: string) {
    // 1. Get old value
    const currentResult = await pool.query(`SELECT value FROM finance_settings WHERE key = $1`, [key]);
    const oldValue = currentResult.rows.length > 0 ? Number(currentResult.rows[0].value) : null;

    // 2. Upsert the setting
    const result = await pool.query(
      `INSERT INTO finance_settings (key, value, updated_by, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (key) DO UPDATE
       SET value = $2, updated_by = $3, updated_at = NOW()
       RETURNING *`,
      [key, value, userId]
    );

    // 3. Create audit log entry
    await pool.query(
      `INSERT INTO finance_settings_audit (setting_key, old_value, new_value, changed_by, changed_by_name)
       VALUES ($1, $2, $3, $4, $5)`,
      [key, oldValue, value, userId, userName]
    );

    return result.rows[0];
  }

  async getFinanceSettingsAuditLog() {
    const result = await pool.query(
      `SELECT a.*, u.name as changed_by_username
       FROM finance_settings_audit a
       LEFT JOIN users u ON a.changed_by = u.id
       ORDER BY a.changed_at DESC`
    );
    return result.rows;
  }

  // ─── Event Management ─────────────────────────────────────────────────────

  async getEvents(branchId: string | null) {
    let query = `
      SELECT id, title, date, type, description, branch_id, created_at
      FROM events
    `;
    const params: any[] = [];
    if (branchId) {
      query += ` WHERE (branch_id = $1 OR branch_id IS NULL)`;
      params.push(branchId);
    }
    query += ` ORDER BY date ASC, created_at ASC`;
    const result = await pool.query(query, params);
    return result.rows;
  }

  async createEvent(data: { title: string; date: string; endDate?: string; type: string; description?: string; branchId: string | null }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `INSERT INTO events (title, date, end_date, type, description, branch_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [data.title, data.date, data.endDate || data.date, data.type, data.description || null, data.branchId]
      );
      const newEvent = result.rows[0];
      await syncSchoolCalendarForEvent(client, newEvent);
      await client.query('COMMIT');
      return newEvent;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async updateEvent(id: string, data: { title?: string; date?: string; endDate?: string; type?: string; description?: string; branchId?: string | null }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const fields: string[] = [];
      const values: any[] = [];
      let p = 0;
      if (data.title !== undefined) { p++; fields.push(`title = $${p}`); values.push(data.title); }
      if (data.date !== undefined) { p++; fields.push(`date = $${p}`); values.push(data.date); }
      if (data.endDate !== undefined) { p++; fields.push(`end_date = $${p}`); values.push(data.endDate); }
      if (data.type !== undefined) { p++; fields.push(`type = $${p}`); values.push(data.type); }
      if (data.description !== undefined) { p++; fields.push(`description = $${p}`); values.push(data.description); }
      if (data.branchId !== undefined) { p++; fields.push(`branch_id = $${p}`); values.push(data.branchId); }
      if (fields.length === 0) throw new Error('No fields to update');
      p++;
      values.push(id);
      const result = await client.query(
        `UPDATE events SET ${fields.join(', ')} WHERE id = $${p} RETURNING *`,
        values
      );
      if (result.rows.length === 0) throw new Error('Event not found');
      const updatedEvent = result.rows[0];
      await syncSchoolCalendarForEvent(client, updatedEvent);
      await client.query('COMMIT');
      return updatedEvent;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async deleteEvent(id: string) {
    const result = await pool.query('DELETE FROM events WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) throw new Error('Event not found');
    return result.rows[0];
  }
}

export default new SuperAdminService();
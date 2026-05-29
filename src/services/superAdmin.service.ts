import pool from '../config/database';
import { hashPassword, generateRandomPassword } from '../utils/password';
import { sendWelcomeEmail } from '../utils/emailService';

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

    const branchCollectedResult = await pool.query(
      `SELECT ft.branch_id, COALESCE(SUM(ft.amount), 0)::numeric AS collected
       FROM finance_transactions ft
       WHERE ft.date >= $1${branchId ? ' AND ft.branch_id = $2' : ''}
       GROUP BY ft.branch_id`,
      branchId ? [currentMonthStart.toISOString().slice(0, 10), branchId] : [currentMonthStart.toISOString().slice(0, 10)]
    );

    const expectedResult = await pool.query(
      `SELECT s.branch_id, COALESCE(SUM(COALESCE(s.monthly_fee, 0) + COALESCE(s.bus_fee, 0) + COALESCE(s.penalty_fee, 0)), 0)::numeric AS expected,
              COUNT(*)::int AS students
       FROM students s
       ${branchId ? 'WHERE s.branch_id = $1' : ''}
       GROUP BY s.branch_id`,
      branchParams
    );

    const studentAttendanceResult = await pool.query(
      `SELECT COUNT(DISTINCT s.id)::int AS total_students,
              COUNT(DISTINCT CASE WHEN sa.status = 'present' THEN sa.student_id END)::int AS present_students
       FROM students s
       LEFT JOIN student_attendance sa ON sa.student_id = s.id AND sa.date = $1
       ${branchId ? 'WHERE s.branch_id = $2' : ''}`,
      branchId ? [new Date().toISOString().slice(0, 10), branchId] : [new Date().toISOString().slice(0, 10)]
    );

    // Overdue payments (students with outstanding balance and last payment > 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const overdueParams = branchId ? [branchId, thirtyDaysAgo.toISOString().slice(0, 10)] : [thirtyDaysAgo.toISOString().slice(0, 10)];
    const overdueWhereBranch = branchId ? 'AND s.branch_id = $1' : '';

    const overdueResult = await pool.query(
      `SELECT COUNT(*)::int AS overdue_count,
              COALESCE(SUM((s.monthly_fee + s.bus_fee + s.penalty_fee) - COALESCE(p.total_paid,0)), 0)::numeric AS overdue_amount
       FROM students s
       LEFT JOIN (
         SELECT student_id, COALESCE(SUM(amount),0) AS total_paid, MAX(date) AS last_payment
         FROM finance_transactions ft
         ${branchId ? 'WHERE ft.branch_id = $1' : ''}
         GROUP BY student_id
       ) p ON p.student_id = s.id
       WHERE ((s.monthly_fee + s.bus_fee + s.penalty_fee) - COALESCE(p.total_paid,0)) > 0
         AND COALESCE(p.last_payment, s.created_at) < $${branchId ? 2 : 1}`,
      overdueParams
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

    const monthlyStudents = parseInt(studentsResult.rows[0]?.total_students || '0', 10);
    const previousMonthStudents = parseInt(lastMonthStudentsResult.rows[0]?.total_students || '0', 10);
    const studentAttendanceTotal = parseInt(studentAttendanceResult.rows[0]?.total_students || '0', 10);
    const studentAttendancePresent = parseInt(studentAttendanceResult.rows[0]?.present_students || '0', 10);
    const staffAttendanceTotal = parseInt(staffAttendanceResult.rows[0]?.total_staff || '0', 10);
    const staffAttendancePresent = parseInt(staffAttendanceResult.rows[0]?.present_staff || '0', 10);

    const branchMap = new Map<string, { collected: number; expected: number; students: number }>();
    for (const row of expectedResult.rows) {
      branchMap.set(row.branch_id, {
        collected: 0,
        expected: Number(row.expected || 0),
        students: Number(row.students || 0)
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
        : 0
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
    const usersCheck = await pool.query(`SELECT COUNT(*) FROM users WHERE branch_id = $1`, [id]);
    if (parseInt(usersCheck.rows[0].count) > 0) {
      throw new Error('Cannot delete branch with existing users');
    }

    const result = await pool.query(`DELETE FROM branches WHERE id = $1 RETURNING *`, [id]);
    if (result.rows.length === 0) {
      throw new Error('Branch not found');
    }
    return { message: 'Branch deleted successfully' };
  }

  // ─── User Management ──────────────────────────────────────────────────────

  async createUser(data: {
    name: string;
    email: string;
    role: string;
    branchId?: string;
    phone?: string;
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
      `INSERT INTO users (digital_id, name, email, password_hash, role, branch_id, phone, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Active')
       RETURNING id, digital_id, name, email, role, branch_id, phone, status, created_at`,
      [
        digitalId,
        data.name,
        data.email,
        hashedPassword,
        data.role,
        data.branchId || null,
        data.phone   || null,
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

    return {
      totalBranches: parseInt(branchesResult.rows[0].count),
      usersByRole: usersResult.rows,
      totalStudents: parseInt(studentsResult.rows[0].count),
      allTimePayments: paymentsResult.rows[0],
      monthlyPayments: monthlyPaymentsResult.rows[0]
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
        SUM(amount) as total_collected
      FROM finance_transactions p
      JOIN students s ON p.student_id = s.id
      WHERE s.branch_id = $1
    `, [branchId]);

    return {
      branch: branchResult.rows[0],
      usersByRole: usersResult.rows,
      totalStudents: parseInt(studentsResult.rows[0].count),
      payments: paymentsResult.rows[0]
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

    const pendingUsersResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM users
      WHERE status = 'Pending'
    `);

    return {
      ...systemReport,
      recentUsers: recentUsersResult.rows,
      pendingUsers: parseInt(pendingUsersResult.rows[0].count)
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

  async getBranchGradeFees() {
    const result = await pool.query(
      `SELECT f.*, b.name AS branch_name
       FROM branch_grade_fees f
       JOIN branches b ON b.id = f.branch_id
       ORDER BY b.name, f.grade_level`
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
      throw new Error('Fee configuration not found');
    }
    return { id };
  }

  // ─── Monthly profit targets ───────────────────────────────────────────────

  private static readonly ETHIOPIAN_TO_GREGORIAN_MONTH: Record<number, number> = {
    1: 9, 2: 10, 3: 11, 4: 12, 5: 1, 6: 2, 7: 3, 8: 4, 9: 5, 10: 6, 11: 7, 12: 8, 13: 9,
  };

  async getMonthlyProfitTargets(year?: number) {
    const targetYear = year ?? new Date().getFullYear();
    const targetsResult = await pool.query(
      `SELECT * FROM monthly_profit_targets WHERE target_year = $1 ORDER BY ethiopian_month`,
      [targetYear]
    );

    const rows = [];
    for (const row of targetsResult.rows) {
      const gregMonth = SuperAdminService.ETHIOPIAN_TO_GREGORIAN_MONTH[row.ethiopian_month] ?? 1;
      let gregYear = targetYear;
      if (row.ethiopian_month >= 5) {
        gregYear = targetYear + 1;
      }
      const actualResult = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS total
         FROM finance_transactions
         WHERE EXTRACT(MONTH FROM date) = $1 AND EXTRACT(YEAR FROM date) = $2`,
        [gregMonth, gregYear]
      );
      rows.push({
        ...row,
        actual_amount: Number(actualResult.rows[0].total),
      });
    }
    return rows;
  }

  async upsertMonthlyProfitTarget(
    ethiopianMonth: number,
    targetAmount: number,
    userId: string,
    year?: number
  ) {
    const targetYear = year ?? new Date().getFullYear();
    const result = await pool.query(
      `INSERT INTO monthly_profit_targets (ethiopian_month, target_year, target_amount, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (ethiopian_month, target_year) DO UPDATE
       SET target_amount = EXCLUDED.target_amount,
           updated_by = EXCLUDED.updated_by,
           updated_at = NOW()
       RETURNING *`,
      [ethiopianMonth, targetYear, targetAmount, userId]
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
      smtp_host: '',
      smtp_port: '587',
      smtp_user: '',
      smtp_from: '',
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
}

export default new SuperAdminService();
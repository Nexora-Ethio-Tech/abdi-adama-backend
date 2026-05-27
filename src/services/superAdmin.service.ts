import pool from '../config/database';
import { hashPassword, generateRandomPassword } from '../utils/password';
import { sendWelcomeEmail } from '../utils/emailService';

// Roles that receive a welcome email on creation — must match user.service.ts
const EMAIL_ON_CREATE_ROLES = ['school-admin', 'vice-principal', 'auditor'];

class SuperAdminService {
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

  // ─── SMTP / Email Settings Management ───────────────────────────────────

  async getSmtpSettings() {
    const SMTP_KEYS = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_from'];
    const result = await pool.query(
      `SELECT key, value, updated_by, updated_at FROM finance_settings WHERE key = ANY($1) ORDER BY key`,
      [SMTP_KEYS]
    );

    // Return a clean object — smtp_pass is intentionally excluded from GET
    // so the password is never sent to the frontend
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
      const value = (data as any)[key];
      if (value === undefined || value === null) continue;

      // Get old value for audit
      const currentResult = await pool.query(
        `SELECT value FROM finance_settings WHERE key = $1`, [key]
      );
      const oldValue = currentResult.rows[0]?.value ?? null;

      // Upsert
      await pool.query(
        `INSERT INTO finance_settings (key, value, updated_by, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (key) DO UPDATE
         SET value = $2, updated_by = $3, updated_at = NOW()`,
        [key, value, userId]
      );

      // Audit — mask the password value
      const auditValue = key === 'smtp_pass' ? '••••••••' : value;
      const auditOld   = key === 'smtp_pass' ? '••••••••' : oldValue;
      await pool.query(
        `INSERT INTO finance_settings_audit (setting_key, old_value, new_value, changed_by, changed_by_name)
         VALUES ($1, $2, $3, $4, $5)`,
        [key, auditOld, auditValue, userId, userName]
      );

      // Apply to process.env immediately so the running server uses the new values
      // without needing a restart
      process.env[key.toUpperCase()] = value;
      if (key === 'smtp_from') process.env['SMTP_FROM'] = value;

      updated.push(key);
    }

    // Invalidate the singleton transporter so next email uses the new config
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
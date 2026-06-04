import pool from '../config/database';

class EmployeeProfileService {
  /**
   * Upserts (creates or updates) an employee's salary payroll profile.
   */
  async createOrUpdateProfile(
    userId: string,
    data: {
      basicSalary: number;
      transportAllowance?: number;
      housingAllowance?: number;
      positionAllowance?: number;
      overtimeRatePerHour?: number;
      bankAccount?: string;
      tinNumber?: string;
    }
  ) {
    const result = await pool.query(
      `INSERT INTO employee_payroll_profiles 
        (user_id, basic_salary, transport_allowance, housing_allowance, position_allowance, overtime_rate_per_hour, bank_account, tin_number, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
        basic_salary = $2,
        transport_allowance = $3,
        housing_allowance = $4,
        position_allowance = $5,
        overtime_rate_per_hour = $6,
        bank_account = $7,
        tin_number = $8,
        updated_at = NOW()
       RETURNING *`,
      [
        userId,
        data.basicSalary,
        data.transportAllowance || 0,
        data.housingAllowance || 0,
        data.positionAllowance || 0,
        data.overtimeRatePerHour || 0,
        data.bankAccount || null,
        data.tinNumber || null
      ]
    );
    const profile = result.rows[0];
    return {
      ...profile,
      total_allowance: Number(profile.transport_allowance || 0) + Number(profile.housing_allowance || 0) + Number(profile.position_allowance || 0)
    };
  }

  /**
   * Gets a specific employee's profile including user detail.
   */
  async getProfile(userId: string) {
    const result = await pool.query(
            `SELECT u.id as user_id, u.name, u.digital_id, u.role, u.branch_id, u.email, u.status, u.is_active,
              e.id as profile_id, e.basic_salary, e.transport_allowance, e.housing_allowance,
              e.position_allowance, (COALESCE(e.transport_allowance, 0) + COALESCE(e.housing_allowance, 0) + COALESCE(e.position_allowance, 0)) as total_allowance,
              e.overtime_rate_per_hour, e.bank_account, e.tin_number
       FROM users u
       LEFT JOIN employee_payroll_profiles e ON u.id = e.user_id
       WHERE u.id = $1`,
      [userId]
    );
    if (result.rows.length === 0) {
      throw new Error('Employee not found');
    }
    return result.rows[0];
  }

  /**
   * Gets all staff members (excluding students/parents) and their profiles.
   */
  async getAllProfiles(branchId?: string) {
    const queryStr = `
      SELECT u.id as user_id, u.name, u.digital_id, u.role, u.branch_id, u.email, u.status, u.is_active,
             e.id as profile_id, COALESCE(e.basic_salary, 0) as basic_salary, 
             COALESCE(e.transport_allowance, 0) as transport_allowance, 
             COALESCE(e.housing_allowance, 0) as housing_allowance,
              COALESCE(e.position_allowance, 0) as position_allowance,
              (COALESCE(e.transport_allowance, 0) + COALESCE(e.housing_allowance, 0) + COALESCE(e.position_allowance, 0)) as total_allowance, 
             COALESCE(e.overtime_rate_per_hour, 0) as overtime_rate_per_hour, 
             e.bank_account, e.tin_number
      FROM users u
      LEFT JOIN employee_payroll_profiles e ON u.id = e.user_id
      WHERE u.role NOT IN ('student', 'parent', 'super-admin')
        AND u.status = 'Approved'
        AND ($1::UUID IS NULL OR u.branch_id = $1::UUID)
      ORDER BY u.name ASC
    `;
    const result = await pool.query(queryStr, [branchId || null]);
    return result.rows;
  }

  /**
   * Records or updates employee attendance.
   */
  async recordAttendance(userId: string, date: string, status: string, recordedBy: string) {
    const result = await pool.query(
      `INSERT INTO employee_attendance (user_id, date, status, recorded_by, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, date) DO UPDATE
       SET status = $3, recorded_by = $4
       RETURNING *`,
      [userId, date, status, recordedBy]
    );
    return result.rows[0];
  }

  /**
   * Gets employee attendance for a specific month and year.
   */
  async getAttendance(userId: string, month: number, year: number) {
    const result = await pool.query(
      `SELECT * FROM employee_attendance
       WHERE user_id = $1 
         AND EXTRACT(MONTH FROM date) = $2
         AND EXTRACT(YEAR FROM date) = $3
       ORDER BY date ASC`,
      [userId, month, year]
    );
    return result.rows;
  }

  /**
   * Gets all in-app staff notifications for a specific employee.
   */
  async getStaffNotifications(userId: string) {
    const result = await pool.query(
      `SELECT * FROM staff_notifications
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Marks an in-app staff notification as read.
   */
  async markNotificationRead(notificationId: string) {
    const result = await pool.query(
      `UPDATE staff_notifications
       SET is_read = TRUE
       WHERE id = $1
       RETURNING *`,
      [notificationId]
    );
    return result.rows[0];
  }
}

export default new EmployeeProfileService();

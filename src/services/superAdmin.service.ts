import pool from '../config/database';

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

  // System-wide Reports
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
      FROM payments
    `);

    const monthlyPaymentsResult = await pool.query(`
      SELECT 
        COUNT(*) as count,
        SUM(amount) as total
      FROM payments
      WHERE payment_date >= DATE_TRUNC('month', CURRENT_DATE)
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
      FROM payments p
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

  // Academic Year Management (Global)
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

  // Set Grade/Section Capacity Limits
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

  // Dashboard
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
}

export default new SuperAdminService();

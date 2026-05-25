import pool from '../config/database';
import { sendLoanNotification } from '../utils/emailService';

class LoanService {
  /**
   * Helper to retrieve a finance setting value or return a default.
   */
  private async getFinanceSetting(key: string, defaultValue: number): Promise<number> {
    const result = await pool.query(`SELECT value FROM finance_settings WHERE key = $1`, [key]);
    if (result.rows.length === 0) return defaultValue;
    return Number(result.rows[0].value);
  }

  /**
   * Issues a new loan to an employee.
   */
  async issueLoan(employeeId: string, amount: number, notes: string, issuedBy: string) {
    // 1. Validate employee has a payroll profile set up with basic salary > 0
    const profileCheck = await pool.query(
      `SELECT basic_salary FROM employee_payroll_profiles WHERE user_id = $1`,
      [employeeId]
    );
    if (profileCheck.rows.length === 0 || Number(profileCheck.rows[0].basic_salary) <= 0) {
      throw new Error('Employee has no salary profile configured or salary is 0. Cannot issue loan.');
    }
    const basicSalary = Number(profileCheck.rows[0].basic_salary);

    // 2. Validate no existing active loan
    const activeCheck = await pool.query(
      `SELECT id, amount, remaining_balance FROM loans WHERE employee_id = $1 AND status = 'active'`,
      [employeeId]
    );
    if (activeCheck.rows.length > 0) {
      throw new Error(`Employee already has an active loan of ${activeCheck.rows[0].amount} ETB (Remaining balance: ${activeCheck.rows[0].remaining_balance} ETB). Repay it first.`);
    }

    // 3. Fetch global settings for max duration and deduction percentage
    const maxMonths = await this.getFinanceSetting('max_loan_months', 3);
    const deductionPercentage = await this.getFinanceSetting('loan_deduction_percentage', 30);

    // 4. Calculate monthly deduction = basic_salary * deductionPercentage / 100
    const monthlyDeduction = parseFloat(((basicSalary * deductionPercentage) / 100).toFixed(2));

    // 5. Create loan record
    const result = await pool.query(
      `INSERT INTO loans (employee_id, amount, remaining_balance, monthly_deduction, max_months, status, issued_by, issued_at, notes)
       VALUES ($1, $2, $2, $3, $4, 'active', $5, NOW(), $6)
       RETURNING *`,
      [employeeId, amount, monthlyDeduction, maxMonths, issuedBy, notes || null]
    );
    const loan = result.rows[0];

    // 6. Create in-app notification in staff_notifications
    await pool.query(
      `INSERT INTO staff_notifications (user_id, title, message, type, is_read, created_at)
       VALUES ($1, $2, $3, 'loan', FALSE, NOW())`,
      [
        employeeId,
        'Loan Issued Successfully',
        `A loan of ${amount} ETB has been issued to you. Monthly deductions of ${monthlyDeduction} ETB will be applied to your salary slips until fully repaid.`
      ]
    );

    // 7. Call sendEmail stub
    const userResult = await pool.query(`SELECT name, email FROM users WHERE id = $1`, [employeeId]);
    if (userResult.rows.length > 0) {
      const { name, email } = userResult.rows[0];
      if (email) {
        try {
          await sendLoanNotification(name, email, amount, monthlyDeduction, maxMonths);
        } catch (err) {
          console.error('Failed to send loan email notification:', err);
        }
      }
    }

    return loan;
  }

  /**
   * Lists all loans with optional status filters.
   */
  async getLoans(filters?: { status?: string; employeeId?: string }) {
    let queryStr = `
      SELECT l.*, u.name as employee_name, u.digital_id as employee_digital_id,
             i.name as issued_by_name
      FROM loans l
      JOIN users u ON l.employee_id = u.id
      LEFT JOIN users i ON l.issued_by = i.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.status) {
      queryStr += ` AND l.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters?.employeeId) {
      queryStr += ` AND l.employee_id = $${paramIndex}`;
      params.push(filters.employeeId);
      paramIndex++;
    }

    queryStr += ` ORDER BY l.issued_at DESC`;
    const result = await pool.query(queryStr, params);
    return result.rows;
  }

  /**
   * Retrieves active loan for an employee.
   */
  async getActiveLoan(userId: string) {
    const result = await pool.query(
      `SELECT l.*, i.name as issued_by_name
       FROM loans l
       LEFT JOIN users i ON l.issued_by = i.id
       WHERE l.employee_id = $1 AND l.status = 'active'`,
      [userId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Get all loans (history) for an employee.
   */
  async getLoansByEmployee(userId: string) {
    const result = await pool.query(
      `SELECT l.*, i.name as issued_by_name
       FROM loans l
       LEFT JOIN users i ON l.issued_by = i.id
       WHERE l.employee_id = $1
       ORDER BY l.issued_at DESC`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Cancels/voids an active loan.
   */
  async cancelLoan(loanId: string, cancelledBy: string) {
    const loanCheck = await pool.query(`SELECT status, employee_id, amount FROM loans WHERE id = $1`, [loanId]);
    if (loanCheck.rows.length === 0) {
      throw new Error('Loan not found');
    }
    if (loanCheck.rows[0].status !== 'active') {
      throw new Error(`Only active loans can be cancelled. This loan is currently ${loanCheck.rows[0].status}.`);
    }

    // Cancel loan
    const result = await pool.query(
      `UPDATE loans
       SET status = 'cancelled', completed_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [loanId]
    );

    // Create staff notification
    await pool.query(
      `INSERT INTO staff_notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, 'loan')`,
      [
        loanCheck.rows[0].employee_id,
        'Loan Cancelled',
        `Your active loan of ${loanCheck.rows[0].amount} ETB has been cancelled/voided by the Finance Department.`
      ]
    );

    return result.rows[0];
  }
}

export default new LoanService();

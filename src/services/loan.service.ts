import pool from '../config/database';
import { sendLoanSubmittedEmail, sendLoanApprovedEmail } from '../utils/emailService';

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
    // 1. Fetch employee salary if profile exists (used for deduction calculation only)
    const profileCheck = await pool.query(
      `SELECT basic_salary FROM employee_payroll_profiles WHERE user_id = $1`,
      [employeeId]
    );
    const basicSalary = profileCheck.rows.length > 0 ? Number(profileCheck.rows[0].basic_salary) : 0;

    // 2. Validate no existing pending/approved/active loan
    const activeCheck = await pool.query(
      `SELECT id, amount, remaining_balance, status FROM loans WHERE employee_id = $1 AND status IN ('pending', 'approved', 'active')`,
      [employeeId]
    );
    if (activeCheck.rows.length > 0) {
      const existing = activeCheck.rows[0];
      throw new Error(`Employee already has a loan request in progress (${existing.status}). Existing amount: ${existing.amount} ETB.`);
    }

    // 3. Fetch global settings for max duration and deduction percentage
    const maxMonths = await this.getFinanceSetting('max_loan_months', 3);
    const deductionPercentage = await this.getFinanceSetting('loan_deduction_percentage', 30);

    // 4. Calculate monthly deduction = basic_salary * deductionPercentage / 100
    //    If no salary profile, fall back to evenly splitting the loan across max_months
    const salaryBasedDeduction = parseFloat(((basicSalary * deductionPercentage) / 100).toFixed(2));
    const monthlyDeduction = salaryBasedDeduction > 0
      ? salaryBasedDeduction
      : parseFloat((amount / maxMonths).toFixed(2));

    // 5. Create loan record in pending status for auditor review
    const result = await pool.query(
      `INSERT INTO loans (employee_id, amount, remaining_balance, monthly_deduction, max_months, status, issued_by, issued_at, notes)
       VALUES ($1, $2, $2, $3, $4, 'pending', $5, NOW(), $6)
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
        'Loan Request Submitted',
        `A loan request of ${amount} ETB has been submitted and is pending auditor approval. You will be notified when the request is approved or rejected.`
      ]
    );

    // 7. Send "loan submitted" email so the employee knows it's pending review
    const userResult = await pool.query(`SELECT name, email FROM users WHERE id = $1`, [employeeId]);
    if (userResult.rows.length > 0) {
      const { name, email } = userResult.rows[0];
      if (email) {
        sendLoanSubmittedEmail(name, email, amount, monthlyDeduction, maxMonths).catch((err) => {
          console.error('Failed to send loan submission email:', err);
        });
      }
    }

    return loan;
  }

  async approveLoan(loanId: string, auditorId: string) {
    const loanCheck = await pool.query(`SELECT status, employee_id, amount FROM loans WHERE id = $1`, [loanId]);
    if (loanCheck.rows.length === 0) {
      throw new Error('Loan not found.');
    }
    if (loanCheck.rows[0].status !== 'pending') {
      throw new Error('Only pending loans can be approved.');
    }

    const result = await pool.query(
      `UPDATE loans
       SET status = 'approved', audited_by = $1, audited_at = NOW(), rejection_reason = NULL
       WHERE id = $2
       RETURNING *`,
      [auditorId, loanId]
    );
    const loan = result.rows[0];

    await pool.query(
      `INSERT INTO staff_notifications (user_id, title, message, type, is_read, created_at)
       VALUES ($1, $2, $3, 'loan', FALSE, NOW())`,
      [
        loanCheck.rows[0].employee_id,
        'Loan Request Approved',
        `Your loan request of ${loanCheck.rows[0].amount} ETB has been approved by the auditor and is awaiting payment by finance.`
      ]
    );

    return loan;
  }

  async rejectLoan(loanId: string, auditorId: string, reason?: string) {
    const loanCheck = await pool.query(`SELECT status, employee_id, amount FROM loans WHERE id = $1`, [loanId]);
    if (loanCheck.rows.length === 0) {
      throw new Error('Loan not found.');
    }
    if (loanCheck.rows[0].status !== 'pending') {
      throw new Error('Only pending loans can be rejected.');
    }

    const result = await pool.query(
      `UPDATE loans
       SET status = 'rejected', audited_by = $1, audited_at = NOW(), rejection_reason = $2, completed_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [auditorId, reason || 'Rejected by auditor', loanId]
    );
    const loan = result.rows[0];

    await pool.query(
      `INSERT INTO staff_notifications (user_id, title, message, type, is_read, created_at)
       VALUES ($1, $2, $3, 'loan', FALSE, NOW())`,
      [
        loanCheck.rows[0].employee_id,
        'Loan Request Rejected',
        `Your loan request of ${loanCheck.rows[0].amount} ETB has been rejected by the auditor. ${reason || ''}`.trim()
      ]
    );

    return loan;
  }

  async payLoan(loanId: string, paidBy: string) {
    const loanCheck = await pool.query(`SELECT status, employee_id, amount FROM loans WHERE id = $1`, [loanId]);
    if (loanCheck.rows.length === 0) {
      throw new Error('Loan not found.');
    }
    if (loanCheck.rows[0].status !== 'approved') {
      throw new Error('Only approved loans can be marked as paid.');
    }

    const result = await pool.query(
      `UPDATE loans
       SET status = 'active', paid_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [loanId]
    );
    const loan = result.rows[0];

    await pool.query(
      `INSERT INTO staff_notifications (user_id, title, message, type, is_read, created_at)
       VALUES ($1, $2, $3, 'loan', FALSE, NOW())`,
      [
        loanCheck.rows[0].employee_id,
        'Loan Approved and Paid',
        `Your approved loan of ${loanCheck.rows[0].amount} ETB has been paid out by finance and is now active. Monthly deductions will begin on your next payroll.`
      ]
    );

    // Send "approved & disbursed" email now that the loan is truly active
    const userResult = await pool.query(
      `SELECT u.name, u.email, l.monthly_deduction, l.max_months
       FROM users u
       JOIN loans l ON l.id = $1
       WHERE u.id = $2`,
      [loanId, loanCheck.rows[0].employee_id]
    );
    if (userResult.rows.length > 0) {
      const { name, email, monthly_deduction, max_months } = userResult.rows[0];
      if (email) {
        sendLoanApprovedEmail(
          name,
          email,
          Number(loanCheck.rows[0].amount),
          Number(monthly_deduction),
          Number(max_months)
        ).catch((err) => {
          console.error('Failed to send loan approval email:', err);
        });
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
      WHERE u.role <> 'super-admin'
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

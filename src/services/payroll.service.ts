import pool from '../config/database';
import { calculateEthiopianIncomeTax, calculatePension } from '../utils/taxCalculator';
import { sendPayrollNotification } from '../utils/emailService';

// Map month names to numbers (1-12)
const MONTH_MAP: { [key: string]: number } = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
};

class PayrollService {
  /**
   * Helper to retrieve a global finance setting value.
   */
  private async getFinanceSetting(key: string, defaultValue: number): Promise<number> {
    const result = await pool.query(`SELECT value FROM finance_settings WHERE key = $1`, [key]);
    if (result.rows.length === 0) return defaultValue;
    return Number(result.rows[0].value);
  }

  /**
   * Translates a month name (e.g. "May") to its numerical index (1-12).
   */
  private monthNameToNumber(monthName: string): number {
    const num = MONTH_MAP[monthName.toLowerCase()];
    if (!num) {
      const parsed = parseInt(monthName);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 12) return parsed;
      return new Date().getMonth() + 1; // Default fallback to current month
    }
    return num;
  }

  /**
   * Queries employee_attendance table to calculate total absent days in a given month.
   */
  async getEmployeeAbsentDays(userId: string, monthStr: string, year: number): Promise<number> {
    const monthNum = this.monthNameToNumber(monthStr);
    const result = await pool.query(
      `SELECT COUNT(*) as count 
       FROM employee_attendance
       WHERE user_id = $1 
         AND status = 'absent'
         AND EXTRACT(MONTH FROM date) = $2
         AND EXTRACT(YEAR FROM date) = $3`,
      [userId, monthNum, year]
    );
    return parseInt(result.rows[0].count) || 0;
  }

  /**
   * Generates a monthly payroll run (stored as Draft by default).
   */
  async generatePayroll(
    month: string,
    year: number,
    branchId: string | null,
    generatedBy: string,
    overtimeHoursMap: { [employeeId: string]: number } = {}
  ) {
    // 1. Check if finalized or draft payroll already exists for this exact month, year, and branch
    const existingCheck = await pool.query(
      `SELECT id, status FROM payroll_runs 
       WHERE month = $1 AND year = $2 AND (branch_id = $3 OR (branch_id IS NULL AND $3 IS NULL))`,
      [month, year, branchId]
    );
    if (existingCheck.rows.length > 0) {
      const run = existingCheck.rows[0];
      throw new Error(`A payroll run for ${month} ${year} already exists in ${run.status} status. Please delete the draft first if you wish to regenerate.`);
    }

    // Begin a database transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 2. Fetch global settings
      const dailyPenaltyRate = await this.getFinanceSetting('daily_penalty_rate', 150.0);

      // 3. Fetch all approved employees with valid payroll profiles
      const employeesQuery = `
        SELECT u.id as user_id, u.name, e.basic_salary, e.transport_allowance, 
               e.housing_allowance, e.position_allowance, e.overtime_rate_per_hour
        FROM users u
        JOIN employee_payroll_profiles e ON u.id = e.user_id
        WHERE u.role NOT IN ('student', 'parent')
          AND u.status = 'Approved'
          AND ($1::UUID IS NULL OR u.branch_id = $1::UUID)
      `;
      const employeesRes = await client.query(employeesQuery, [branchId]);
      const employees = employeesRes.rows;

      if (employees.length === 0) {
        throw new Error('No employees with active salary profiles found to process payroll.');
      }

      // 4. Create the draft payroll run header
      const runResult = await client.query(
        `INSERT INTO payroll_runs 
          (month, year, branch_id, status, generated_by, total_gross, total_deductions, total_net, total_tax, total_pension_employee, total_pension_employer, created_at)
         VALUES ($1, $2, $3, 'draft', $4, 0, 0, 0, 0, 0, 0, NOW())
         RETURNING *`,
        [month, year, branchId, generatedBy]
      );
      const payrollRun = runResult.rows[0];
      const runId = payrollRun.id;

      let totalGross = 0;
      let totalDeductions = 0;
      let totalNet = 0;
      let totalTax = 0;
      let totalPensionEmployee = 0;
      let totalPensionEmployer = 0;

      // 5. Calculate and insert individual payroll items
      for (const emp of employees) {
        const empId = emp.user_id;
        const basicSalary = Number(emp.basic_salary);
        const transportAllowance = Number(emp.transport_allowance);
        const housingAllowance = Number(emp.housing_allowance);
        const positionAllowance = Number(emp.position_allowance);
        const overtimeRate = Number(emp.overtime_rate_per_hour);

        // Fetch absent days
        const monthNum = this.monthNameToNumber(month);
        const absentDaysRes = await client.query(
          `SELECT COUNT(*) as count 
           FROM employee_attendance
           WHERE user_id = $1 
             AND status = 'absent'
             AND EXTRACT(MONTH FROM date) = $2
             AND EXTRACT(YEAR FROM date) = $3`,
          [empId, monthNum, year]
        );
        const absentDays = parseInt(absentDaysRes.rows[0].count) || 0;
        const penaltyAmount = absentDays * dailyPenaltyRate;

        // Fetch overtime
        const overtimeHours = overtimeHoursMap[empId] || 0;
        const overtimeAmount = overtimeHours * overtimeRate;

        // Calculate Gross Salary
        const grossSalary = basicSalary + transportAllowance + housingAllowance + positionAllowance + overtimeAmount;

        // Fetch active loans and calculate deduction
        const activeLoanRes = await client.query(
          `SELECT id, remaining_balance, monthly_deduction FROM loans WHERE employee_id = $1 AND status = 'active'`,
          [empId]
        );
        let loanDeduction = 0;
        if (activeLoanRes.rows.length > 0) {
          const loan = activeLoanRes.rows[0];
          loanDeduction = Math.min(Number(loan.monthly_deduction), Number(loan.remaining_balance));
        }

        // Calculate Pension
        const pension = calculatePension(basicSalary);

        // Taxable Income = Gross - PensionEmployee - Penalty
        const taxableIncome = Math.max(0, grossSalary - pension.employee - penaltyAmount);

        // Calculate Tax
        const incomeTax = calculateEthiopianIncomeTax(taxableIncome);

        // Calculate Net Pay = Gross - Penalty - LoanDeduction - Tax - PensionEmployee
        const empDeductions = penaltyAmount + loanDeduction + incomeTax + pension.employee;
        const netPay = grossSalary - empDeductions;

        // Save payroll item
        await client.query(
          `INSERT INTO payroll_items (
            payroll_run_id, employee_id, employee_name, basic_salary, transport_allowance, housing_allowance,
            position_allowance, overtime_hours, overtime_amount, gross_salary, absent_days, penalty_amount,
            loan_deduction, taxable_income, income_tax, pension_employee, pension_employer, total_deductions, net_pay
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
          [
            runId, empId, emp.name, basicSalary, transportAllowance, housingAllowance,
            positionAllowance, overtimeHours, overtimeAmount, grossSalary, absentDays, penaltyAmount,
            loanDeduction, taxableIncome, incomeTax, pension.employee, pension.employer, empDeductions, netPay
          ]
        );

        // Aggregate run totals
        totalGross += grossSalary;
        totalDeductions += empDeductions;
        totalNet += netPay;
        totalTax += incomeTax;
        totalPensionEmployee += pension.employee;
        totalPensionEmployer += pension.employer;
      }

      // 6. Update the payroll run header with totals
      const updatedRunResult = await client.query(
        `UPDATE payroll_runs 
         SET total_gross = $1, total_deductions = $2, total_net = $3, total_tax = $4, 
             total_pension_employee = $5, total_pension_employer = $6
         WHERE id = $7
         RETURNING *`,
        [totalGross, totalDeductions, totalNet, totalTax, totalPensionEmployee, totalPensionEmployer, runId]
      );

      await client.query('COMMIT');
      return updatedRunResult.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves a specific payroll run header and items list.
   */
  async getPayrollRun(runId: string) {
    const runResult = await pool.query(
      `SELECT r.*, g.name as generated_by_name, f.name as finalized_by_name, b.name as branch_name
       FROM payroll_runs r
       LEFT JOIN users g ON r.generated_by = g.id
       LEFT JOIN users f ON r.finalized_by = f.id
       LEFT JOIN branches b ON r.branch_id = b.id
       WHERE r.id = $1`,
      [runId]
    );
    if (runResult.rows.length === 0) {
      throw new Error('Payroll run not found');
    }

    const itemsResult = await pool.query(
      `SELECT i.*, u.digital_id as employee_digital_id, u.role as employee_role
       FROM payroll_items i
       JOIN users u ON i.employee_id = u.id
       WHERE i.payroll_run_id = $1
       ORDER BY i.employee_name ASC`,
      [runId]
    );

    return {
      run: runResult.rows[0],
      items: itemsResult.rows
    };
  }

  /**
   * Lists payroll runs.
   */
  async getPayrollRuns(filters?: { branchId?: string; status?: string }) {
    let queryStr = `
      SELECT r.*, g.name as generated_by_name, f.name as finalized_by_name, b.name as branch_name
      FROM payroll_runs r
      LEFT JOIN users g ON r.generated_by = g.id
      LEFT JOIN users f ON r.finalized_by = f.id
      LEFT JOIN branches b ON r.branch_id = b.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.branchId) {
      queryStr += ` AND r.branch_id = $${paramIndex}`;
      params.push(filters.branchId);
      paramIndex++;
    }

    if (filters?.status) {
      queryStr += ` AND r.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    queryStr += ` ORDER BY r.year DESC, 
                  CASE 
                    WHEN r.month = 'January' THEN 1
                    WHEN r.month = 'February' THEN 2
                    WHEN r.month = 'March' THEN 3
                    WHEN r.month = 'April' THEN 4
                    WHEN r.month = 'May' THEN 5
                    WHEN r.month = 'June' THEN 6
                    WHEN r.month = 'July' THEN 7
                    WHEN r.month = 'August' THEN 8
                    WHEN r.month = 'September' THEN 9
                    WHEN r.month = 'October' THEN 10
                    WHEN r.month = 'November' THEN 11
                    WHEN r.month = 'December' THEN 12
                    ELSE 99
                  END DESC, r.created_at DESC`;

    const result = await pool.query(queryStr, params);
    return result.rows;
  }

  /**
   * Deletes a draft payroll run.
   */
  async deletePayrollRun(runId: string) {
    const check = await pool.query(`SELECT status FROM payroll_runs WHERE id = $1`, [runId]);
    if (check.rows.length === 0) throw new Error('Payroll run not found');
    if (check.rows[0].status === 'finalized') {
      throw new Error('Cannot delete a finalized payroll run');
    }
    await pool.query(`DELETE FROM payroll_runs WHERE id = $1`, [runId]);
    return { message: 'Draft payroll deleted successfully' };
  }

  /**
   * Finalizes a payroll run, updating active loan balances and sending notifications.
   */
  async finalizePayroll(runId: string, finalizedBy: string) {
    const runResult = await pool.query(`SELECT status, month, year FROM payroll_runs WHERE id = $1`, [runId]);
    if (runResult.rows.length === 0) {
      throw new Error('Payroll run not found');
    }
    const run = runResult.rows[0];
    if (run.status !== 'draft') {
      throw new Error(`Payroll run is already ${run.status}. Only draft payrolls can be finalized.`);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Update status to finalized
      await client.query(
        `UPDATE payroll_runs 
         SET status = 'finalized', finalized_by = $1, finalized_at = NOW()
         WHERE id = $2`,
        [finalizedBy, runId]
      );

      // 2. Fetch all payroll items in this run
      const itemsRes = await client.query(
        `SELECT id, employee_id, employee_name, loan_deduction, net_pay FROM payroll_items WHERE payroll_run_id = $1`,
        [runId]
      );
      const items = itemsRes.rows;

      for (const item of items) {
        const empId = item.employee_id;
        const loanDed = Number(item.loan_deduction);

        // A. Handle loan repayment updates
        if (loanDed > 0) {
          const activeLoanRes = await client.query(
            `SELECT id, remaining_balance, months_paid FROM loans WHERE employee_id = $1 AND status = 'active'`,
            [empId]
          );
          if (activeLoanRes.rows.length > 0) {
            const loan = activeLoanRes.rows[0];
            const remainingAfter = Math.max(0, Number(loan.remaining_balance) - loanDed);
            const monthsPaid = (parseInt(loan.months_paid) || 0) + 1;
            const newStatus = remainingAfter <= 0 ? 'completed' : 'active';
            const completedAt = remainingAfter <= 0 ? 'NOW()' : 'NULL';

            // Update loan record
            await client.query(
              `UPDATE loans 
               SET remaining_balance = $1, months_paid = $2, status = $3, 
                   completed_at = ${completedAt === 'NOW()' ? 'NOW()' : 'NULL'}
               WHERE id = $4`,
              [remainingAfter, monthsPaid, newStatus, loan.id]
            );

            // Record repayment details
            await client.query(
              `INSERT INTO loan_repayments (loan_id, payroll_id, amount, remaining_after, repaid_at)
               VALUES ($1, $2, $3, $4, NOW())`,
              [loan.id, runId, loanDed, remainingAfter]
            );
          }
        }

        // B. Generate In-app Notification for salary slip release
        await client.query(
          `INSERT INTO staff_notifications (user_id, title, message, type, is_read, created_at)
           VALUES ($1, $2, $3, 'payroll', FALSE, NOW())`,
          [
            empId,
            'New Payslip Available',
            `Your payslip for ${run.month} ${run.year} has been finalized. Net pay: ${Number(item.net_pay).toFixed(2)} ETB.`
          ]
        );

        // C. Fetch employee email and send payroll notification email stub
        const emailRes = await client.query(`SELECT email FROM users WHERE id = $1`, [empId]);
        if (emailRes.rows.length > 0 && emailRes.rows[0].email) {
          try {
            await sendPayrollNotification(item.employee_name, emailRes.rows[0].email, run.month, run.year, Number(item.net_pay));
          } catch (err) {
            console.error(`Failed to send email notification to ${item.employee_name}:`, err);
          }
        }
      }

      await client.query('COMMIT');
      return { success: true, message: 'Payroll run finalized, loan repayments recorded, and payslips released.' };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves payslip breakdown for "My Finance" view.
   */
  async getPayslip(userId: string, month: string, year: number) {
    const result = await pool.query(
      `SELECT i.*, r.status, r.finalized_at
       FROM payroll_items i
       JOIN payroll_runs r ON i.payroll_run_id = r.id
       WHERE i.employee_id = $1 
         AND r.month = $2 
         AND r.year = $3
         AND r.status = 'finalized'`,
      [userId, month, year]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Retrieves payslip history for "My Finance" list.
   */
  async getPayslipHistory(userId: string) {
    const result = await pool.query(
      `SELECT i.id, i.payroll_run_id, i.gross_salary, i.total_deductions, i.net_pay,
              r.month, r.year, r.finalized_at
       FROM payroll_items i
       JOIN payroll_runs r ON i.payroll_run_id = r.id
       WHERE i.employee_id = $1 AND r.status = 'finalized'
       ORDER BY r.year DESC, 
                CASE 
                  WHEN r.month = 'January' THEN 1
                  WHEN r.month = 'February' THEN 2
                  WHEN r.month = 'March' THEN 3
                  WHEN r.month = 'April' THEN 4
                  WHEN r.month = 'May' THEN 5
                  WHEN r.month = 'June' THEN 6
                  WHEN r.month = 'July' THEN 7
                  WHEN r.month = 'August' THEN 8
                  WHEN r.month = 'September' THEN 9
                  WHEN r.month = 'October' THEN 10
                  WHEN r.month = 'November' THEN 11
                  WHEN r.month = 'December' THEN 12
                  ELSE 99
                END DESC`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Calculates global school liability summary for finalized periods.
   */
  async getSchoolLiability(month: string, year: number) {
    const query = `
      SELECT COUNT(i.id) as staff_count,
             COALESCE(SUM(i.basic_salary), 0) as total_basic,
             COALESCE(SUM(i.gross_salary), 0) as total_gross,
             COALESCE(SUM(i.penalty_amount), 0) as total_penalties,
             COALESCE(SUM(i.loan_deduction), 0) as total_loan_repayments,
             COALESCE(SUM(i.income_tax), 0) as total_tax,
             COALESCE(SUM(i.pension_employee), 0) as total_pension_employee,
             COALESCE(SUM(i.pension_employer), 0) as total_pension_employer,
             COALESCE(SUM(i.net_pay), 0) as total_net_pay
      FROM payroll_items i
      JOIN payroll_runs r ON i.payroll_run_id = r.id
      WHERE r.month = $1 AND r.year = $2 AND r.status = 'finalized'
    `;
    const result = await pool.query(query, [month, year]);
    return result.rows[0];
  }
}

export default new PayrollService();

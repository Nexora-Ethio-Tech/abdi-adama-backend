import * as xlsx from 'xlsx';

/**
 * Utility for exporting payroll data to Excel (via CSV) and PDF (via print-ready HTML).
 */

interface PayrollRun {
  id: string;
  month: string;
  year: number;
  status: string;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  total_tax: number;
  total_pension_employee: number;
  total_pension_employer: number;
}

interface PayrollItem {
  employee_name: string;
  basic_salary: number;
  transport_allowance: number;
  housing_allowance: number;
  position_allowance: number;
  overtime_hours: number;
  overtime_amount: number;
  gross_salary: number;
  absent_days: number;
  penalty_amount: number;
  loan_deduction: number;
  taxable_income: number;
  income_tax: number;
  pension_employee: number;
  pension_employer: number;
  total_deductions: number;
  net_pay: number;
}

/**
 * Generates a standard CSV string representing the payroll run.
 * Excel can open this natively.
 */
export function generatePayrollCSV(run: PayrollRun, items: PayrollItem[]): string {
  const headers = [
    'Employee Name',
    'Basic Salary (ETB)',
    'Transport Allowance (ETB)',
    'Housing Allowance (ETB)',
    'Position Allowance (ETB)',
    'Overtime Hours',
    'Overtime Amount (ETB)',
    'Gross Salary (ETB)',
    'Absent Days',
    'Absent Penalty (ETB)',
    'Loan Deduction (ETB)',
    'Taxable Income (ETB)',
    'Income Tax (ETB)',
    'Pension Employee 7% (ETB)',
    'Pension Employer 11% (ETB)',
    'Total Deductions (ETB)',
    'Net Pay (ETB)'
  ];

  const rows = items.map(item => [
    `"${item.employee_name.replace(/"/g, '""')}"`,
    item.basic_salary,
    item.transport_allowance,
    item.housing_allowance,
    item.position_allowance,
    item.overtime_hours,
    item.overtime_amount,
    item.gross_salary,
    item.absent_days,
    item.penalty_amount,
    item.loan_deduction,
    item.taxable_income,
    item.income_tax,
    item.pension_employee,
    item.pension_employer,
    item.total_deductions,
    item.net_pay
  ]);

  // Totals Row
  const totals = [
    '"TOTALS"',
    items.reduce((sum, item) => sum + Number(item.basic_salary), 0),
    items.reduce((sum, item) => sum + Number(item.transport_allowance), 0),
    items.reduce((sum, item) => sum + Number(item.housing_allowance), 0),
    items.reduce((sum, item) => sum + Number(item.position_allowance), 0),
    items.reduce((sum, item) => sum + Number(item.overtime_hours), 0),
    items.reduce((sum, item) => sum + Number(item.overtime_amount), 0),
    run.total_gross,
    items.reduce((sum, item) => sum + Number(item.absent_days), 0),
    items.reduce((sum, item) => sum + Number(item.penalty_amount), 0),
    items.reduce((sum, item) => sum + Number(item.loan_deduction), 0),
    items.reduce((sum, item) => sum + Number(item.taxable_income), 0),
    run.total_tax,
    run.total_pension_employee,
    run.total_pension_employer,
    run.total_deductions,
    run.total_net
  ];

  const csvContent = [
    `"PAYROLL RUN SUMMARY - ${run.month.toUpperCase()} ${run.year}"`,
    `"Status: ${run.status.toUpperCase()}"`,
    '',
    headers.join(','),
    ...rows.map(row => row.join(',')),
    totals.join(',')
  ].join('\n');

  return csvContent;
}

/**
 * Generates print-ready HTML representing the payroll run.
 * Can be rendered directly or printed to PDF in the browser.
 */
export function generatePayrollHTML(run: PayrollRun, items: PayrollItem[]): string {
  const tableRows = items.map((item, index) => `
    <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">${item.employee_name}</td>
      <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">${Number(item.basic_salary).toFixed(2)}</td>
      <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">${Number(item.transport_allowance).toFixed(2)}</td>
      <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">${Number(item.housing_allowance).toFixed(2)}</td>
      <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">${Number(item.position_allowance).toFixed(2)}</td>
      <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center;">${item.overtime_hours}</td>
      <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">${Number(item.overtime_amount).toFixed(2)}</td>
      <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: 550;">${Number(item.gross_salary).toFixed(2)}</td>
      <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center;">${item.absent_days}</td>
      <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; color: #dc2626;">-${Number(item.penalty_amount).toFixed(2)}</td>
      <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; color: #dc2626;">-${Number(item.loan_deduction).toFixed(2)}</td>
      <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; color: #dc2626;">-${Number(item.income_tax).toFixed(2)}</td>
      <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; color: #dc2626;">-${Number(item.pension_employee).toFixed(2)}</td>
      <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; color: #475569;">${Number(item.pension_employer).toFixed(2)}</td>
      <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #166534; background-color: #f0fdf4;">${Number(item.net_pay).toFixed(2)}</td>
    </tr>
  `).join('');

  const totals = {
    basic: items.reduce((sum, item) => sum + Number(item.basic_salary), 0).toFixed(2),
    transport: items.reduce((sum, item) => sum + Number(item.transport_allowance), 0).toFixed(2),
    housing: items.reduce((sum, item) => sum + Number(item.housing_allowance), 0).toFixed(2),
    position: items.reduce((sum, item) => sum + Number(item.position_allowance), 0).toFixed(2),
    overtimeHours: items.reduce((sum, item) => sum + Number(item.overtime_hours), 0),
    overtimeAmount: items.reduce((sum, item) => sum + Number(item.overtime_amount), 0).toFixed(2),
    absentDays: items.reduce((sum, item) => sum + Number(item.absent_days), 0),
    penalty: items.reduce((sum, item) => sum + Number(item.penalty_amount), 0).toFixed(2),
    loan: items.reduce((sum, item) => sum + Number(item.loan_deduction), 0).toFixed(2)
  };

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Payroll Run Report - ${run.month} ${run.year}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 30px; color: #1e293b; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #4f46e5; padding-bottom: 20px; margin-bottom: 30px; }
        .title { margin: 0; color: #4f46e5; font-size: 28px; }
        .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
        .meta-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; text-align: center; }
        .meta-card span { font-size: 12px; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 5px; }
        .meta-card strong { font-size: 18px; color: #0f172a; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: 13px; }
        th { background-color: #4f46e5; color: white; padding: 12px 10px; border: 1px solid #4f46e5; text-align: center; font-weight: 600; }
        .totals-row { background-color: #e2e8f0 !important; font-weight: bold; border-top: 2px solid #94a3b8; }
        .totals-row td { padding: 12px 10px; border: 1px solid #cbd5e1; }
        @media print {
          body { margin: 10px; }
          .header { border-bottom: 2px solid #000; }
          .title { color: #000; }
          th { background-color: #d1d5db; color: #000; border: 1px solid #9ca3af; }
          .totals-row { background-color: #f3f4f6 !important; }
          button { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1 class="title">ABDI ADAMA SCHOOL IMS</h1>
          <h2 style="margin: 5px 0 0 0; color: #64748b; font-size: 16px;">Monthly Payroll Ledger Report &mdash; ${run.month} ${run.year}</h2>
        </div>
        <button onclick="window.print()" style="background-color: #4f46e5; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">Print Report / Save as PDF</button>
      </div>

      <div class="meta-grid">
        <div class="meta-card">
          <span>Payroll Period</span>
          <strong>${run.month} ${run.year}</strong>
        </div>
        <div class="meta-card">
          <span>Total Gross Ledger</span>
          <strong>${Number(run.total_gross).toFixed(2)} ETB</strong>
        </div>
        <div class="meta-card">
          <span>Total Deductions</span>
          <strong style="color: #dc2626;">${Number(run.total_deductions).toFixed(2)} ETB</strong>
        </div>
        <div class="meta-card" style="background-color: #f0fdf4; border-color: #bbf7d0;">
          <span>Net Salary Payout</span>
          <strong style="color: #15803d;">${Number(run.total_net).toFixed(2)} ETB</strong>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Employee</th>
            <th>Basic</th>
            <th>Transport</th>
            <th>Housing</th>
            <th>Position</th>
            <th>OT Hours</th>
            <th>OT Pay</th>
            <th>Gross</th>
            <th>Abs Days</th>
            <th>Absent Ded.</th>
            <th>Loan Ded.</th>
            <th>Tax</th>
            <th>Pension (7%)</th>
            <th>Employer (11%)</th>
            <th>Net Pay</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
          <tr class="totals-row">
            <td>TOTALS</td>
            <td style="text-align: right;">${totals.basic}</td>
            <td style="text-align: right;">${totals.transport}</td>
            <td style="text-align: right;">${totals.housing}</td>
            <td style="text-align: right;">${totals.position}</td>
            <td style="text-align: center;">${totals.overtimeHours}</td>
            <td style="text-align: right;">${totals.overtimeAmount}</td>
            <td style="text-align: right;">${Number(run.total_gross).toFixed(2)}</td>
            <td style="text-align: center;">${totals.absentDays}</td>
            <td style="text-align: right; color: #dc2626;">-${totals.penalty}</td>
            <td style="text-align: right; color: #dc2626;">-${totals.loan}</td>
            <td style="text-align: right; color: #dc2626;">-${Number(run.total_tax).toFixed(2)}</td>
            <td style="text-align: right; color: #dc2626;">-${Number(run.total_pension_employee).toFixed(2)}</td>
            <td style="text-align: right; color: #475569;">${Number(run.total_pension_employer).toFixed(2)}</td>
            <td style="text-align: right; color: #166534; background-color: #dcfce7 !important;">${Number(run.total_net).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 50px; display: flex; justify-content: space-between; font-size: 14px;">
        <div style="border-top: 1px solid #94a3b8; width: 200px; text-align: center; padding-top: 10px;">
          Prepared By (Finance Clerk)
        </div>
        <div style="border-top: 1px solid #94a3b8; width: 200px; text-align: center; padding-top: 10px;">
          Audited By
        </div>
        <div style="border-top: 1px solid #94a3b8; width: 200px; text-align: center; padding-top: 10px;">
          Approved By (Super Admin)
        </div>
      </div>
    </body>
    </html>
  `;

  return html;
}

/**
 * Generates an Excel buffer with multiple sheets for Auditor Custom Export.
 */
export function generateCustomExcel(
  month: string,
  year: number,
  staffData: any[],
  otherData: any[]
): Buffer {
  const wb = xlsx.utils.book_new();

  // Scenario A: Staff Payroll
  if (staffData.length > 0) {
    const staffHeaders = [
      'Employee Name',
      'TIN Number',
      'Basic Salary (ETB)',
      'Transport Allowance (ETB)',
      'Housing Allowance (ETB)',
      'Position Allowance (ETB)',
      'Overtime Hours',
      'Overtime Amount (ETB)',
      'Gross Salary (ETB)',
      'Absent Days',
      'Absent Penalty (ETB)',
      'Loan Deduction (ETB)',
      'Taxable Income (ETB)',
      'Income Tax (ETB)',
      'Pension Employee 7% (ETB)',
      'Pension Employer 11% (ETB)',
      'Total Deductions (ETB)',
      'Net Pay (ETB)'
    ];

    const staffRows = staffData.map(item => ({
      'Employee Name': item.employee_name,
      'TIN Number': item.tin_number || 'N/A',
      'Basic Salary (ETB)': Number(item.basic_salary),
      'Transport Allowance (ETB)': Number(item.transport_allowance),
      'Housing Allowance (ETB)': Number(item.housing_allowance),
      'Position Allowance (ETB)': Number(item.position_allowance),
      'Overtime Hours': item.overtime_hours,
      'Overtime Amount (ETB)': Number(item.overtime_amount),
      'Gross Salary (ETB)': Number(item.gross_salary),
      'Absent Days': item.absent_days,
      'Absent Penalty (ETB)': Number(item.penalty_amount),
      'Loan Deduction (ETB)': Number(item.loan_deduction),
      'Taxable Income (ETB)': Number(item.taxable_income),
      'Income Tax (ETB)': Number(item.income_tax),
      'Pension Employee 7% (ETB)': Number(item.pension_employee),
      'Pension Employer 11% (ETB)': Number(item.pension_employer),
      'Total Deductions (ETB)': Number(item.total_deductions),
      'Net Pay (ETB)': Number(item.net_pay)
    }));

    const wsStaff = xlsx.utils.json_to_sheet(staffRows, { header: staffHeaders });
    xlsx.utils.book_append_sheet(wb, wsStaff, 'Staff Payroll');
  }

  // Scenario B: Other Transactions
  if (otherData.length > 0) {
    const otherHeaders = [
      'Transaction ID',
      'Date',
      'Amount (ETB)',
      'Type',
      'Verified By'
    ];

    const otherRows = otherData.map(tx => ({
      'Transaction ID': tx.id,
      'Date': new Date(tx.date).toLocaleDateString(),
      'Amount (ETB)': Number(tx.amount),
      'Type': tx.type,
      'Verified By': tx.verified_by || 'System'
    }));

    const wsOther = xlsx.utils.json_to_sheet(otherRows, { header: otherHeaders });
    xlsx.utils.book_append_sheet(wb, wsOther, 'Other Transactions');
  }

  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

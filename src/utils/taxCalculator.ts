/**
 * Utility for calculating payroll tax and pension based on Ethiopian Proclamation 1395/2025
 */

/**
 * Calculates personal income tax based on Ethiopian tax law brackets.
 * 
 * Brackets:
 * - 0 - 600 ETB: 0%
 * - 601 - 1,650 ETB: 10% (deduct 60)
 * - 1,651 - 3,200 ETB: 15% (deduct 142.5)
 * - 3,201 - 5,250 ETB: 20% (deduct 302.5)
 * - 5,251 - 7,800 ETB: 25% (deduct 565)
 * - 7,801 - 10,900 ETB: 30% (deduct 955)
 * - 10,901+ ETB: 35% (deduct 1500)
 * 
 * @param taxableIncome The employee's taxable monthly income (Gross minus employee pension and penalty)
 * @returns The calculated income tax rounded to 2 decimal places
 */
export function calculateEthiopianIncomeTax(taxableIncome: number): number {
  if (taxableIncome <= 600) {
    return 0;
  } else if (taxableIncome <= 1650) {
    return parseFloat(((taxableIncome * 0.10) - 60).toFixed(2));
  } else if (taxableIncome <= 3200) {
    return parseFloat(((taxableIncome * 0.15) - 142.5).toFixed(2));
  } else if (taxableIncome <= 5250) {
    return parseFloat(((taxableIncome * 0.20) - 302.5).toFixed(2));
  } else if (taxableIncome <= 7800) {
    return parseFloat(((taxableIncome * 0.25) - 565).toFixed(2));
  } else if (taxableIncome <= 10900) {
    return parseFloat(((taxableIncome * 0.30) - 955).toFixed(2));
  } else {
    return parseFloat(((taxableIncome * 0.35) - 1500).toFixed(2));
  }
}

/**
 * Calculates employee and employer pension contributions.
 * 
 * - Employee contribution: 7%
 * - Employer contribution: 11%
 * 
 * @param basicSalary The basic salary of the employee
 * @returns Object containing employee and employer pension deductions
 */
export function calculatePension(basicSalary: number) {
  const employee = parseFloat((basicSalary * 0.07).toFixed(2));
  const employer = parseFloat((basicSalary * 0.11).toFixed(2));
  return { employee, employer };
}

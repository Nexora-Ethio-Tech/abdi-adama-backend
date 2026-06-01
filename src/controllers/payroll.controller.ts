import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import payrollService from '../services/payroll.service';
import { generatePayrollCSV, generatePayrollHTML, generateCustomExcel } from '../utils/exportService';

class PayrollController {
  /**
   * Generates a monthly payroll run (as draft).
   */
  async generatePayroll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { month, year, branchId, overtimeHoursMap } = req.body;
      const generatedBy = req.user!.id;

      if (!month || !year) {
        res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'month and year are required.' } });
        return;
      }

      const run = await payrollService.generatePayroll(
        month,
        Number(year),
        branchId || null,
        generatedBy,
        overtimeHoursMap || {}
      );

      res.status(201).json({
        success: true,
        data: run,
        message: 'Draft payroll run generated successfully.'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'PAYROLL_GENERATION_FAILED',
          message: error.message
        }
      });
    }
  }

  /**
   * Lists all payroll runs.
   */
  async getPayrollRuns(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { branchId, status } = req.query;
      const runs = await payrollService.getPayrollRuns({
        branchId: branchId as string,
        status: status as string
      });
      res.json({
        success: true,
        data: runs,
        count: runs.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves a specific payroll run with all payslip items.
   */
  async getPayrollRun(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await payrollService.getPayrollRun(id);
      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deletes a draft payroll run.
   */
  async deletePayrollRun(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await payrollService.deletePayrollRun(id);
      res.json({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'PAYROLL_DELETE_FAILED',
          message: error.message
        }
      });
    }
  }

  /**
   * Finalizes a draft payroll run.
   */
  async finalizePayroll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const finalizedBy = req.user!.id;

      const result = await payrollService.finalizePayroll(id, finalizedBy);
      res.json({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'PAYROLL_FINALIZATION_FAILED',
          message: error.message
        }
      });
    }
  }

  /**
   * Retrieves personal payslip for logged in employee for a specific month and year.
   */
  async getMyPayslip(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { month, year } = req.query;

      if (!month || !year) {
        res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'month and year are required query parameters.' } });
        return;
      }

      const payslip = await payrollService.getPayslip(userId, month as string, Number(year));
      if (!payslip) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `No finalized payslip found for ${month} ${year}.`
          }
        });
        return;
      }

      res.json({
        success: true,
        data: payslip
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves all personal payslip history for logged in employee.
   */
  async getMyPayslips(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const payslips = await payrollService.getPayslipHistory(userId);
      res.json({
        success: true,
        data: payslips,
        count: payslips.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves monthly school liability totals.
   */
  async getSchoolLiability(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { month, year } = req.query;
      if (!month || !year) {
        res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'month and year are required query parameters.' } });
        return;
      }

      const liability = await payrollService.getSchoolLiability(month as string, Number(year));
      res.json({
        success: true,
        data: liability
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Exports a payroll run as CSV or print-ready HTML.
   */
  async exportPayroll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { format } = req.query; // 'csv' or 'html'

      const { run, items } = await payrollService.getPayrollRun(id);

      if (format === 'html') {
        const htmlContent = generatePayrollHTML(run, items);
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(htmlContent);
      } else {
        // Default to CSV
        const csvContent = generatePayrollCSV(run, items);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="payroll_run_${run.month}_${run.year}.csv"`);
        res.status(200).send(csvContent);
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Custom export for Auditor with Staff Payroll and Other Transactions filtering.
   */
  async customExport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { month, year, includeStaff, includeOther } = req.query;

      if (!month || !year) {
        res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'month and year are required.' } });
        return;
      }

      const isStaff = includeStaff === 'true';
      const isOther = includeOther === 'true';

      if (!isStaff && !isOther) {
        res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'At least one export type must be selected.' } });
        return;
      }

      const data = await payrollService.getCustomExportData(
        month as string,
        Number(year),
        isStaff,
        isOther
      );

      // No data found — return a friendly JSON notice, not an error
      if (data.empty) {
        res.status(200).json({
          success: false,
          empty: true,
          message: `No records were found for ${month} ${year}. There may not be any payroll runs or transactions recorded for this period yet.`
        });
        return;
      }

      const buffer = generateCustomExcel(
        month as string,
        Number(year),
        data.staffData,
        data.otherData
      );

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="auditor_report_${month}_${year}.xlsx"`);
      res.status(200).send(buffer);
    } catch (error: any) {
      next(error);
    }
  }
}

export default new PayrollController();

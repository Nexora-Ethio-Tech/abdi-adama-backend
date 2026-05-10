import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import financeClerkService from '../services/financeClerk.service';

class FinanceClerkController {
  // Record payment
  async recordPayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { studentId, amount, type, date } = req.body;
      const verifiedBy = req.user!.name;
      const branchId = req.user!.branchId;

      const payment = await financeClerkService.recordPayment({
        studentId,
        amount,
        type,
        date,
        verifiedBy,
        branchId
      });

      res.status(201).json({
        success: true,
        data: payment,
        message: 'Payment recorded successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Get payment history for a student
  async getPaymentHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { studentId } = req.params;
      const payments = await financeClerkService.getPaymentHistory(studentId);

      res.json({
        success: true,
        data: payments
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all students with fee information
  async getStudentsWithFees(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branchId;
      const { search, feeStatus } = req.query;

      const students = await financeClerkService.getStudentsWithFees(
        branchId!,
        search as string,
        feeStatus as string
      );

      res.json({
        success: true,
        data: students
      });
    } catch (error) {
      next(error);
    }
  }

  // Update student fee status and create reduction request
  async updateFeeStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { feeStatus, monthlyFee, busFee, penaltyFee, feeNotes } = req.body;

      const student = await financeClerkService.updateFeeStatus(id, {
        feeStatus,
        monthlyFee,
        busFee,
        penaltyFee,
        feeNotes
      });

      res.json({
        success: true,
        data: student,
        message: 'Fee status updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Get dashboard statistics
  async getDashboard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branchId;
      const stats = await financeClerkService.getDashboardStats(branchId!);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  // Get overdue payments
  async getOverduePayments(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branchId;
      const overdueStudents = await financeClerkService.getOverduePayments(branchId!);

      res.json({
        success: true,
        data: overdueStudents
      });
    } catch (error) {
      next(error);
    }
  }

  // Get daily collection report
  async getDailyReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branchId;
      const { date } = req.query;

      const report = await financeClerkService.getDailyReport(
        branchId!,
        date as string
      );

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new FinanceClerkController();

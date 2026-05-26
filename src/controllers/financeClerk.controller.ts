import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import financeClerkService from '../services/financeClerk.service';

class FinanceClerkController {
  // Record payment
  async recordPayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { studentId, amount, type, date } = req.body;
      const verifiedBy = req.user!.name;
      const branchId = req.user!.branch_id;
      const normalizedType = Array.isArray(type) ? type.join(', ') : type;

      const payment = await financeClerkService.recordPayment({
        studentId,
        amount,
        type: normalizedType,
        date,
        verifiedBy,
        branchId: branchId!
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

  // Get pending applications assigned to finance
  async getPendingApplications(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const { status } = req.query;

      const apps = await financeClerkService.getPendingApplications(branchId!, status as string);

      res.json({ success: true, data: apps });
    } catch (error) {
      next(error);
    }
  }

  // Approve application and finalize registration after payment
  async approveApplication(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { amount, reference } = req.body;
      const financeUserId = req.user!.id;

      const result = await financeClerkService.approveApplication(id, { amount, reference }, financeUserId);

      res.status(201).json({ success: true, data: result, message: 'Application approved and student registered' });
    } catch (error) {
      next(error);
    }
  }

  // Get all students with fee information
  async getStudentsWithFees(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
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

  // Get transport-managed students
  async getTransportStudents(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const { search, status } = req.query;

      const students = await financeClerkService.getTransportStudents(
        branchId!,
        search as string,
        (status as 'assigned' | 'unassigned' | 'all') || 'assigned'
      );

      res.json({ success: true, data: students });
    } catch (error) {
      next(error);
    }
  }

  // Get available driver routes for transport assignment
  async getTransportRoutes(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const { search } = req.query;

      const routes = await financeClerkService.getTransportRoutes(branchId!, search as string);

      res.json({ success: true, data: routes });
    } catch (error) {
      next(error);
    }
  }

  // Assign or change a student's driver/route
  async assignTransportStudent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const verifiedBy = req.user!.name;
      const { studentId, routeId, transportFee } = req.body;

      const result = await financeClerkService.assignTransportStudent({
        branchId: branchId!,
        studentId,
        routeId,
        transportFee: Number(transportFee),
        verifiedBy
      });

      res.status(201).json({ success: true, data: result, message: 'Transport assignment saved successfully' });
    } catch (error) {
      next(error);
    }
  }

  // Stop transport and create a proration settlement
  async stopTransportStudent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const verifiedBy = req.user!.name;
      const { studentId, daysUsed } = req.body;

      const result = await financeClerkService.stopTransportStudent({
        branchId: branchId!,
        studentId,
        daysUsed: Number(daysUsed),
        verifiedBy
      });

      res.status(201).json({ success: true, data: result, message: 'Transport stopped and settlement recorded' });
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
      const branchId = req.user!.branch_id;
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
      const branchId = req.user!.branch_id;
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
      const branchId = req.user!.branch_id;
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

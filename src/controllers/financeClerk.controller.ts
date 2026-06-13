import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import financeClerkService from '../services/financeClerk.service';
import schoolAdminService from '../services/schoolAdmin.service';

class FinanceClerkController {
  // Record payment
  async recordPayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { studentId, items, month, date, reference } = req.body;
      const verifiedBy = req.user!.name;
      const branchId = req.user!.branch_id;

      const payment = await financeClerkService.recordPayment({
        studentId,
        items,
        month,
        date,
        reference,
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

  async getStudentOutstanding(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { month } = req.query; // YYYY-MM

      const outstanding = await financeClerkService.getStudentOutstanding(id, (month as string) || undefined);

      res.json({ success: true, data: outstanding });
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
      const { amount, reference, parentDigitalId } = req.body;
      const financeUserId = req.user!.id;

      const result = await financeClerkService.approveApplication(
        id,
        { amount, reference, parentDigitalId },
        financeUserId
      );

      res.status(201).json({ success: true, data: result, message: 'Application approved and student registered' });
    } catch (error) {
      next(error);
    }
  }

  async rejectApplication(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const financeUserId = req.user!.id;
      const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : undefined;

      const result = await financeClerkService.rejectApplication(id, financeUserId, reason);

      res.status(200).json({ success: true, data: result, message: 'Application returned to school admin' });
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

  // Get all students with fee information
  async getStudentsWithFees(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const { search, feeStatus, grade } = req.query;

      const students = await financeClerkService.getStudentsWithFees(
        branchId,
        search as string,
        feeStatus as string,
        grade as string
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

  async getGlobalRegistrationFee(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const grade = (req.query.grade as string) || undefined;
      const fee = await financeClerkService.getGlobalRegistrationFee(branchId!, grade);

      res.json({ success: true, data: fee });
    } catch (error) {
      next(error);
    }
  }

  // Get all drivers in the branch
  async getTransportDrivers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;

      const drivers = await schoolAdminService.getBranchUsers(branchId!, 'driver');

      res.json({ success: true, data: drivers });
    } catch (error) {
      next(error);
    }
  }

  // Get financial policies for transport fee lookup
  async getTransportPolicies(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;

      const policies = await financeClerkService.getTransportPolicies(branchId!);

      res.json({ success: true, data: policies });
    } catch (error) {
      next(error);
    }
  }

  // Assign or change a student's driver/route
  async assignTransportStudent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const verifiedBy = req.user!.name;
      const { studentId, driverId, transportFee } = req.body;

      const result = await financeClerkService.assignTransportStudent({
        branchId: branchId!,
        studentId,
        driverId,
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
      const { feeStatus, monthlyFee, busFee, penaltyFee, feeNotes, requestedAidAmount } = req.body;

      const student = await financeClerkService.updateFeeStatus(id, {
        feeStatus,
        monthlyFee,
        busFee,
        penaltyFee,
        feeNotes,
        requestedAidAmount
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

  // Send SMS to parent about overdue payment
  async sendSms(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { studentId, message } = req.body;
      const branchId = req.user!.branch_id || undefined;
      const financeClerkName = req.user!.name;

      if (!studentId || typeof studentId !== 'string') {
        res.status(400).json({
          success: false,
          error: { message: 'Student ID is required' }
        });
        return;
      }

      if (!message || typeof message !== 'string') {
        res.status(400).json({
          success: false,
          error: { message: 'Message is required' }
        });
        return;
      }

      const result = await financeClerkService.sendSmsToParent(
        studentId,
        message,
        branchId
      );

      console.log(`[Finance Clerk SMS] ${financeClerkName} sent SMS to student ${studentId}`);

      res.status(200).json({
        success: true,
        data: result,
        message: 'SMS sent successfully to parent'
      });
    } catch (error: any) {
      const statusCode = error.message?.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          message: error.message || 'Failed to send SMS'
        }
      });
    }
  }
}

export default new FinanceClerkController();

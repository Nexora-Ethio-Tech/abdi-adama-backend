import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import auditorService from '../services/auditor.service';

class AuditorController {
  async getPayments(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const { studentId, startDate, endDate } = req.query;

      const payments = await auditorService.getPayments(branchId!, {
        studentId: studentId as string,
        startDate: startDate as string,
        endDate: endDate as string
      });

      res.json({
        success: true,
        data: payments
      });
    } catch (error) {
      next(error);
    }
  }

  async getFeeReductionRequests(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const { status } = req.query;

      const requests = await auditorService.getFeeReductionRequests(branchId!, status as string);

      res.json({
        success: true,
        data: requests
      });
    } catch (error) {
      next(error);
    }
  }

  async updateFeeReductionStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const branchId = req.user!.branch_id;
      const auditorId = req.user!.id;

      const student = await auditorService.updateFeeReductionStatus(id, branchId!, status, auditorId);

      res.json({
        success: true,
        data: student,
        message: `Fee reduction ${status.toLowerCase()} successfully`
      });
    } catch (error) {
      next(error);
    }
  }

  async getFinancialReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'startDate and endDate are required'
          }
        });
        return;
      }

      const report = await auditorService.getFinancialReport(branchId!, startDate as string, endDate as string);

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      next(error);
    }
  }

  async getAuditTrail(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const { userId, action, startDate, endDate } = req.query;

      const auditTrail = await auditorService.getAuditTrail(branchId!, {
        userId: userId as string,
        action: action as string,
        startDate: startDate as string,
        endDate: endDate as string
      });

      res.json({
        success: true,
        data: auditTrail
      });
    } catch (error) {
      next(error);
    }
  }

  async getDashboard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const dashboard = await auditorService.getDashboard(branchId!);

      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuditorController();

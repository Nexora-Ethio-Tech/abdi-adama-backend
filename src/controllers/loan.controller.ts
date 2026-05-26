import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import loanService from '../services/loan.service';

class LoanController {
  /**
   * Issues a new loan to an employee.
   */
  async issueLoan(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { employeeId, amount, notes } = req.body;
      const issuedBy = req.user!.id;

      if (!employeeId) {
        res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'employeeId is required.' } });
        return;
      }
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'A valid positive amount is required.' } });
        return;
      }

      const loan = await loanService.issueLoan(employeeId, Number(amount), notes, issuedBy);
      res.status(201).json({
        success: true,
        data: loan,
        message: 'Loan request submitted and pending auditor approval.'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'LOAN_ISSUANCE_FAILED',
          message: error.message
        }
      });
    }
  }

  async approveLoan(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const auditorId = req.user!.id;
      const loan = await loanService.approveLoan(id, auditorId);
      res.json({
        success: true,
        data: loan,
        message: 'Loan request approved and ready for payment.'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'LOAN_APPROVAL_FAILED',
          message: error.message
        }
      });
    }
  }

  async rejectLoan(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const auditorId = req.user!.id;
      const loan = await loanService.rejectLoan(id, auditorId, reason);
      res.json({
        success: true,
        data: loan,
        message: 'Loan request rejected.'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'LOAN_REJECTION_FAILED',
          message: error.message
        }
      });
    }
  }

  async payLoan(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const paidBy = req.user!.id;
      const loan = await loanService.payLoan(id, paidBy);
      res.json({
        success: true,
        data: loan,
        message: 'Loan has been marked as paid and is now active.'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'LOAN_PAYMENT_FAILED',
          message: error.message
        }
      });
    }
  }

  /**
   * Gets all loans, with optional status and employeeId filters.
   */
  async getLoans(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, employeeId } = req.query;
      const loans = await loanService.getLoans({
        status: status as string,
        employeeId: employeeId as string
      });
      res.json({
        success: true,
        data: loans,
        count: loans.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Gets the active loan for the logged-in staff member.
   */
  async getMyActiveLoan(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const loan = await loanService.getActiveLoan(userId);
      res.json({
        success: true,
        data: loan
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Gets the loan history for the logged-in staff member.
   */
  async getMyLoans(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const loans = await loanService.getLoansByEmployee(userId);
      res.json({
        success: true,
        data: loans,
        count: loans.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Gets loan details by ID.
   */
  async getLoanById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const loans = await loanService.getLoans();
      const loan = loans.find(l => l.id === id);
      if (!loan) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Loan not found.' } });
        return;
      }
      res.json({
        success: true,
        data: loan
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancels/voids an active loan.
   */
  async cancelLoan(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const cancelledBy = req.user!.id;

      const loan = await loanService.cancelLoan(id, cancelledBy);
      res.json({
        success: true,
        data: loan,
        message: 'Loan successfully cancelled.'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'LOAN_CANCELLATION_FAILED',
          message: error.message
        }
      });
    }
  }
}

export default new LoanController();

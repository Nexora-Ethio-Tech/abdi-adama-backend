import { Router } from 'express';
import loanController from '../controllers/loan.controller';
import { authenticate } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import { UserRole } from '../types';

const router = Router();

// All loan routes require authentication
router.use(authenticate);

// Staff self-service routes (any authenticated staff role)
router.get('/my-loan', loanController.getMyActiveLoan);
router.get('/my-loans', loanController.getMyLoans);

// Management and Auditor routes
router.get('/', roleGuard([UserRole.FINANCE_CLERK, UserRole.SUPER_ADMIN, UserRole.AUDITOR]), loanController.getLoans);
router.get('/:id', roleGuard([UserRole.FINANCE_CLERK, UserRole.SUPER_ADMIN, UserRole.AUDITOR]), loanController.getLoanById);

// Administrative modification routes
router.post('/', roleGuard([UserRole.FINANCE_CLERK, UserRole.SUPER_ADMIN]), loanController.issueLoan);
router.post('/:id/confirm', roleGuard([UserRole.AUDITOR]), loanController.approveLoan);
router.post('/:id/reject', roleGuard([UserRole.AUDITOR]), loanController.rejectLoan);
router.post('/:id/pay', roleGuard([UserRole.FINANCE_CLERK, UserRole.SUPER_ADMIN]), loanController.payLoan);
router.post('/:id/cancel', roleGuard([UserRole.FINANCE_CLERK, UserRole.SUPER_ADMIN]), loanController.cancelLoan);

export default router;

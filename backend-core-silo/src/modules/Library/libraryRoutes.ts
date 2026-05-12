import { Router } from 'express';
import { getStats, getBooks, addBook, getLoans, issueBook, returnBook } from './libraryController';
import { authenticateToken, authorizeRoles } from '../../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);
router.use(authorizeRoles('Librarian'));

router.get('/stats',              getStats);
router.get('/books',              getBooks);
router.post('/add-book',          addBook);
router.get('/loans',              getLoans);
router.post('/issue',             issueBook);
router.post('/return/:loanId',    returnBook);

export default router;

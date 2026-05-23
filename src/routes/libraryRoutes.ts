import { Router } from 'express';
import {
  getStats,
  getBooks,
  getAvailableBooks,
  addBook,
  getLoans,
  validateStudent,
  validateTeacher,
  issueBook,
  returnBook,
} from '../controllers/libraryController';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);
router.use(authorizeRoles('Librarian'));

router.get('/stats',              getStats);
router.get('/books',              getBooks);
router.get('/available-books',    getAvailableBooks);
router.get('/validate-student/:studentId', validateStudent);
router.get('/validate-teacher/:teacherId', validateTeacher);
router.post('/add-book',          addBook);
router.get('/loans',              getLoans);
router.post('/issue',             issueBook);
router.post('/return/:loanId',    returnBook);

export default router;

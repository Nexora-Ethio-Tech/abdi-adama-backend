import { Request, Response } from 'express';
import pool from '../config/db';
import { sendError, getPagination } from '../shared/responseUtils';

/**
 * GET /api/library/stats
 */
export const getStats = async (req: Request, res: Response) => {
  try {
    const [coll, loans, avail] = await Promise.all([
      pool.query('SELECT SUM(total) as total FROM library_books'),
      pool.query('SELECT COUNT(*) as active FROM library_loans WHERE returned_at IS NULL'),
      pool.query("SELECT SUM(available) as available FROM library_books"),
    ]);

    res.json({
      totalCollection: parseInt(coll.rows[0].total || '0', 10),
      activeLoans: parseInt(loans.rows[0].active || '0', 10),
      availableNow: parseInt(avail.rows[0].available || '0', 10),
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    sendError(res, 'Failed to fetch library stats.', 500, err.message);
  }
};

/**
 * GET /api/library/books?search=&page=&limit=
 * Frontend expects: id, title, author, isbn, shelf, total, available, status
 */
export const getBooks = async (req: Request, res: Response) => {
  const { search } = req.query;
  const { limit, offset, page } = getPagination(req.query);

  try {
    const searchFilter = search
      ? `WHERE title ILIKE $3 OR author ILIKE $3 OR book_code ILIKE $3`
      : '';
    const params: any[] = search
      ? [limit, offset, `%${search}%`]
      : [limit, offset];

    const countQuery = search
      ? `SELECT COUNT(*) FROM library_books WHERE title ILIKE $1 OR author ILIKE $1 OR book_code ILIKE $1`
      : `SELECT COUNT(*) FROM library_books`;
    const countParams = search ? [`%${search}%`] : [];

    const [dataResult, countResult] = await Promise.all([
      pool.query(
        `SELECT
           id,
           title,
           author,
           shelf,
           total,
           available,
           status,
           book_code,
           isbn,
           created_at
         FROM library_books
         ${searchFilter}
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        params
      ),
      pool.query(countQuery, countParams),
    ]);

    res.json({
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
      page,
      limit,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    sendError(res, 'Failed to fetch books.', 500, err.message);
  }
};

/**
 * GET /api/library/available-books
 * Returns only books that are currently in stock (available > 0)
 * Used for the dropdown in Issue Book modal
 */
export const getAvailableBooks = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT
         id,
         title,
         author,
         book_code,
         available,
         shelf
       FROM library_books
       WHERE available > 0
       ORDER BY title ASC`
    );

    res.json({
      data: result.rows,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    sendError(res, 'Failed to fetch available books.', 500, err.message);
  }
};

/**
 * POST /api/library/add-book
 */
export const addBook = async (req: Request, res: Response) => {
  const { title, author, shelf_location, stock } = req.body;

  if (!title || !author) {
    sendError(res, 'Title and author are required.');
    return;
  }

  try {
    const stockNum = parseInt(stock || '1', 10);
    // Generate a permanent short Book ID (e.g., BK-1234)
    const bookCode = `BK-${Math.floor(1000 + Math.random() * 9000)}`;

    const result = await pool.query(
      `INSERT INTO library_books (title, author, shelf, total, available, status, book_code)
       VALUES ($1, $2, $3, $4, $4, 'Available', $5)
       RETURNING id, title, author, shelf, total, available, status, book_code, created_at`,
      [title, author, shelf_location, stockNum, bookCode]
    );

    res.status(201).json({
      status: 'success',
      message: 'Book added successfully.',
      data: result.rows[0],
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    sendError(res, 'Failed to add book.', 500, err.message);
  }
};

/**
 * GET /api/library/validate-student/:studentId
 * Validates if a student ID exists in the system
 * Accepts: UUID or digital_id
 */
export const validateStudent = async (req: Request, res: Response) => {
  const { studentId } = req.params;

  if (!studentId) {
    sendError(res, 'Student ID is required.');
    return;
  }

  try {
    const result = await pool.query(
      `SELECT s.id, u.name, u.digital_id 
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.id::text = $1 OR u.digital_id = $1 OR u.username = $1`,
      [studentId.trim()]
    );

    if (result.rows.length === 0) {
      return res.json({
        valid: false,
        message: 'This Student ID is not valid.',
      });
    }

    const student = result.rows[0];
    res.json({
      valid: true,
      student: {
        id: student.id,
        name: student.name,
        digital_id: student.digital_id,
      },
      message: 'Student found.',
    });
  } catch (err: any) {
    sendError(res, 'Failed to validate student.', 500, err.message);
  }
};

/**
 * GET /api/library/validate-teacher/:teacherId
 * Validates if a teacher ID exists in the system
 * Accepts: UUID or digital_id
 */
export const validateTeacher = async (req: Request, res: Response) => {
  const { teacherId } = req.params;

  if (!teacherId) {
    sendError(res, 'Teacher ID is required.');
    return;
  }

  try {
    const result = await pool.query(
      `SELECT t.id, u.name, u.digital_id 
       FROM teachers t
       JOIN users u ON t.user_id = u.id
       WHERE t.id::text = $1 OR u.digital_id = $1 OR u.username = $1`,
      [teacherId.trim()]
    );

    if (result.rows.length === 0) {
      return res.json({
        valid: false,
        message: 'This Teacher ID is not valid.',
      });
    }

    const teacher = result.rows[0];
    res.json({
      valid: true,
      teacher: {
        id: teacher.id,
        name: teacher.name,
        digital_id: teacher.digital_id,
      },
      message: 'Teacher found.',
    });
  } catch (err: any) {
    sendError(res, 'Failed to validate teacher.', 500, err.message);
  }
};

/**
 * GET /api/library/loans?search=&page=&limit=
 * Returns active loans with book/borrower info.
 */
export const getLoans = async (req: Request, res: Response) => {
  const { search } = req.query;
  const { limit, offset, page } = getPagination(req.query);

  try {
    const searchFilter = search
      ? `WHERE l.borrower_name ILIKE $3 OR l.book_title ILIKE $3`
      : '';
    const params: any[] = search ? [limit, offset, `%${search}%`] : [limit, offset];

    const [dataResult] = await Promise.all([
      pool.query(
        `SELECT
           l.id,
           l.book_id,
           l.student_id,
           l.teacher_id,
           l.borrower_type,
           l.borrower_name,
           l.book_title,
           l.book_code,
           l.student_school_id,
           l.borrowed_at,
           l.due_date,
           l.returned_at,
           CASE
             WHEN l.returned_at IS NOT NULL THEN 0
             WHEN l.due_date < CURRENT_DATE THEN (CURRENT_DATE - l.due_date)
             ELSE 0
           END AS days_overdue,
           CASE
             WHEN l.returned_at IS NOT NULL THEN 0
             WHEN l.due_date < CURRENT_DATE THEN (CURRENT_DATE - l.due_date) * 5
             ELSE 0
           END AS fine_amount
         FROM library_loans l
         ${searchFilter}
         ORDER BY 
           CASE WHEN l.returned_at IS NULL THEN 0 ELSE 1 END,
           l.borrowed_at DESC,
           l.created_at DESC
         LIMIT $1 OFFSET $2`,
        params
      ),
    ]);

    res.json({
      data: dataResult.rows,
      page,
      limit,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    sendError(res, 'Failed to fetch loans.', 500, err.message);
  }
};

/**
 * POST /api/library/issue
 * Issues a book to a student or teacher
 * Body: { book_id, borrower_id, borrower_type, due_date }
 * borrower_type: 'student' or 'teacher'
 */
export const issueBook = async (req: Request, res: Response) => {
  const { book_id, borrower_id, borrower_type, due_date } = req.body;

  // Validation
  if (!book_id || !borrower_id || !borrower_type || !due_date) {
    sendError(res, 'book_id, borrower_id, borrower_type, and due_date are required.');
    return;
  }

  if (!['student', 'teacher'].includes(borrower_type)) {
    sendError(res, 'borrower_type must be "student" or "teacher".');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check book exists and has stock
    const bookResult = await client.query(
      'SELECT id, title, book_code, available, status FROM library_books WHERE id = $1',
      [book_id]
    );
    if (bookResult.rows.length === 0) {
      await client.query('ROLLBACK');
      sendError(res, 'Book not found.', 404);
      return;
    }
    const book = bookResult.rows[0];
    if (book.available < 1) {
      await client.query('ROLLBACK');
      sendError(res, 'This book is out of stock.', 409);
      return;
    }

    let borrower: any = null;
    let borrowerName = '';
    let studentId = null;
    let teacherId = null;

    if (borrower_type === 'student') {
      // Resolve student (handle both UUID and digital_id)
      const studentResult = await client.query(
        `SELECT s.id, u.name, u.digital_id 
         FROM students s 
         JOIN users u ON s.user_id = u.id 
         WHERE s.id::text = $1 OR u.digital_id = $1 OR u.username = $1`,
        [borrower_id.trim()]
      );
      if (studentResult.rows.length === 0) {
        await client.query('ROLLBACK');
        sendError(res, 'This Student ID is not valid.', 404);
        return;
      }
      borrower = studentResult.rows[0];
      studentId = borrower.id;
      borrowerName = borrower.name;
    } else if (borrower_type === 'teacher') {
      // Resolve teacher (handle both UUID and digital_id)
      const teacherResult = await client.query(
        `SELECT t.id, u.name, u.digital_id 
         FROM teachers t 
         JOIN users u ON t.user_id = u.id 
         WHERE t.id::text = $1 OR u.digital_id = $1 OR u.username = $1`,
        [borrower_id.trim()]
      );
      if (teacherResult.rows.length === 0) {
        await client.query('ROLLBACK');
        sendError(res, 'This Teacher ID is not valid.', 404);
        return;
      }
      borrower = teacherResult.rows[0];
      teacherId = borrower.id;
      borrowerName = borrower.name;
    }

    // Create loan record with denormalized data
    const loanResult = await client.query(
      `INSERT INTO library_loans 
       (book_id, student_id, teacher_id, borrower_type, borrower_name, book_title, 
        book_code, borrowed_at, due_date, loan_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, $8, 'Borrowed')
       RETURNING *`,
      [book_id, studentId, teacherId, borrower_type, borrowerName, book.title, book.book_code, due_date]
    );

    // Decrement available and update status if needed
    const newAvailable = book.available - 1;
    await client.query(
      `UPDATE library_books 
       SET available = $1, 
           status = CASE WHEN $1 = 0 THEN 'Out of Stock' ELSE 'Available' END 
       WHERE id = $2`,
      [newAvailable, book.id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      status: 'success',
      message: `Book "${book.title}" issued to ${borrowerName}.`,
      data: loanResult.rows[0],
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('[Library] IssueBook error:', err);
    sendError(res, `Failed to issue book: ${err.message}`, 500);
    return;
  } finally {
    client.release();
  }
};

/**
 * POST /api/library/return/:loanId
 * Marks a loan as returned.
 */
export const returnBook = async (req: Request, res: Response) => {
  const { loanId } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const loanResult = await client.query(
      'SELECT * FROM library_loans WHERE id = $1',
      [loanId]
    );
    if (loanResult.rows.length === 0) {
      await client.query('ROLLBACK');
      sendError(res, 'Loan not found.', 404);
      return;
    }
    const loan = loanResult.rows[0];
    if (loan.returned_at) {
      await client.query('ROLLBACK');
      sendError(res, 'This book has already been returned.', 409);
      return;
    }

    // Mark returned
    await client.query(
      'UPDATE library_loans SET returned_at = CURRENT_DATE, loan_status = $1 WHERE id = $2',
      ['Returned', loanId]
    );

    // Increment book available and update status
    await client.query(
      `UPDATE library_books
       SET available = available + 1,
           status = CASE WHEN available + 1 > 0 THEN 'Available' ELSE status END
       WHERE id = $1`,
      [loan.book_id]
    );

    await client.query('COMMIT');

    res.json({
      status: 'success',
      message: 'Book returned successfully.',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    sendError(res, 'Failed to return book.', 500, err.message);
    return;
  } finally {
    client.release();
  }
};

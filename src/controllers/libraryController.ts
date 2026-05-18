import { Request, Response } from 'express';
import pool from '../config/db';
import { sendError, getPagination } from '../shared/responseUtils';

/**
 * GET /api/library/stats
 */
export const getStats = async (req: Request, res: Response) => {
  try {
    const [coll, loans, avail] = await Promise.all([
      pool.query('SELECT SUM(total_copies) as total FROM silo_books'),
      pool.query('SELECT COUNT(*) as active FROM silo_loans WHERE returned_at IS NULL'),
      pool.query("SELECT SUM(stock) as available FROM silo_books"),
    ]);

    res.json({
      totalCollection: parseInt(coll.rows[0].total   || '0', 10),
      activeLoans:     parseInt(loans.rows[0].active  || '0', 10),
      availableNow:    parseInt(avail.rows[0].available || '0', 10),
      timestamp:       new Date().toISOString(),
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
      ? `WHERE title ILIKE $3 OR author ILIKE $3 OR isbn ILIKE $3`
      : '';
    const params: any[] = search
      ? [limit, offset, `%${search}%`]
      : [limit, offset];

    const countQuery = search
      ? `SELECT COUNT(*) FROM silo_books WHERE title ILIKE $1 OR author ILIKE $1 OR isbn ILIKE $1`
      : `SELECT COUNT(*) FROM silo_books`;
    const countParams = search ? [`%${search}%`] : [];

    const [dataResult, countResult] = await Promise.all([
      pool.query(
        `SELECT
           id,
           title,
           author,
           isbn,
           shelf_location AS shelf,
           total_copies    AS total,
           stock           AS available,
           status,
           book_code,
           created_at
         FROM silo_books
         ${searchFilter}
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        params
      ),
      pool.query(countQuery, countParams),
    ]);

    res.json({
      data:      dataResult.rows,
      total:     parseInt(countResult.rows[0].count, 10),
      page,
      limit,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    sendError(res, 'Failed to fetch books.', 500, err.message);
  }
};

/**
 * POST /api/library/add-book
 */
export const addBook = async (req: Request, res: Response) => {
  const { title, author, isbn, shelf_location, stock } = req.body;

  if (!title || !author) {
    return sendError(res, 'Title and author are required.');
  }

  try {
    const stockNum = parseInt(stock || '1', 10);
    // Generate a permanent short Book ID (e.g., BK-1234)
    const bookCode = `BK-${Math.floor(1000 + Math.random() * 9000)}`;

    const result = await pool.query(
      `INSERT INTO silo_books (title, author, isbn, shelf_location, stock, total_copies, status, book_code)
       VALUES ($1, $2, $3, $4, $5, $5, 'Available', $6)
       RETURNING id, title, author, isbn, shelf_location AS shelf, total_copies AS total, stock AS available, status, book_code, created_at`,
      [title, author, isbn && isbn.trim() !== '' ? isbn.trim() : null, shelf_location, stockNum, bookCode]
    );

    res.status(201).json({
      status:  'success',
      message: 'Book added successfully.',
      data:    result.rows[0],
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    if (err.code === '23505') {
      return sendError(res, 'A book with this ISBN already exists.', 409);
    }
    sendError(res, 'Failed to add book.', 500, err.message);
  }
};

/**
 * GET /api/library/loans?search=&page=&limit=
 * Returns active loans with book/student info.
 */
export const getLoans = async (req: Request, res: Response) => {
  const { search } = req.query;
  const { limit, offset, page } = getPagination(req.query);

  try {
    const searchFilter = search
      ? `WHERE l.student_name ILIKE $3 OR l.book_title ILIKE $3`
      : '';
    const params: any[] = search ? [limit, offset, `%${search}%`] : [limit, offset];

    const [dataResult] = await Promise.all([
      pool.query(
        `SELECT
           l.id,
           l.book_id,
           l.student_id,
           l.student_name,
           l.book_title,
           l.book_code,
           l.student_school_id,
           l.loan_date     AS borrowed_at,
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
         FROM silo_loans l
         ${searchFilter}
         ORDER BY 
           CASE WHEN l.returned_at IS NULL THEN 0 ELSE 1 END,
           l.loan_date DESC,
           l.created_at DESC
         LIMIT $1 OFFSET $2`,
        params
      ),
    ]);

    res.json({
      data:      dataResult.rows,
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
 * Issues a book to a student. Body: { book_id, student_id, due_date }
 */
export const issueBook = async (req: Request, res: Response) => {
  const { book_id, student_id, due_date } = req.body;

  if (!book_id || !student_id || !due_date) {
    return sendError(res, 'book_id, student_id, and due_date are required.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check book exists and has stock
    const bookResult = await client.query(
      'SELECT id, title, stock, status, book_code FROM silo_books WHERE id = $1',
      [book_id]
    );
    if (bookResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return sendError(res, 'Book not found.', 404);
    }
    const book = bookResult.rows[0];
    if (book.stock < 1) {
      await client.query('ROLLBACK');
      return sendError(res, 'This book is out of stock.', 409);
    }

    // Resolve student identity (handle both UUID and School ID)
    const studentResult = await client.query(
      'SELECT id, full_name, school_id FROM silo_identities WHERE id::text = $1 OR school_id = $1',
      [student_id]
    );
    if (studentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return sendError(res, `Student with ID "${student_id}" not found.`, 404);
    }
    const student = studentResult.rows[0];

    // Create loan record
    // Create loan record with permanent Book ID and real Student School ID
    const loanResult = await client.query(
      `INSERT INTO silo_loans (book_id, student_id, loan_date, due_date, student_name, book_title, book_code, student_school_id)
       VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, $7)
       RETURNING *`,
      [book.id, student.id, due_date, student.full_name, book.title, (book as any).book_code || 'N/A', student.school_id]
    );

    // Decrement stock and update status if needed
    const newStock = book.stock - 1;
    await client.query(
      `UPDATE silo_books SET stock = $1, status = CASE WHEN $1 = 0 THEN 'Out of Stock'::silo_book_status ELSE 'Borrowed'::silo_book_status END WHERE id = $2`,
      [newStock, book.id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      status:  'success',
      message: `Book "${book.title}" issued to ${student.full_name}.`,
      data:    loanResult.rows[0],
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('[Library] IssueBook error:', err);
    sendError(res, `Failed to issue book: ${err.message}`, 500);
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
      'SELECT * FROM silo_loans WHERE id = $1',
      [loanId]
    );
    if (loanResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return sendError(res, 'Loan not found.', 404);
    }
    const loan = loanResult.rows[0];
    if (loan.returned_at) {
      await client.query('ROLLBACK');
      return sendError(res, 'This book has already been returned.', 409);
    }

    // Mark returned
    await client.query(
      'UPDATE silo_loans SET returned_at = NOW() WHERE id = $1',
      [loanId]
    );

    // Increment book stock and reset status
    await client.query(
      `UPDATE silo_books
       SET stock = stock + 1,
           status = CASE WHEN stock + 1 > 0 THEN 'Available'::silo_book_status ELSE status END
       WHERE id = $1`,
      [loan.book_id]
    );

    await client.query('COMMIT');

    res.json({
      status:  'success',
      message: 'Book returned successfully.',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    sendError(res, 'Failed to return book.', 500, err.message);
  } finally {
    client.release();
  }
};

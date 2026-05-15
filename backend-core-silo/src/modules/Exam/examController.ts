import { Response } from 'express';
import pool from '../../config/db';
import { AuthRequest } from '../../middleware/authMiddleware';
import { sendSuccess, sendError } from '../../shared/responseUtils';

// ─── Utility ──────────────────────────────────────────────────────────────────
const SERVER_NOW = `CURRENT_TIMESTAMP AT TIME ZONE 'UTC'`;

// ─── Management ───────────────────────────────────────────────────────────────
/**
 * GET /api/exams/management
 * Returns all exams for the school (VP/Admin view).
 */
export const getManagementExams = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT
         e.*,
         s.name        AS subject_name,
         s.code        AS subject_code,
         si.full_name  AS examiner_name
       FROM silo_official_exams e
       LEFT JOIN silo_courses    s   ON s.id  = e.subject_id
       LEFT JOIN silo_identities si  ON si.id = e.examiner_id
       ORDER BY e.start_window DESC`
    );
    return sendSuccess(res, result.rows);
  } catch (err: any) {
    return sendError(res, 'Failed to fetch management exams.', 500, err.message);
  }
};

/**
 * POST /api/exams
 * Create a new official exam.
 */
export const createExam = async (req: AuthRequest, res: Response) => {
  const { title, subject_id, start_window, duration_minutes, examiner_id, section_id } = req.body;

  if (!title || !subject_id || !start_window || !duration_minutes) {
    return sendError(res, 'Missing required fields (title, subject_id, start_window, duration_minutes).', 400);
  }

  try {
    const result = await pool.query(
      `INSERT INTO silo_official_exams (title, subject_id, start_window, duration_minutes, examiner_id, section_id, is_published)
       VALUES ($1, $2, $3, $4, $5, $6, FALSE)
       RETURNING *`,
      [title, subject_id, start_window, duration_minutes, examiner_id || req.user?.identity_id, section_id || null]
    );
    return sendSuccess(res, result.rows[0], 'Exam created successfully.', 201);
  } catch (err: any) {
    return sendError(res, 'Failed to create exam.', 500, err.message);
  }
};

/**
 * PATCH /api/exams/:examId
 * Update exam details.
 */
export const updateExam = async (req: AuthRequest, res: Response) => {
  const { examId } = req.params;
  const { title, subject_id, start_window, duration_minutes, examiner_id, section_id, is_published } = req.body;

  try {
    const result = await pool.query(
      `UPDATE silo_official_exams
          SET title            = COALESCE($1, title),
              subject_id       = COALESCE($2, subject_id),
              start_window     = COALESCE($3, start_window),
              duration_minutes = COALESCE($4, duration_minutes),
              examiner_id      = COALESCE($5, examiner_id),
              section_id       = $6,
              is_published     = COALESCE($7, is_published)
        WHERE id = $8
        RETURNING *`,
      [title, subject_id, start_window, duration_minutes, examiner_id, section_id, is_published, examId]
    );
    if (result.rowCount === 0) return sendError(res, 'Exam not found.', 404);
    return sendSuccess(res, result.rows[0], 'Exam updated successfully.');
  } catch (err: any) {
    return sendError(res, 'Failed to update exam.', 500, err.message);
  }
};

/**
 * DELETE /api/exams/:examId
 */
export const deleteExam = async (req: AuthRequest, res: Response) => {
  const { examId } = req.params;
  try {
    const result = await pool.query('DELETE FROM silo_official_exams WHERE id = $1 RETURNING id', [examId]);
    if (result.rowCount === 0) return sendError(res, 'Exam not found.', 404);
    return sendSuccess(res, { id: examId }, 'Exam deleted successfully.');
  } catch (err: any) {
    return sendError(res, 'Failed to delete exam.', 500, err.message);
  }
};

/**
 * GET /api/exams
 * Returns exams available to the logged-in student based on their section.
 * Only published exams are returned.
 * Includes a server_time field so the frontend can compute time remaining
 * without trusting the client clock.
 */
export const listExams = async (req: AuthRequest, res: Response) => {
  const role = req.user?.role;
  let identityId = req.user?.identity_id;

  // If Parent, they must specify which child (student_id)
  if (role?.toLowerCase() === 'parent') {
    const { student_id } = req.query;
    if (!student_id) {
      return sendError(res, 'student_id query parameter is required for parents.', 400);
    }
    
    // Verify parent-child relationship via silo_family_links
    try {
      const relationCheck = await pool.query(
        `SELECT 1 FROM silo_family_links 
         WHERE student_identity_id = $1 AND parent_user_id = $2`,
        [student_id, req.user?.user_id]
      );
      if (relationCheck.rowCount === 0) {
        return sendError(res, 'Unauthorized: This student is not linked to your account.', 403);
      }
      identityId = student_id as string;
    } catch (err: any) {
      return sendError(res, 'Failed to verify parent-child relationship.', 500, err.message);
    }
  }

  try {
    // Note: silo_enrollments does not have section_id. 
    // For now, we set sectionId to null until the schema is updated or link found.
    const sectionId = null;

    // Fetch published exams for this section (or school-wide exams where section_id IS NULL)
    const result = await pool.query(
      `SELECT
         e.id,
         e.title,
         e.start_window,
         e.duration_minutes,
         e.is_published,
         s.name        AS subject_name,
         s.code        AS subject_code,
         si.full_name  AS examiner_name,
         -- Include existing result for this student (if any)
         er.status     AS my_status,
         er.start_time AS my_start_time,
         er.score      AS my_score,
         er.approval_status AS my_approval_status,
         e.questions_json,
         NOW()::timestamptz AS server_time
       FROM silo_official_exams e
       LEFT JOIN silo_courses        s   ON s.id  = e.subject_id
       LEFT JOIN silo_identities     si  ON si.id = e.examiner_id
       LEFT JOIN silo_exam_results   er  ON er.exam_id = e.id AND er.student_id = $1
       WHERE e.is_published = TRUE
         AND (e.section_id = $2 OR e.section_id IS NULL)
       ORDER BY e.start_window ASC`,
      [identityId, sectionId]
    );

    const formattedExams = result.rows.map(exam => {
      const q = Array.isArray(exam.questions_json) ? exam.questions_json : [];
      // Only include question count for the list view, not the questions themselves
      const { questions_json, ...rest } = exam;
      return { ...rest, questions_count: q.length };
    });

    return sendSuccess(res, {
      server_time: new Date().toISOString(),
      exams: formattedExams,
    });
  } catch (err: any) {
    return sendError(res, 'Failed to fetch exams.', 500, err.message);
  }
};

/**
 * POST /api/exams/:examId/start
 * Starts an exam session for the authenticated student.
 * Guards:
 *   - Exam must be published
 *   - Current server time must be >= start_window
 *   - Student must not have an existing non-active attempt
 */
export const startExam = async (req: AuthRequest, res: Response) => {
  const { examId } = req.params;
  const identityId = req.user?.identity_id;

  try {
    // 1. Fetch exam
    const examResult = await pool.query(
      `SELECT id, title, start_window, duration_minutes, is_published, questions_json
         FROM silo_official_exams WHERE id = $1`,
      [examId]
    );
    if (examResult.rows.length === 0) {
      return sendError(res, 'Exam not found.', 404);
    }
    const exam = examResult.rows[0];

    if (!exam.is_published) {
      return sendError(res, 'This exam has not been published yet.', 403);
    }

    // 2. Server-side time guard — cannot start before the window opens
    const serverNow = new Date();
    const startWindow = new Date(exam.start_window);
    if (serverNow < startWindow) {
      return sendError(
        res,
        `This exam cannot be started yet. It opens at ${startWindow.toISOString()}.`,
        403,
        `server_time=${serverNow.toISOString()} start_window=${startWindow.toISOString()}`
      );
    }

    // 3. Check for existing result
    const existing = await pool.query(
      `SELECT id, status FROM silo_exam_results
        WHERE exam_id = $1 AND student_id = $2`,
      [examId, identityId]
    );
    if (existing.rows.length > 0) {
      const prev = existing.rows[0];
      if (prev.status === 'submitted') {
        return sendError(res, 'You have already submitted this exam.', 409);
      }
      if (prev.status === 'terminated') {
        return sendError(res, 'Your attempt was terminated. Contact your teacher.', 403);
      }
      // Re-active session exists — return it
      return sendSuccess(res, {
        result_id:       prev.id,
        exam_id:         examId,
        title:           exam.title,
        duration_minutes: exam.duration_minutes,
        server_time:     new Date().toISOString(),
        questions:       exam.questions_json,
        resumed:         true,
      });
    }

    // 4. Create new result row
    const resultRow = await pool.query(
      `INSERT INTO silo_exam_results (exam_id, student_id, status, start_time)
       VALUES ($1, $2, 'active', NOW())
       RETURNING id, start_time`,
      [examId, identityId]
    );

    return sendSuccess(res, {
      result_id:        resultRow.rows[0].id,
      exam_id:          examId,
      title:            exam.title,
      duration_minutes: exam.duration_minutes,
      server_time:      new Date().toISOString(),
      start_time:       resultRow.rows[0].start_time,
      questions:        exam.questions_json,
      resumed:          false,
    }, 'Exam started.', 201);
  } catch (err: any) {
    return sendError(res, 'Failed to start exam.', 500, err.message);
  }
};

/**
 * POST /api/exams/:examId/submit
 * Submits answers for a student's active exam attempt.
 * Body: { result_id, answers: Record<questionId, answerValue> }
 */
export const submitExam = async (req: AuthRequest, res: Response) => {
  const { examId } = req.params;
  const { result_id, answers } = req.body;
  const identityId = req.user?.identity_id;

  if (!result_id) {
    return sendError(res, 'result_id is required.', 400);
  }

  try {
    const resultRow = await pool.query(
      `SELECT id, status FROM silo_exam_results
        WHERE id = $1 AND exam_id = $2 AND student_id = $3`,
      [result_id, examId, identityId]
    );
    if (resultRow.rows.length === 0) {
      return sendError(res, 'Exam attempt not found.', 404);
    }
    if (resultRow.rows[0].status !== 'active') {
      return sendError(res, `Exam is already ${resultRow.rows[0].status}.`, 409);
    }

    await pool.query(
      `UPDATE silo_exam_results
          SET answers_json = $1,
              status       = 'submitted',
              end_time     = NOW()
        WHERE id = $2`,
      [JSON.stringify(answers ?? {}), result_id]
    );

    return sendSuccess(res, { result_id, status: 'submitted' }, 'Exam submitted successfully.');
  } catch (err: any) {
    return sendError(res, 'Failed to submit exam.', 500, err.message);
  }
};

/**
 * POST /api/exams/terminate
 * Terminates an active exam attempt (anti-cheat trigger or manual stop).
 * Body: { result_id, reason? }
 * After termination:
 *   - status = 'terminated', end_time = NOW()
 *   - Score will NOT be set — no data is shown to the student
 */
export const terminateExam = async (req: AuthRequest, res: Response) => {
  const { result_id, reason } = req.body;
  const identityId = req.user?.identity_id;

  if (!result_id) {
    return sendError(res, 'result_id is required.', 400);
  }

  try {
    const resultRow = await pool.query(
      `SELECT id, status FROM silo_exam_results
        WHERE id = $1 AND student_id = $2`,
      [result_id, identityId]
    );
    if (resultRow.rows.length === 0) {
      return sendError(res, 'Exam attempt not found.', 404);
    }
    if (resultRow.rows[0].status !== 'active') {
      return sendError(res, `Exam is already ${resultRow.rows[0].status}.`, 409);
    }

    await pool.query(
      `UPDATE silo_exam_results
          SET status   = 'terminated',
              end_time = NOW(),
              answers_json = COALESCE(answers_json, '{}'::jsonb) || $1::jsonb
        WHERE id = $2`,
      [JSON.stringify({ _termination_reason: reason || 'student_triggered' }), result_id]
    );

    return sendSuccess(res, {
      result_id,
      status:    'terminated',
      message:   'Your exam session has been terminated.',
      redirect:  '/dashboard/student',
    });
  } catch (err: any) {
    return sendError(res, 'Failed to terminate exam.', 500, err.message);
  }
};

/**
 * GET /api/exams/teacher
 * Teacher/Admin view — returns all results for their exams with student info.
 * Role guard: Teacher, Admin only.
 */
export const getExamResults = async (req: AuthRequest, res: Response) => {
  const { exam_id } = req.query;
  const examinerId = req.user?.identity_id;

  try {
    const result = await pool.query(
      `SELECT
         er.id,
         er.exam_id,
         e.title       AS exam_title,
         er.student_id,
         si.full_name  AS student_name,
         si.school_id,
         er.status,
         er.score,
         er.approval_status,
         er.start_time,
         er.end_time,
         EXTRACT(EPOCH FROM (er.end_time - er.start_time)) / 60 AS duration_taken_minutes
       FROM silo_exam_results er
       JOIN silo_official_exams e  ON e.id  = er.exam_id
       JOIN silo_identities     si ON si.id = er.student_id
       WHERE (e.examiner_id = $1 OR $3 = TRUE)
         AND ($2::uuid IS NULL OR er.exam_id = $2::uuid)
       ORDER BY er.start_time DESC`,
      [examinerId, exam_id || null, ['viceprincipal', 'schooladmin', 'admin'].includes((req.user?.role || '').toLowerCase())]
    );

    return sendSuccess(res, result.rows);
  } catch (err: any) {
    return sendError(res, 'Failed to fetch exam results.', 500, err.message);
  }
};

/**
 * POST /api/exams/results/:resultId/approve
 * Teacher approves a result → pushes score to silo_student_grades.final_50
 * Body: { score }
 */
export const approveResult = async (req: AuthRequest, res: Response) => {
  const { resultId } = req.params;
  const { score } = req.body;

  if (score === undefined || isNaN(Number(score))) {
    return sendError(res, 'A numeric score is required.', 400);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch the result + its exam's subject
    const resultRow = await client.query(
      `SELECT er.student_id, e.subject_id
         FROM silo_exam_results er
         JOIN silo_official_exams e ON e.id = er.exam_id
        WHERE er.id = $1 AND er.status = 'submitted'`,
      [resultId]
    );
    if (resultRow.rows.length === 0) {
      await client.query('ROLLBACK');
      return sendError(res, 'Result not found or not submitted yet.', 404);
    }
    const { student_id, subject_id } = resultRow.rows[0];

    // 2. Update score + approval
    await client.query(
      `UPDATE silo_exam_results
          SET score = $1, approval_status = 'approved'
        WHERE id = $2`,
      [score, resultId]
    );

    // 3. Push to silo_student_grades.final_50
    if (subject_id) {
      await client.query(
        `UPDATE silo_student_grades g
            SET final_50 = $1
           FROM silo_enrollments e
          WHERE g.enrollment_id = e.id
            AND e.student_id = $2
            AND e.course_id = $3`,
        [score, student_id, subject_id]
      );
    }

    await client.query('COMMIT');
    return sendSuccess(res, { result_id: resultId, score, approval_status: 'approved' }, 'Result approved and grade updated.');
  } catch (err: any) {
    await client.query('ROLLBACK');
    return sendError(res, 'Failed to approve result.', 500, err.message);
  } finally {
    client.release();
  }
};

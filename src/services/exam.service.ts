import pool from '../config/database';

interface ExamQuestionInput {
  id: string;
  text: string;
  correctOptionId?: string | null;
  options?: Array<{ id: string; text: string }>;
}

interface CreateExamInput {
  title: string;
  courseId?: string | null;
  courseName: string;
  category: 'Mid-term' | 'Final' | 'Quiz' | 'Assignment';
  durationMinutes: number;
  questions?: ExamQuestionInput[];
}

class ExamService {
  private async getStudentIdByUserId(userId: string): Promise<string | null> {
    const result = await pool.query(
      'SELECT id FROM students WHERE user_id = $1 LIMIT 1',
      [userId]
    );

    return result.rows.length > 0 ? result.rows[0].id : null;
  }

  async listAvailableExams(userId: string): Promise<any[]> {
    // Only published, visible exams are listed for students.
    const query = `
      SELECT
        e.id,
        e.title,
        e.course_id,
        e.course_name,
        COALESCE(t.user_id::text, '') AS teacher_user_id,
        e.teacher_name,
        e.category,
        e.duration_minutes,
        e.status,
        e.is_locked,
        e.lock_password,
        e.is_hidden,
        e.principal_set_password,
        COUNT(eq.id) AS question_count
      FROM exams e
      LEFT JOIN exam_questions eq ON eq.exam_id = e.id
      LEFT JOIN teachers t ON t.id = e.teacher_id
      WHERE e.status = 'available'
        AND e.is_hidden = false
      GROUP BY e.id, t.user_id
      ORDER BY e.created_at DESC
    `;

    const result = await pool.query(query, []);
    return result.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      courseId: row.course_id,
      courseName: row.course_name,
      teacherId: row.teacher_user_id,
      teacherName: row.teacher_name,
      category: row.category,
      durationMinutes: Number(row.duration_minutes),
      status: row.status,
      isLocked: row.is_locked,
      lockPassword: row.lock_password,
      isHidden: row.is_hidden,
      principalSetPassword: row.principal_set_password,
      questions: []
    }));
  }

  async getExamDetails(examId: string, userId: string): Promise<any> {
    const examResult = await pool.query(
      `SELECT
         e.id,
         e.title,
         e.course_id,
         e.course_name,
         COALESCE(t.user_id::text, '') AS teacher_user_id,
         e.teacher_name,
         e.category,
         e.duration_minutes,
         e.status,
         e.is_locked,
         e.lock_password,
         e.is_hidden,
         e.principal_set_password
       FROM exams e
       LEFT JOIN teachers t ON t.id = e.teacher_id
       WHERE e.id = $1
       LIMIT 1`,
      [examId]
    );

    if (examResult.rows.length === 0) {
      throw new Error('Exam not found');
    }

    const examRow = examResult.rows[0];

    const questionsResult = await pool.query(
      `SELECT
         q.id,
         q.question_text AS text,
         q.correct_option_id AS "correctOptionId",
         oq.id AS option_id,
         oq.option_key AS option_key,
         oq.option_text AS option_text,
         oq.sort_order AS option_sort_order,
         q.sort_order AS question_sort_order
       FROM exam_questions q
       LEFT JOIN exam_question_options oq ON oq.question_id = q.id
       WHERE q.exam_id = $1
       ORDER BY q.sort_order, oq.sort_order`,
      [examId]
    );

    const questionsById: Record<string, any> = {};
    questionsResult.rows.forEach((row: any) => {
      if (!questionsById[row.id]) {
        questionsById[row.id] = {
          id: row.id,
          text: row.text,
          correctOptionId: row.correctOptionId,
          options: [] as Array<{ id: string; text: string }>,
        };
      }
      if (row.option_id) {
        questionsById[row.id].options.push({
          id: row.option_key,
          text: row.option_text,
        });
      }
    });

    const questions = Object.values(questionsById);

    const studentId = await this.getStudentIdByUserId(userId);
    let savedAnswers: Record<string, string> = {};
    let session: any = {
      status: 'active',
      startTime: new Date().toISOString(),
      endTime: Date.now() + Number(examRow.duration_minutes) * 60 * 1000
    };

    if (studentId) {
      const submissionResult = await pool.query(
        `SELECT id, answers, started_at, submitted_at, auto_submitted
         FROM exam_submissions
         WHERE exam_id = $1 AND student_id = $2
         LIMIT 1`,
        [examId, studentId]
      );

      if (submissionResult.rows.length > 0) {
        const submission = submissionResult.rows[0];
        savedAnswers = submission.answers || {};
        const startedAt = submission.started_at ? new Date(submission.started_at).toISOString() : new Date().toISOString();
        const endTime = submission.started_at
          ? new Date(submission.started_at).getTime() + Number(examRow.duration_minutes) * 60 * 1000
          : Date.now() + Number(examRow.duration_minutes) * 60 * 1000;

        session = {
          id: submission.id,
          status: submission.submitted_at ? 'submitted' : 'active',
          startTime: startedAt,
          endTime,
          submittedAt: submission.submitted_at ? new Date(submission.submitted_at).toISOString() : null,
          autoSubmitted: submission.auto_submitted
        };
      }
    }

    return {
      exam: {
        id: examRow.id,
        title: examRow.title,
        courseId: examRow.course_id,
        courseName: examRow.course_name,
        teacherId: examRow.teacher_user_id,
        teacherName: examRow.teacher_name,
        category: examRow.category,
        durationMinutes: Number(examRow.duration_minutes),
        status: examRow.status,
        isLocked: examRow.is_locked,
        lockPassword: examRow.lock_password,
        isHidden: examRow.is_hidden,
        principalSetPassword: examRow.principal_set_password,
        questions
      },
      questions,
      savedAnswers,
      session
    };
  }

  async saveExamAnswer(examId: string, userId: string, questionId: string, answer: string): Promise<void> {
    const studentId = await this.getStudentIdByUserId(userId);
    if (!studentId) throw new Error('Student record not found');

    const values = [examId, studentId, questionId, answer];
    const updateResult = await pool.query(
      `UPDATE exam_submissions
       SET answers = jsonb_set(COALESCE(answers, '{}'::jsonb), $1, to_jsonb($2::text), true),
           started_at = COALESCE(started_at, NOW())
       WHERE exam_id = $3 AND student_id = $4
       RETURNING id`,
      [`{${questionId}}`, answer, examId, studentId]
    );

    if (updateResult.rowCount === 0) {
      await pool.query(
        `INSERT INTO exam_submissions (exam_id, student_id, answers, started_at)
         VALUES ($1, $2, jsonb_build_object($3, $4), NOW())`,
        [examId, studentId, questionId, answer]
      );
    }
  }

  async submitExam(examId: string, userId: string, autoSubmitted: boolean): Promise<any> {
    const studentId = await this.getStudentIdByUserId(userId);
    if (!studentId) throw new Error('Student record not found');

    const result = await pool.query(
      `INSERT INTO exam_submissions (exam_id, student_id, answers, started_at, submitted_at, auto_submitted)
       VALUES ($1, $2, '{}'::jsonb, NOW(), NOW(), $3)
       ON CONFLICT (exam_id, student_id)
       DO UPDATE SET submitted_at = NOW(), auto_submitted = $3
       RETURNING id, answers, started_at, submitted_at, auto_submitted`,
      [examId, studentId, autoSubmitted]
    );

    const submission = result.rows[0];
    return {
      id: submission.id,
      status: submission.submitted_at ? 'submitted' : 'active',
      startedAt: submission.started_at,
      submittedAt: submission.submitted_at,
      autoSubmitted: submission.auto_submitted
    };
  }

  async createExam(teacherUserId: string, examData: CreateExamInput): Promise<any> {
    const teacherResult = await pool.query(
      'SELECT id, user_id FROM teachers WHERE user_id = $1 LIMIT 1',
      [teacherUserId]
    );

    if (teacherResult.rows.length === 0) {
      throw new Error('Teacher record not found');
    }

    const teacher = teacherResult.rows[0];

    const examInsert = await pool.query(
      `INSERT INTO exams
         (title, course_id, course_name, teacher_id, teacher_name, category, duration_minutes, status, is_locked, is_hidden, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'available', false, false, NOW(), NOW())
       RETURNING *`,
      [
        examData.title,
        examData.courseId || null,
        examData.courseName,
        teacher.id,
        examData.courseName,
        examData.category,
        examData.durationMinutes
      ]
    );

    const examRow = examInsert.rows[0];
    const questions = [];

    if (Array.isArray(examData.questions) && examData.questions.length > 0) {
      for (let index = 0; index < examData.questions.length; index += 1) {
        const question = examData.questions[index];
        const questionInsert = await pool.query(
          `INSERT INTO exam_questions (exam_id, question_text, correct_option_id, sort_order, created_at)
           VALUES ($1, $2, $3, $4, NOW())
           RETURNING id`,
          [examRow.id, question.text, question.correctOptionId || null, index]
        );

        const questionId = questionInsert.rows[0].id;
        const options = [] as Array<{ id: string; text: string }>;

        if (Array.isArray(question.options)) {
          for (let optionIndex = 0; optionIndex < question.options.length; optionIndex += 1) {
            const option = question.options[optionIndex];
            await pool.query(
              `INSERT INTO exam_question_options
               (question_id, option_key, option_text, sort_order)
               VALUES ($1, $2, $3, $4)`,
              [questionId, option.id, option.text, optionIndex]
            );
            options.push({ id: option.id, text: option.text });
          }
        }

        questions.push({
          id: questionId,
          text: question.text,
          correctOptionId: question.correctOptionId || undefined,
          options
        });
      }
    }

    return {
      id: examRow.id,
      title: examRow.title,
      courseId: examRow.course_id,
      courseName: examRow.course_name,
      teacherId: teacher.user_id,
      teacherName: examRow.teacher_name,
      category: examRow.category,
      durationMinutes: Number(examRow.duration_minutes),
      status: examRow.status,
      isLocked: examRow.is_locked,
      lockPassword: examRow.lock_password,
      isHidden: examRow.is_hidden,
      principalSetPassword: examRow.principal_set_password,
      questions
    };
  }
}

export default new ExamService();

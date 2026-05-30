import pool from '../config/database';
import logger from '../utils/logger';

interface CreateExamInput {
  teacherId: string;
  classId: string;
  gradeId?: string;
  subjectId?: string;
  title: string;
  examType: string;
  totalMarks: number;
  duration: number;
  instructions?: string;
  selectedSection?: string;
  questions?: any[];
  examPassword?: string;
  isLocked?: boolean;
  passwordRequired?: boolean;
}

interface UpdateExamInput {
  title?: string;
  examType?: string;
  totalMarks?: number;
  duration?: number;
  instructions?: string;
  selectedSection?: string;
  status?: string;
  questions?: any[];
  gradeId?: string;
  subjectId?: string;
  examPassword?: string;
  isLocked?: boolean;
  passwordRequired?: boolean;
}

class TeacherExamService {
  /**
   * Create a new exam (draft)
   */
  async createExam(input: CreateExamInput) {
    const {
      teacherId,
      classId,
      gradeId,
      subjectId,
      title,
      examType,
      totalMarks,
      duration,
      instructions,
      selectedSection,
      questions = [],
      examPassword,
      isLocked = false,
      passwordRequired = false
    } = input;

    try {
      const result = await pool.query(
        `INSERT INTO teacher_exams (
          teacher_id, class_id, grade_id, subject_id, title, exam_type, total_marks, 
          duration_minutes, instructions, selected_section, status, questions, 
          exam_password, is_locked, password_required
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft', $11, $12, $13, $14)
         RETURNING *`,
        [teacherId, classId, gradeId || null, subjectId || null, title, examType, totalMarks, duration, 
         instructions, selectedSection, JSON.stringify(questions), examPassword || null, isLocked, passwordRequired]
      );

      logger.info(`📝 Exam created: ${result.rows[0].id} by teacher ${teacherId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating exam:', error);
      throw error;
    }
  }

  /**
   * Get all exams for a teacher
   */
  async getTeacherExams(teacherId: string) {
    try {
      const result = await pool.query(
        `SELECT te.*, c.name as class_name, c.section
         FROM teacher_exams te
         LEFT JOIN classes c ON te.class_id = c.id
         WHERE te.teacher_id = $1
         ORDER BY te.created_at DESC`,
        [teacherId]
      );

      return result.rows.map(exam => ({
        ...exam,
        questions: exam.questions || []
      }));
    } catch (error) {
      logger.error('Error fetching teacher exams:', error);
      throw error;
    }
  }

  /**
   * Get exam by ID
   */
  async getExamById(examId: string) {
    try {
      const result = await pool.query(
        `SELECT te.*, c.name as class_name, c.section
         FROM teacher_exams te
         LEFT JOIN classes c ON te.class_id = c.id
         WHERE te.id = $1`,
        [examId]
      );

      if (result.rows.length === 0) {
        throw new Error('Exam not found');
      }

      return {
        ...result.rows[0],
        questions: result.rows[0].questions || []
      };
    } catch (error) {
      logger.error('Error fetching exam:', error);
      throw error;
    }
  }

  /**
   * Update exam (only drafts can be updated)
   */
  async updateExam(examId: string, input: UpdateExamInput) {
    try {
      // Check if exam is draft
      const examCheck = await pool.query(
        'SELECT status FROM teacher_exams WHERE id = $1',
        [examId]
      );

      if (examCheck.rows.length === 0) {
        throw new Error('Exam not found');
      }

      if (examCheck.rows[0].status !== 'draft') {
        throw new Error('Only draft exams can be updated');
      }

      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (input.title !== undefined) {
        updates.push(`title = $${paramCount++}`);
        values.push(input.title);
      }
      if (input.examType !== undefined) {
        updates.push(`exam_type = $${paramCount++}`);
        values.push(input.examType);
      }
      if (input.totalMarks !== undefined) {
        updates.push(`total_marks = $${paramCount++}`);
        values.push(input.totalMarks);
      }
      if (input.duration !== undefined) {
        updates.push(`duration_minutes = $${paramCount++}`);
        values.push(input.duration);
      }
      if (input.instructions !== undefined) {
        updates.push(`instructions = $${paramCount++}`);
        values.push(input.instructions);
      }
      if (input.selectedSection !== undefined) {
        updates.push(`selected_section = $${paramCount++}`);
        values.push(input.selectedSection);
      }
      if (input.questions !== undefined) {
        updates.push(`questions = $${paramCount++}`);
        values.push(JSON.stringify(input.questions));
      }
      if (input.gradeId !== undefined) {
        updates.push(`grade_id = $${paramCount++}`);
        values.push(input.gradeId || null);
      }
      if (input.subjectId !== undefined) {
        updates.push(`subject_id = $${paramCount++}`);
        values.push(input.subjectId || null);
      }
      if (input.examPassword !== undefined) {
        updates.push(`exam_password = $${paramCount++}`);
        values.push(input.examPassword || null);
      }
      if (input.passwordRequired !== undefined) {
        updates.push(`password_required = $${paramCount++}`);
        values.push(input.passwordRequired);
      }
      if (input.isLocked !== undefined) {
        updates.push(`is_locked = $${paramCount++}`);
        values.push(input.isLocked);
      }

      updates.push(`updated_at = $${paramCount++}`);
      values.push(new Date());

      values.push(examId);

      const result = await pool.query(
        `UPDATE teacher_exams SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      logger.info(`📝 Exam updated: ${examId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating exam:', error);
      throw error;
    }
  }

  /**
   * Publish exam (changes status from draft to published)
   */
  async publishExam(examId: string, teacherId: string) {
    try {
      // Verify teacher owns the exam
      const examCheck = await pool.query(
        'SELECT status FROM teacher_exams WHERE id = $1 AND teacher_id = $2',
        [examId, teacherId]
      );

      if (examCheck.rows.length === 0) {
        throw new Error('Exam not found or unauthorized');
      }

      if (examCheck.rows[0].status !== 'draft') {
        throw new Error('Only draft exams can be published');
      }

      const result = await pool.query(
        `UPDATE teacher_exams SET status = 'published', updated_at = NOW() WHERE id = $1 RETURNING *`,
        [examId]
      );

      logger.info(`✓ Exam published: ${examId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error publishing exam:', error);
      throw error;
    }
  }

  /**
   * Delete exam (only drafts can be deleted)
   */
  async deleteExam(examId: string, teacherId: string) {
    try {
      // Verify teacher owns the exam and it's a draft
      const examCheck = await pool.query(
        'SELECT status FROM teacher_exams WHERE id = $1 AND teacher_id = $2',
        [examId, teacherId]
      );

      if (examCheck.rows.length === 0) {
        throw new Error('Exam not found or unauthorized');
      }

      if (examCheck.rows[0].status !== 'draft') {
        throw new Error('Only draft exams can be deleted');
      }

      await pool.query('DELETE FROM teacher_exams WHERE id = $1', [examId]);

      logger.info(`🗑 Exam deleted: ${examId}`);
      return { success: true, message: 'Exam deleted' };
    } catch (error) {
      logger.error('Error deleting exam:', error);
      throw error;
    }
  }

  /**
   * Get exams by class (for students to access published exams)
   */
  async getClassExams(classId: string, onlyPublished = true) {
    try {
      const status = onlyPublished ? "WHERE te.status = 'published'" : '';
      const result = await pool.query(
        `SELECT te.*, t.name as teacher_name, c.name as class_name
         FROM teacher_exams te
         LEFT JOIN teachers t ON te.teacher_id = t.id
         LEFT JOIN classes c ON te.class_id = c.id
         ${status}
         ${status ? 'AND' : 'WHERE'} te.class_id = $1
         ORDER BY te.created_at DESC`,
        [classId]
      );

      return result.rows.map(exam => ({
        ...exam,
        questions: exam.questions || []
      }));
    } catch (error) {
      logger.error('Error fetching class exams:', error);
      throw error;
    }
  }

  /**
   * Save exam result
   */
  async saveExamResult(examId: string, studentId: string, marksObtained: number) {
    try {
      const result = await pool.query(
        `INSERT INTO teacher_exam_results (exam_id, student_id, marks_obtained)
         VALUES ($1, $2, $3)
         ON CONFLICT (exam_id, student_id) DO UPDATE
         SET marks_obtained = $3, graded = true, graded_at = NOW()
         RETURNING *`,
        [examId, studentId, marksObtained]
      );

      logger.info(`✓ Exam result saved for student ${studentId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error saving exam result:', error);
      throw error;
    }
  }

  /**
   * Get exam results
   */
  async getExamResults(examId: string) {
    try {
      const result = await pool.query(
        `SELECT ter.*, s.name as student_name
         FROM teacher_exam_results ter
         LEFT JOIN students s ON ter.student_id = s.id
         WHERE ter.exam_id = $1
         ORDER BY ter.submitted_at DESC`,
        [examId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error fetching exam results:', error);
      throw error;
    }
  }

  // ─── Exam Password & Session Management ───────────────────────────────────────

  /**
   * Verify exam password (for locked exams)
   */
  async verifyExamPassword(examId: string, providedPassword: string): Promise<boolean> {
    try {
      const result = await pool.query(
        `SELECT exam_password, password_required FROM teacher_exams WHERE id = $1`,
        [examId]
      );

      if (result.rows.length === 0) {
        throw new Error('Exam not found');
      }

      const exam = result.rows[0];
      if (!exam.password_required) {
        return true; // No password required
      }

      if (!exam.exam_password) {
        return false; // Password required but not set
      }

      // Simple password comparison (in production, use bcrypt)
      return exam.exam_password === providedPassword;
    } catch (error) {
      logger.error('Error verifying exam password:', error);
      throw error;
    }
  }

  /**
   * Create an exam session for a student
   */
  async createExamSession(examId: string, studentId: string) {
    try {
      const result = await pool.query(
        `INSERT INTO exam_sessions (exam_id, student_id, is_active, session_start)
         VALUES ($1, $2, TRUE, NOW())
         ON CONFLICT (exam_id, student_id) 
         DO UPDATE SET is_active = TRUE, session_start = NOW(), last_activity = NOW()
         RETURNING *`,
        [examId, studentId]
      );

      logger.info(`📋 Exam session created for student ${studentId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating exam session:', error);
      throw error;
    }
  }

  /**
   * Mark password as verified for exam session
   */
  async markPasswordVerified(examId: string, studentId: string) {
    try {
      const result = await pool.query(
        `UPDATE exam_sessions 
         SET password_verified = TRUE, password_verified_at = NOW()
         WHERE exam_id = $1 AND student_id = $2
         RETURNING *`,
        [examId, studentId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error marking password verified:', error);
      throw error;
    }
  }

  /**
   * Save individual exam answer
   */
  async saveExamAnswer(examId: string, studentId: string, sessionId: string, questionId: string, answer: string) {
    try {
      const result = await pool.query(
        `INSERT INTO exam_answers (exam_id, session_id, student_id, question_id, student_answer, saved_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (session_id, question_id) 
         DO UPDATE SET student_answer = $5, saved_at = NOW()
         RETURNING *`,
        [examId, sessionId, studentId, questionId, answer]
      );

      logger.info(`💾 Answer saved for student ${studentId}, question ${questionId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error saving exam answer:', error);
      throw error;
    }
  }

  /**
   * Submit exam results (saves grade to student record)
   */
  async submitExamResult(examId: string, studentId: string, score?: number | null, totalMarks?: number | null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Get exam details including subject_id and total marks and questions
      const examResult = await client.query(
        `SELECT subject_id, grade_id, total_marks, questions, exam_type FROM teacher_exams WHERE id = $1`,
        [examId]
      );

      if (examResult.rows.length === 0) {
        throw new Error('Exam not found');
      }

      const exam = examResult.rows[0];

      // If score or totalMarks not provided, attempt to auto-grade using stored questions and student answers
      if ((score === undefined || score === null) || (totalMarks === undefined || totalMarks === null) || (score === 0 && totalMarks === 0)) {
        // derive totalMarks from exam if available
        totalMarks = totalMarks || exam.total_marks || 0;
        const total = Number(totalMarks || 0);

        // parse questions from JSON (teacher exams store questions as JSON)
        let questions: any[] = [];
        try {
          questions = exam.questions && typeof exam.questions === 'string' ? JSON.parse(exam.questions) : (exam.questions || []);
        } catch (err) {
          questions = exam.questions || [];
        }

        // fetch student answers
        const ansRes = await client.query(
          `SELECT question_id, student_answer FROM exam_answers WHERE exam_id = $1 AND student_id = $2`,
          [examId, studentId]
        );
        const answersMap: Record<string, string> = {};
        ansRes.rows.forEach((r: any) => { answersMap[r.question_id] = r.student_answer; });

        // determine gradable questions and compute per-question mark
        const gradable = questions.filter(q => q && (q.type === 'options' || q.options) && (q.correctOptionId || q.correct_option_id));
        const gradableCount = gradable.length || 0;
        let perQuestionMark = 0;
        if (gradableCount > 0 && total > 0) {
          perQuestionMark = total / gradableCount;
        }

        let computedScore = 0;
        for (const q of gradable) {
          const qid = q.id || q.questionId || q.question_id;
          const correct = q.correctOptionId || q.correct_option_id;
          const studentAns = answersMap[qid];
          if (studentAns !== undefined && studentAns !== null && String(studentAns) === String(correct)) {
            computedScore += perQuestionMark;
          }
        }

        // round to nearest integer
        score = Math.round(computedScore);
        // ensure totalMarks variable reflects numeric total
        totalMarks = total;
      }

      const percentage = (totalMarks && Number(totalMarks) > 0) ? (Number(score) / Number(totalMarks)) * 100 : 0;

      // 2. Save exam result
      const resultInsert = await client.query(
        `INSERT INTO exam_results (exam_id, student_id, score, total_marks, percentage, is_submitted, submitted_at, status)
         VALUES ($1, $2, $3, $4, $5, TRUE, NOW(), 'pending')
         ON CONFLICT (exam_id, student_id) 
         DO UPDATE SET score = $3, total_marks = $4, percentage = $5, is_submitted = TRUE, submitted_at = NOW()
         RETURNING *`,
        [examId, studentId, score, totalMarks, percentage]
      );

      // 3. Save to grade book (`grades` table)
      if (exam.subject_id) {
        // Normalize exam_type to grade `type`
        const t = (exam.exam_type || exam.examType || '').toString().toLowerCase();
        let gradeType = 'Quiz';
        if (t.includes('mid')) gradeType = 'Mid-term';
        else if (t.includes('final')) gradeType = 'Final';
        else if (t.includes('assign')) gradeType = 'Assignment';
        else if (t.includes('quiz')) gradeType = 'Quiz';

        const existing = await client.query(
          `SELECT id FROM grades WHERE student_id = $1 AND course_id = $2 AND type = $3 LIMIT 1`,
          [studentId, exam.subject_id, gradeType]
        );

        if (existing.rows.length) {
          await client.query(
            `UPDATE grades SET score = $1, total = $2, created_at = NOW() WHERE id = $3`,
            [score, totalMarks, existing.rows[0].id]
          );
        } else {
          await client.query(
            `INSERT INTO grades (student_id, course_id, type, score, total, created_at) VALUES ($1, $2, $3, $4, $5, NOW())`,
            [studentId, exam.subject_id, gradeType, score, totalMarks]
          );
        }
      }

      // 4. End exam session
      await client.query(
        `UPDATE exam_sessions 
         SET is_active = FALSE, session_end = NOW()
         WHERE exam_id = $1 AND student_id = $2`,
        [examId, studentId]
      );

      await client.query('COMMIT');
      logger.info(`✓ Exam result submitted for student ${studentId}`);
      return resultInsert.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error submitting exam result:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get exam session for resume
   */
  async getExamSession(examId: string, studentId: string) {
    try {
      const result = await pool.query(
        `SELECT * FROM exam_sessions 
         WHERE exam_id = $1 AND student_id = $2`,
        [examId, studentId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting exam session:', error);
      throw error;
    }
  }
}

export default new TeacherExamService();

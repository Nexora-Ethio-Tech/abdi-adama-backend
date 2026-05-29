import pool from '../config/database';
import logger from '../utils/logger';

interface CreateExamInput {
  teacherId: string;
  classId: string;
  title: string;
  examType: string;
  totalMarks: number;
  duration: number;
  instructions?: string;
  selectedSection?: string;
  questions?: any[];
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
}

class TeacherExamService {
  /**
   * Create a new exam (draft)
   */
  async createExam(input: CreateExamInput) {
    const {
      teacherId,
      classId,
      title,
      examType,
      totalMarks,
      duration,
      instructions,
      selectedSection,
      questions = []
    } = input;

    try {
      const result = await pool.query(
        `INSERT INTO teacher_exams (teacher_id, class_id, title, exam_type, total_marks, duration_minutes, 
          instructions, selected_section, status, questions)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', $9)
         RETURNING *`,
        [teacherId, classId, title, examType, totalMarks, duration, instructions, selectedSection, JSON.stringify(questions)]
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
}

export default new TeacherExamService();

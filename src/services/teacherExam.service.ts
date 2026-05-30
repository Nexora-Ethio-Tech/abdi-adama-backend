import pool from '../config/database';
import logger from '../utils/logger';

const VARIATION_CODES = ['A', 'B', 'C', 'D', 'E'];

function shuffleArray<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

class TeacherExamService {

  // ─── Published exams for student ───────────────────────────────────────────

  async getPublishedExamsForStudent(userId: string) {
    try {
      // Find student record
      const studentRes = await pool.query(
        `SELECT id FROM students WHERE user_id=$1 LIMIT 1`, [userId]);
      const studentId = studentRes.rows[0]?.id;

      const result = await pool.query(
        `SELECT
           oe.id,
           oe.title,
           oe.duration_minutes,
           oe.is_published,
           oe.created_at,
           u.name AS teacher_name,
           COUNT(oeq.id)::int AS question_count,
           oes.status AS session_status,
           COALESCE(oes.terminated, FALSE) AS terminated,
           COALESCE(oes.violation_count, 0) AS violation_count,
           CASE
             WHEN oes.status = 'submitted' THEN oes.final_score
             ELSE NULL
           END AS final_score
         FROM online_exams oe
         LEFT JOIN users u ON u.id = oe.creator_id
         LEFT JOIN online_exam_questions oeq ON oeq.exam_id = oe.id
         LEFT JOIN online_exam_sessions oes ON oes.exam_id = oe.id AND oes.student_id = $1
         WHERE oe.is_published = TRUE
         GROUP BY oe.id, u.name, oes.status, oes.terminated, oes.violation_count, oes.final_score
         ORDER BY oe.created_at DESC`,
        [studentId || userId]);

      return result.rows.map((exam: any) => ({
        id: exam.id,
        title: exam.title,
        examType: 'Official Exam',
        durationMinutes: Number(exam.duration_minutes),
        teacherName: exam.teacher_name || 'Teacher',
        questionCount: exam.question_count || 0,
        sessionStatus: exam.terminated ? 'terminated'
          : exam.session_status === 'submitted' ? 'submitted'
          : exam.session_status === 'active' ? 'active'
          : 'available',
        finalScore: exam.final_score !== null ? Math.round(Number(exam.final_score)) : null,
        violated: exam.terminated,
        violationCount: exam.violation_count,
        passwordRequired: false,
      }));
    } catch (error) { logger.error('Error fetching published exams:', error); throw error; }
  }

  // ─── Variation (randomisation) ─────────────────────────────────────────────

  async getOrCreateVariation(examId: string, studentId: string) {
    try {
      const existing = await pool.query(
        `SELECT variation_code, shuffled_questions FROM exam_variations WHERE exam_id=$1 AND student_id=$2`,
        [examId, studentId]);
      if (existing.rows.length > 0) {
        return {
          variationCode: existing.rows[0].variation_code as string,
          questions: existing.rows[0].shuffled_questions as any[],
        };
      }

      // Fetch questions
      const qRes = await pool.query(
        `SELECT id, question_text, question_type, options_json, correct_answer, points, sort_order
         FROM online_exam_questions WHERE exam_id=$1 ORDER BY sort_order`, [examId]);
      const rawQuestions = qRes.rows;

      const seed = stringToSeed(examId + studentId);
      const codeIndex = Math.abs(seed) % VARIATION_CODES.length;
      const variationCode = VARIATION_CODES[codeIndex];

      const shuffledQs = shuffleArray(rawQuestions, seed);
      const correctMap: Record<string, string> = {};

      const clientQuestions = shuffledQs.map((q: any, qi: number) => {
        if (q.correct_answer) correctMap[q.id] = q.correct_answer;
        const opts: any[] = q.options_json || [];
        const shuffledOpts = shuffleArray(opts, seed + qi * 31);
        return {
          id: q.id,
          text: q.question_text,
          type: q.question_type || 'options',
          options: shuffledOpts.map((o: any) => ({ id: o.id || o.key, text: o.text || o.label })),
          points: q.points || 1,
        };
      });

      await pool.query(
        `INSERT INTO exam_variations (exam_id, student_id, variation_code, shuffled_questions, correct_map)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (exam_id, student_id) DO NOTHING`,
        [examId, studentId, variationCode, JSON.stringify(clientQuestions), JSON.stringify(correctMap)]);

      return { variationCode, questions: clientQuestions };
    } catch (error) { logger.error('Error creating variation:', error); throw error; }
  }

  async getExamDetailsForStudent(examId: string, userId: string) {
    try {
      const studentRes = await pool.query(
        `SELECT id FROM students WHERE user_id=$1 LIMIT 1`, [userId]);
      const studentId = studentRes.rows[0]?.id || userId;

      const examRes = await pool.query(
        `SELECT oe.*, u.name AS teacher_name
         FROM online_exams oe
         LEFT JOIN users u ON u.id = oe.creator_id
         WHERE oe.id=$1`, [examId]);
      if (examRes.rows.length === 0) throw new Error('Exam not found');
      const exam = examRes.rows[0];

      const { variationCode, questions } = await this.getOrCreateVariation(examId, studentId);

      const sessionRes = await pool.query(
        `SELECT * FROM online_exam_sessions WHERE exam_id=$1 AND student_id=$2`, [examId, studentId]);
      const session = sessionRes.rows[0] || null;

      const answersRes = await pool.query(
        `SELECT question_id, student_answer FROM online_exam_answers
         WHERE session_id=(SELECT id FROM online_exam_sessions WHERE exam_id=$1 AND student_id=$2 LIMIT 1)`,
        [examId, studentId]);
      const savedAnswers: Record<string, string> = {};
      answersRes.rows.forEach((r: any) => { savedAnswers[r.question_id] = r.student_answer; });

      const durationMs = Number(exam.duration_minutes) * 60 * 1000;
      const startTime = session?.start_time ? new Date(session.start_time).toISOString() : new Date().toISOString();
      const endTime = session?.start_time
        ? new Date(session.start_time).getTime() + durationMs
        : Date.now() + durationMs;

      let status = 'not_started';
      if (session) {
        if (session.terminated) status = 'terminated';
        else if (session.status === 'submitted') status = 'submitted';
        else status = 'active';
      }

      return {
        exam: {
          id: exam.id,
          title: exam.title,
          durationMinutes: Number(exam.duration_minutes),
          totalMarks: questions.reduce((s: number, q: any) => s + (q.points || 1), 0),
          instructions: '',
          teacherName: exam.teacher_name,
          passwordRequired: false,
        },
        session: {
          id: session?.id || null,
          status,
          startTime,
          endTime,
          terminated: session?.terminated || false,
          violationCount: session?.violation_count || 0,
        },
        questions,
        savedAnswers,
        variationCode,
      };
    } catch (error) { logger.error('Error getting exam details:', error); throw error; }
  }

  // ─── Session management ────────────────────────────────────────────────────

  async createExamSession(examId: string, userId: string) {
    try {
      const studentRes = await pool.query(
        `SELECT id FROM students WHERE user_id=$1 LIMIT 1`, [userId]);
      const studentId = studentRes.rows[0]?.id || userId;

      const result = await pool.query(
        `INSERT INTO online_exam_sessions (exam_id, student_id, status, start_time)
         VALUES ($1, $2, 'active', NOW())
         ON CONFLICT (exam_id, student_id)
         DO UPDATE SET status='active', start_time=COALESCE(online_exam_sessions.start_time, NOW())
         RETURNING *`,
        [examId, studentId]);
      return result.rows[0];
    } catch (error) { logger.error('Error creating session:', error); throw error; }
  }

  async saveExamAnswer(examId: string, userId: string, sessionId: string, questionId: string, answer: string) {
    try {
      const result = await pool.query(
        `INSERT INTO online_exam_answers (session_id, question_id, student_answer, saved_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (session_id, question_id) DO UPDATE SET student_answer=$3, saved_at=NOW()
         RETURNING *`,
        [sessionId, questionId, answer]);
      return result.rows[0];
    } catch (error) { logger.error('Error saving answer:', error); throw error; }
  }

  // ─── Violation & Termination ───────────────────────────────────────────────

  async incrementViolationCount(examId: string, userId: string): Promise<number> {
    try {
      const studentRes = await pool.query(`SELECT id FROM students WHERE user_id=$1 LIMIT 1`, [userId]);
      const studentId = studentRes.rows[0]?.id || userId;
      const result = await pool.query(
        `UPDATE online_exam_sessions
         SET violation_count = COALESCE(violation_count, 0) + 1
         WHERE exam_id=$1 AND student_id=$2
         RETURNING violation_count`,
        [examId, studentId]);
      return result.rows[0]?.violation_count || 1;
    } catch (error) { logger.error('Error incrementing violation:', error); throw error; }
  }

  async markTerminated(examId: string, userId: string, reason: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const studentRes = await client.query(`SELECT id FROM students WHERE user_id=$1 LIMIT 1`, [userId]);
      const studentId = studentRes.rows[0]?.id || userId;
      await client.query(
        `UPDATE online_exam_sessions
         SET terminated=TRUE, termination_reason=$3, status='submitted', end_time=NOW()
         WHERE exam_id=$1 AND student_id=$2`,
        [examId, studentId, reason]);
      await client.query('COMMIT');
      // Auto-grade
      await this.submitExamResult(examId, userId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }

  // ─── Reset PIN ─────────────────────────────────────────────────────────────

  async issueResetPin(examId: string, userId: string, teacherUserId: string, pin: string) {
    try {
      const studentRes = await pool.query(`SELECT id FROM students WHERE user_id=$1 LIMIT 1`, [userId]);
      const studentId = studentRes.rows[0]?.id || userId;
      const teacherRes = await pool.query(`SELECT id FROM teachers WHERE user_id=$1 LIMIT 1`, [teacherUserId]);
      const teacherId = teacherRes.rows[0]?.id || teacherUserId;
      const result = await pool.query(
        `INSERT INTO exam_reset_pins (exam_id, student_id, pin, created_by, used)
         VALUES ($1, $2, $3, $4, FALSE)
         ON CONFLICT (exam_id, student_id)
         DO UPDATE SET pin=$3, used=FALSE, created_at=NOW(), used_at=NULL, created_by=$4
         RETURNING *`,
        [examId, studentId, pin, teacherId]);
      return result.rows[0];
    } catch (error) { logger.error('Error issuing reset PIN:', error); throw error; }
  }

  async validateResetPin(examId: string, userId: string, pin: string): Promise<boolean> {
    try {
      const studentRes = await pool.query(`SELECT id FROM students WHERE user_id=$1 LIMIT 1`, [userId]);
      const studentId = studentRes.rows[0]?.id || userId;
      const res = await pool.query(
        `SELECT id, pin, used FROM exam_reset_pins WHERE exam_id=$1 AND student_id=$2 AND used=FALSE`,
        [examId, studentId]);
      if (res.rows.length === 0 || res.rows[0].pin !== pin) return false;
      await pool.query(`UPDATE exam_reset_pins SET used=TRUE, used_at=NOW() WHERE id=$1`, [res.rows[0].id]);
      await pool.query(
        `UPDATE online_exam_sessions SET terminated=FALSE, termination_reason=NULL, status='active', end_time=NULL
         WHERE exam_id=$1 AND student_id=$2`,
        [examId, studentId]);
      return true;
    } catch (error) { logger.error('Error validating reset PIN:', error); throw error; }
  }

  // ─── Submit / Grade ────────────────────────────────────────────────────────

  async submitExamResult(examId: string, userId: string, _score?: number | null, _totalMarks?: number | null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const studentRes = await client.query(`SELECT id FROM students WHERE user_id=$1 LIMIT 1`, [userId]);
      const studentId = studentRes.rows[0]?.id || userId;

      // Get variation correct map
      const varRes = await client.query(
        `SELECT correct_map FROM exam_variations WHERE exam_id=$1 AND student_id=$2`, [examId, studentId]);
      const correctMap: Record<string, string> = varRes.rows[0]?.correct_map || {};

      // Get student answers
      const sessionRes = await client.query(
        `SELECT id FROM online_exam_sessions WHERE exam_id=$1 AND student_id=$2 LIMIT 1`, [examId, studentId]);
      const sessionId = sessionRes.rows[0]?.id;
      let score = 0;
      let totalMarks = 0;

      if (sessionId) {
        const ansRes = await client.query(
          `SELECT question_id, student_answer FROM online_exam_answers WHERE session_id=$1`, [sessionId]);
        const answersMap: Record<string, string> = {};
        ansRes.rows.forEach((r: any) => { answersMap[r.question_id] = r.student_answer; });

        // Get point values per question
        const qRes = await client.query(
          `SELECT id, points FROM online_exam_questions WHERE exam_id=$1`, [examId]);
        qRes.rows.forEach((q: any) => {
          const pts = q.points || 1;
          totalMarks += pts;
          if (correctMap[q.id] && answersMap[q.id] === correctMap[q.id]) {
            score += pts;
          }
        });

        // Mark each answer correct/incorrect
        for (const [qId, ans] of Object.entries(answersMap)) {
          const isCorrect = correctMap[qId] !== undefined && ans === correctMap[qId];
          await client.query(
            `UPDATE online_exam_answers SET is_correct=$1 WHERE session_id=$2 AND question_id=$3`,
            [isCorrect, sessionId, qId]);
        }
      }

      const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;

      // Update session with final score
      await client.query(
        `UPDATE online_exam_sessions SET status='submitted', end_time=NOW(), final_score=$1
         WHERE exam_id=$2 AND student_id=$3`,
        [percentage, examId, studentId]);

      await client.query('COMMIT');
      return { score, total_marks: totalMarks, percentage: Math.round(percentage) };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error submitting exam result:', error);
      throw error;
    } finally { client.release(); }
  }

  // ─── Teacher exam CRUD (kept from original) ────────────────────────────────

  async createExam(input: any) {
    const { teacherId, title, examType, totalMarks, duration, instructions, selectedSection, questions = [], examPassword, isLocked = false, passwordRequired = false, gradeId, subjectId, classId } = input;
    const creatorRes = await pool.query(`SELECT id FROM users WHERE id=$1`, [teacherId]);
    const creatorId = creatorRes.rows[0]?.id || teacherId;
    const result = await pool.query(
      `INSERT INTO online_exams (creator_id, subject_id, title, duration_minutes, is_published, start_window)
       VALUES ($1, $2, $3, $4, FALSE, NOW()) RETURNING *`,
      [creatorId, subjectId || null, title, duration]);
    const exam = result.rows[0];
    if (Array.isArray(questions) && questions.length > 0) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await pool.query(
          `INSERT INTO online_exam_questions (exam_id, question_text, question_type, options_json, correct_answer, points, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [exam.id, q.text, q.type || 'options', JSON.stringify(q.options || []), q.correctOptionId || null, q.points || 1, i]);
      }
    }
    return { id: exam.id, title: exam.title, status: 'draft', durationMinutes: exam.duration_minutes, questions };
  }

  async getTeacherExams(teacherId: string) {
    const result = await pool.query(
      `SELECT oe.*, COUNT(oeq.id)::int as question_count FROM online_exams oe
       LEFT JOIN online_exam_questions oeq ON oeq.exam_id = oe.id
       WHERE oe.creator_id = (SELECT id FROM users WHERE id=$1)
       GROUP BY oe.id ORDER BY oe.created_at DESC`,
      [teacherId]);
    return result.rows.map((e: any) => ({
      ...e,
      status: e.is_published ? 'published' : 'draft',
      questions: [],
    }));
  }

  async getExamById(examId: string) {
    const result = await pool.query(
      `SELECT oe.*, u.id as teacher_id FROM online_exams oe
       LEFT JOIN users u ON u.id = oe.creator_id WHERE oe.id=$1`, [examId]);
    if (result.rows.length === 0) throw new Error('Exam not found');
    const exam = result.rows[0];
    const qs = await pool.query(
      `SELECT * FROM online_exam_questions WHERE exam_id=$1 ORDER BY sort_order`, [examId]);
    return { ...exam, teacher_id: exam.teacher_id, questions: qs.rows, status: exam.is_published ? 'published' : 'draft' };
  }

  async updateExam(examId: string, input: any) {
    const { title, duration, questions } = input;
    const updates: string[] = []; const vals: any[] = []; let p = 1;
    if (title !== undefined) { updates.push(`title=$${p++}`); vals.push(title); }
    if (duration !== undefined) { updates.push(`duration_minutes=$${p++}`); vals.push(duration); }
    if (updates.length > 0) {
      vals.push(examId);
      await pool.query(`UPDATE online_exams SET ${updates.join(',')} WHERE id=$${p}`, vals);
    }
    return this.getExamById(examId);
  }

  async publishExam(examId: string, teacherId: string) {
    const check = await pool.query(`SELECT creator_id FROM online_exams WHERE id=$1`, [examId]);
    if (check.rows.length === 0) throw new Error('Exam not found');
    const result = await pool.query(
      `UPDATE online_exams SET is_published=TRUE, start_window=NOW() WHERE id=$1 RETURNING *`, [examId]);
    return { ...result.rows[0], status: 'published' };
  }

  async deleteExam(examId: string, teacherId: string) {
    const check = await pool.query(`SELECT is_published FROM online_exams WHERE id=$1`, [examId]);
    if (check.rows.length === 0) throw new Error('Exam not found');
    if (check.rows[0].is_published) throw new Error('Published exams cannot be deleted');
    await pool.query(`DELETE FROM online_exams WHERE id=$1`, [examId]);
    return { success: true };
  }

  async getClassExams(classId: string, onlyPublished = true) {
    try {
      const statusFilter = onlyPublished ? "AND oe.is_published = TRUE" : '';
      const result = await pool.query(
        `SELECT oe.*, u.name AS teacher_name
         FROM online_exams oe
         LEFT JOIN users u ON u.id = oe.creator_id
         WHERE oe.section_id = $1 ${statusFilter}
         ORDER BY oe.created_at DESC`,
        [classId]
      );
      return result.rows.map(exam => ({
        ...exam,
        status: exam.is_published ? 'published' : 'draft',
        questions: []
      }));
    } catch (error) {
      logger.error('Error fetching class exams:', error);
      throw error;
    }
  }

  async verifyExamPassword(_examId: string, _password: string): Promise<boolean> {
    return true; // online_exams has no password field
  }

  async markPasswordVerified(_examId: string, _userId: string) {
    return null;
  }

  async saveExamResult(_examId: string, _studentId: string, _marks: number) {
    return {};
  }

  async getExamResults(examId: string) {
    const result = await pool.query(
      `SELECT oes.*, s.name AS student_name FROM online_exam_sessions oes
       LEFT JOIN students s ON s.id = oes.student_id WHERE oes.exam_id=$1`, [examId]);
    return result.rows;
  }

  async getExamSession(examId: string, userId: string) {
    const studentRes = await pool.query(`SELECT id FROM students WHERE user_id=$1 LIMIT 1`, [userId]);
    const studentId = studentRes.rows[0]?.id || userId;
    const result = await pool.query(
      `SELECT * FROM online_exam_sessions WHERE exam_id=$1 AND student_id=$2`, [examId, studentId]);
    return result.rows[0] || null;
  }
}

export default new TeacherExamService();

import pool from '../config/database';
import { getCurrentVotingCycle } from '../utils/ethiopianWeek';

export interface TeacherVoteOption {
  id: string;
  name: string;
  subjects: string[];
  department: string | null;
}

export interface StudentTeacherOfWeekPayload {
  isOpen: boolean;
  cycleKey: string;
  ethiopianWeekStart: string;
  hasVoted: boolean;
  votedTeacherId: string | null;
  teachers: TeacherVoteOption[];
}

class TeacherOfWeekService {
  async getStudentVoteContext(userId: string): Promise<StudentTeacherOfWeekPayload> {
    const cycle = getCurrentVotingCycle();

    const studentRow = await pool.query(
      `SELECT s.id AS student_id, s.branch_id, s.section_id, s.grade
       FROM students s
       WHERE s.user_id = $1
       LIMIT 1`,
      [userId]
    );

    if (studentRow.rows.length === 0) {
      return {
        isOpen: false,
        cycleKey: cycle.cycleKey,
        ethiopianWeekStart: cycle.cycleKey,
        hasVoted: false,
        votedTeacherId: null,
        teachers: [],
      };
    }

    const { student_id: studentId, branch_id: branchId, section_id: sectionId, grade: studentGrade } = studentRow.rows[0];

    if (!cycle.isOpen) {
      return {
        isOpen: false,
        cycleKey: cycle.cycleKey,
        ethiopianWeekStart: cycle.cycleKey,
        hasVoted: false,
        votedTeacherId: null,
        teachers: [],
      };
    }

    const [teachersResult, voteResult] = await Promise.all([
      pool.query(
        `SELECT DISTINCT t.id, u.name, t.subjects, t.department
         FROM teachers t
         JOIN users u ON t.user_id = u.id
         JOIN courses c ON c.teacher_id = t.id
         JOIN classes cl ON c.class_id = cl.id
         WHERE t.branch_id = $1
           AND u.status != 'Revoked'
           AND u.is_active = true
           AND (
             cl.id = $2
             OR ($2 IS NULL AND cl.branch_id = $1 AND (cl.name = $3 OR cl.grade = $3))
           )
         ORDER BY u.name`,
        [branchId, sectionId, studentGrade]
      ),
      pool.query(
        `SELECT teacher_id FROM teacher_of_week_votes
         WHERE student_id = $1 AND cycle_key = $2
         LIMIT 1`,
        [studentId, cycle.cycleKey]
      ),
    ]);

    const existingVote = voteResult.rows[0]?.teacher_id ?? null;

    return {
      isOpen: true,
      cycleKey: cycle.cycleKey,
      ethiopianWeekStart: cycle.cycleKey,
      hasVoted: !!existingVote,
      votedTeacherId: existingVote,
      teachers: teachersResult.rows.map((row) => ({
        id: row.id,
        name: row.name,
        subjects: Array.isArray(row.subjects) ? row.subjects : [],
        department: row.department ?? null,
      })),
    };
  }

  async submitStudentVote(userId: string, teacherId: string) {
    const cycle = getCurrentVotingCycle();
    if (!cycle.isOpen) {
      throw new Error('Teacher of the Week voting is closed until Saturday morning.');
    }

    const studentRow = await pool.query(
      `SELECT s.id AS student_id, s.branch_id
       FROM students s WHERE s.user_id = $1 LIMIT 1`,
      [userId]
    );
    if (studentRow.rows.length === 0) {
      throw new Error('Student record not found');
    }
    const { student_id: studentId, branch_id: branchId } = studentRow.rows[0];

    const teacherRow = await pool.query(
      `SELECT t.id FROM teachers t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = $1 AND t.branch_id = $2 AND u.status != 'Revoked'`,
      [teacherId, branchId]
    );
    if (teacherRow.rows.length === 0) {
      throw new Error('Teacher not found in your branch');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query(
        `SELECT id FROM teacher_of_week_votes
         WHERE student_id = $1 AND cycle_key = $2 FOR UPDATE`,
        [studentId, cycle.cycleKey]
      );
      if (existing.rows.length > 0) {
        throw new Error('You have already voted this week');
      }

      await client.query(
        `INSERT INTO teacher_of_week_votes
           (branch_id, student_id, teacher_id, cycle_key, ethiopian_week_start)
         VALUES ($1, $2, $3, $4, $5)`,
        [branchId, studentId, teacherId, cycle.cycleKey, cycle.cycleKey]
      );

      await client.query(
        `UPDATE teachers
         SET student_vote_count = COALESCE(student_vote_count, 0) + 1,
             student_vote_rating = COALESCE(student_vote_rating, 0) + 1,
             updated_at = NOW()
         WHERE id = $1`,
        [teacherId]
      );

      await client.query('COMMIT');

      const teacherName = await pool.query(
        `SELECT u.name FROM teachers t JOIN users u ON t.user_id = u.id WHERE t.id = $1`,
        [teacherId]
      );

      return {
        success: true,
        teacherId,
        teacherName: teacherName.rows[0]?.name ?? 'Teacher',
        cycleKey: cycle.cycleKey,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getBranchVoteSummary(branchId: string, cycleKey?: string) {
    const cycle = cycleKey ? { cycleKey, isOpen: true } : getCurrentVotingCycle();
    const key = cycleKey || cycle.cycleKey;

    const totals = await pool.query(
      `SELECT
         t.id AS teacher_id,
         u.name AS teacher_name,
         t.department,
         t.subjects,
         COALESCE(t.student_vote_rating, 0) AS overall_rating,
         COALESCE(t.student_vote_count, 0) AS overall_vote_count,
         COUNT(v.id)::int AS week_votes
       FROM teachers t
       JOIN users u ON t.user_id = u.id
       LEFT JOIN teacher_of_week_votes v
         ON v.teacher_id = t.id AND v.cycle_key = $2
       WHERE t.branch_id = $1 AND u.status != 'Revoked'
       GROUP BY t.id, u.name, t.department, t.subjects, t.student_vote_rating, t.student_vote_count
       ORDER BY week_votes DESC, u.name ASC`,
      [branchId, key]
    );

    const participation = await pool.query(
      `SELECT COUNT(*)::int AS vote_count
       FROM teacher_of_week_votes
       WHERE branch_id = $1 AND cycle_key = $2`,
      [branchId, key]
    );

    return {
      cycleKey: key,
      isOpen: getCurrentVotingCycle().isOpen && getCurrentVotingCycle().cycleKey === key,
      totalVotes: participation.rows[0]?.vote_count ?? 0,
      teachers: totals.rows.map((row) => ({
        teacherId: row.teacher_id,
        teacherName: row.teacher_name,
        department: row.department,
        subjects: Array.isArray(row.subjects) ? row.subjects : [],
        weekVotes: row.week_votes,
        overallRating: Number(row.overall_rating) || 0,
        overallVoteCount: Number(row.overall_vote_count) || 0,
      })),
    };
  }
}

export default new TeacherOfWeekService();

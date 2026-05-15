import pool from '../config/database';

class TeacherService {
  // Mark attendance (bulk)
  async markAttendance(date: string, attendanceRecords: Array<{ studentId: string; status: string }>, recordedBy: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const results = [];
      for (const record of attendanceRecords) {
        const result = await client.query(
          `INSERT INTO student_attendance (student_id, date, status, recorded_by)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (student_id, date) 
           DO UPDATE SET status = $3, recorded_by = $4
           RETURNING *`,
          [record.studentId, date, record.status, recordedBy]
        );
        results.push(result.rows[0]);
      }

      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get attendance for a class
  async getAttendance(classId: string, date?: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `SELECT 
        sa.id, sa.student_id, sa.date, sa.status,
        u.name as student_name, u.digital_id,
        s.grade
      FROM student_attendance sa
      JOIN students s ON sa.student_id = s.id
      JOIN users u ON s.user_id = u.id
      JOIN classes c ON s.grade = c.name
      WHERE c.id = $1 AND sa.date = $2
      ORDER BY u.name`,
      [classId, targetDate]
    );

    return result.rows;
  }

  // Enter grade
  async enterGrade(data: {
    studentId: string;
    courseId: string;
    type: string;
    score: number;
    total: number;
    weight?: string;
  }) {
    const result = await pool.query(
      `INSERT INTO grades (student_id, course_id, type, score, total, weight)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.studentId, data.courseId, data.type, data.score, data.total, data.weight]
    );

    return result.rows[0];
  }

  // Get grades by course
  async getGradesByCourse(courseId: string) {
    const result = await pool.query(
      `SELECT 
        g.*,
        u.name as student_name, u.digital_id,
        s.grade
      FROM grades g
      JOIN students s ON g.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE g.course_id = $1
      ORDER BY u.name, g.created_at DESC`,
      [courseId]
    );

    return result.rows;
  }

  // Update grade
  async updateGrade(gradeId: string, teacherId: string, data: {
    score: number;
    total: number;
    type?: string;
    weight?: string;
  }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get grade with student and course info
      const gradeResult = await client.query(
        `SELECT g.*, s.grade as grade_level, s.branch_id, c.teacher_id
         FROM grades g
         JOIN students s ON g.student_id = s.id
         JOIN courses c ON g.course_id = c.id
         WHERE g.id = $1`,
        [gradeId]
      );

      if (gradeResult.rows.length === 0) {
        throw new Error('Grade not found');
      }

      const grade = gradeResult.rows[0];

      // Get teacher record
      const teacherResult = await client.query(
        'SELECT id FROM teachers WHERE user_id = $1',
        [teacherId]
      );

      if (teacherResult.rows.length === 0) {
        throw new Error('Teacher not found');
      }

      // Verify teacher owns this course
      if (grade.teacher_id !== teacherResult.rows[0].id) {
        throw new Error('You can only update grades for courses you teach');
      }

      // Check if grades are locked for this grade level
      const lockResult = await client.query(
        `SELECT is_locked FROM grade_locks 
         WHERE grade_level = $1 AND branch_id = $2 AND is_locked = true`,
        [grade.grade_level, grade.branch_id]
      );

      if (lockResult.rows.length > 0) {
        throw new Error(`Grades are locked for ${grade.grade_level}. Contact Vice Principal to unlock.`);
      }

      // Validate score doesn't exceed total
      if (data.score > data.total) {
        throw new Error('Score cannot exceed total marks');
      }

      // Update grade
      const updateResult = await client.query(
        `UPDATE grades SET
         score = $1, total = $2, type = COALESCE($3, type), weight = COALESCE($4, weight)
         WHERE id = $5
         RETURNING *`,
        [data.score, data.total, data.type, data.weight, gradeId]
      );

      await client.query('COMMIT');
      return updateResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Delete grade
  async deleteGrade(gradeId: string, teacherId: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get grade with student and course info
      const gradeResult = await client.query(
        `SELECT g.*, s.grade as grade_level, s.branch_id, c.teacher_id
         FROM grades g
         JOIN students s ON g.student_id = s.id
         JOIN courses c ON g.course_id = c.id
         WHERE g.id = $1`,
        [gradeId]
      );

      if (gradeResult.rows.length === 0) {
        throw new Error('Grade not found');
      }

      const grade = gradeResult.rows[0];

      // Get teacher record
      const teacherResult = await client.query(
        'SELECT id FROM teachers WHERE user_id = $1',
        [teacherId]
      );

      if (teacherResult.rows.length === 0) {
        throw new Error('Teacher not found');
      }

      // Verify teacher owns this course
      if (grade.teacher_id !== teacherResult.rows[0].id) {
        throw new Error('You can only delete grades for courses you teach');
      }

      // Check if grades are locked for this grade level
      const lockResult = await client.query(
        `SELECT is_locked FROM grade_locks 
         WHERE grade_level = $1 AND branch_id = $2 AND is_locked = true`,
        [grade.grade_level, grade.branch_id]
      );

      if (lockResult.rows.length > 0) {
        throw new Error(`Grades are locked for ${grade.grade_level}. Contact Vice Principal to unlock.`);
      }

      // Delete grade
      await client.query('DELETE FROM grades WHERE id = $1', [gradeId]);

      await client.query('COMMIT');
      return { id: gradeId, deleted: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get assigned classes
  async getAssignedClasses(teacherId: string) {
    // Get teacher record
    const teacherResult = await pool.query(
      'SELECT * FROM teachers WHERE user_id = $1',
      [teacherId]
    );

    if (teacherResult.rows.length === 0) {
      throw new Error('Teacher not found');
    }

    const teacher = teacherResult.rows[0];

    // Get classes where teacher is assigned
    const result = await pool.query(
      `SELECT 
        c.*,
        COUNT(s.id) as actual_student_count
      FROM classes c
      LEFT JOIN students s ON s.grade = c.name AND s.branch_id = c.branch_id
      WHERE c.teacher_id = $1
      GROUP BY c.id
      ORDER BY c.name`,
      [teacher.id]
    );

    return result.rows;
  }

  // Get student roster
  async getStudentRoster(classId: string) {
    const result = await pool.query(
      `SELECT 
        s.id, s.grade, s.parent_name, s.parent_phone,
        s.allergies, s.medications, s.chronic_conditions,
        u.name, u.email, u.digital_id
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN classes c ON s.grade = c.name AND s.branch_id = c.branch_id
      WHERE c.id = $1
      ORDER BY u.name`,
      [classId]
    );

    return result.rows;
  }

  // Submit weekly lesson plan
  async submitWeeklyPlan(teacherId: string, planData: any) {
    // Get teacher record
    const teacherResult = await pool.query(
      'SELECT id FROM teachers WHERE user_id = $1',
      [teacherId]
    );

    if (teacherResult.rows.length === 0) {
      throw new Error('Teacher not found');
    }

    const result = await pool.query(
      `INSERT INTO weekly_plans 
       (teacher_id, date, content, objectives, teacher_activity, time_duration,
        student_activity, teaching_method, teaching_aids, evaluation, remark, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        teacherResult.rows[0].id,
        planData.date,
        planData.content,
        planData.objectives,
        planData.teacherActivity,
        planData.timeDuration,
        planData.studentActivity,
        planData.teachingMethod,
        planData.teachingAids,
        planData.evaluation,
        planData.remark || null,
        planData.status || 'Pending'
      ]
    );

    return result.rows[0];
  }

  // Get teacher plans
  async getTeacherPlans(teacherId: string, status?: string) {
    // Get teacher record
    const teacherResult = await pool.query(
      'SELECT id FROM teachers WHERE user_id = $1',
      [teacherId]
    );

    if (teacherResult.rows.length === 0) {
      throw new Error('Teacher not found');
    }

    let query = `
      SELECT wp.*, u.name as reviewed_by_name
      FROM weekly_plans wp
      LEFT JOIN teachers t ON wp.reviewed_by = t.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE wp.teacher_id = $1
    `;

    const params: any[] = [teacherResult.rows[0].id];

    if (status) {
      query += ' AND wp.status = $2';
      params.push(status);
    }

    query += ' ORDER BY wp.date DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Update lesson plan
  async updatePlan(planId: string, teacherId: string, planData: any) {
    // Get teacher record
    const teacherResult = await pool.query(
      'SELECT id FROM teachers WHERE user_id = $1',
      [teacherId]
    );

    if (teacherResult.rows.length === 0) {
      throw new Error('Teacher not found');
    }

    // Check if plan belongs to teacher and is in Draft status
    const checkResult = await pool.query(
      'SELECT status FROM weekly_plans WHERE id = $1 AND teacher_id = $2',
      [planId, teacherResult.rows[0].id]
    );

    if (checkResult.rows.length === 0) {
      throw new Error('Lesson plan not found or access denied');
    }

    if (checkResult.rows[0].status !== 'Draft' && checkResult.rows[0].status !== 'Revision Required') {
      throw new Error('Can only update plans in Draft or Revision Required status');
    }

    const result = await pool.query(
      `UPDATE weekly_plans SET
       date = $1, content = $2, objectives = $3, teacher_activity = $4,
       time_duration = $5, student_activity = $6, teaching_method = $7,
       teaching_aids = $8, evaluation = $9, remark = $10,
       status = $11, updated_at = NOW()
       WHERE id = $12
       RETURNING *`,
      [
        planData.date,
        planData.content,
        planData.objectives,
        planData.teacherActivity,
        planData.timeDuration,
        planData.studentActivity,
        planData.teachingMethod,
        planData.teachingAids,
        planData.evaluation,
        planData.remark || null,
        planData.status || 'Pending',
        planId
      ]
    );

    return result.rows[0];
  }

  // Submit communication log
  async submitCommunicationLog(teacherId: string, logData: any) {
    // Get teacher record
    const teacherResult = await pool.query(
      'SELECT id FROM teachers WHERE user_id = $1',
      [teacherId]
    );

    if (teacherResult.rows.length === 0) {
      throw new Error('Teacher not found');
    }

    const result = await pool.query(
      `INSERT INTO communication_logs
       (student_id, teacher_id, week_ending, rating_uniform, rating_materials,
        rating_homework, rating_participation, rating_conduct, rating_social,
        rating_punctuality, rating_note_taking, teacher_note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (student_id, week_ending)
       DO UPDATE SET
         rating_uniform = $4, rating_materials = $5, rating_homework = $6,
         rating_participation = $7, rating_conduct = $8, rating_social = $9,
         rating_punctuality = $10, rating_note_taking = $11, teacher_note = $12
       RETURNING *`,
      [
        logData.studentId,
        teacherResult.rows[0].id,
        logData.weekEnding,
        logData.ratingUniform,
        logData.ratingMaterials,
        logData.ratingHomework,
        logData.ratingParticipation,
        logData.ratingConduct,
        logData.ratingSocial,
        logData.ratingPunctuality,
        logData.ratingNoteTaking,
        logData.teacherNote || null
      ]
    );

    return result.rows[0];
  }

  // Get communication logs
  async getCommunicationLogs(studentId: string) {
    const result = await pool.query(
      `SELECT cl.*, u.name as teacher_name
       FROM communication_logs cl
       JOIN teachers t ON cl.teacher_id = t.id
       JOIN users u ON t.user_id = u.id
       WHERE cl.student_id = $1
       ORDER BY cl.week_ending DESC`,
      [studentId]
    );

    return result.rows;
  }

  // Get teacher schedule
  async getTeacherSchedule(teacherId: string) {
    // Get teacher record
    const teacherResult = await pool.query(
      'SELECT id FROM teachers WHERE user_id = $1',
      [teacherId]
    );

    if (teacherResult.rows.length === 0) {
      throw new Error('Teacher not found');
    }

    const result = await pool.query(
      `SELECT * FROM schedules
       WHERE teacher_id = $1
       ORDER BY 
         CASE day
           WHEN 'Monday' THEN 1
           WHEN 'Tuesday' THEN 2
           WHEN 'Wednesday' THEN 3
           WHEN 'Thursday' THEN 4
           WHEN 'Friday' THEN 5
           WHEN 'Saturday' THEN 6
           WHEN 'Sunday' THEN 7
         END,
         time_slot`,
      [teacherResult.rows[0].id]
    );

    return result.rows;
  }

  // Get dashboard
  async getDashboard(teacherId: string) {
    // Get teacher record
    const teacherResult = await pool.query(
      'SELECT * FROM teachers WHERE user_id = $1',
      [teacherId]
    );

    if (teacherResult.rows.length === 0) {
      throw new Error('Teacher not found');
    }

    const teacher = teacherResult.rows[0];

    // Today's schedule
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const scheduleResult = await pool.query(
      'SELECT * FROM schedules WHERE teacher_id = $1 AND day = $2 ORDER BY time_slot',
      [teacher.id, today]
    );

    // Assigned classes count
    const classesResult = await pool.query(
      'SELECT COUNT(*) as count FROM classes WHERE teacher_id = $1',
      [teacher.id]
    );

    // Pending lesson plans
    const plansResult = await pool.query(
      `SELECT COUNT(*) as count FROM weekly_plans 
       WHERE teacher_id = $1 AND status IN ('Draft', 'Revision Required')`,
      [teacher.id]
    );

    return {
      todaySchedule: scheduleResult.rows,
      assignedClassesCount: parseInt(classesResult.rows[0].count),
      pendingPlansCount: parseInt(plansResult.rows[0].count),
      teacherInfo: teacher
    };
  }
}

export default new TeacherService();

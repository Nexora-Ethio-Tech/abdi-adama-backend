import pool from '../config/database';

class TeacherService {
  private async assertGradesNotGloballyLocked(client: { query: typeof pool.query }) {
    const globalLockResult = await client.query(
      `SELECT value FROM system_settings WHERE key = 'grades_locked'`
    );
    if (globalLockResult.rows[0]?.value === 'true') {
      throw new Error('Grade entry is globally locked by administration.');
    }
  }

  private async assertGradeNotLocked(client: { query: typeof pool.query }, teacherId: string, courseId: string, type: string) {
    const submissionResult = await client.query(
      `SELECT 1 FROM grade_submissions 
       WHERE course_id = $1 AND teacher_id = $2 AND submission_type = $3`,
      [courseId, teacherId, type]
    );
    if (submissionResult.rows[0]) {
      throw new Error(`Grades for this course and assessment type "${type}" have already been submitted and locked.`);
    }
  }

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
        s.id as student_id,
        u.name as student_name,
        u.digital_id,
        s.grade,
        sa.id as attendance_id,
        sa.status,
        sa.date
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN classes c ON s.grade = c.name AND s.branch_id = c.branch_id
      LEFT JOIN student_attendance sa ON s.id = sa.student_id AND sa.date = $2
      WHERE c.id = $1
      ORDER BY u.name`,
      [classId, targetDate]
    );

    return result.rows.map((row: any) => ({
      id: row.attendance_id,
      student_id: row.student_id,
      studentId: row.student_id,
      date: row.date,
      status: row.status,
      student_name: row.student_name,
      studentName: row.student_name,
      digital_id: row.digital_id,
      digitalId: row.digital_id,
      grade: row.grade
    }));
  }

  // Enter grade
  async enterGrade(data: {
    studentId: string;
    courseId: string;
    type: string;
    score: number;
    total: number;
    weight?: string;
    academicYear?: string;
    semester?: number;
  }) {
    const academicYear = data.academicYear || '2025/2026';
    const semester = data.semester ?? 2;
    const result = await pool.query(
      `INSERT INTO grades (student_id, course_id, type, score, total, weight, academic_year, semester)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (student_id, course_id, type, academic_year, semester)
       DO UPDATE SET score = EXCLUDED.score, total = EXCLUDED.total, weight = EXCLUDED.weight
       RETURNING *`,
      [data.studentId, data.courseId, data.type, data.score, data.total, data.weight, academicYear, semester]
    );

    return result.rows[0];
  }

  // Bulk enter grades
  async bulkEnterGrades(teacherId: string, courseId: string, grades: Array<{
    studentId: string;
    type: string;
    score: number;
    total: number;
    weight?: string;
  }>, options?: { academicYear?: string; semester?: number }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get teacher record
      const teacherResult = await client.query(
        'SELECT id, branch_id FROM teachers WHERE user_id = $1',
        [teacherId]
      );

      if (teacherResult.rows.length === 0) {
        throw new Error('Teacher not found');
      }

      const teacher = teacherResult.rows[0];

      // Verify teacher owns this course
      const courseResult = await client.query(
        'SELECT teacher_id FROM courses WHERE id = $1',
        [courseId]
      );

      if (courseResult.rows.length === 0) {
        throw new Error('Course not found');
      }

      if (courseResult.rows[0].teacher_id !== teacher.id) {
        throw new Error('You can only enter grades for courses you teach');
      }

      // Get all students' grade levels to check locks
      const studentIds = grades.map(g => g.studentId);
      const studentsResult = await client.query(
        `SELECT DISTINCT s.grade, s.branch_id 
         FROM students s 
         WHERE s.id = ANY($1::uuid[])`,
        [studentIds]
      );

      await this.assertGradesNotGloballyLocked(client);

      // Check if any grade level is locked
      for (const student of studentsResult.rows) {
        const lockResult = await client.query(
          `SELECT is_locked FROM grade_locks 
           WHERE grade_level = $1 AND branch_id = $2 AND is_locked = true`,
          [student.grade, student.branch_id]
        );

        if (lockResult.rows.length > 0) {
          throw new Error(`Grades are locked for ${student.grade}. Contact Vice Principal to unlock.`);
        }
      }

      // Check if grades are locked for this course and type (already submitted)
      const uniqueTypes = Array.from(new Set(grades.map(g => g.type)));
      for (const type of uniqueTypes) {
        await this.assertGradeNotLocked(client, teacher.id, courseId, type);
      }

      // Validate all grades
      for (const grade of grades) {
        if (grade.score > grade.total) {
          throw new Error(`Score (${grade.score}) cannot exceed total (${grade.total}) for student ${grade.studentId}`);
        }
        if (grade.score < 0) {
          throw new Error(`Score cannot be negative for student ${grade.studentId}`);
        }
        if (grade.total <= 0) {
          throw new Error(`Total must be positive for student ${grade.studentId}`);
        }
      }

      // Bulk upsert grades (scoped by academic year + semester)
      const insertedGrades = [];
      const academicYear = options?.academicYear || '2025/2026';
      const semester = options?.semester ?? 2;
      for (const grade of grades) {
        const result = await client.query(
          `INSERT INTO grades (student_id, course_id, type, score, total, weight, academic_year, semester)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (student_id, course_id, type, academic_year, semester)
           DO UPDATE SET score = EXCLUDED.score, total = EXCLUDED.total, weight = EXCLUDED.weight
           RETURNING *`,
          [grade.studentId, courseId, grade.type, grade.score, grade.total, grade.weight || null, academicYear, semester]
        );
        insertedGrades.push(result.rows[0]);
      }

      await client.query('COMMIT');
      return {
        count: insertedGrades.length,
        grades: insertedGrades
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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

      if (grade.is_submitted) {
        throw new Error('This grade has been submitted and locked, and cannot be updated.');
      }

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

      await this.assertGradesNotGloballyLocked(client);

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

      if (grade.is_submitted) {
        throw new Error('This grade has been submitted and locked, and cannot be deleted.');
      }

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

      await this.assertGradesNotGloballyLocked(client);

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

  // Get assigned classes (teacher courses with class/section context)
  async getAssignedClasses(teacherId: string) {
    const teacherResult = await pool.query(
      'SELECT * FROM teachers WHERE user_id = $1',
      [teacherId]
    );

    if (teacherResult.rows.length === 0) {
      throw new Error('Teacher not found');
    }

    const teacher = teacherResult.rows[0];

    const coursesResult = await pool.query(
      `SELECT
        c.id,
        c.id AS course_id,
        c.name AS subject,
        c.code,
        cl.id AS class_id,
        cl.name,
        cl.section,
        cl.grade AS grade_level,
        COUNT(DISTINCT s.id) AS actual_student_count
      FROM courses c
      JOIN classes cl ON c.class_id = cl.id
      LEFT JOIN students s ON s.section_id = cl.id
        OR (s.section_id IS NULL AND s.branch_id IS NOT DISTINCT FROM cl.branch_id AND (s.grade = cl.name OR cl.grade = s.grade))
      WHERE c.teach
      er_id = $1
      GROUP BY c.id, cl.id
      ORDER BY cl.name, c.name`,
      [teacher.id]
    );

    if (coursesResult.rows.length > 0) {
      return coursesResult.rows;
    }

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
        student_activity, teaching_method, teaching_aids, evaluation, remark, status,
        course_id, subject, dept_head_id, week_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
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
        planData.status || 'Pending',
        planData.courseId || null,
        planData.subject || null,
        planData.deptHeadId || null,
        planData.weekNumber || null
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
       status = $11, course_id = $12, subject = $13, dept_head_id = $14,
       week_number = $15, updated_at = NOW()
       WHERE id = $16
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
        planData.courseId || null,
        planData.subject || null,
        planData.deptHeadId || null,
        planData.weekNumber || null,
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

  // Get student's all grades (teacher view)
  async getStudentGrades(studentId: string, teacherId: string) {
    const client = await pool.connect();
    try {
      // Get teacher record
      const teacherResult = await client.query(
        'SELECT id, branch_id FROM teachers WHERE user_id = $1',
        [teacherId]
      );

      if (teacherResult.rows.length === 0) {
        throw new Error('Teacher not found');
      }

      const teacher = teacherResult.rows[0];

      // Get student info and verify they're in teacher's branch
      const studentResult = await client.query(
        `SELECT 
          s.id, s.grade, s.status,
          u.name, u.email, u.digital_id
        FROM students s
        JOIN users u ON s.user_id = u.id
        WHERE s.id = $1 AND s.branch_id = $2`,
        [studentId, teacher.branch_id]
      );

      if (studentResult.rows.length === 0) {
        throw new Error('Student not found or not in your branch');
      }

      const student = studentResult.rows[0];

      // Verify teacher has access to this student (student must be in one of teacher's classes)
      const accessResult = await client.query(
        `SELECT COUNT(*) as count
         FROM classes c
         JOIN students s ON s.grade = c.name AND s.branch_id = c.branch_id
         WHERE c.teacher_id = $1 AND s.id = $2`,
        [teacher.id, studentId]
      );

      if (parseInt(accessResult.rows[0].count) === 0) {
        throw new Error('You can only view grades for students in your classes');
      }

      // Get all grades grouped by course
      const gradesResult = await client.query(
        `SELECT 
          g.id, g.type, g.score, g.total, g.weight, g.created_at,
          c.id as course_id, c.name as course_name, c.code as course_code,
          t.id as teacher_id,
          u.name as teacher_name,
          CASE WHEN t.id = $2 THEN true ELSE false END as is_my_course
        FROM grades g
        JOIN courses c ON g.course_id = c.id
        LEFT JOIN teachers t ON c.teacher_id = t.id
        LEFT JOIN users u ON t.user_id = u.id
        WHERE g.student_id = $1
        ORDER BY is_my_course DESC, c.name, g.created_at DESC`,
        [studentId, teacher.id]
      );

      // Group grades by course and calculate averages
      const courseMap = new Map();
      let totalWeightedScore = 0;
      let totalWeight = 0;
      let myCoursesAverage = 0;
      let myCoursesCount = 0;

      for (const grade of gradesResult.rows) {
        const courseId = grade.course_id;

        if (!courseMap.has(courseId)) {
          courseMap.set(courseId, {
            courseId: grade.course_id,
            courseName: grade.course_name,
            courseCode: grade.course_code,
            teacherId: grade.teacher_id,
            teacherName: grade.teacher_name,
            isMyCourse: grade.is_my_course,
            grades: [],
            totalScore: 0,
            totalPossible: 0,
            average: 0,
            gradeCount: 0
          });
        }

        const course = courseMap.get(courseId);
        const percentage = grade.total > 0 ? (grade.score / grade.total) * 100 : 0;

        course.grades.push({
          id: grade.id,
          type: grade.type,
          score: grade.score,
          total: grade.total,
          weight: grade.weight,
          percentage: parseFloat(percentage.toFixed(2)),
          createdAt: grade.created_at
        });

        course.totalScore += grade.score;
        course.totalPossible += grade.total;
        course.gradeCount++;

        // Calculate weighted contribution for overall average
        if (grade.weight) {
          const weight = parseFloat(grade.weight);
          totalWeightedScore += percentage * weight;
          totalWeight += weight;
        }
      }

      // Calculate course averages and separate my courses
      const myCourses = [];
      const otherCourses = [];

      for (const course of courseMap.values()) {
        course.average = course.totalPossible > 0
          ? parseFloat(((course.totalScore / course.totalPossible) * 100).toFixed(2))
          : 0;

        if (course.isMyCourse) {
          myCourses.push(course);
          myCoursesAverage += course.average;
          myCoursesCount++;
        } else {
          otherCourses.push(course);
        }
      }

      const courses = [...myCourses, ...otherCourses];

      // Calculate overall average
      const overallAverage = totalWeight > 0
        ? parseFloat((totalWeightedScore / totalWeight).toFixed(2))
        : courses.length > 0
          ? parseFloat((courses.reduce((sum, c) => sum + c.average, 0) / courses.length).toFixed(2))
          : 0;

      const myAverage = myCoursesCount > 0
        ? parseFloat((myCoursesAverage / myCoursesCount).toFixed(2))
        : 0;

      return {
        student: {
          id: student.id,
          name: student.name,
          email: student.email,
          digitalId: student.digital_id,
          grade: student.grade,
          status: student.status
        },
        myCourses,
        otherCourses,
        summary: {
          totalCourses: courses.length,
          myCoursesCount,
          otherCoursesCount: courses.length - myCoursesCount,
          totalGrades: gradesResult.rows.length,
          overallAverage,
          myCoursesAverage: myAverage,
          gradeStatus: overallAverage >= 50 ? 'Passing' : 'Needs Improvement'
        }
      };
    } finally {
      client.release();
    }
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

  // Submit all grades for a course and lock them
  async submitCourseGrades(teacherUserId: string, courseId: string, submissionType: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Get teacher record
      const teacherResult = await client.query(
        'SELECT id, branch_id FROM teachers WHERE user_id = $1',
        [teacherUserId]
      );

      if (teacherResult.rows.length === 0) {
        throw new Error('Teacher not found');
      }
      const teacherId = teacherResult.rows[0].id;

      // 2. Verify teacher owns this course
      const courseResult = await client.query(
        'SELECT teacher_id FROM courses WHERE id = $1',
        [courseId]
      );

      if (courseResult.rows.length === 0) {
        throw new Error('Course not found');
      }

      if (courseResult.rows[0].teacher_id !== teacherId) {
        throw new Error('You can only submit grades for courses you teach');
      }

      // 3. Check if already submitted
      const checkSubResult = await client.query(
        `SELECT 1 FROM grade_submissions 
         WHERE course_id = $1 AND teacher_id = $2 AND submission_type = $3`,
        [courseId, teacherId, submissionType]
      );

      if (checkSubResult.rows.length > 0) {
        throw new Error('Grades for this course and type have already been submitted and locked.');
      }

      // 4. Update all matching grades to is_submitted = true
      await client.query(
        `UPDATE grades 
         SET is_submitted = true, submitted_at = NOW(), submitted_by = $1
         WHERE course_id = $2 AND type = $3`,
        [teacherUserId, courseId, submissionType]
      );

      // 5. Insert into grade_submissions
      const insertResult = await client.query(
        `INSERT INTO grade_submissions (course_id, teacher_id, submission_type, submitted_at, submitted_by, is_locked)
         VALUES ($1, $2, $3, NOW(), $4, TRUE)
         RETURNING *`,
        [courseId, teacherId, submissionType, teacherUserId]
      );

      await client.query('COMMIT');
      return insertResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get teacher's own grade submissions
  async getGradeSubmissions(teacherUserId: string) {
    const teacherResult = await pool.query(
      'SELECT id FROM teachers WHERE user_id = $1',
      [teacherUserId]
    );

    if (teacherResult.rows.length === 0) {
      throw new Error('Teacher not found');
    }

    const result = await pool.query(
      `SELECT gs.*, c.name as course_name, c.code as course_code
       FROM grade_submissions gs
       JOIN courses c ON gs.course_id = c.id
       WHERE gs.teacher_id = $1
       ORDER BY gs.submitted_at DESC`,
      [teacherResult.rows[0].id]
    );

    return result.rows;
  }

  // Get department heads (teachers where is_dean = true)
  async getDepartmentHeads(branchId: string) {
    const result = await pool.query(
      `SELECT t.id as teacher_id, u.name, t.department
       FROM teachers t
       JOIN users u ON t.user_id = u.id
       WHERE t.branch_id = $1 AND t.is_dean = true AND u.is_active = true
       ORDER BY u.name`,
      [branchId]
    );
    return result.rows;
  }

  // Get weekly plans submitted to this teacher (as department head)
  async getDeptPlans(teacherUserId: string, status?: string) {
    const teacherResult = await pool.query(
      'SELECT id FROM teachers WHERE user_id = $1',
      [teacherUserId]
    );

    if (teacherResult.rows.length === 0) {
      throw new Error('Teacher not found');
    }

    const teacherId = teacherResult.rows[0].id;

    let query = `
      SELECT wp.*, u.name as teacher_name, c.name as course_name
      FROM weekly_plans wp
      JOIN teachers t ON wp.teacher_id = t.id
      JOIN users u ON t.user_id = u.id
      LEFT JOIN courses c ON wp.course_id = c.id
      WHERE wp.dept_head_id = $1
    `;
    const params: any[] = [teacherId];

    if (status) {
      query += ' AND wp.status = $2';
      params.push(status);
    }

    query += ' ORDER BY wp.date DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Review a weekly plan as department head
  async reviewDeptPlan(teacherUserId: string, planId: string, reviewData: { status: string; feedback?: string; rating?: number }) {
    const teacherResult = await pool.query(
      'SELECT id FROM teachers WHERE user_id = $1',
      [teacherUserId]
    );

    if (teacherResult.rows.length === 0) {
      throw new Error('Teacher not found');
    }

    const teacherId = teacherResult.rows[0].id;

    // Check if the plan exists and is assigned to this department head
    const planCheck = await pool.query(
      'SELECT id, status FROM weekly_plans WHERE id = $1 AND dept_head_id = $2',
      [planId, teacherId]
    );

    if (planCheck.rows.length === 0) {
      throw new Error('Lesson plan not found or not assigned to you for review');
    }

    const result = await pool.query(
      `UPDATE weekly_plans SET
       status = $1,
       dean_feedback = $2,
       dean_rating = $3,
       reviewed_by = $4,
       updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [reviewData.status, reviewData.feedback || null, reviewData.rating || null, teacherId, planId]
    );

    return result.rows[0];
  }

  // ─── Exam Grade & Subject Management ───────────────────────────────────────

  /**
   * Get all unique grade levels from classes and students
   */
  async getAllGrades() {
    try {
      const result = await pool.query(
        `SELECT DISTINCT 
          CASE 
            WHEN c.name LIKE 'Grade %' THEN c.name
            ELSE 'Grade ' || s.grade
          END as id,
          CASE 
            WHEN c.name LIKE 'Grade %' THEN c.name
            ELSE 'Grade ' || s.grade
          END as name,
          CASE 
            WHEN s.grade ~ '^[0-9]+$' THEN CAST(s.grade as INTEGER)
            ELSE CAST(SUBSTRING(c.name, 7) as INTEGER)
          END as level
         FROM students s
         LEFT JOIN classes c ON s.grade = c.name OR s.grade = SUBSTRING(c.name, 7)
         WHERE s.grade IS NOT NULL
         ORDER BY level ASC`
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching grades:', error);
      throw error;
    }
  }

  /**
   * Get all courses/subjects for a specific grade
   */
  async getCoursesByGrade(gradeOrClassName: string) {
    try {
      const result = await pool.query(
        `SELECT DISTINCT c.id, c.name, c.code, cl.name as class_name
         FROM courses c
         LEFT JOIN classes cl ON c.class_id = cl.id
         WHERE c.class_id IN (
           SELECT id FROM classes 
           WHERE name = $1 OR name = 'Grade ' || $1 OR name LIKE $1 || '%'
         )
         ORDER BY c.name ASC`,
        [gradeOrClassName]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching courses by grade:', error);
      throw error;
    }
  }

  /**
   * Get all courses taught by a specific teacher
   */
  async getTeacherCourses(teacherId: string) {
    try {
      const teacherResult = await pool.query(
        'SELECT id FROM teachers WHERE user_id = $1',
        [teacherId]
      );

      if (teacherResult.rows.length === 0) {
        throw new Error('Teacher not found');
      }

      const result = await pool.query(
        `SELECT DISTINCT c.id, c.name, c.code, cl.id as class_id, cl.name as class_name, cl.grade as grade_level
         FROM courses c
         LEFT JOIN classes cl ON c.class_id = cl.id
         WHERE c.teacher_id = $1
         ORDER BY cl.name ASC, c.name ASC`,
        [teacherResult.rows[0].id]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching teacher courses:', error);
      throw error;
    }
  }
}

export default new TeacherService();

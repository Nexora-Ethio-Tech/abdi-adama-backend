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

  private async assertGradeNotLocked(
    client: { query: typeof pool.query },
    teacherId: string,
    courseId: string,
    type: string,
    academicYear?: string,
    semester?: number
  ) {
    const conditions = ['course_id = $1', 'teacher_id = $2', 'submission_type = $3', 'is_locked = true'];
    const params: any[] = [courseId, teacherId, type];

    if (academicYear) {
      conditions.push(`academic_year = $${params.length + 1}`);
      params.push(academicYear);
    }
    if (semester !== undefined) {
      conditions.push(`semester = $${params.length + 1}`);
      params.push(semester);
    }

    const submissionResult = await client.query(
      `SELECT 1 FROM grade_submissions WHERE ${conditions.join(' AND ')} LIMIT 1`,
      params
    );
    if (submissionResult.rows[0]) {
      throw new Error(`Grades for this course, assessment type "${type}", and academic period have already been submitted and locked.`);
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
      JOIN classes c ON s.section_id = c.id 
        OR (s.section_id IS NULL AND (s.grade = c.name OR s.grade = c.grade) AND s.branch_id = c.branch_id)
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

  // Enter grade (single student)
  async enterGrade(data: {
    teacherUserId?: string;
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

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // If a teacher is entering grades, validate ownership and lock status
      if (data.teacherUserId) {
        const teacherResult = await client.query(
          'SELECT id FROM teachers WHERE user_id = $1',
          [data.teacherUserId]
        );
        if (teacherResult.rows.length === 0) throw new Error('Teacher not found');
        const teacherId = teacherResult.rows[0].id;

        const courseResult = await client.query(
          'SELECT teacher_id FROM courses WHERE id = $1',
          [data.courseId]
        );
        if (courseResult.rows.length === 0) throw new Error('Course not found');
        if (courseResult.rows[0].teacher_id !== teacherId) {
          throw new Error('You can only enter grades for courses you teach');
        }

        await this.assertGradesNotGloballyLocked(client);
        await this.assertGradeNotLocked(client, teacherId, data.courseId, data.type, academicYear, semester);
      }

      const result = await client.query(
        `INSERT INTO grades (student_id, course_id, type, score, total, weight, academic_year, semester, status, is_submitted, is_finalized)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', false, false)
         ON CONFLICT (student_id, course_id, type, academic_year, semester)
         DO UPDATE SET
           score = EXCLUDED.score,
           total = GREATEST(grades.total, EXCLUDED.total),
           weight = COALESCE(EXCLUDED.weight, grades.weight),
           status = 'draft',
           is_submitted = false,
           is_finalized = false
         RETURNING *`,
        [data.studentId, data.courseId, data.type, data.score, data.total, data.weight, academicYear, semester]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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

      // Check if grades are locked for this course and type (already submitted) within the academic period
      const academicYear = options?.academicYear || '2025/2026';
      const semester = options?.semester ?? 2;
      const uniqueTypes = Array.from(new Set(grades.map(g => g.type)));
      for (const type of uniqueTypes) {
        await this.assertGradeNotLocked(client, teacher.id, courseId, type, academicYear, semester);
      }

      // Additional check: prevent bulk entry of any grades that are already finalized for this period
      const finalizedCheckResult = await client.query(
        `SELECT COUNT(*)::int as count FROM grades 
         WHERE course_id = $1 
           AND academic_year = $2 
           AND semester = $3 
           AND is_finalized = true 
         LIMIT 1`,
        [courseId, academicYear, semester]
      );

      if (finalizedCheckResult.rows[0].count > 0) {
        throw new Error(`Cannot edit: Some or all grades for ${academicYear} Semester ${semester} have been finalized. You can only edit grades for future academic periods.`);
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
      for (const grade of grades) {
        const result = await client.query(
          `INSERT INTO grades (student_id, course_id, type, score, total, weight, academic_year, semester, status, is_submitted, is_finalized)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', false, false)
           ON CONFLICT (student_id, course_id, type, academic_year, semester)
           DO UPDATE SET
             score = EXCLUDED.score,
             total = GREATEST(grades.total, EXCLUDED.total),
             weight = COALESCE(EXCLUDED.weight, grades.weight),
             status = 'draft',
             is_submitted = false,
             is_finalized = false
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
        s.grade,
        (
          COALESCE(g.is_submitted, false) = true
          OR EXISTS (
            SELECT 1 FROM grade_submissions gs
            WHERE gs.course_id = g.course_id
              AND gs.submission_type = g.type
          )
        ) AS is_submitted
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

      // Check if grade is finalized (locked from editing)
      if (grade.is_finalized) {
        throw new Error(`This grade has been finalized for ${grade.academic_year} Semester ${grade.semester} and cannot be edited. Only draft grades can be updated.`);
      }

      // Legacy check for is_submitted
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
  async getAssignedClasses(teacherId: string, purpose?: string) {
    const teacherResult = await pool.query(
      'SELECT * FROM teachers WHERE user_id = $1',
      [teacherId]
    );

    if (teacherResult.rows.length === 0) {
      throw new Error('Teacher not found');
    }

    const teacher = teacherResult.rows[0];

    if (purpose === 'grades') {
      // Return all classes where this teacher has an active course assignment.
      // The courses table is the authoritative source for subject-teaching assignments.
      // Homeroom-only assignments are kept clean by the reconciliation logic (no orphaned course rows).
      const result = await pool.query(
        `SELECT 
          co.id AS course_id,
          c.id AS class_id,
          c.id AS id,
          c.name,
          c.section,
          c.grade AS grade_level,
          c.capacity,
          co.name AS subject,
          (SELECT COUNT(*)::int FROM students s WHERE s.section_id = c.id) AS "enrolledStudents",
          (SELECT COUNT(*)::int FROM students s WHERE s.section_id = c.id) AS actual_student_count
        FROM courses co
        JOIN classes c ON co.class_id = c.id
        WHERE co.teacher_id = $1
        ORDER BY c.name, c.section`,
        [teacher.id]
      );
      return result.rows;
    }

    if (purpose === 'attendance') {
      const result = await pool.query(
        `WITH teacher_classes_combined AS (
          -- 1. class_teachers table
          SELECT 
            c.id AS class_id,
            c.name,
            c.section,
            c.grade AS grade_level,
            c.capacity,
            'Assigned Class'::text AS subject
          FROM class_teachers ct
          JOIN classes c ON ct.class_id = c.id
          WHERE ct.teacher_id = $1

          UNION

          -- 2. classes table (teacher_id column)
          SELECT 
            c.id AS class_id,
            c.name,
            c.section,
            c.grade AS grade_level,
            c.capacity,
            'Assigned Class'::text AS subject
          FROM classes c
          WHERE c.teacher_id = $1
        )
        SELECT 
          class_id AS id,
          class_id,
          name,
          section,
          grade_level,
          capacity,
          subject,
          (SELECT COUNT(*)::int FROM students s WHERE s.section_id = class_id) AS "enrolledStudents",
          (SELECT COUNT(*)::int FROM students s WHERE s.section_id = class_id) AS actual_student_count
        FROM teacher_classes_combined
        ORDER BY name, section`,
        [teacher.id]
      );
      return result.rows;
    }

    const result = await pool.query(
      `WITH teacher_classes_combined AS (
        -- 1. class_teachers table
        SELECT 
          c.id AS class_id,
          c.name,
          c.section,
          c.grade AS grade_level,
          c.capacity,
          COALESCE(
            (SELECT string_agg(co.name, ', ') FROM courses co WHERE co.class_id = c.id AND co.teacher_id = ct.teacher_id),
            'Assigned Class'
          ) AS subject
        FROM class_teachers ct
        JOIN classes c ON ct.class_id = c.id
        WHERE ct.teacher_id = $1

        UNION

        -- 2. classes table (teacher_id column)
        SELECT 
          c.id AS class_id,
          c.name,
          c.section,
          c.grade AS grade_level,
          c.capacity,
          'Assigned Class'::text AS subject
        FROM classes c
        WHERE c.teacher_id = $1

        UNION

        -- 3. courses table (teacher_id column)
        SELECT 
          c.id AS class_id,
          c.name,
          c.section,
          c.grade AS grade_level,
          c.capacity,
          co.name AS subject
        FROM courses co
        JOIN classes c ON co.class_id = c.id
        WHERE co.teacher_id = $1
      )
      SELECT 
        class_id AS id,
        class_id,
        name,
        section,
        grade_level,
        capacity,
        subject,
        (SELECT COUNT(*)::int FROM students s WHERE s.section_id = class_id) AS "enrolledStudents",
        (SELECT COUNT(*)::int FROM students s WHERE s.section_id = class_id) AS actual_student_count
      FROM teacher_classes_combined
      ORDER BY name, section`,
      [teacher.id]
    );

    return result.rows;
  }

  // Get student roster
  async getStudentRoster(classId: string) {
    const result = await pool.query(
      `SELECT 
        s.id, s.grade, s.parent_name, s.parent_phone,
        s.allergies, s.medications, s.chronic_conditions, s.status,
        u.name, u.email, u.digital_id
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN classes c ON s.section_id = c.id 
        OR (s.section_id IS NULL AND (s.grade = c.name OR s.grade = c.grade) AND s.branch_id = c.branch_id)
      WHERE c.id = $1
      ORDER BY u.name`,
      [classId]
    );

    return result.rows.map((row: any) => {
      const nameParts = (row.name || '').trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      return {
        ...row,
        digitalId: row.digital_id,
        firstName,
        lastName
      };
    });
  }

  // ────────────────────────────────────────────────────────
  // Helper: find the Head of Department teacher ID that matches
  // a given subject name + grade combination within a branch.
  // Returns a teachers.id (UUID) or null if no HoD found.
  private async resolveDeptHeadId(
    subjectName: string | null | undefined,
    courseId: string | null | undefined,
    branchId: string
  ): Promise<string | null> {
    // Determine the subject name and grade from the course record if courseId given
    let grade: string | null = null;
    let resolvedSubject = subjectName || null;

    if (courseId) {
      const courseRes = await pool.query(
        `SELECT c.name AS course_name,
                cl.name AS class_grade,
                cl.grade AS class_grade2
         FROM courses c
         LEFT JOIN classes cl ON c.class_id = cl.id
         WHERE c.id = $1`,
        [courseId]
      );
      if (courseRes.rows.length > 0) {
        const row = courseRes.rows[0];
        resolvedSubject = resolvedSubject || row.course_name;
        grade = row.class_grade2 || row.class_grade || null;
      }
    }

    if (!resolvedSubject) return null;

    // Normalize grade for JSON ? operator comparison
    // The staff_profile stores grades as "Grade 10"; the classes table stores as "10" or "Grade 10"
    // Build both forms to match against staff_profile.promotion.grades
    let gradeForJson = grade; // raw value from DB
    let gradeNormalized: string | null = null;
    if (grade) {
      gradeNormalized = /^\d+$/.test(grade.trim()) ? `Grade ${grade.trim()}` : grade.trim();
    }

    // Find the HoD who covers this subject AND grade
    // Use case-insensitive match on subject, check both raw and "Grade N" form for grade
    const hodQuery = await pool.query(
      `SELECT t.id
       FROM public.teachers t
       JOIN public.users u ON t.user_id = u.id
       WHERE u.branch_id = $1
         AND (t.is_dean = true OR u.staff_profile->'promotion'->'roles' ? 'headOfDepartment')
         AND (
           u.staff_profile->'promotion'->'subjects' @> to_jsonb(LOWER($2::text))
           OR u.staff_profile->'promotion'->'headOfDepartment'->'subjects' @> to_jsonb(LOWER($2::text))
         )
         ${gradeNormalized ? `AND (
           u.staff_profile->'promotion'->'grades' ? $3
           OR u.staff_profile->'promotion'->'grades' ? $4
           OR u.staff_profile->'promotion'->'headOfDepartment'->'grades' ? $3
           OR u.staff_profile->'promotion'->'headOfDepartment'->'grades' ? $4
         )` : ''}
       LIMIT 1`,
      gradeNormalized
        ? [branchId, resolvedSubject.toLowerCase(), gradeNormalized, grade || '']
        : [branchId, resolvedSubject.toLowerCase()]
    );

    if (hodQuery.rows.length > 0) {
      return hodQuery.rows[0].id;
    }

    // Fallback: subject match only (ignore grade), in case grades array wasn't populated
    const fallbackRes = await pool.query(
      `SELECT t.id
       FROM public.teachers t
       JOIN public.users u ON t.user_id = u.id
       WHERE u.branch_id = $1
         AND (t.is_dean = true OR u.staff_profile->'promotion'->'roles' ? 'headOfDepartment')
         AND (
           u.staff_profile->'promotion'->'subjects' @> to_jsonb(LOWER($2::text))
           OR u.staff_profile->'promotion'->'headOfDepartment'->'subjects' @> to_jsonb(LOWER($2::text))
         )
       LIMIT 1`,
      [branchId, resolvedSubject.toLowerCase()]
    );
    if (fallbackRes.rows.length > 0) return fallbackRes.rows[0].id;

    // No matching HoD found — leave dept_head_id as null
    return null;
  }


  // Submit weekly lesson plan
  async submitWeeklyPlan(teacherId: string, planData: any) {
    // Get teacher record with branch
    const teacherResult = await pool.query(
      `SELECT t.id, u.branch_id FROM teachers t
       JOIN users u ON t.user_id = u.id
       WHERE t.user_id = $1`,
      [teacherId]
    );

    if (teacherResult.rows.length === 0) {
      throw new Error('Teacher not found');
    }

    const { id: dbTeacherId, branch_id: branchId } = teacherResult.rows[0];

    // Auto-resolve dept_head_id based on course/subject+grade
    const resolvedDeptHeadId = await this.resolveDeptHeadId(
      planData.subject || null,
      planData.courseId || null,
      branchId
    );
    const finalDeptHeadId = planData.deptHeadId || resolvedDeptHeadId;

    const result = await pool.query(
      `INSERT INTO weekly_plans 
       (teacher_id, date, content, objectives, teacher_activity, time_duration,
        student_activity, teaching_method, teaching_aids, evaluation, remark, status,
        course_id, subject, dept_head_id, week_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        dbTeacherId,
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
        finalDeptHeadId,
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
    // Get teacher record with branch
    const teacherResult = await pool.query(
      `SELECT t.id, u.branch_id FROM teachers t
       JOIN users u ON t.user_id = u.id
       WHERE t.user_id = $1`,
      [teacherId]
    );

    if (teacherResult.rows.length === 0) {
      throw new Error('Teacher not found');
    }

    const { id: dbTeacherId, branch_id: branchId } = teacherResult.rows[0];

    // Check if plan belongs to teacher and is in editable status
    const checkResult = await pool.query(
      'SELECT status FROM weekly_plans WHERE id = $1 AND teacher_id = $2',
      [planId, dbTeacherId]
    );

    if (checkResult.rows.length === 0) {
      throw new Error('Lesson plan not found or access denied');
    }

    if (checkResult.rows[0].status !== 'Draft' && checkResult.rows[0].status !== 'Revision Required') {
      throw new Error('Can only update plans in Draft or Revision Required status');
    }

    // Auto-resolve dept_head_id based on course/subject+grade
    const resolvedDeptHeadId = await this.resolveDeptHeadId(
      planData.subject || null,
      planData.courseId || null,
      branchId
    );
    const finalDeptHeadId = planData.deptHeadId || resolvedDeptHeadId;

    // Clear review details if resubmitting for review
    const isResubmitting = planData.status === 'Pending';

    const result = await pool.query(
      `UPDATE weekly_plans SET
       date = $1, content = $2, objectives = $3, teacher_activity = $4,
       time_duration = $5, student_activity = $6, teaching_method = $7,
       teaching_aids = $8, evaluation = $9, remark = $10,
       status = $11, course_id = $12, subject = $13, dept_head_id = $14,
       week_number = $15,
       dean_feedback = CASE WHEN $16 = true THEN NULL ELSE dean_feedback END,
       dean_rating = CASE WHEN $16 = true THEN NULL ELSE dean_rating END,
       updated_at = NOW()
       WHERE id = $17
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
        finalDeptHeadId,
        planData.weekNumber || null,
        isResubmitting,
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
        rating_punctuality, rating_note_taking, rating_excellent, teacher_note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (student_id, week_ending)
       DO UPDATE SET
         rating_uniform = $4, rating_materials = $5, rating_homework = $6,
         rating_participation = $7, rating_conduct = $8, rating_social = $9,
         rating_punctuality = $10, rating_note_taking = $11, rating_excellent = $12,
         teacher_note = $13
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
        logData.ratingExcellent,
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

  // Get communication logs for a teacher by week ending
  async getCommunicationLogsByWeek(teacherId: string, weekEnding: string) {
    const teacherResult = await pool.query(
      'SELECT id FROM teachers WHERE user_id = $1',
      [teacherId]
    );

    if (teacherResult.rows.length === 0) {
      return [];
    }

    const result = await pool.query(
      `SELECT cl.*
       FROM communication_logs cl
       WHERE cl.teacher_id = $1 AND cl.week_ending = $2`,
      [teacherResult.rows[0].id, weekEnding]
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
        `SELECT COUNT(*)::int as count
         FROM classes c
         JOIN students s ON s.section_id = c.id 
           OR (s.section_id IS NULL AND (s.grade = c.name OR s.grade = c.grade) AND s.branch_id = c.branch_id)
         LEFT JOIN class_teachers ct ON ct.class_id = c.id
         WHERE (c.teacher_id = $1 OR ct.teacher_id = $1) AND s.id = $2`,
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
      `SELECT s.*, u.name AS teacher_name
       FROM schedules s
       JOIN teachers t ON s.teacher_id = t.id
       JOIN users u ON t.user_id = u.id
       WHERE s.teacher_id = $1
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
         COALESCE(s.period_number, 99), s.time_slot`,
      [teacherResult.rows[0].id]
    );

    return result.rows;
  }

  // Get dashboard
  async getDashboard(teacherId: string) {
    // Get teacher record
    const teacherResult = await pool.query(
      `SELECT t.*, 
              (t.is_dean = true OR u.staff_profile->'promotion'->'roles' ? 'headOfDepartment') as is_hod 
       FROM teachers t
       JOIN users u ON t.user_id = u.id
       WHERE t.user_id = $1`,
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
      `WITH teacher_classes_combined AS (
        SELECT ct.class_id FROM class_teachers ct WHERE ct.teacher_id = $1
        UNION
        SELECT c.id AS class_id FROM classes c WHERE c.teacher_id = $1
        UNION
        SELECT co.class_id FROM courses co WHERE co.teacher_id = $1
      )
      SELECT COUNT(*)::int as count FROM teacher_classes_combined`,
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

  // Submit all grades for a course and lock them (alias of finalize workflow)
  async submitCourseGrades(teacherUserId: string, courseId: string, submissionType: string) {
    return this.finalizeGradeSubmission(teacherUserId, courseId, submissionType);
  }

  // REFINED WORKFLOW: Save Draft (editable, partial submission)
  // Draft grades visible to: Teacher, Student, Parent (NOT VP)
  // Draft grades remain editable until finalized for that specific academic period
  async saveDraftGrades(teacherUserId: string, courseId: string, submissionType: string, options?: {
    academicYear?: string;
    semester?: number;
    sectionId?: string;
    subjectId?: string;
  }) {
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
      const branchId = teacherResult.rows[0].branch_id;

      // 2. Verify teacher owns this course
      const courseResult = await client.query(
        'SELECT teacher_id FROM courses WHERE id = $1',
        [courseId]
      );

      if (courseResult.rows.length === 0) {
        throw new Error('Course not found');
      }

      if (courseResult.rows[0].teacher_id !== teacherId) {
        throw new Error('You can only save grades for courses you teach');
      }

      const academicYear = options?.academicYear || '2025/2026';
      const semester = options?.semester ?? 2;

      // 3. Check if grades are finalized for THIS SPECIFIC academic period
      // Finalized grades cannot be edited. But teachers can still work on future periods.
      const finalizedCheck = await client.query(
        `SELECT 1 FROM grades 
         WHERE course_id = $1 
           AND type = $2 
           AND academic_year = $3 
           AND semester = $4 
           AND is_finalized = true 
         LIMIT 1`,
        [courseId, submissionType, academicYear, semester]
      );

      if (finalizedCheck.rows.length > 0) {
        throw new Error(`Grades for ${academicYear} Semester ${semester} have been finalized and locked. You cannot edit them.`);
      }

      await this.assertGradesNotGloballyLocked(client);

      // 4. Create/update grade submission record as 'saved' (not yet fully submitted)
      // Note: No locks are created for draft submissions, allowing future period editing
      const subResult = await client.query(
        `INSERT INTO grade_submissions (course_id, teacher_id, submission_type, academic_year, semester, submitted_at, submitted_by, submission_stage, is_locked, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), $6, 'saved', FALSE, NOW())
         ON CONFLICT (course_id, teacher_id, submission_type, academic_year, semester)
         DO UPDATE SET submission_stage = 'saved', updated_at = NOW(), is_locked = FALSE
         RETURNING *`,
        [courseId, teacherId, submissionType, academicYear, semester, teacherUserId]
      );

      await client.query('COMMIT');

      return {
        status: 'success',
        message: `Draft grades saved for ${academicYear} Semester ${semester}. You can edit these grades at any time until you finalize the submission. You can also submit grades for future academic periods.`,
        submission: subResult.rows[0]
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // REFINED WORKFLOW: Final Submit (locks grades, makes visible to VP)
  // REFINED WORKFLOW: Final Submit (locks grades, makes visible to VP)
  // Finalized grades visible to: Teacher, Student, Parent, VP Principal
  // Once finalized, grades are locked and cannot be edited by the teacher
  // Only the specific academic period is locked; future periods remain editable
  async finalizeGradeSubmission(teacherUserId: string, courseId: string, submissionType: string, options?: {
    academicYear?: string;
    semester?: number;
    sectionId?: string;
    subjectId?: string;
  }) {
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
      const branchId = teacherResult.rows[0].branch_id;

      // 2. Verify teacher owns this course
      const courseResult = await client.query(
        'SELECT teacher_id FROM courses WHERE id = $1',
        [courseId]
      );

      if (courseResult.rows.length === 0) {
        throw new Error('Course not found');
      }

      if (courseResult.rows[0].teacher_id !== teacherId) {
        throw new Error('You can only finalize grades for courses you teach');
      }

      // 3. Extract academic year and semester
      const academicYear = options?.academicYear || '2025/2026';
      const semester = options?.semester ?? 2;

      // 4. Check if already finalized for this specific academic period
      const alreadyFinalized = await client.query(
        `SELECT 1 FROM grades 
         WHERE course_id = $1 
           AND type = $2 
           AND academic_year = $3 
           AND semester = $4 
           AND is_finalized = true 
         LIMIT 1`,
        [courseId, submissionType, academicYear, semester]
      );

      if (alreadyFinalized.rows.length > 0) {
        throw new Error(`Grades for ${academicYear} Semester ${semester} have already been finalized.`);
      }

      await this.assertGradesNotGloballyLocked(client);

      // 5. Mark all draft/submitted grades as finalized FOR THIS SPECIFIC PERIOD
      const updateResult = await client.query(
        `UPDATE grades 
         SET is_submitted = true, is_finalized = true, submitted_at = NOW(), submitted_by = $1, status = 'finalized'
         WHERE course_id = $2 
           AND type = $3 
           AND academic_year = $4 
           AND semester = $5
         RETURNING id`,
        [teacherUserId, courseId, submissionType, academicYear, semester]
      );

      const updatedCount = updateResult.rowCount;

      // 6. Update/create grade submission record as 'finalized' and locked
      const subResult = await client.query(
        `INSERT INTO grade_submissions (course_id, teacher_id, submission_type, academic_year, semester, submitted_at, submitted_by, submission_stage, is_locked, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), $6, 'finalized', TRUE, NOW())
         ON CONFLICT (course_id, teacher_id, submission_type, academic_year, semester)
         DO UPDATE SET submission_stage = 'finalized', updated_at = NOW(), is_locked = TRUE
         RETURNING *`,
        [courseId, teacherId, submissionType, academicYear, semester, teacherUserId]
      );

      // 7. Create granular lock for this specific period ONLY
      // This prevents editing grades for this period but allows future periods to be edited
      await client.query(
        `INSERT INTO grade_submission_locks (academic_year, semester, course_id, grading_component, locked_by, branch_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (academic_year, semester, course_id, grading_component, branch_id) DO NOTHING`,
        [academicYear, semester, courseId, submissionType, teacherUserId, branchId]
      );

      await client.query('COMMIT');

      return {
        status: 'success',
        message: `✓ Grades finalized and locked for ${academicYear} Semester ${semester}. ${updatedCount} grade(s) are now visible to VP Principal. You cannot edit these grades. You can still submit grades for future academic periods.`,
        updatedCount: updatedCount,
        submission: subResult.rows[0]
      };
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

  // Get department heads (teachers where is_dean = true or 'headOfDepartment' in promotion roles)
  async getDepartmentHeads(branchId: string) {
    const result = await pool.query(
      `SELECT t.id as teacher_id, u.name, t.department,
              COALESCE(u.staff_profile->'promotion'->'headOfDepartment'->'subjects', u.staff_profile->'promotion'->'subjects') AS subjects,
              COALESCE(u.staff_profile->'promotion'->'headOfDepartment'->'grades', u.staff_profile->'promotion'->'grades') AS grades
       FROM teachers t
       JOIN users u ON t.user_id = u.id
       WHERE t.branch_id = $1 AND (t.is_dean = true OR u.staff_profile->'promotion'->'roles' ? 'headOfDepartment') AND u.is_active = true
       ORDER BY u.name`,
      [branchId]
    );
    return result.rows;
  }

  // Get weekly plans submitted to this teacher (as department head)
  // STRICT: only returns plans whose subject AND grade match the HoD's
  // staff_profile.promotion.headOfDepartment.subjects[] AND .grades[]
  async getDeptPlans(teacherUserId: string, status?: string) {
    const teacherResult = await pool.query(
      `SELECT
         t.id,
         t.is_dean,
         (t.is_dean = true OR u.staff_profile->'promotion'->'roles' ? 'headOfDepartment') as is_hod,
         u.branch_id,
         COALESCE(u.staff_profile->'promotion'->'headOfDepartment'->'subjects', u.staff_profile->'promotion'->'subjects') AS hod_subjects,
         COALESCE(u.staff_profile->'promotion'->'headOfDepartment'->'grades', u.staff_profile->'promotion'->'grades') AS hod_grades
       FROM public.teachers t
       JOIN public.users u ON t.user_id = u.id
       WHERE t.user_id = $1`,
      [teacherUserId]
    );

    if (teacherResult.rows.length === 0) {
      throw new Error('Teacher not found');
    }

    const { id: teacherId, is_hod: isHod, branch_id: branchId,
            hod_subjects, hod_grades } = teacherResult.rows[0];

    // If not a department head, return empty array immediately
    if (!isHod) {
      return [];
    }

    // Parse subjects and grades from JSONB (they come as JS arrays or null)
    const subjects: string[] = Array.isArray(hod_subjects) ? hod_subjects : [];
    const grades: string[]   = Array.isArray(hod_grades)   ? hod_grades   : [];

    // No promotion data yet — return empty
    if (subjects.length === 0) {
      return [];
    }

    // Normalize grade labels: both "10" and "Grade 10" → "grade 10" (lowercase for comparison)
    const normalizeGrade = (g: string) => {
      const t = g.trim().toLowerCase();
      return /^\d+$/.test(t) ? `grade ${t}` : t;
    };

    const normalizedHodGrades = grades.map(normalizeGrade);

    // Build parameter arrays for SQL ANY() operator
    // $1 = branchId, $2 = teacherId (to exclude HoD's own plans), $3 = subjects[]
    const params: any[] = [
      branchId,
      teacherId,
      subjects.map(s => s.toLowerCase()),  // lowercase subject list
    ];
    let paramIndex = 4;
    
    let gradeClause = '';
    if (normalizedHodGrades.length > 0) {
      params.push(normalizedHodGrades);
      gradeClause = `
        -- Grade must match HoD's grades (normalize "10" -> "grade 10", "Grade 10" -> "grade 10")
        AND (
          CASE
            WHEN COALESCE(cl.grade, '') ~ '^[0-9]+$' THEN 'grade ' || cl.grade
            ELSE LOWER(COALESCE(cl.grade, cl.name, ''))
          END
        ) = ANY($${paramIndex}::text[])
      `;
      paramIndex++;
    }

    const statusClause = status ? `AND wp.status = $${paramIndex}` : '';
    if (status) params.push(status);

    const query = `
      SELECT DISTINCT ON (wp.id)
        wp.*,
        u.name                               AS teacher_name,
        COALESCE(c.name, wp.subject)         AS course_name,
        cl.name                              AS class_name,
        COALESCE(cl.grade, cl.name)          AS grade_level
      FROM public.weekly_plans wp
      JOIN public.teachers  t  ON wp.teacher_id  = t.id
      JOIN public.users      u  ON t.user_id      = u.id
      LEFT JOIN public.courses c  ON wp.course_id  = c.id
      LEFT JOIN public.classes cl ON c.class_id    = cl.id
      WHERE u.branch_id = $1
        AND wp.teacher_id != $2
        AND (wp.dept_head_id IS NULL OR wp.dept_head_id = $2)
        -- Subject must match HoD's subjects (case-insensitive, check course name OR plan subject field)
        AND LOWER(COALESCE(c.name, wp.subject, '')) = ANY($3::text[])
        ${gradeClause}
        ${statusClause}
      ORDER BY wp.id, wp.date DESC, wp.created_at DESC
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Review a weekly plan as department head
  async reviewDeptPlan(teacherUserId: string, planId: string, reviewData: { status: string; feedback?: string; rating?: number }) {
    const teacherResult = await pool.query(
      `SELECT
         t.id,
         t.is_dean,
         (t.is_dean = true OR u.staff_profile->'promotion'->'roles' ? 'headOfDepartment') as is_hod,
         u.branch_id,
         COALESCE(u.staff_profile->'promotion'->'headOfDepartment'->'subjects', u.staff_profile->'promotion'->'subjects') AS hod_subjects,
         COALESCE(u.staff_profile->'promotion'->'headOfDepartment'->'grades', u.staff_profile->'promotion'->'grades') AS hod_grades
       FROM public.teachers t
       JOIN public.users u ON t.user_id = u.id
       WHERE t.user_id = $1`,
      [teacherUserId]
    );

    if (teacherResult.rows.length === 0) {
      throw new Error('Teacher not found');
    }

    const { id: teacherId, is_hod: isHod, branch_id: branchId,
            hod_subjects, hod_grades } = teacherResult.rows[0];

    // If not a department head, throw error
    if (!isHod) {
      throw new Error('Access denied: Only department heads can review plans');
    }

    const subjects: string[] = Array.isArray(hod_subjects) ? hod_subjects.map((s: string) => s.toLowerCase()) : [];
    const normalizeGrade = (g: string) => { const t = g.trim().toLowerCase(); return /^\d+$/.test(t) ? `grade ${t}` : t; };
    const normalizedGrades: string[] = Array.isArray(hod_grades) ? hod_grades.map(normalizeGrade) : [];

    const params: any[] = [planId, branchId, subjects, teacherId];
    let gradeClause = '';
    if (normalizedGrades.length > 0) {
      params.push(normalizedGrades);
      gradeClause = `
         AND (
           CASE
             WHEN COALESCE(cl.grade, '') ~ '^[0-9]+$' THEN 'grade ' || cl.grade
             ELSE LOWER(COALESCE(cl.grade, cl.name, ''))
           END
         ) = ANY($5::text[])
      `;
    }

    // Verify the plan exists and its subject+grade fall within HoD's scope
    const planCheck = await pool.query(
      `SELECT wp.id, wp.status, wp.teacher_id, wp.dept_head_id
       FROM public.weekly_plans wp
       JOIN public.teachers t  ON wp.teacher_id = t.id
       JOIN public.users    u  ON t.user_id      = u.id
       LEFT JOIN public.courses c  ON wp.course_id  = c.id
       LEFT JOIN public.classes cl ON c.class_id    = cl.id
       WHERE wp.id = $1
         AND u.branch_id = $2
         AND LOWER(COALESCE(c.name, wp.subject, '')) = ANY($3::text[])
         AND (wp.dept_head_id IS NULL OR wp.dept_head_id = $4)
         ${gradeClause}`,
      params
    );

    if (planCheck.rows.length === 0) {
      throw new Error('Lesson plan not found or not within your department scope');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE public.weekly_plans SET
         status = $1,
         dean_feedback = $2,
         dean_rating = $3,
         reviewed_by = $4,
         dept_head_id = COALESCE(dept_head_id, $4),
         updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [reviewData.status, reviewData.feedback || null, reviewData.rating || null, teacherId, planId]
      );

      if (reviewData.rating) {
        const ratingPoints = reviewData.rating * 100; // 1 -> 100, 2 -> 200, 3 -> 300

        // Check if the dept head has already rated this teacher this week.
        // Uses DATE_TRUNC so no additional schema column is required.
        const weeklyCheck = await client.query(
          `SELECT id FROM teacher_ratings
           WHERE teacher_id = $1
             AND rated_by = $2
             AND DATE_TRUNC('week', created_at) = DATE_TRUNC('week', NOW())
             AND weekly_plan_id != $3
           LIMIT 1`,
          [planCheck.rows[0].teacher_id, teacherId, planId]
        );

        if (weeklyCheck.rows.length > 0) {
          throw new Error('You have already rated this teacher this week. Department Head ratings are limited to once per week per teacher.');
        }

        // The database does not have a unique constraint on weekly_plan_id, so ON CONFLICT will throw 42P10.
        // We do a manual check instead to perform an UPSERT.
        const existingPlanRating = await client.query(
          `SELECT id FROM teacher_ratings WHERE weekly_plan_id = $1 LIMIT 1`,
          [planId]
        );

        if (existingPlanRating.rows.length > 0) {
          await client.query(
            `UPDATE teacher_ratings 
             SET rating_value = $1, rated_by = $2, created_at = NOW() 
             WHERE weekly_plan_id = $3`,
            [ratingPoints, teacherId, planId]
          );
        } else {
          await client.query(
            `INSERT INTO teacher_ratings (teacher_id, weekly_plan_id, rating_value, rated_by)
             VALUES ($1, $2, $3, $4)`,
            [planCheck.rows[0].teacher_id, planId, ratingPoints, teacherId]
          );
        }

        // Aggregate total score and update teachers table
        const sumResult = await client.query(
          `SELECT COALESCE(SUM(rating_value), 0) as total_score 
           FROM teacher_ratings 
           WHERE teacher_id = $1`,
          [planCheck.rows[0].teacher_id]
        );
        const totalScore = parseInt(sumResult.rows[0].total_score) || 0;

        await client.query(
          `UPDATE teachers SET overall_rating_score = $1 WHERE id = $2`,
          [totalScore, planCheck.rows[0].teacher_id]
        );
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
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
        `SELECT DISTINCT c.id, c.name, c.code,
                cl.id as class_id, cl.name as class_name,
                cl.grade as grade_level, cl.section as section_name
         FROM courses c
         LEFT JOIN classes cl ON c.class_id = cl.id
         WHERE c.teacher_id = $1
         ORDER BY cl.name ASC, cl.section ASC, c.name ASC`,
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

/**
 * Seed script for Schedule Builder test data.
 *
 * Creates teachers, classes, courses with teacher-class-subject mappings,
 * schedule configuration, teacher unavailability, and course frequencies.
 *
 * Usage:  npm run seed:schedule
 */
import pool from '../config/database';

async function seedScheduleData() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🔧 Seeding schedule builder data...\n');

    // 1. Get the first branch
    const branchResult = await client.query('SELECT id, name FROM branches LIMIT 1');
    if (branchResult.rows.length === 0) {
      throw new Error('No branches found. Run consolidated_migration.sql first.');
    }
    const branchId = branchResult.rows[0].id;
    const branchName = branchResult.rows[0].name;
    console.log(`📍 Using branch: ${branchName} (${branchId})`);

    // 2. Ensure we have teacher users — create or find existing
    const teacherData = [
      { name: 'Ato Solomon Girma',   email: 'solomon.girma@abdi.edu',   subjects: ['Mathematics', 'Physics'] },
      { name: 'W/ro Selam Tadesse',  email: 'selam.tadesse@abdi.edu',   subjects: ['Biology', 'Chemistry'] },
      { name: 'Ato Kebede Desta',    email: 'kebede.desta@abdi.edu',    subjects: ['History', 'Geography'] },
      { name: 'W/ro Aster Mekonnen', email: 'aster.mekonnen@abdi.edu',  subjects: ['English', 'Amharic'] },
      { name: 'Ato Tadesse Haile',   email: 'tadesse.haile@abdi.edu',   subjects: ['Civics', 'Economics'] },
      { name: 'W/ro Bethlehem Yonas',email: 'bethlehem.yonas@abdi.edu', subjects: ['ICT'] },
      { name: 'Ato Dawit Alemayehu', email: 'dawit.alemayehu@abdi.edu', subjects: ['Art', 'Music'] },
      { name: 'Ato Henok Worku',     email: 'henok.worku@abdi.edu',     subjects: ['Physical Education'] },
    ];

    const teacherIds: string[] = [];
    const teacherSubjects: string[][] = [];

    for (const t of teacherData) {
      // Check if user exists
      let userResult = await client.query('SELECT id FROM users WHERE email = $1', [t.email]);

      let userId: string;
      if (userResult.rows.length > 0) {
        userId = userResult.rows[0].id;
      } else {
        const userInsert = await client.query(
          `INSERT INTO users (name, email, password_hash, role, branch_id, status, is_active)
           VALUES ($1, $2, '$2b$10$placeholder_hash_for_seed_data', 'teacher', $3, 'Approved', true)
           RETURNING id`,
          [t.name, t.email, branchId]
        );
        userId = userInsert.rows[0].id;
      }

      // Check if teacher record exists
      let teacherResult = await client.query('SELECT id FROM teachers WHERE user_id = $1', [userId]);
      let teacherId: string;

      if (teacherResult.rows.length > 0) {
        teacherId = teacherResult.rows[0].id;
      } else {
        const teacherInsert = await client.query(
          `INSERT INTO teachers (user_id, branch_id, subjects, department, hire_date, experience)
           VALUES ($1, $2, $3, 'General', CURRENT_DATE, '5 Years')
           RETURNING id`,
          [userId, branchId, `{${t.subjects.join(',')}}`]
        );
        teacherId = teacherInsert.rows[0].id;
      }

      teacherIds.push(teacherId);
      teacherSubjects.push(t.subjects);
      console.log(`  👤 Teacher: ${t.name} → ${teacherId}`);
    }

    // 3. Create classes (Grade 9A, 9B, 10A, 10B, 11A, 11B)
    const classNames = ['Grade 9A', 'Grade 9B', 'Grade 10A', 'Grade 10B', 'Grade 11A', 'Grade 11B'];
    const classIds: string[] = [];

    for (const className of classNames) {
      let classResult = await client.query(
        'SELECT id FROM classes WHERE name = $1 AND branch_id = $2',
        [className, branchId]
      );

      let classId: string;
      if (classResult.rows.length > 0) {
        classId = classResult.rows[0].id;
      } else {
        const classInsert = await client.query(
          `INSERT INTO classes (name, branch_id, student_count) VALUES ($1, $2, 40)
           RETURNING id`,
          [className, branchId]
        );
        classId = classInsert.rows[0].id;
      }
      classIds.push(classId);
      console.log(`  📚 Class: ${className} → ${classId}`);
    }

    // 4. Create courses (teacher + subject + class combinations)
    // Core subjects taught to all classes by respective teachers
    const coreSubjectAssignments = [
      { teacherIdx: 0, subject: 'Mathematics', sessionsPerWeek: 5 },
      { teacherIdx: 0, subject: 'Physics',     sessionsPerWeek: 4 },
      { teacherIdx: 1, subject: 'Biology',     sessionsPerWeek: 4 },
      { teacherIdx: 1, subject: 'Chemistry',   sessionsPerWeek: 4 },
      { teacherIdx: 2, subject: 'History',     sessionsPerWeek: 3 },
      { teacherIdx: 2, subject: 'Geography',   sessionsPerWeek: 2 },
      { teacherIdx: 3, subject: 'English',     sessionsPerWeek: 5 },
      { teacherIdx: 3, subject: 'Amharic',     sessionsPerWeek: 4 },
      { teacherIdx: 4, subject: 'Civics',      sessionsPerWeek: 2 },
      { teacherIdx: 5, subject: 'ICT',         sessionsPerWeek: 2 },
      { teacherIdx: 7, subject: 'Physical Education', sessionsPerWeek: 2 },
    ];

    // Each teacher teaches their subjects to 2 classes (spread workload)
    const courseEntries: Array<{ teacherIdx: number; subject: string; classIdx: number; sessions: number }> = [];

    for (const assignment of coreSubjectAssignments) {
      // Assign to first 2 or 3 classes depending on subject
      const classCount = assignment.sessionsPerWeek >= 4 ? 2 : 3;
      for (let ci = 0; ci < Math.min(classCount, classIds.length); ci++) {
        courseEntries.push({
          teacherIdx: assignment.teacherIdx,
          subject: assignment.subject,
          classIdx: ci,
          sessions: assignment.sessionsPerWeek
        });
      }
    }

    const courseIds: string[] = [];
    const courseFrequencies: Array<{ courseId: string; sessions: number }> = [];

    for (const ce of courseEntries) {
      const code = `${ce.subject.substring(0, 4).toUpperCase()}-${classNames[ce.classIdx].replace(/\s/g, '')}`;

      // Check existing
      let courseResult = await client.query('SELECT id FROM courses WHERE code = $1', [code]);
      let courseId: string;

      if (courseResult.rows.length > 0) {
        courseId = courseResult.rows[0].id;
      } else {
        const courseInsert = await client.query(
          `INSERT INTO courses (name, code, teacher_id, class_id)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [ce.subject, code, teacherIds[ce.teacherIdx], classIds[ce.classIdx]]
        );
        courseId = courseInsert.rows[0].id;
      }

      courseIds.push(courseId);
      courseFrequencies.push({ courseId, sessions: ce.sessions });
      console.log(`  📖 Course: ${ce.subject} → ${classNames[ce.classIdx]} (${ce.sessions}/wk)`);
    }

    // 5. Schedule configuration
    await client.query(
      `INSERT INTO schedule_config
        (branch_id, academic_year, periods_per_day, start_time, end_time,
         max_consecutive_periods, distribute_subjects)
       VALUES ($1, '2025/2026', 8, '08:00', '15:30', 3, true)
       ON CONFLICT (branch_id, academic_year) DO UPDATE SET
         periods_per_day = 8, start_time = '08:00', end_time = '15:30',
         max_consecutive_periods = 3, distribute_subjects = true, updated_at = NOW()`,
      [branchId]
    );
    console.log('\n  ⚙️  Schedule config: 8 periods/day, 08:00-15:30, max 3 consecutive');

    // 6. Teacher unavailability (sample constraints)
    // Solomon: unavailable Monday P1, Friday P7-P8
    // Selam: unavailable Wednesday P5-P6
    const unavailabilities = [
      { teacherIdx: 0, day: 'Monday', period: 1 },
      { teacherIdx: 0, day: 'Friday', period: 7 },
      { teacherIdx: 0, day: 'Friday', period: 8 },
      { teacherIdx: 1, day: 'Wednesday', period: 5 },
      { teacherIdx: 1, day: 'Wednesday', period: 6 },
      { teacherIdx: 4, day: 'Thursday', period: 1 },
      { teacherIdx: 4, day: 'Thursday', period: 2 },
    ];

    // Clear existing unavailabilities for these teachers
    for (const u of unavailabilities) {
      await client.query(
        `INSERT INTO teacher_unavailability (teacher_id, branch_id, academic_year, day_of_week, period_number)
         VALUES ($1, $2, '2025/2026', $3, $4)
         ON CONFLICT (teacher_id, day_of_week, period_number, academic_year) DO NOTHING`,
        [teacherIds[u.teacherIdx], branchId, u.day, u.period]
      );
    }
    console.log(`  🚫 Teacher unavailability: ${unavailabilities.length} blocked slots`);

    // 7. Course frequencies
    for (const cf of courseFrequencies) {
      await client.query(
        `INSERT INTO course_frequency (course_id, branch_id, academic_year, sessions_per_week)
         VALUES ($1, $2, '2025/2026', $3)
         ON CONFLICT (course_id, academic_year) DO UPDATE SET
           sessions_per_week = $3, updated_at = NOW()`,
        [cf.courseId, branchId, cf.sessions]
      );
    }
    console.log(`  📊 Course frequencies: ${courseFrequencies.length} courses configured`);

    // 8. Timetable structure (overwrite any existing demo rows for this branch/year)
    await client.query(
      `DELETE FROM schedule_structure
       WHERE branch_id = $1 AND academic_year = '2025/2026'`,
      [branchId]
    );

    const structureRows = courseEntries.map((entry) => ({
      classId: classIds[entry.classIdx],
      teacherId: teacherIds[entry.teacherIdx],
      subject: entry.subject,
      sessionsPerWeek: entry.sessions,
    }));

    const uniqueStructureRows = new Map<string, typeof structureRows[number]>();
    for (const row of structureRows) {
      uniqueStructureRows.set([row.classId, row.teacherId, row.subject].join('::'), row);
    }

    for (const row of uniqueStructureRows.values()) {
      await client.query(
        `INSERT INTO schedule_structure
          (branch_id, academic_year, class_id, teacher_id, subject, sessions_per_week)
         VALUES ($1, '2025/2026', $2, $3, $4, $5)`,
        [branchId, row.classId, row.teacherId, row.subject, row.sessionsPerWeek]
      );
    }
    console.log(`  🧩 Timetable structure: ${uniqueStructureRows.size} rows seeded`);

    await client.query('COMMIT');

    console.log('\n✅ Schedule builder seed data inserted successfully!');
    console.log(`   Branch: ${branchName}`);
    console.log(`   Teachers: ${teacherIds.length}`);
    console.log(`   Classes: ${classIds.length}`);
    console.log(`   Courses: ${courseIds.length}`);
    console.log(`   Structure rows: ${uniqueStructureRows.size}`);
    console.log(`   Unavailabilities: ${unavailabilities.length}`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedScheduleData()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

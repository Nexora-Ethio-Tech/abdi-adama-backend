import pool from '../config/database';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ScheduleConfigInput {
  periodsPerDay: number;
  startTime: string;
  endTime: string;
  maxConsecutivePeriods: number;
  distributeSubjects: boolean;
  academicYear?: string;
}

interface TeacherConstraintInput {
  dayOfWeek: string;
  periodNumber: number;
}

interface CourseFrequencyInput {
  courseId: string;
  sessionsPerWeek: number;
}

interface StructureRowInput {
  classId: string;
  teacherId: string;
  subject: string;
  sessionsPerWeek: number;
}

interface CourseInfo {
  courseId: string;
  courseName: string;
  courseCode: string;
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  sessionsPerWeek: number;
}

interface SlotKey {
  day: string;
  period: number;
}

interface ScheduleEntry {
  teacherId: string;
  teacherName: string;
  day: string;
  period: number;
  timeSlot: string;
  classId: string;
  className: string;
  courseId: string;
  subject: string;
}

// ─── Service ───────────────────────────────────────────────────────────────────

class ScheduleService {

  // ── Config CRUD ──────────────────────────────────────────────────────────────

  async saveConfig(branchId: string, config: ScheduleConfigInput) {
    const year = config.academicYear || '2025/2026';
    const result = await pool.query(
      `INSERT INTO schedule_config
        (branch_id, academic_year, periods_per_day, start_time, end_time,
         max_consecutive_periods, distribute_subjects)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (branch_id, academic_year)
       DO UPDATE SET
         periods_per_day = $3, start_time = $4, end_time = $5,
         max_consecutive_periods = $6, distribute_subjects = $7,
         updated_at = NOW()
       RETURNING *`,
      [branchId, year, config.periodsPerDay, config.startTime, config.endTime,
        config.maxConsecutivePeriods, config.distributeSubjects]
    );
    return result.rows[0];
  }

  async getConfig(branchId: string, academicYear?: string) {
    const year = academicYear || '2025/2026';
    const result = await pool.query(
      `SELECT * FROM schedule_config WHERE branch_id = $1 AND academic_year = $2`,
      [branchId, year]
    );
    return result.rows[0] || null;
  }

  // ── Teacher Constraints CRUD ─────────────────────────────────────────────────

  async saveTeacherConstraints(
    teacherId: string, branchId: string,
    constraints: TeacherConstraintInput[], academicYear?: string
  ) {
    const year = academicYear || '2025/2026';
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Clear existing constraints for this teacher + year
      await client.query(
        `DELETE FROM teacher_unavailability
         WHERE teacher_id = $1 AND branch_id = $2 AND academic_year = $3`,
        [teacherId, branchId, year]
      );

      // Insert new ones
      for (const c of constraints) {
        await client.query(
          `INSERT INTO teacher_unavailability
            (teacher_id, branch_id, academic_year, day_of_week, period_number)
           VALUES ($1, $2, $3, $4, $5)`,
          [teacherId, branchId, year, c.dayOfWeek, c.periodNumber]
        );
      }

      await client.query('COMMIT');
      return { teacherId, count: constraints.length };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getTeacherConstraints(branchId: string, academicYear?: string) {
    const year = academicYear || '2025/2026';
    const result = await pool.query(
      `SELECT tu.*, u.name as teacher_name
       FROM teacher_unavailability tu
       JOIN teachers t ON tu.teacher_id = t.id
       JOIN users u ON t.user_id = u.id
       WHERE tu.branch_id = $1 AND tu.academic_year = $2
       ORDER BY u.name, tu.day_of_week, tu.period_number`,
      [branchId, year]
    );
    return result.rows;
  }

  // ── Course Frequencies CRUD ──────────────────────────────────────────────────

  async saveCourseFrequencies(
    branchId: string, frequencies: CourseFrequencyInput[], academicYear?: string
  ) {
    const year = academicYear || '2025/2026';
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const f of frequencies) {
        await client.query(
          `INSERT INTO course_frequency (course_id, branch_id, academic_year, sessions_per_week)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (course_id, academic_year)
           DO UPDATE SET sessions_per_week = $4, updated_at = NOW()`,
          [f.courseId, branchId, year, f.sessionsPerWeek]
        );
      }

      await client.query('COMMIT');
      return { count: frequencies.length };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getCourseFrequencies(branchId: string, academicYear?: string) {
    const year = academicYear || '2025/2026';
    const result = await pool.query(
      `SELECT cf.*, c.name as course_name, c.code as course_code,
              u.name as teacher_name, cl.name as class_name
       FROM course_frequency cf
       JOIN courses c ON cf.course_id = c.id
       LEFT JOIN teachers t ON c.teacher_id = t.id
       LEFT JOIN users u ON t.user_id = u.id
       LEFT JOIN classes cl ON c.class_id = cl.id
       WHERE cf.branch_id = $1 AND cf.academic_year = $2
       ORDER BY cl.name, c.name`,
      [branchId, year]
    );
    return result.rows;
  }

  // ── Timetable Structure CRUD ────────────────────────────────────────────────

  async saveStructure(branchId: string, structures: StructureRowInput[], academicYear?: string) {
    const year = academicYear || '2025/2026';
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const dedupedRows = new Map<string, StructureRowInput>();
      for (const row of structures) {
        const key = [row.classId, row.teacherId, row.subject].join('::');
        dedupedRows.set(key, row);
      }

      await client.query(
        'DELETE FROM schedule_structure WHERE branch_id = $1 AND academic_year = $2',
        [branchId, year]
      );

      for (const row of dedupedRows.values()) {
        const classCheck = await client.query(
          'SELECT id, name, section FROM classes WHERE id = $1 AND branch_id = $2',
          [row.classId, branchId]
        );
        if (classCheck.rows.length === 0) {
          throw new Error(`Class not found for structure row: ${row.classId}`);
        }

        const teacherCheck = await client.query(
          'SELECT id FROM teachers WHERE id = $1 AND branch_id = $2',
          [row.teacherId, branchId]
        );
        if (teacherCheck.rows.length === 0) {
          throw new Error(`Teacher not found for structure row: ${row.teacherId}`);
        }

        await client.query(
          `INSERT INTO schedule_structure
            (branch_id, academic_year, class_id, teacher_id, subject, sessions_per_week)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [branchId, year, row.classId, row.teacherId, row.subject, row.sessionsPerWeek]
        );

        // Sync the courses table so Grade Entry always reflects the structure.
        const cls = classCheck.rows[0];
        const cleanSubject = (row.subject || '').trim();
        const cleanClassName = (cls.name || '').replace(/\s+/g, '');
        const cleanSection = (cls.section || '').replace(/\s+/g, '');
        const subjectCode = `${cleanSubject.substring(0, 4).toUpperCase()}-${cleanClassName}-${cleanSection}`;

        // Upsert: match on class_id + subject name (not teacher, as teacher may change)
        const existingCourse = await client.query(
          `SELECT id FROM courses WHERE class_id = $1 AND name = $2`,
          [row.classId, cleanSubject]
        );

        if (existingCourse.rows.length === 0) {
          await client.query(
            `INSERT INTO courses (name, code, teacher_id, class_id, progress) VALUES ($1, $2, $3, $4, 0)`,
            [cleanSubject, subjectCode, row.teacherId, row.classId]
          );
        } else {
          // Update teacher & code in case the structure was edited
          await client.query(
            `UPDATE courses SET teacher_id = $1, code = $2 WHERE id = $3`,
            [row.teacherId, subjectCode, existingCourse.rows[0].id]
          );
        }
      }

      await client.query('COMMIT');
      return { count: dedupedRows.size };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }


  async getStructure(branchId: string, academicYear?: string) {
    const year = academicYear || '2025/2026';
    const result = await pool.query(
      `SELECT ss.*, c.name as class_name, c.section, u.name as teacher_name, u.digital_id as teacher_digital_id
       FROM schedule_structure ss
       JOIN classes c ON ss.class_id = c.id
       JOIN teachers t ON ss.teacher_id = t.id
       JOIN users u ON t.user_id = u.id
       WHERE ss.branch_id = $1 AND ss.academic_year = $2
       ORDER BY c.name, ss.subject, u.name`,
      [branchId, year]
    );
    return result.rows;
  }

  // ── Timetable Generation Engine ──────────────────────────────────────────────

  async generateTimetable(branchId: string, generatedBy: string, academicYear?: string) {
    const year = academicYear || '2025/2026';

    // 1. Load config
    const config = await this.getConfig(branchId, year);
    if (!config) {
      throw new Error('Schedule configuration not found. Please save parameters first.');
    }

    const periodsPerDay = config.periods_per_day;
    const maxConsec = config.max_consecutive_periods;
    const distributeSubs = config.distribute_subjects;
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    // 2. Load timetable structure if defined, otherwise fall back to existing courses
    const structureResult = await this.getStructure(branchId, year);

    const courses: CourseInfo[] = structureResult.length > 0
      ? structureResult.map((row: any) => ({
        courseId: row.id,
        courseName: row.subject,
        courseCode: `${row.class_id}-${row.subject}`,
        teacherId: row.teacher_id,
        teacherName: row.teacher_name,
        classId: row.class_id,
        className: row.section ? `${row.class_name}${row.section}` : row.class_name,
        sessionsPerWeek: parseInt(row.sessions_per_week)
      }))
      : (await pool.query(
        `SELECT c.id as course_id, c.name as course_name, c.code as course_code,
                  c.teacher_id, COALESCE(u.name, 'Unknown') as teacher_name,
                  c.class_id, cl.name as class_name,
                  COALESCE(cf.sessions_per_week, 5) as sessions_per_week
           FROM courses c
           LEFT JOIN teachers t ON c.teacher_id = t.id
           LEFT JOIN users u ON t.user_id = u.id
           JOIN classes cl ON c.class_id = cl.id
           LEFT JOIN course_frequency cf ON cf.course_id = c.id AND cf.academic_year = $2
           WHERE cl.branch_id = $1 AND c.teacher_id IS NOT NULL
           ORDER BY c.name`,
        [branchId, year]
      )).rows.map((r: any) => ({
        courseId: r.course_id,
        courseName: r.course_name,
        courseCode: r.course_code,
        teacherId: r.teacher_id,
        teacherName: r.teacher_name,
        classId: r.class_id,
        className: r.class_name,
        sessionsPerWeek: parseInt(r.sessions_per_week)
      }));

    if (courses.length === 0) {
      throw new Error('No timetable structure or courses found. Please define timetable structure first.');
    }

    // 3. Load teacher unavailability
    const unavailResult = await pool.query(
      `SELECT teacher_id, day_of_week, period_number
       FROM teacher_unavailability
       WHERE branch_id = $1 AND academic_year = $2`,
      [branchId, year]
    );

    // Build unavailability lookup: teacherId -> Set<"day-period">
    const unavailMap = new Map<string, Set<string>>();
    for (const row of unavailResult.rows) {
      const key = row.teacher_id;
      if (!unavailMap.has(key)) unavailMap.set(key, new Set());
      unavailMap.get(key)!.add(`${row.day_of_week}-${row.period_number}`);
    }

    // 4. Build course sessions (flatten: one entry per required session)
    interface CourseSession {
      courseId: string;
      courseName: string;
      courseCode: string;
      teacherId: string;
      teacherName: string;
      classId: string;
      className: string;
      sessionIndex: number; // which of the N sessions this is
    }

    const sessions: CourseSession[] = [];
    for (const course of courses) {
      for (let i = 0; i < course.sessionsPerWeek; i++) {
        sessions.push({ ...course, sessionIndex: i });
      }
    }

    const totalSlotsPossible = sessions.length;

    // 5. Compute slot availability per session for difficulty sorting
    const allSlots: SlotKey[] = [];
    for (const day of days) {
      for (let p = 1; p <= periodsPerDay; p++) {
        allSlots.push({ day, period: p });
      }
    }

    // 6. Generate up to 5 candidate timetables using randomized backtracking
    const MAX_CANDIDATES = 5;
    const candidates: ScheduleEntry[][] = [];

    for (let attempt = 0; attempt < MAX_CANDIDATES; attempt++) {
      const result = this.solveOnce(
        sessions, allSlots, days, periodsPerDay,
        unavailMap, maxConsec, distributeSubs, attempt
      );
      if (result) {
        // Check if this candidate is meaningfully different from existing ones
        const isDuplicate = candidates.some(c => this.isSameSchedule(c, result));
        if (!isDuplicate) {
          candidates.push(result);
        }
      }
    }

    if (candidates.length === 0) {
      throw new Error(
        'Unable to generate a valid timetable with the current constraints. ' +
        'Try reducing teacher unavailability, lowering sessions per week, or increasing periods per day.'
      );
    }

    // 7. Store candidates in timetable_runs
    const runResult = await pool.query(
      `INSERT INTO timetable_runs
        (branch_id, academic_year, status, candidates,
         total_slots_filled, total_slots_possible, conflicts_count, generated_by)
       VALUES ($1, $2, 'pending', $3, $4, $5, 0, $6)
       RETURNING *`,
      [branchId, year, JSON.stringify(candidates),
        candidates[0].length, totalSlotsPossible, generatedBy]
    );

    return {
      runId: runResult.rows[0].id,
      candidateCount: candidates.length,
      totalSlotsPossible,
      candidates: candidates.map((c, i) => ({
        index: i,
        slotsFilled: c.length,
        totalSlots: totalSlotsPossible,
        fillRate: `${Math.round((c.length / totalSlotsPossible) * 100)}%`,
        entries: c
      }))
    };
  }

  // ── Solver: single attempt ───────────────────────────────────────────────────

  private solveOnce(
    sessions: Array<{
      courseId: string; courseName: string; courseCode: string;
      teacherId: string; teacherName: string;
      classId: string; className: string; sessionIndex: number;
    }>,
    allSlots: SlotKey[],
    days: string[],
    periodsPerDay: number,
    unavailMap: Map<string, Set<string>>,
    maxConsec: number,
    distributeSubs: boolean,
    seed: number
  ): ScheduleEntry[] | null {

    // State tracking
    const teacherSlots = new Map<string, Set<string>>();    // teacherId -> Set<"day-period">
    const classSlots = new Map<string, Set<string>>();      // classId -> Set<"day-period">
    const classDaySubjects = new Map<string, Set<string>>(); // "classId-day" -> Set<courseName>
    const teacherDayPeriods = new Map<string, number[]>();   // "teacherId-day" -> sorted period list

    // Seed-based random
    let s = seed;
    const nextRandom = () => {
      s = (s * 1664525 + 1013904223) & 0x7fffffff;
      return s / 0x7fffffff;
    };

    const unassigned = new Set(sessions);
    const result: ScheduleEntry[] = [];
    let bestResult: ScheduleEntry[] = [];
    let maxPlaced = 0;

    // Time limit for backtracking to prevent freezing
    const startTime = Date.now();
    const TIME_LIMIT_MS = 800; // 800ms per attempt to keep overall execution snappy

    const backtrack = (): boolean => {
      // If we placed all sessions, we are done!
      if (unassigned.size === 0) {
        bestResult = [...result];
        return true;
      }

      // Track the best partial result we have found so far
      if (result.length > maxPlaced) {
        maxPlaced = result.length;
        bestResult = [...result];
      }

      // If we exceed time limit, abort search
      if (Date.now() - startTime > TIME_LIMIT_MS) {
        return false;
      }

      // Dynamic MRV (Minimum Remaining Values)
      let bestSession: typeof sessions[0] | null = null;
      let minSlotsCount = Infinity;
      let bestValidSlots: SlotKey[] = [];

      for (const session of unassigned) {
        const validSlots = this.getValidSlots(
          session, allSlots, unavailMap, teacherSlots, classSlots,
          classDaySubjects, teacherDayPeriods, maxConsec, distributeSubs, periodsPerDay
        );
        // If a session has 0 valid slots, we have failed. Backtrack immediately!
        if (validSlots.length === 0) {
          return false;
        }
        if (validSlots.length < minSlotsCount) {
          minSlotsCount = validSlots.length;
          bestSession = session;
          bestValidSlots = validSlots;
        }
      }

      if (!bestSession) {
        return false;
      }

      // Randomize the order of valid slots using our seeded shuffle
      for (let i = bestValidSlots.length - 1; i > 0; i--) {
        const j = Math.floor(nextRandom() * (i + 1));
        [bestValidSlots[i], bestValidSlots[j]] = [bestValidSlots[j], bestValidSlots[i]];
      }

      unassigned.delete(bestSession);

      for (const slot of bestValidSlots) {
        const slotKey = `${slot.day}-${slot.period}`;
        const cdKey = `${bestSession.classId}-${slot.day}`;
        const tdKey = `${bestSession.teacherId}-${slot.day}`;

        // Apply constraints
        if (!teacherSlots.has(bestSession.teacherId)) teacherSlots.set(bestSession.teacherId, new Set());
        teacherSlots.get(bestSession.teacherId)!.add(slotKey);

        if (!classSlots.has(bestSession.classId)) classSlots.set(bestSession.classId, new Set());
        classSlots.get(bestSession.classId)!.add(slotKey);

        if (!classDaySubjects.has(cdKey)) classDaySubjects.set(cdKey, new Set());
        classDaySubjects.get(cdKey)!.add(bestSession.courseName);

        if (!teacherDayPeriods.has(tdKey)) teacherDayPeriods.set(tdKey, []);
        teacherDayPeriods.get(tdKey)!.push(slot.period);
        teacherDayPeriods.get(tdKey)!.sort((a, b) => a - b);

        const entry: ScheduleEntry = {
          teacherId: bestSession.teacherId,
          teacherName: bestSession.teacherName,
          day: slot.day,
          period: slot.period,
          timeSlot: this.periodToTimeSlot(slot.period),
          classId: bestSession.classId,
          className: bestSession.className,
          courseId: bestSession.courseId,
          subject: bestSession.courseName
        };
        result.push(entry);

        // Recurse to next session
        if (backtrack()) {
          return true;
        }

        // Backtrack constraints
        result.pop();
        
        teacherSlots.get(bestSession.teacherId)!.delete(slotKey);
        classSlots.get(bestSession.classId)!.delete(slotKey);
        classDaySubjects.get(cdKey)!.delete(bestSession.courseName);
        
        const periods = teacherDayPeriods.get(tdKey)!;
        const pIdx = periods.indexOf(slot.period);
        if (pIdx > -1) {
          periods.splice(pIdx, 1);
        }
      }

      unassigned.add(bestSession);
      return false;
    };

    // Run backtracking search
    backtrack();

    // Only return if we filled at least 80% of sessions
    if (bestResult.length < sessions.length * 0.8) {
      return null;
    }

    return bestResult;
  }

  private getValidSlots(
    session: { teacherId: string; classId: string; courseName: string },
    allSlots: SlotKey[],
    unavailMap: Map<string, Set<string>>,
    teacherSlots: Map<string, Set<string>>,
    classSlots: Map<string, Set<string>>,
    classDaySubjects: Map<string, Set<string>>,
    teacherDayPeriods: Map<string, number[]>,
    maxConsec: number,
    distributeSubs: boolean,
    periodsPerDay: number
  ): SlotKey[] {
    // 1. Hard constraints filter
    const hardFiltered = allSlots.filter(slot => {
      const slotKey = `${slot.day}-${slot.period}`;
      if (unavailMap.get(session.teacherId)?.has(slotKey)) return false;
      if (teacherSlots.get(session.teacherId)?.has(slotKey)) return false;
      if (classSlots.get(session.classId)?.has(slotKey)) return false;
      return true;
    });

    // 2. Soft constraints filter
    const softFiltered = hardFiltered.filter(slot => {
      // Soft constraint: distribute subjects — avoid same subject twice in one day per class
      if (distributeSubs) {
        const cdKey = `${session.classId}-${slot.day}`;
        if (classDaySubjects.get(cdKey)?.has(session.courseName)) return false;
      }

      // Soft constraint: max consecutive periods for teacher
      const tdKey = `${session.teacherId}-${slot.day}`;
      const existingPeriods = teacherDayPeriods.get(tdKey) || [];
      if (existingPeriods.length > 0) {
        // Check if adding this period would create a run > maxConsec
        const withNew = [...existingPeriods, slot.period].sort((a, b) => a - b);
        let maxRun = 1, currentRun = 1;
        for (let i = 1; i < withNew.length; i++) {
          if (withNew[i] === withNew[i - 1] + 1) {
            currentRun++;
            maxRun = Math.max(maxRun, currentRun);
          } else {
            currentRun = 1;
          }
        }
        if (maxRun > maxConsec) return false;
      }

      return true;
    });

    // 3. Fallback: if soft constraints leave no options, return hard-filtered slots!
    if (softFiltered.length === 0) {
      return hardFiltered;
    }

    return softFiltered;
  }

  private countValidSlots(
    session: { teacherId: string; classId: string },
    allSlots: SlotKey[],
    unavailMap: Map<string, Set<string>>,
    teacherSlots: Map<string, Set<string>>,
    classSlots: Map<string, Set<string>>
  ): number {
    return allSlots.filter(slot => {
      const slotKey = `${slot.day}-${slot.period}`;
      if (unavailMap.get(session.teacherId)?.has(slotKey)) return false;
      if (teacherSlots.get(session.teacherId)?.has(slotKey)) return false;
      if (classSlots.get(session.classId)?.has(slotKey)) return false;
      return true;
    }).length;
  }

  private periodToTimeSlot(period: number): string {
    // Ethiopian school standard: 40-minute periods with 10-minute breaks
    const startHour = 8;
    const startMin = 0;
    const periodDuration = 40;
    const breakDuration = 10;

    const totalMinutesFromStart = (period - 1) * (periodDuration + breakDuration);
    const startMinutes = startHour * 60 + startMin + totalMinutesFromStart;
    const endMinutes = startMinutes + periodDuration;

    const formatTime = (m: number) => {
      const h = Math.floor(m / 60);
      const min = m % 60;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
      return `${h12}:${min.toString().padStart(2, '0')} ${ampm}`;
    };

    return `${formatTime(startMinutes)} - ${formatTime(endMinutes)}`;
  }

  private shuffleWithSeed<T>(arr: T[], seed: number): void {
    // Simple seeded shuffle (Fisher-Yates with pseudo-random)
    let s = seed;
    const nextRandom = () => {
      s = (s * 1664525 + 1013904223) & 0x7fffffff;
      return s / 0x7fffffff;
    };
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(nextRandom() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  private isSameSchedule(a: ScheduleEntry[], b: ScheduleEntry[]): boolean {
    if (a.length !== b.length) return false;
    const serialize = (entries: ScheduleEntry[]) =>
      entries
        .map(e => `${e.teacherId}|${e.day}|${e.period}|${e.classId}|${e.courseId}`)
        .sort()
        .join(';');
    return serialize(a) === serialize(b);
  }

  // ── Approve a candidate ──────────────────────────────────────────────────────

  async approveCandidate(runId: string, candidateIndex: number, branchId: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Load the run
      const runResult = await client.query(
        `SELECT * FROM timetable_runs WHERE id = $1 AND branch_id = $2`,
        [runId, branchId]
      );

      if (runResult.rows.length === 0) {
        throw new Error('Timetable run not found');
      }

      const run = runResult.rows[0];
      if (run.status === 'approved') {
        throw new Error('A candidate has already been approved for this run');
      }

      const candidates = run.candidates as ScheduleEntry[][];
      if (candidateIndex < 0 || candidateIndex >= candidates.length) {
        throw new Error(`Invalid candidate index. Must be 0-${candidates.length - 1}`);
      }

      const chosen = candidates[candidateIndex];

      // Clear existing schedules for this branch's teachers
      await client.query(
        `DELETE FROM schedules
         WHERE teacher_id IN (
           SELECT id FROM teachers WHERE branch_id = $1
         )`,
        [branchId]
      );

      // Insert the chosen schedule
      for (const entry of chosen) {
        await client.query(
          `INSERT INTO schedules (teacher_id, day, time_slot, period_number, class_name, subject)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [entry.teacherId, entry.day, entry.timeSlot, entry.period, entry.className, entry.subject]
        );
      }

      // Mark the run as approved
      await client.query(
        `UPDATE timetable_runs
         SET status = 'approved', approved_candidate = $1
         WHERE id = $2`,
        [candidateIndex, runId]
      );

      // Reject any other pending runs for this branch+year
      await client.query(
        `UPDATE timetable_runs
         SET status = 'rejected'
         WHERE branch_id = $1 AND academic_year = $2 AND id != $3 AND status = 'pending'`,
        [branchId, run.academic_year, runId]
      );

      await client.query('COMMIT');

      return {
        runId,
        candidateIndex,
        entriesInserted: chosen.length,
        message: 'Schedule approved and published. Teachers, students, and parents can now view their timetables.'
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ── Query helpers ────────────────────────────────────────────────────────────

  async getTimetableRuns(branchId: string, academicYear?: string) {
    const year = academicYear || '2025/2026';
    const result = await pool.query(
      `SELECT id, branch_id, academic_year, status, approved_candidate,
              total_slots_filled, total_slots_possible, conflicts_count,
              generated_by, created_at,
              jsonb_array_length(candidates) as candidate_count
       FROM timetable_runs
       WHERE branch_id = $1 AND academic_year = $2
       ORDER BY created_at DESC`,
      [branchId, year]
    );
    return result.rows;
  }

  async getTimetableRunDetail(runId: string, branchId: string) {
    const result = await pool.query(
      `SELECT * FROM timetable_runs WHERE id = $1 AND branch_id = $2`,
      [runId, branchId]
    );
    if (result.rows.length === 0) return null;

    const run = result.rows[0];
    const candidates = (run.candidates as ScheduleEntry[][]) || [];

    return {
      ...run,
      candidates: candidates.map((c: ScheduleEntry[], i: number) => ({
        index: i,
        slotsFilled: c.length,
        totalSlots: run.total_slots_possible,
        fillRate: `${Math.round((c.length / run.total_slots_possible) * 100)}%`,
        entries: c
      }))
    };
  }

  async getGeneratedSchedule(branchId: string) {
    const result = await pool.query(
      `SELECT s.*, u.name as teacher_name
       FROM schedules s
       JOIN teachers t ON s.teacher_id = t.id
       JOIN users u ON t.user_id = u.id
       WHERE t.branch_id = $1
       ORDER BY
         CASE s.day
           WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3
           WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5
         END,
         COALESCE(s.period_number, 99), s.time_slot, s.class_name`,
      [branchId]
    );
    return result.rows;
  }
}

export default new ScheduleService();

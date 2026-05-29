import pool from '../config/db';

export interface AssignmentResult {
  success: boolean;
  studentId: string;
  fromSection?: string;
  toSection: string;
  message: string;
}

export interface SectionInfo {
  id: string;
  name: string;
  section: string | null;
  grade?: string;
  capacity: number;
  current_count: number;
  available_slots: number;
}

/** Normalize "Grade 7", "7", "grade 7" → "7" */
export const normalizeGradeForSectionQuery = (grade: string): string => {
  const trimmed = grade.trim();
  const fromLabel = trimmed.match(/grade\s*(\d{1,2})/i);
  if (fromLabel) return fromLabel[1];
  const digits = trimmed.match(/(\d{1,2})/);
  return digits ? digits[1] : trimmed;
};

const sectionCountSql = 'COALESCE(c.current_count, c.student_count, 0)';

const gradeMatchSql = `(
  c.name ILIKE 'Grade ' || $1 || '%'
  OR c.name ILIKE $1 || '%'
  OR regexp_replace(c.name, '[^0-9]', '', 'g') = $1
)`;

const hasAvailableSlotSql = `(
  COALESCE(c.capacity, 0) <= 0
  OR ${sectionCountSql} < c.capacity
)`;

/**
 * Get eligible sections for a student's grade level with capacity info.
 */
export const getEligibleSections = async (
  grade: string,
  branchId?: string | null
): Promise<SectionInfo[]> => {
  const normalizedGrade = normalizeGradeForSectionQuery(grade);
  const params: any[] = [normalizedGrade];
  let branchFilter = '';

  if (branchId) {
    params.push(branchId);
    branchFilter = ` AND c.branch_id = $${params.length}`;
  }

  const result = await pool.query(
    `SELECT 
       c.id, 
       c.name, 
       c.section,
       c.capacity, 
       ${sectionCountSql} AS current_count,
       CASE
         WHEN COALESCE(c.capacity, 0) <= 0 THEN 999
         ELSE GREATEST(c.capacity - ${sectionCountSql}, 0)
       END AS available_slots
     FROM classes c
     WHERE ${gradeMatchSql}
     ${branchFilter}
     AND ${hasAvailableSlotSql}
     ORDER BY ${sectionCountSql} ASC, c.section ASC NULLS LAST, c.name ASC`,
    params
  );

  return result.rows.map((row: any) => ({
    ...row,
    grade: normalizedGrade
  }));
};

const syncSectionCounts = async (
  client: { query: (text: string, params?: any[]) => Promise<any> },
  sectionId: string
) => {
  await client.query(
    `UPDATE classes
     SET current_count = (
       SELECT COUNT(*)::int FROM students WHERE section_id = $1
     ),
     student_count = (
       SELECT COUNT(*)::int FROM students WHERE section_id = $1
     )
     WHERE id = $1`,
    [sectionId]
  );
};

/**
 * Assign a student to a section with transaction safety and capacity checks.
 */
export const assignStudentToSection = async (
  studentId: string,
  toSectionId: string,
  reason: string,
  assignedByUserId: string
): Promise<AssignmentResult> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const studentResult = await client.query(
      'SELECT id, section_id, grade, branch_id FROM students WHERE id = $1 FOR UPDATE',
      [studentId]
    );
    if (studentResult.rows.length === 0) {
      throw new Error('Student not found');
    }

    const student = studentResult.rows[0];
    const fromSectionId = student.section_id;

    const sectionResult = await client.query(
      `SELECT id, name, section, capacity, ${sectionCountSql} AS current_count
       FROM classes c WHERE id = $1 FOR UPDATE`,
      [toSectionId]
    );
    if (sectionResult.rows.length === 0) {
      throw new Error('Section not found');
    }

    const section = sectionResult.rows[0];
    const capacity = Number(section.capacity) || 0;
    const currentCount = Number(section.current_count) || 0;

    if (capacity > 0 && currentCount >= capacity) {
      throw new Error(
        `Section "${section.name}" is at capacity (${capacity}/${capacity}). Cannot assign student.`
      );
    }

    await client.query(
      `UPDATE students 
       SET section_id = $1, 
           previous_section_id = COALESCE(section_id, $2),
           section_assigned_at = NOW(),
           updated_at = NOW()
       WHERE id = $3`,
      [toSectionId, fromSectionId, studentId]
    );

    await syncSectionCounts(client, toSectionId);
    if (fromSectionId) {
      await syncSectionCounts(client, fromSectionId);
    }

    await client.query(
      `INSERT INTO section_assignment_audit 
       (student_id, from_section_id, to_section_id, assigned_by, reason, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [studentId, fromSectionId || null, toSectionId, assignedByUserId, reason]
    );

    await client.query('COMMIT');

    const sectionLabel = section.section
      ? `${section.name} — Section ${section.section}`
      : section.name;

    return {
      success: true,
      studentId,
      fromSection: fromSectionId ? `Previous section` : 'Unassigned',
      toSection: sectionLabel,
      message: `Student successfully assigned to "${sectionLabel}"`
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Auto-assign new students to least-loaded sections in their grade.
 */
export const autoAssignStudent = async (
  studentId: string,
  grade: string,
  assignedByUserId: string
): Promise<AssignmentResult> => {
  const normalizedGrade = normalizeGradeForSectionQuery(grade);

  const studentRow = await pool.query(
    'SELECT branch_id FROM students WHERE id = $1',
    [studentId]
  );
  const branchId = studentRow.rows[0]?.branch_id || null;

  const sections = await getEligibleSections(normalizedGrade, branchId);
  if (sections.length === 0) {
    throw new Error(`No available sections for grade ${grade}`);
  }

  const targetSection = sections[0];
  return assignStudentToSection(
    studentId,
    targetSection.id,
    'Auto-assigned on enrollment',
    assignedByUserId
  );
};

/**
 * Bulk assign multiple students to a section.
 */
export const bulkAssignStudents = async (
  studentIds: string[],
  toSectionId: string,
  reason: string,
  assignedByUserId: string
): Promise<AssignmentResult[]> => {
  const results: AssignmentResult[] = [];

  for (const studentId of studentIds) {
    try {
      const result = await assignStudentToSection(
        studentId,
        toSectionId,
        reason,
        assignedByUserId
      );
      results.push(result);
    } catch (error) {
      results.push({
        success: false,
        studentId,
        toSection: toSectionId,
        message: `Failed: ${(error as any).message}`
      });
    }
  }

  return results;
};

const studentGradeMatchSql = `(
  s.grade = $1
  OR s.grade ILIKE 'Grade ' || $1
  OR s.grade ILIKE 'Grade ' || $1 || '%'
  OR regexp_replace(s.grade, '[^0-9]', '', 'g') = $1
)`;

/**
 * Auto-distribute unassigned students in a grade fairly across available sections.
 */
export const autoDistributeUnassigned = async (
  grade: string,
  branchId: string | null | undefined,
  assignedByUserId: string
): Promise<{ successful: number; failed: number; results: AssignmentResult[] }> => {
  const normalizedGrade = normalizeGradeForSectionQuery(grade);

  const params: any[] = [normalizedGrade];
  let branchFilter = '';
  if (branchId) {
    params.push(branchId);
    branchFilter = ` AND s.branch_id = $${params.length}`;
  }

  const unassignedStudents = await pool.query(
    `SELECT s.id, s.grade, s.branch_id FROM students s
     WHERE s.section_id IS NULL 
     AND ${studentGradeMatchSql}
     ${branchFilter}
     ORDER BY s.created_at ASC`,
    params
  );

  if (unassignedStudents.rows.length === 0) {
    return { successful: 0, failed: 0, results: [] };
  }

  const effectiveBranchId = branchId || unassignedStudents.rows[0]?.branch_id || null;
  const sections = await getEligibleSections(grade, effectiveBranchId);

  if (sections.length === 0) {
    throw new Error(
      `No available sections for grade ${grade}. Create grade sections under Classes with capacity set.`
    );
  }

  const results: AssignmentResult[] = [];
  let sectionIndex = 0;

  for (const student of unassignedStudents.rows) {
    try {
      const targetSection = sections[sectionIndex % sections.length];
      sectionIndex++;

      const result = await assignStudentToSection(
        student.id,
        targetSection.id,
        `Auto-distributed to ${targetSection.name}`,
        assignedByUserId
      );
      results.push(result);
    } catch (error) {
      results.push({
        success: false,
        studentId: student.id,
        toSection: 'Unknown',
        message: `Failed: ${(error as any).message}`
      });
    }
  }

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return { successful, failed, results };
};

/**
 * Swap two students' sections atomically.
 */
export const swapStudentSections = async (
  studentAId: string,
  studentBId: string,
  assignedByUserId: string
): Promise<{ success: boolean; message: string }> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const studentsResult = await client.query(
      'SELECT id, section_id FROM students WHERE id IN ($1, $2) FOR UPDATE',
      [studentAId, studentBId]
    );

    if (studentsResult.rows.length !== 2) {
      throw new Error('One or both students not found');
    }

    const [studentA, studentB] = studentsResult.rows;
    const sectionAId = studentA.section_id;
    const sectionBId = studentB.section_id;

    if (!sectionAId || !sectionBId) {
      throw new Error('Both students must be assigned to sections to swap');
    }

    await client.query('UPDATE students SET section_id = $2, updated_at = NOW() WHERE id = $1', [
      studentAId,
      sectionBId
    ]);
    await client.query('UPDATE students SET section_id = $2, updated_at = NOW() WHERE id = $1', [
      studentBId,
      sectionAId
    ]);

    await syncSectionCounts(client, sectionAId);
    await syncSectionCounts(client, sectionBId);

    await client.query(
      `INSERT INTO section_assignment_audit (student_id, from_section_id, to_section_id, assigned_by, reason)
       VALUES ($1, $2, $3, $4, $5), ($6, $7, $8, $9, $10)`,
      [
        studentAId,
        sectionAId,
        sectionBId,
        assignedByUserId,
        'Swap',
        studentBId,
        sectionBId,
        sectionAId,
        assignedByUserId,
        'Swap'
      ]
    );

    await client.query('COMMIT');
    return { success: true, message: 'Students swapped successfully' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

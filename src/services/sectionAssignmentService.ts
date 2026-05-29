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
  grade: string;
  capacity: number;
  current_count: number;
  available_slots: number;
}

/**
 * Get eligible sections for a student's grade level with capacity info.
 * Uses grade column for reliable filtering. Falls back to name pattern matching if grade column is NULL.
 */
export const getEligibleSections = async (grade: string): Promise<SectionInfo[]> => {
  const result = await pool.query(
    `SELECT 
       c.id, 
       c.name, 
       c.section,
       c.capacity, 
       COALESCE(c.current_count, 0) AS current_count,
       (c.capacity - COALESCE(c.current_count, 0)) AS available_slots
     FROM classes c
     WHERE (
       -- Primary: Match using grade column
       c.grade = $1
       -- Fallback: Pattern match in name if grade column not populated yet
       OR (c.grade IS NULL AND (
         c.name ILIKE 'Grade ' || $1 || '%'
         OR c.name ILIKE $1 || '%'
         OR c.name ILIKE $1 || '-%'
       ))
     )
     AND c.capacity > 0
     AND COALESCE(c.current_count, 0) < c.capacity
     ORDER BY c.current_count ASC, c.section ASC, c.name ASC`,
    [grade]
  );
  
  return result.rows;
};

/**
 * Assign a student to a section with transaction safety and capacity checks.
 * Logic:
 * - If student already assigned, update previous_section_id
 * - Check target section capacity (must have slots)
 * - Use transaction: update student, increment new section count, decrement old count, audit
 */
export const assignStudentToSection = async (
  studentId: string,
  toSectionId: string,
  reason: string,
  assignedByUserId: string
): Promise<AssignmentResult> => {
  const client = await pool.connect();
  try {
    // Start transaction
    await client.query('BEGIN');

    // 1. Lock student row to prevent concurrent updates
    const studentResult = await client.query(
      'SELECT id, section_id, grade FROM students WHERE id = $1 FOR UPDATE',
      [studentId]
    );
    if (studentResult.rows.length === 0) {
      throw new Error('Student not found');
    }

    const student = studentResult.rows[0];
    const fromSectionId = student.section_id;

    // 2. Lock and verify target section
    const sectionResult = await client.query(
      'SELECT id, name, capacity, COALESCE(current_count, 0) AS current_count FROM classes WHERE id = $1 FOR UPDATE',
      [toSectionId]
    );
    if (sectionResult.rows.length === 0) {
      throw new Error('Section not found');
    }

    const section = sectionResult.rows[0];
    if (section.current_count >= section.capacity) {
      throw new Error(
        `Section "${section.name}" is at capacity (${section.capacity}/${section.capacity}). Cannot assign student.`
      );
    }

    // 3. Update student record
    await client.query(
      `UPDATE students 
       SET section_id = $1, 
           previous_section_id = COALESCE(section_id, $2),
           section_assigned_at = NOW(),
           updated_at = NOW()
       WHERE id = $3`,
      [toSectionId, fromSectionId, studentId]
    );

    // 4. Update section counts
    // Increment new section
    await client.query(
      'UPDATE classes SET current_count = current_count + 1 WHERE id = $1',
      [toSectionId]
    );

    // Decrement old section if exists
    if (fromSectionId) {
      await client.query(
        'UPDATE classes SET current_count = GREATEST(current_count - 1, 0) WHERE id = $1',
        [fromSectionId]
      );
    }

    // 5. Log to audit table
    await client.query(
      `INSERT INTO section_assignment_audit 
       (student_id, from_section_id, to_section_id, assigned_by, reason, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [studentId, fromSectionId || null, toSectionId, assignedByUserId, reason]
    );

    // Commit transaction
    await client.query('COMMIT');

    return {
      success: true,
      studentId,
      fromSection: fromSectionId ? `Section ${section.name}` : 'Unassigned',
      toSection: section.name,
      message: `Student successfully assigned to section "${section.name}"`
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
    client.release();
  }
};

/**
 * Auto-assign new students to least-loaded sections in their grade.
 * Randomly shuffles eligible sections then picks the least-loaded.
 */
export const autoAssignStudent = async (
  studentId: string,
  grade: string,
  assignedByUserId: string
): Promise<AssignmentResult> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get eligible sections sorted by load
    const sectionsResult = await client.query(
      `SELECT c.id, c.name, c.capacity, COALESCE(c.current_count, 0) AS current_count
       FROM classes c
       WHERE c.capacity > COALESCE(c.current_count, 0)
       ORDER BY c.current_count ASC, RANDOM()
       LIMIT 1`,
      []
    );

    if (sectionsResult.rows.length === 0) {
      throw new Error(`No available sections for grade ${grade}`);
    }

    const targetSection = sectionsResult.rows[0];
    await client.query('COMMIT');
    return assignStudentToSection(studentId, targetSection.id, 'Auto-assigned on enrollment', assignedByUserId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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

    // Get both students' current sections
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

    // Swap sections
    await client.query('UPDATE students SET section_id = $2, updated_at = NOW() WHERE id = $1', [
      studentAId,
      sectionBId
    ]);
    await client.query('UPDATE students SET section_id = $2, updated_at = NOW() WHERE id = $1', [
      studentBId,
      sectionAId
    ]);

    // Audit both swaps
    await client.query(
      `INSERT INTO section_assignment_audit (student_id, from_section_id, to_section_id, assigned_by, reason)
       VALUES ($1, $2, $3, $4, $5), ($6, $7, $8, $9, $10)`,
      [studentAId, sectionAId, sectionBId, assignedByUserId, 'Swap', studentBId, sectionBId, sectionAId, assignedByUserId, 'Swap']
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

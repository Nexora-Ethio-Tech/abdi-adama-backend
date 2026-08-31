const mockConnect = jest.fn();
const mockPoolQuery = jest.fn();

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    connect: mockConnect,
    query: mockPoolQuery,
  },
}));

jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: { warn: jest.fn() },
}));

import teacherService from '../services/teacher.service';

const teacherUserId = '00000000-0000-4000-8000-000000000001';
const teacherId = '00000000-0000-4000-8000-000000000002';
const courseId = '00000000-0000-4000-8000-000000000003';
const studentId = '00000000-0000-4000-8000-000000000004';
const classId = '00000000-0000-4000-8000-000000000005';
const gradeId = '00000000-0000-4000-8000-000000000006';

const ownedCourse = {
  teacher_id: teacherId,
  teacher_branch_id: 'branch-1',
  class_id: classId,
  class_branch_id: 'branch-1',
};

const makeClient = (
  finalizedRows: Array<{ type: string }> = [],
  rosterRows: Array<{ id: string; grade: string; branch_id: string }> = [
    { id: studentId, grade: '10', branch_id: 'branch-1' },
  ]
) => {
  const query = jest.fn(async (sql: string, _params?: unknown[]) => {
    if (sql.includes('FROM teachers t') && sql.includes('JOIN courses c')) return { rows: [ownedCourse] };
    if (sql.includes('SELECT DISTINCT s.id')) return { rows: rosterRows };
    if (sql.includes("WHERE key = 'grades_locked'")) return { rows: [] };
    if (sql.includes('FROM grade_locks')) return { rows: [] };
    if (sql.includes('FROM grade_submissions')) return { rows: [] };
    if (sql.includes('SELECT DISTINCT g.type FROM grades')) return { rows: finalizedRows };
    if (sql.includes('UPDATE grades g')) return { rows: [{ id: 'grade-1' }], rowCount: 1 };
    if (sql.includes('INSERT INTO grade_submissions')) return { rows: [{ id: 'submission-1' }] };
    if (sql.includes('INSERT INTO grades')) return { rows: [{ id: 'grade-1' }] };
    return { rows: [] };
  });

  return { query, release: jest.fn() };
};

describe('teacher grade assessment scoping', () => {
  afterEach(() => jest.clearAllMocks());

  it('reads grades and lock state from the requested academic period only', async () => {
    mockPoolQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM teachers t') && sql.includes('JOIN courses c')) {
        return { rows: [ownedCourse] };
      }
      return { rows: [] };
    });

    await teacherService.getGradesByCourse(teacherUserId, courseId, '2025/2026', 2);

    const [sql, params] = mockPoolQuery.mock.calls[1];
    expect(sql).toContain('gs.academic_year = g.academic_year');
    expect(sql).toContain('gs.semester = g.semester');
    expect(sql).toContain('t.user_id = $2');
    expect(sql).toContain('g.academic_year = $3');
    expect(sql).toContain('g.semester = $4');
    expect(sql).toContain('s.branch_id = cl.branch_id');
    expect(params).toEqual([courseId, teacherUserId, '2025/2026', 2]);
  });

  it('denies reading a course that is not owned by the authenticated teacher', async () => {
    mockPoolQuery.mockResolvedValue({ rows: [] });

    await expect(
      teacherService.getGradesByCourse(teacherUserId, courseId, '2025/2026', 2)
    ).rejects.toMatchObject({ statusCode: 403, code: 'GRADE_ACCESS_DENIED' });

    expect(mockPoolQuery).toHaveBeenCalledTimes(1);
  });

  it('denies grade access when the teacher and course class branches do not match', async () => {
    mockPoolQuery.mockResolvedValue({
      rows: [{ ...ownedCourse, class_branch_id: 'branch-2' }],
    });

    await expect(
      teacherService.getGradesByCourse(teacherUserId, courseId)
    ).rejects.toMatchObject({ statusCode: 403, code: 'GRADE_ACCESS_DENIED' });
  });

  it('checks finalized grades using only the assessment types in the request', async () => {
    const client = makeClient();
    mockConnect.mockResolvedValue(client);

    await expect(teacherService.bulkEnterGrades(
      teacherUserId,
      courseId,
      [{ studentId, type: 'final', score: 40, total: 50 }],
      { academicYear: '2025/2026', semester: 2 }
    )).resolves.toMatchObject({ count: 1 });

    const finalizedCall = client.query.mock.calls.find(([sql]) =>
      String(sql).includes('SELECT DISTINCT g.type FROM grades')
    );
    expect(finalizedCall?.[1]).toEqual([courseId, '2025/2026', 2, ['final'], classId]);
  });

  it('still rejects editing when that exact requested assessment is finalized', async () => {
    const client = makeClient([{ type: 'final' }]);
    mockConnect.mockResolvedValue(client);

    await expect(teacherService.bulkEnterGrades(
      teacherUserId,
      courseId,
      [{ studentId, type: 'final', score: 40, total: 50 }],
      { academicYear: '2025/2026', semester: 2 }
    )).rejects.toThrow('final grades for 2025/2026 Semester 2 have already been submitted and locked');

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('rejects a bulk write when any student is outside the course roster', async () => {
    const client = makeClient([], []);
    mockConnect.mockResolvedValue(client);

    await expect(teacherService.bulkEnterGrades(
      teacherUserId,
      courseId,
      [{ studentId, type: 'quiz', score: 8, total: 10 }],
      { academicYear: '2025/2026', semester: 2 }
    )).rejects.toMatchObject({ statusCode: 403, code: 'GRADE_ACCESS_DENIED' });

    expect(client.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO grades'))).toBe(false);
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('rejects a single write when the student is outside the course roster', async () => {
    const client = makeClient([], []);
    mockConnect.mockResolvedValue(client);

    await expect(teacherService.enterGrade({
      teacherUserId,
      courseId,
      studentId,
      type: 'quiz',
      score: 8,
      total: 10,
      academicYear: '2025/2026',
      semester: 2,
    })).rejects.toMatchObject({ statusCode: 403, code: 'GRADE_ACCESS_DENIED' });

    expect(client.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO grades'))).toBe(false);
  });

  it('rejects updating a grade that is not owned or no longer in the course roster', async () => {
    const client = makeClient();
    mockConnect.mockResolvedValue(client);

    await expect(teacherService.updateGrade(gradeId, teacherUserId, {
      score: 8,
      total: 10,
    })).rejects.toMatchObject({ statusCode: 403, code: 'GRADE_ACCESS_DENIED' });

    expect(client.query.mock.calls.some(([sql]) => String(sql).includes('UPDATE grades SET'))).toBe(false);
  });

  it('finalizes only students who still belong to the owned course roster', async () => {
    const client = makeClient();
    mockConnect.mockResolvedValue(client);

    await expect(teacherService.finalizeGradeSubmission(
      teacherUserId,
      courseId,
      'final',
      { academicYear: '2025/2026', semester: 2 }
    )).resolves.toMatchObject({ updatedCount: 1 });

    const finalizationCall = client.query.mock.calls.find(([sql]) =>
      String(sql).includes('UPDATE grades g')
    );
    expect(finalizationCall?.[0]).toContain('s.id = g.student_id');
    expect(finalizationCall?.[0]).toContain('s.branch_id = c.branch_id');
    expect(finalizationCall?.[1]).toEqual([
      teacherUserId,
      courseId,
      'final',
      '2025/2026',
      2,
      classId,
    ]);
  });
});

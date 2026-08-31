const mockConnect = jest.fn();
const mockPoolQuery = jest.fn();

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    connect: mockConnect,
    query: mockPoolQuery,
  },
}));

import teacherService from '../services/teacher.service';

const teacherUserId = '00000000-0000-4000-8000-000000000001';
const teacherId = '00000000-0000-4000-8000-000000000002';
const courseId = '00000000-0000-4000-8000-000000000003';
const studentId = '00000000-0000-4000-8000-000000000004';

const makeClient = (finalizedRows: Array<{ type: string }> = []) => {
  const query = jest.fn(async (sql: string, _params?: unknown[]) => {
    if (sql.includes('SELECT id, branch_id FROM teachers')) {
      return { rows: [{ id: teacherId, branch_id: 'branch-1' }] };
    }
    if (sql.includes('SELECT teacher_id FROM courses')) {
      return { rows: [{ teacher_id: teacherId }] };
    }
    if (sql.includes('SELECT DISTINCT s.grade')) {
      return { rows: [{ grade: '10', branch_id: 'branch-1' }] };
    }
    if (sql.includes("WHERE key = 'grades_locked'")) return { rows: [] };
    if (sql.includes('FROM grade_locks')) return { rows: [] };
    if (sql.includes('FROM grade_submissions')) return { rows: [] };
    if (sql.includes('SELECT DISTINCT type FROM grades')) return { rows: finalizedRows };
    if (sql.includes('INSERT INTO grades')) return { rows: [{ id: 'grade-1' }] };
    return { rows: [] };
  });

  return { query, release: jest.fn() };
};

describe('teacher grade assessment scoping', () => {
  afterEach(() => jest.clearAllMocks());

  it('reads grades and lock state from the requested academic period only', async () => {
    mockPoolQuery.mockResolvedValue({ rows: [] });

    await teacherService.getGradesByCourse(courseId, '2025/2026', 2);

    const [sql, params] = mockPoolQuery.mock.calls[0];
    expect(sql).toContain('gs.academic_year = g.academic_year');
    expect(sql).toContain('gs.semester = g.semester');
    expect(sql).toContain('g.academic_year = $2');
    expect(sql).toContain('g.semester = $3');
    expect(params).toEqual([courseId, '2025/2026', 2]);
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
      String(sql).includes('SELECT DISTINCT type FROM grades')
    );
    expect(finalizedCall?.[1]).toEqual([courseId, '2025/2026', 2, ['final']]);
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
});

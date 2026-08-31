const mockPoolQuery = jest.fn();

jest.mock('../config/db', () => ({
  __esModule: true,
  default: { query: mockPoolQuery },
}));

jest.mock('../config/database', () => ({
  __esModule: true,
  default: { query: mockPoolQuery },
}));

import {
  fetchHistoricalCourses,
  fetchStudentGradeRows,
} from '../controllers/studentController';

describe('student grade history integrity', () => {
  afterEach(() => jest.clearAllMocks());

  it('uses only finalized grades from the requested period to recover historical courses', async () => {
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'course-1', name: 'English' }] });

    await expect(fetchHistoricalCourses(
      'student-1',
      'user-1',
      '2025/2026',
      2
    )).resolves.toEqual([{ id: 'course-1', name: 'English' }]);

    const [sql, params] = mockPoolQuery.mock.calls[1];
    expect(sql).toContain('g.academic_year = $2');
    expect(sql).toContain('g.semester = $3');
    expect(sql).toContain('COALESCE(g.is_finalized, false) = true');
    expect(params).toEqual(['student-1', '2025/2026', 2]);
  });

  it('does not substitute the current class roster when period-owned history is absent', async () => {
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(fetchHistoricalCourses(
      'student-1',
      'user-1',
      '2025/2026',
      1
    )).resolves.toEqual([]);

    expect(mockPoolQuery).toHaveBeenCalledTimes(2);
  });

  it('keeps official grade reads finalized and explicitly period-scoped', async () => {
    mockPoolQuery.mockResolvedValueOnce({ rows: [] });

    await fetchStudentGradeRows(
      'student-1',
      '2025/2026',
      2,
      ['00000000-0000-4000-8000-000000000001']
    );

    const [sql, params] = mockPoolQuery.mock.calls[0];
    expect(sql).toContain('g.academic_year = $2');
    expect(sql).toContain('g.semester = $3');
    expect(sql).toContain('COALESCE(g.is_finalized, false) = true');
    expect(params).toEqual([
      'student-1',
      '2025/2026',
      2,
      ['00000000-0000-4000-8000-000000000001'],
    ]);
  });

  it('allows provisional reads without ever dropping the requested period', async () => {
    mockPoolQuery.mockResolvedValueOnce({ rows: [] });

    await fetchStudentGradeRows(
      'student-1',
      '2025/2026',
      1,
      ['00000000-0000-4000-8000-000000000001'],
      false
    );

    const [sql, params] = mockPoolQuery.mock.calls[0];
    expect(sql).toContain('g.academic_year = $2');
    expect(sql).toContain('g.semester = $3');
    expect(sql).not.toContain('COALESCE(g.is_finalized, false) = true');
    expect(params.slice(0, 3)).toEqual(['student-1', '2025/2026', 1]);
  });
});

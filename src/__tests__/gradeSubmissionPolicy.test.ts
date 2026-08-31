import {
  DEFAULT_GRADE_UNLOCK_WINDOW_DAYS,
  canUnlockGradeSubmission,
  getCurrentAcademicPeriod,
  getGradeUnlockWindowDays,
} from '../shared/gradeSubmissionPolicy';

describe('grade submission policy', () => {
  const originalValue = process.env.GRADE_SUBMISSION_UNLOCK_DAYS;

  afterEach(() => {
    if (originalValue === undefined) delete process.env.GRADE_SUBMISSION_UNLOCK_DAYS;
    else process.env.GRADE_SUBMISSION_UNLOCK_DAYS = originalValue;
  });

  it('defaults the unlock window to 60 days and accepts a valid override', () => {
    delete process.env.GRADE_SUBMISSION_UNLOCK_DAYS;
    expect(getGradeUnlockWindowDays()).toBe(DEFAULT_GRADE_UNLOCK_WINDOW_DAYS);

    process.env.GRADE_SUBMISSION_UNLOCK_DAYS = '45';
    expect(getGradeUnlockWindowDays()).toBe(45);
  });

  it('ignores unsafe or invalid configured windows', () => {
    process.env.GRADE_SUBMISSION_UNLOCK_DAYS = '0';
    expect(getGradeUnlockWindowDays()).toBe(DEFAULT_GRADE_UNLOCK_WINDOW_DAYS);
    process.env.GRADE_SUBMISSION_UNLOCK_DAYS = '500';
    expect(getGradeUnlockWindowDays()).toBe(DEFAULT_GRADE_UNLOCK_WINDOW_DAYS);
    process.env.GRADE_SUBMISSION_UNLOCK_DAYS = 'not-a-number';
    expect(getGradeUnlockWindowDays()).toBe(DEFAULT_GRADE_UNLOCK_WINDOW_DAYS);
  });

  it('uses the same Sep 11 academic-year boundary as the frontend', () => {
    expect(getCurrentAcademicPeriod(new Date('2026-09-10T12:00:00Z'))).toEqual({
      academicYear: '2025/2026',
      semester: 2,
    });
    expect(getCurrentAcademicPeriod(new Date('2026-09-11T12:00:00Z'))).toEqual({
      academicYear: '2026/2027',
      semester: 1,
    });
  });

  it('allows only active-period submissions no older than the configured window', () => {
    const now = new Date('2026-08-31T09:00:00Z');
    const base = { academicYear: '2025/2026', semester: 2 as const };

    expect(canUnlockGradeSubmission({ ...base, submittedAt: '2026-07-03T09:00:00Z' }, now, 60)).toBe(true);
    expect(canUnlockGradeSubmission({ ...base, submittedAt: '2026-07-01T08:59:59Z' }, now, 60)).toBe(false);
    expect(canUnlockGradeSubmission({ ...base, submittedAt: '2026-09-01T09:00:00Z' }, now, 60)).toBe(false);
    expect(canUnlockGradeSubmission({ academicYear: '2024/2025', semester: 2, submittedAt: '2026-08-30T09:00:00Z' }, now, 60)).toBe(false);
  });
});


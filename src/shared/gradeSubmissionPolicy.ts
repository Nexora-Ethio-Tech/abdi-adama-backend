export const DEFAULT_GRADE_UNLOCK_WINDOW_DAYS = 60;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface AcademicPeriod {
  academicYear: string;
  semester: 1 | 2;
}

export interface GradeSubmissionUnlockInput extends AcademicPeriod {
  submittedAt: Date | string;
}

export const ACADEMIC_YEAR_PATTERN = /^\d{4}\/\d{4}$/;

export const isValidAcademicYear = (value: unknown): value is string => {
  if (typeof value !== 'string' || !ACADEMIC_YEAR_PATTERN.test(value)) return false;
  const [startYear, endYear] = value.split('/').map(Number);
  return endYear === startYear + 1;
};

export const requireGradeAcademicPeriod = (
  academicYear: unknown,
  semester: unknown
): AcademicPeriod => {
  if (!isValidAcademicYear(academicYear) || !Number.isInteger(semester) || (semester !== 1 && semester !== 2)) {
    const error = new Error(
      'A valid academicYear (YYYY/YYYY consecutive years) and semester (1 or 2) are required.'
    ) as Error & { statusCode: number; code: string };
    error.statusCode = 400;
    error.code = 'INVALID_ACADEMIC_PERIOD';
    throw error;
  }

  return { academicYear, semester };
};

const getAddisAbabaDateParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Addis_Ababa',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);

  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((item) => item.type === type)?.value);

  return { year: part('year'), month: part('month'), day: part('day') };
};

/**
 * Mirrors the frontend academic calendar:
 * Semester 1 is Sep 11-Jan 31; Semester 2 is Feb 1-Sep 10.
 */
export const getCurrentAcademicPeriod = (now = new Date()): AcademicPeriod => {
  const { year, month, day } = getAddisAbabaDateParts(now);
  const academicStartYear = month > 9 || (month === 9 && day >= 11) ? year : year - 1;
  const semester: 1 | 2 = (month > 9 || (month === 9 && day >= 11) || month === 1) ? 1 : 2;

  return {
    academicYear: `${academicStartYear}/${academicStartYear + 1}`,
    semester,
  };
};

export const getGradeUnlockWindowDays = () => {
  const configured = Number.parseInt(process.env.GRADE_SUBMISSION_UNLOCK_DAYS || '', 10);
  return Number.isInteger(configured) && configured > 0 && configured <= 365
    ? configured
    : DEFAULT_GRADE_UNLOCK_WINDOW_DAYS;
};

export const canUnlockGradeSubmission = (
  submission: GradeSubmissionUnlockInput,
  now = new Date(),
  unlockWindowDays = getGradeUnlockWindowDays()
) => {
  const activePeriod = getCurrentAcademicPeriod(now);
  if (
    submission.academicYear !== activePeriod.academicYear
    || Number(submission.semester) !== activePeriod.semester
  ) {
    return false;
  }

  const submittedAt = new Date(submission.submittedAt).getTime();
  const ageMs = now.getTime() - submittedAt;
  return Number.isFinite(submittedAt) && ageMs >= 0 && ageMs <= unlockWindowDays * DAY_MS;
};

import {
  bulkEnterGradesSchema,
  enterGradeSchema,
  gradeSubmissionSchema,
} from '../shared/teacherGradeSchemas';

const studentId = '00000000-0000-4000-8000-000000000001';
const courseId = '00000000-0000-4000-8000-000000000002';

const validPayloads = [
  {
    schema: enterGradeSchema,
    payload: {
      studentId,
      courseId,
      type: 'quiz-1',
      score: 8,
      total: 10,
      academicYear: '2025/2026',
      semester: 2,
    },
  },
  {
    schema: bulkEnterGradesSchema,
    payload: {
      courseId,
      academicYear: '2025/2026',
      semester: 2,
      grades: [{ studentId, type: 'quiz-1', score: 8, total: 10 }],
    },
  },
  {
    schema: gradeSubmissionSchema,
    payload: {
      courseId,
      submissionType: 'quiz-1',
      academicYear: '2025/2026',
      semester: 2,
    },
  },
];

describe('teacher grade mutation validation', () => {
  it.each(validPayloads)('accepts an exact academic period', ({ schema, payload }) => {
    expect(schema.validate(payload).error).toBeUndefined();
  });

  it.each(validPayloads)('rejects a missing academic period', ({ schema, payload }) => {
    const { academicYear: _academicYear, semester: _semester, ...withoutPeriod } = payload;
    const error = schema.validate(withoutPeriod, { abortEarly: false }).error;

    expect(error?.details.map(detail => detail.path[0])).toEqual(
      expect.arrayContaining(['academicYear', 'semester'])
    );
  });

  it.each(validPayloads)('rejects malformed, non-consecutive, and loosely typed periods', ({ schema, payload }) => {
    expect(schema.validate({ ...payload, academicYear: '2025-2027' }).error).toBeDefined();
    expect(schema.validate({ ...payload, academicYear: '2025/2027' }).error).toBeDefined();
    expect(schema.validate({ ...payload, semester: '2' }).error).toBeDefined();
    expect(schema.validate({ ...payload, semester: 3 }).error).toBeDefined();
  });

  it('rejects malformed assessment component identifiers', () => {
    const payload = validPayloads[2].payload;
    expect(gradeSubmissionSchema.validate({ ...payload, submissionType: ' final ' }).error).toBeDefined();
    expect(gradeSubmissionSchema.validate({ ...payload, submissionType: 'final exam' }).error).toBeDefined();
  });
});

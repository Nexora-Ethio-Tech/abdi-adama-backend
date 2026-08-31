import Joi from 'joi';
import { ACADEMIC_YEAR_PATTERN, isValidAcademicYear } from './gradeSubmissionPolicy';

export const gradeAcademicYearSchema = Joi.string()
  .pattern(ACADEMIC_YEAR_PATTERN)
  .custom((value, helpers) => isValidAcademicYear(value) ? value : helpers.error('any.invalid'))
  .required()
  .messages({
    'string.pattern.base': 'academicYear must use YYYY/YYYY format',
    'any.invalid': 'academicYear must contain consecutive years, for example 2025/2026',
  });

export const gradeSemesterSchema = Joi.number().strict().integer().valid(1, 2).required();

export const assessmentComponentSchema = Joi.string()
  .min(1)
  .max(30)
  .pattern(/^[A-Za-z0-9][A-Za-z0-9_-]*$/)
  .required();

export const enterGradeSchema = Joi.object({
  studentId: Joi.string().uuid().required(),
  courseId: Joi.string().uuid().required(),
  type: assessmentComponentSchema,
  score: Joi.number().min(0).required(),
  total: Joi.number().positive().required(),
  weight: Joi.string().allow(''),
  academicYear: gradeAcademicYearSchema,
  semester: gradeSemesterSchema,
});

export const bulkEnterGradesSchema = Joi.object({
  courseId: Joi.string().uuid().required(),
  academicYear: gradeAcademicYearSchema,
  semester: gradeSemesterSchema,
  grades: Joi.array().items(
    Joi.object({
      studentId: Joi.string().uuid().required(),
      type: assessmentComponentSchema,
      score: Joi.number().min(0).required(),
      total: Joi.number().positive().required(),
      weight: Joi.string().allow('').optional(),
    })
  ).min(1).required(),
});

export const gradeSubmissionSchema = Joi.object({
  courseId: Joi.string().uuid().required(),
  submissionType: assessmentComponentSchema,
  academicYear: gradeAcademicYearSchema,
  semester: gradeSemesterSchema,
  sectionId: Joi.string().uuid().optional(),
  subjectId: Joi.string().uuid().optional(),
});

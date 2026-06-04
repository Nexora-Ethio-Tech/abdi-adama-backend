import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: error.details.map(d => d.message)
        }
      });
      return;
    }

    next();
  };
};

export const schemas = {
  login: Joi.object({
    email: Joi.string().trim().required().messages({
      'string.empty': 'Email or Digital ID is required',
      'any.required': 'Email or Digital ID is required'
    }),
    password: Joi.string().required()
  }),

  createPendingApplication: Joi.object({
    name: Joi.string().trim().min(2).max(150).required(),
    digital_id: Joi.string().allow('').optional(),
    dob: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow('').optional(),  // Accept ISO date strings (YYYY-MM-DD) from FormData
    gender: Joi.string().allow('').optional(),
    parentName: Joi.string().trim().min(2).max(150).required(),
    parentPhone: Joi.string().required(),
    email: Joi.alternatives().try(
      Joi.string().email(),
      Joi.string().allow('').length(0)
    ).optional(),  // Accept valid email or empty string
    address: Joi.string().trim().allow('').optional(),
    previousSchool: Joi.string().trim().allow('').optional(),
    grade: Joi.string().required(),
    feeStatus: Joi.string().allow('').optional(),
    bloodGroup: Joi.string().allow('').optional(),
    allergies: Joi.string().allow('').optional(),
    chronicConditions: Joi.string().allow('').optional(),
    medications: Joi.string().allow('').optional(),
    notes: Joi.string().allow('').optional()
  }).unknown(true),  // Allow transcript field from multer

  createUser: Joi.object({
    name: Joi.string().min(2).max(150).required(),
    email: Joi.string().email().required(),
    role: Joi.string().valid('teacher', 'student', 'parent', 'finance-clerk', 'driver', 'librarian', 'clinic-admin').required(),
    branchId: Joi.string().uuid().optional(),
    password: Joi.string().min(8).optional(),
    grade: Joi.string().optional(),
    staffProfile: Joi.object().unknown(true).optional()
  }),

  // Schema for dedicated admin creation endpoints (no role field needed)
  createAdminUser: Joi.object({
    name: Joi.string().min(2).max(150).required(),
    email: Joi.string().email().required(),
    branchId: Joi.string().uuid().allow(null, '').optional(),
    password: Joi.string().min(8).optional(),
    profileImage: Joi.string().dataUri().required()
  }),

  updateUserStatus: Joi.object({
    status: Joi.string().valid('Pending', 'Approved', 'Revoked').required()
  }),

  updateUser: Joi.object({
    name: Joi.string().min(2).max(150).optional(),
    email: Joi.string().email().optional(),
    grade: Joi.string().optional(),
    parentPhone: Joi.string().optional()
  }),

  assignStudentToClass: Joi.object({
    studentId: Joi.string().uuid().required(),
    classId: Joi.string().uuid().required()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string()
      .min(5)
      .pattern(/[A-Z]/, 'uppercase letter')
      .pattern(/[a-z]/, 'lowercase letter')
      .pattern(/[0-9]/, 'number')
      .required()
      .messages({
        'string.min': 'New password must be at least 5 characters long',
        'string.pattern.name': 'New password must contain at least one {#name}',
      })
  })
};

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
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  createUser: Joi.object({
    name: Joi.string().min(2).max(150).required(),
    email: Joi.string().email().required(),
    role: Joi.string().valid('teacher', 'student', 'parent', 'finance-clerk', 'driver', 'librarian', 'clinic-admin').required(),
    branchId: Joi.string().uuid().optional(),
    password: Joi.string().min(8).optional(),
    grade: Joi.string().optional()
  }),

  updateUserStatus: Joi.object({
    status: Joi.string().valid('Pending', 'Approved', 'Revoked').required()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).required()
  })
};

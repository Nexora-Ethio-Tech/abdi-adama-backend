import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

interface CustomError extends Error {
  statusCode?: number;
  code?: string;
  isJoi?: boolean;
  details?: any;
  detail?: string;
}

export const errorHandler = (err: CustomError, req: Request, res: Response, _next: NextFunction): void => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  if (err.isJoi) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.details
      }
    });
    return;
  }

  if (err.code && err.code.startsWith('23')) {
    res.status(409).json({
      success: false,
      error: {
        code: 'DATABASE_CONFLICT',
        message: 'Database constraint violation',
        details: err.detail || err.message
      }
    });
    return;
  }

  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred'
    }
  });
};

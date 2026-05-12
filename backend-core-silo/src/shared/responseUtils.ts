import { Response } from 'express';

/**
 * Standardized success response.
 */
export const sendSuccess = (
  res: Response,
  data: any,
  message: string = 'Success',
  statusCode: number = 200
) => {
  return res.status(statusCode).json({
    status: 'success',
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Standardized error response.
 * Uses the "error" key so the frontend can display it as a Toast notification.
 */
export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 400,
  detail?: string
) => {
  return res.status(statusCode).json({
    status: 'error',
    error: message,          // Frontend toast reads the "error" key
    ...(detail ? { detail } : {}),
    timestamp: new Date().toISOString(),
  });
};

/**
 * Parses pagination query params with safe defaults.
 */
export const getPagination = (query: any) => {
  const page   = Math.max(1, parseInt(query.page  as string) || 1);
  const limit  = Math.min(100, Math.max(1, parseInt(query.limit as string) || 20));
  const offset = (page - 1) * limit;
  return { limit, offset, page };
};

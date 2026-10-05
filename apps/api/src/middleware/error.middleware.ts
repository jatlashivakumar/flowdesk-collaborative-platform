import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { logger } from '../config/logger';
import { env } from '../config/env';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
    });
  }

  // Prisma unique constraint violation
  if ((err as any).code === 'P2002') {
    const field = (err as any).meta?.target?.[0] ?? 'field';
    return res.status(409).json({ success: false, message: `${field} already exists`, code: 'DUPLICATE' });
  }

  // Prisma record not found
  if ((err as any).code === 'P2025') {
    return res.status(404).json({ success: false, message: 'Record not found', code: 'NOT_FOUND' });
  }

  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack, url: req.url });

  return res.status(500).json({
    success: false,
    message: env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
    code: 'INTERNAL_ERROR',
    ...(env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

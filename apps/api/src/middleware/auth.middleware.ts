import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/tokens';
import { AppError } from '../utils/AppError';
import { prisma } from '../config/db';
import { hasPermission } from '@flowdesk/shared-types';

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(AppError.unauthorized());
  const token = header.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.userId;
    req.userEmail = payload.email;
    next();
  } catch {
    next(AppError.unauthorized('Token expired or invalid'));
  }
}

export function requireMembership(req: AuthRequest, _res: Response, next: NextFunction) {
  const workspaceId = req.params.workspaceId;
  if (!workspaceId) return next();

  prisma.workspaceMember
    .findUnique({ where: { workspaceId_userId: { workspaceId, userId: req.userId! } } })
    .then((member) => {
      if (!member) return next(AppError.forbidden('Not a member of this workspace'));
      (req as any).membership = member;
      next();
    })
    .catch(next);
}

export function requirePermission(permission: string) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    const membership = (req as any).membership;
    if (!membership) return next(AppError.forbidden());

    const role = membership.role.toLowerCase();
    if (!hasPermission(role, permission)) {
      return next(AppError.forbidden(`Requires permission: ${permission}`));
    }
    next();
  };
}

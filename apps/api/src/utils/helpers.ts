import { Request, Response, NextFunction, RequestHandler } from 'express';

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler =>
  (req, res, next) =>
    fn(req, res, next).catch(next);

export function sendSuccess<T>(res: Response, data: T, message?: string, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data, message });
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  nextCursor: string | null,
  hasMore: boolean
) {
  return res.status(200).json({ success: true, data, nextCursor, hasMore });
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateProjectKey(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return words
      .slice(0, 3)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  }
  return name.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, 'X');
}

export function serializeUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name ?? null,
    avatarUrl: user.avatarUrl ?? null,
    bio: user.bio ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function serializeTask(task: any) {
  return {
    id: task.id,
    projectId: task.projectId,
    workspaceId: task.workspaceId,
    taskNumber: task.taskNumber,
    title: task.title,
    description: task.description ?? null,
    status: task.status.toLowerCase() as any,
    priority: task.priority.toLowerCase() as any,
    labels: task.labels,
    dueDate: task.dueDate?.toISOString() ?? null,
    estimatedHours: task.estimatedHours ?? null,
    version: task.version,
    position: task.position,
    commentCount: task._count?.comments ?? 0,
    assignee: task.assignee ? serializeUser(task.assignee) : null,
    reporter: serializeUser(task.reporter),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export function serializeProject(project: any) {
  return {
    id: project.id,
    workspaceId: project.workspaceId,
    name: project.name,
    key: project.key,
    description: project.description ?? null,
    color: project.color,
    icon: project.icon ?? null,
    isArchived: project.isArchived,
    taskCount: project._count?.tasks ?? 0,
    createdAt: project.createdAt.toISOString(),
  };
}

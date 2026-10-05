import { Response } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../utils/AppError';
import { asyncHandler, sendSuccess, serializeTask } from '../utils/helpers';
import { enqueueNotification } from '../services/queue.service';
import type { AuthRequest } from '../middleware/auth.middleware';

const taskInclude = {
  assignee: true,
  reporter: true,
  _count: { select: { comments: true } },
};

export const createTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { projectId, workspaceId } = req.params;
  const { title, description, status, priority, assigneeId, dueDate, labels, estimatedHours } = req.body;

  // Atomic task number generation using raw SQL increment
  const project = await prisma.project.update({
    where: { id: projectId },
    data: { nextTaskNumber: { increment: 1 } },
    select: { nextTaskNumber: true },
  });
  const taskNumber = project.nextTaskNumber - 1;

  const task = await prisma.task.create({
    data: {
      projectId,
      workspaceId,
      taskNumber,
      title,
      description,
      status: (status ?? 'backlog').toUpperCase() as any,
      priority: (priority ?? 'no_priority').toUpperCase() as any,
      assigneeId: assigneeId ?? null,
      reporterId: req.userId!,
      dueDate: dueDate ? new Date(dueDate) : null,
      labels: labels ?? [],
      estimatedHours: estimatedHours ?? null,
      position: Date.now(),
    },
    include: taskInclude,
  });

  const serialized = serializeTask(task);

  // Broadcast via socket
  const io = (req as any).app.get('io');
  io?.to(workspaceId).emit('task:created', serialized);

  // Notify assignee
  if (assigneeId && assigneeId !== req.userId) {
    const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
    const reporter = await prisma.user.findUnique({ where: { id: req.userId } });
    if (assignee) {
      await enqueueNotification({
        type: 'task_assigned',
        userId: assigneeId,
        workspaceId,
        message: `${reporter?.name ?? reporter?.username} assigned you: ${title}`,
        resourceId: task.id,
        emailTo: assignee.email,
        emailPayload: {
          assigneeName: assignee.name ?? assignee.username,
          taskTitle: title,
        },
      });
    }
  }

  sendSuccess(res, serialized, 'Task created', 201);
});

export const getTasks = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { projectId, workspaceId } = req.params;
  const { status, assigneeId, cursor, limit = '50' } = req.query as any;

  const where: any = { projectId, workspaceId };
  if (status) where.status = status.toUpperCase();
  if (assigneeId) where.assigneeId = assigneeId;

  const take = parseInt(limit);
  const tasks = await prisma.task.findMany({
    where,
    include: taskInclude,
    orderBy: [{ status: 'asc' }, { position: 'asc' }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = tasks.length > take;
  const data = tasks.slice(0, take).map(serializeTask);
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  res.json({ success: true, data, nextCursor, hasMore });
});

export const getTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const task = await prisma.task.findFirst({
    where: { id: req.params.taskId, projectId: req.params.projectId },
    include: taskInclude,
  });
  if (!task) throw AppError.notFound('Task not found');
  sendSuccess(res, serializeTask(task));
});

export const updateTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { taskId, projectId, workspaceId } = req.params;
  const { expectedVersion, ...fields } = req.body;

  // Optimistic concurrency control
  const current = await prisma.task.findFirst({
    where: { id: taskId, projectId },
    select: { version: true },
  });
  if (!current) throw AppError.notFound('Task not found');
  if (current.version !== expectedVersion) {
    throw AppError.conflict('Task was modified by someone else. Please refresh.', 'VERSION_CONFLICT');
  }

  const updateData: any = { version: { increment: 1 } };
  if (fields.title !== undefined) updateData.title = fields.title;
  if (fields.description !== undefined) updateData.description = fields.description;
  if (fields.status !== undefined) updateData.status = fields.status.toUpperCase();
  if (fields.priority !== undefined) updateData.priority = fields.priority.toUpperCase();
  if (fields.assigneeId !== undefined) updateData.assigneeId = fields.assigneeId;
  if (fields.dueDate !== undefined) updateData.dueDate = fields.dueDate ? new Date(fields.dueDate) : null;
  if (fields.labels !== undefined) updateData.labels = fields.labels;
  if (fields.estimatedHours !== undefined) updateData.estimatedHours = fields.estimatedHours;

  const task = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
    include: taskInclude,
  });

  const serialized = serializeTask(task);
  const io = (req as any).app.get('io');
  io?.to(workspaceId).emit('task:updated', serialized);

  sendSuccess(res, serialized, 'Task updated');
});

export const deleteTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { taskId, projectId, workspaceId } = req.params;
  const task = await prisma.task.findFirst({ where: { id: taskId, projectId } });
  if (!task) throw AppError.notFound('Task not found');

  await prisma.task.delete({ where: { id: taskId } });

  const io = (req as any).app.get('io');
  io?.to(workspaceId).emit('task:deleted', { taskId, projectId });

  sendSuccess(res, null, 'Task deleted');
});

export const addComment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { taskId, projectId, workspaceId } = req.params;
  const { body } = req.body;

  const task = await prisma.task.findFirst({ where: { id: taskId, projectId } });
  if (!task) throw AppError.notFound('Task not found');

  const comment = await prisma.comment.create({
    data: { taskId, authorId: req.userId!, body },
    include: { author: true },
  });

  // Notify task assignee
  if (task.assigneeId && task.assigneeId !== req.userId) {
    const commenter = await prisma.user.findUnique({ where: { id: req.userId } });
    await enqueueNotification({
      type: 'task_commented',
      userId: task.assigneeId,
      workspaceId,
      message: `${commenter?.name ?? commenter?.username} commented on a task you're assigned to`,
      resourceId: taskId,
    });
  }

  // Emit updated task
  const updatedTask = await prisma.task.findUnique({
    where: { id: taskId },
    include: taskInclude,
  });
  const io = (req as any).app.get('io');
  if (updatedTask) io?.to(workspaceId).emit('task:updated', serializeTask(updatedTask));

  sendSuccess(res, {
    id: comment.id,
    taskId: comment.taskId,
    body: comment.body,
    author: comment.author,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  }, 'Comment added', 201);
});

export const getComments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const comments = await prisma.comment.findMany({
    where: { taskId: req.params.taskId },
    include: { author: true },
    orderBy: { createdAt: 'asc' },
  });
  sendSuccess(res, comments.map((c) => ({
    id: c.id, taskId: c.taskId, body: c.body,
    author: c.author, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString(),
  })));
});

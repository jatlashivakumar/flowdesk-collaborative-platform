import { Server, Socket } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from '@flowdesk/shared-types';
import { verifyAccessToken } from '../utils/tokens';
import { prisma } from '../config/db';
import { logger } from '../config/logger';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

const typingUsers = new Map<string, Map<string, ReturnType<typeof setTimeout>>>();

export function initSocket(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  // Auth middleware
  io.use(async (socket: any, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = verifyAccessToken(token);
      socket.userId = payload.userId;
      // Auto-join personal room
      socket.join(`user:${payload.userId}`);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: TypedSocket & { userId: string }) => {
    logger.info(`[Socket] Connected: ${socket.id} (user: ${socket.userId})`);

    socket.on('room:join', async (workspaceId: string) => {
      // Verify membership before joining room
      const member = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: socket.userId } },
      });
      if (member) {
        socket.join(workspaceId);
        logger.debug(`[Socket] ${socket.userId} joined room ${workspaceId}`);
      } else {
        socket.emit('error', { message: 'Not a member of this workspace' });
      }
    });

    socket.on('room:leave', (workspaceId: string) => {
      socket.leave(workspaceId);
    });

    socket.on('task:move', async ({ taskId, toStatus, toIndex }) => {
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (!task) return;

      const updated = await prisma.task.update({
        where: { id: taskId },
        data: {
          status: toStatus.toUpperCase() as any,
          position: toIndex,
          version: { increment: 1 },
        },
        include: {
          assignee: true,
          reporter: true,
          _count: { select: { comments: true } },
        },
      });

      const { serializeTask } = await import('../utils/helpers');
      io.to(task.workspaceId).emit('task:updated', serializeTask(updated));
    });

    socket.on('typing:start', ({ taskId }) => {
      if (!typingUsers.has(taskId)) typingUsers.set(taskId, new Map());
      const taskMap = typingUsers.get(taskId)!;

      if (taskMap.has(socket.userId)) clearTimeout(taskMap.get(socket.userId)!);
      const timer = setTimeout(() => {
        taskMap.delete(socket.userId);
        broadcastTyping(io, taskId);
      }, 3000);
      taskMap.set(socket.userId, timer);
      broadcastTyping(io, taskId);
    });

    socket.on('typing:stop', ({ taskId }) => {
      const taskMap = typingUsers.get(taskId);
      if (taskMap) {
        clearTimeout(taskMap.get(socket.userId)!);
        taskMap.delete(socket.userId);
        broadcastTyping(io, taskId);
      }
    });

    socket.on('disconnect', () => {
      logger.info(`[Socket] Disconnected: ${socket.id}`);
    });
  });
}

async function broadcastTyping(io: any, taskId: string) {
  const taskMap = typingUsers.get(taskId);
  if (!taskMap) return;
  const userIds = Array.from(taskMap.keys());
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, username: true },
  });
  io.emit('typing:update', { taskId, users });
}

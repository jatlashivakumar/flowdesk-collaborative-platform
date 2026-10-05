import { Queue, Worker, Job } from 'bullmq';
import { redisForBull } from '../config/redis';
import { prisma } from '../config/db';
import { emailService } from './email.service';
import { logger } from '../config/logger';
import { env } from '../config/env';

// ─── Job types ───────────────────────────────────────────────────────────────

export interface NotificationJob {
  type: 'task_assigned' | 'task_commented' | 'task_due' | 'member_invited' | 'mention';
  userId: string;
  workspaceId: string;
  message: string;
  resourceId?: string;
  emailTo?: string;
  emailPayload?: Record<string, string>;
}

// ─── Queues ──────────────────────────────────────────────────────────────────

export const notificationQueue = new Queue<NotificationJob>('notifications', {
  connection: redisForBull,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

// ─── Worker ──────────────────────────────────────────────────────────────────

let notificationWorker: Worker | null = null;

export function startWorkers(io: any) {
  notificationWorker = new Worker<NotificationJob>(
    'notifications',
    async (job: Job<NotificationJob>) => {
      const { type, userId, workspaceId, message, resourceId, emailTo, emailPayload } = job.data;

      // 1. Persist to DB
      const notification = await prisma.notification.create({
        data: {
          userId,
          workspaceId,
          type: type.toUpperCase() as any,
          message,
          resourceId: resourceId ?? null,
        },
      });

      // 2. Emit via Socket.IO to personal room
      io.to(`user:${userId}`).emit('notification:new', {
        id: notification.id,
        type,
        message,
        read: false,
        resourceId: resourceId ?? null,
        createdAt: notification.createdAt.toISOString(),
      });

      // 3. Send email
      if (emailTo && emailPayload) {
        if (type === 'task_assigned') {
          await emailService.sendTaskAssigned(
            emailTo,
            emailPayload.assigneeName,
            emailPayload.taskTitle,
            `${env.CLIENT_URL}/tasks/${resourceId}`
          );
        } else if (type === 'member_invited') {
          await emailService.sendInvite(
            emailTo,
            emailPayload.workspaceName,
            emailPayload.inviterName,
            `${env.CLIENT_URL}`
          );
        }
      }

      logger.info(`[Queue] Notification processed: ${type} for user ${userId}`);
    },
    { connection: redisForBull, concurrency: 5 }
  );

  notificationWorker.on('failed', (job, err) => {
    logger.error(`[Queue] Job ${job?.id} failed:`, err);
  });

  logger.info('✅ BullMQ workers started');
}

export async function enqueueNotification(data: NotificationJob) {
  await notificationQueue.add('notify', data, { priority: 1 });
}

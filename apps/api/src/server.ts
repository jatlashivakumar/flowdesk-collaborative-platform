import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app';
import { env } from './config/env';
import { connectDB } from './config/db';
import { redis } from './config/redis';
import { initSocket } from './sockets/io';
import { startWorkers } from './services/queue.service';
import { logger } from './config/logger';
import type { ServerToClientEvents, ClientToServerEvents } from '@flowdesk/shared-types';

async function bootstrap() {
  await connectDB();
  await redis.ping();

  const httpServer = createServer(app);

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: env.CLIENT_URL, credentials: true },
    transports: ['websocket', 'polling'],
  });

  app.set('io', io);
  initSocket(io as any);
  startWorkers(io);

  httpServer.listen(env.PORT, () => {
    logger.info(`🚀 FlowDesk API running on http://localhost:${env.PORT}`);
    logger.info(`   Environment: ${env.NODE_ENV}`);
    logger.info(`   Client: ${env.CLIENT_URL}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down...');
    httpServer.close();
    await redis.quit();
    process.exit(0);
  });
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});

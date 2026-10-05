import { PrismaClient } from '@prisma/client';
import { env } from './env';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function connectDB(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✅ PostgreSQL connected via Prisma');
  } catch (err) {
    console.error('❌ DB connection failed:', err);
    process.exit(1);
  }
}

export async function disconnectDB(): Promise<void> {
  await prisma.$disconnect();
}

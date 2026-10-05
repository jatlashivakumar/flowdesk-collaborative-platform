import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Demo users
  const passwordHash = await bcrypt.hash('Password123', 12);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@flowdesk.app' },
    update: {},
    create: { email: 'alice@flowdesk.app', username: 'alice', passwordHash, name: 'Alice Johnson' },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@flowdesk.app' },
    update: {},
    create: { email: 'bob@flowdesk.app', username: 'bob', passwordHash, name: 'Bob Smith' },
  });

  const carol = await prisma.user.upsert({
    where: { email: 'carol@flowdesk.app' },
    update: {},
    create: { email: 'carol@flowdesk.app', username: 'carol', passwordHash, name: 'Carol White' },
  });

  // Demo workspace
  const existing = await prisma.workspace.findUnique({ where: { slug: 'demo-workspace' } });
  if (!existing) {
    const workspace = await prisma.workspace.create({
      data: {
        name: 'Demo Workspace',
        slug: 'demo-workspace',
        members: {
          create: [
            { userId: alice.id, role: 'OWNER' },
            { userId: bob.id, role: 'MEMBER' },
            { userId: carol.id, role: 'VIEWER' },
          ],
        },
      },
    });

    // Demo project
    const project = await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        name: 'FlowDesk App',
        key: 'FD',
        description: 'Building the FlowDesk application itself',
        color: '#6366f1',
        nextTaskNumber: 7,
      },
    });

    // Demo tasks
    const tasks = [
      { title: 'Set up authentication', status: 'DONE', priority: 'HIGH', taskNumber: 1, assigneeId: alice.id, labels: ['backend'] },
      { title: 'Design Kanban board UI', status: 'DONE', priority: 'MEDIUM', taskNumber: 2, assigneeId: bob.id, labels: ['frontend', 'design'] },
      { title: 'Implement real-time sync', status: 'IN_PROGRESS', priority: 'HIGH', taskNumber: 3, assigneeId: alice.id, labels: ['backend', 'websocket'] },
      { title: 'Add drag and drop support', status: 'IN_PROGRESS', priority: 'MEDIUM', taskNumber: 4, assigneeId: bob.id, labels: ['frontend'] },
      { title: 'Write API documentation', status: 'TODO', priority: 'LOW', taskNumber: 5, labels: ['docs'] },
      { title: 'Set up Docker deployment', status: 'BACKLOG', priority: 'MEDIUM', taskNumber: 6, labels: ['devops'] },
    ];

    for (const t of tasks) {
      await prisma.task.create({
        data: {
          ...t,
          projectId: project.id,
          workspaceId: workspace.id,
          reporterId: alice.id,
          position: t.taskNumber * 1000,
          status: t.status as any,
          priority: t.priority as any,
        },
      });
    }

    console.log(`✅ Created workspace: ${workspace.name}`);
    console.log(`✅ Created project: ${project.name} with ${tasks.length} tasks`);
  }

  console.log('');
  console.log('🎉 Seed complete! Demo accounts:');
  console.log('   alice@flowdesk.app / Password123  (owner)');
  console.log('   bob@flowdesk.app   / Password123  (member)');
  console.log('   carol@flowdesk.app / Password123  (viewer)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

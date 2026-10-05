import { Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../utils/AppError';
import { asyncHandler, sendSuccess, slugify, serializeUser } from '../utils/helpers';
import { PLAN_LIMITS } from '../config/plans';
import { enqueueNotification } from '../services/queue.service';
import type { AuthRequest } from '../middleware/auth.middleware';

export const createWorkspace = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  let slug = slugify(name);

  const exists = await prisma.workspace.findUnique({ where: { slug } });
  if (exists) slug = `${slug}-${Date.now().toString(36)}`;

  const workspace = await prisma.workspace.create({
    data: {
      name,
      slug,
      memberLimit: PLAN_LIMITS.FREE.memberLimit,
      members: {
        create: { userId: req.userId!, role: 'OWNER' },
      },
    },
  });

  sendSuccess(res, {
    id: workspace.id, name: workspace.name, slug: workspace.slug,
    logoUrl: null, plan: 'free', memberLimit: workspace.memberLimit,
    createdAt: workspace.createdAt.toISOString(),
  }, 'Workspace created', 201);
});

export const getWorkspaces = asyncHandler(async (req: AuthRequest, res: Response) => {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: req.userId },
    include: { workspace: true },
    orderBy: { joinedAt: 'desc' },
  });

  const data = memberships.map((m) => ({
    id: m.workspace.id, name: m.workspace.name, slug: m.workspace.slug,
    logoUrl: m.workspace.logoUrl, plan: m.workspace.plan.toLowerCase(),
    memberLimit: m.workspace.memberLimit, createdAt: m.workspace.createdAt.toISOString(),
    myRole: m.role.toLowerCase(),
  }));

  sendSuccess(res, data);
});

export const getWorkspace = asyncHandler(async (req: AuthRequest, res: Response) => {
  const ws = await prisma.workspace.findUnique({ where: { id: req.params.workspaceId } });
  if (!ws) throw AppError.notFound('Workspace not found');
  sendSuccess(res, {
    id: ws.id, name: ws.name, slug: ws.slug, logoUrl: ws.logoUrl,
    plan: ws.plan.toLowerCase(), memberLimit: ws.memberLimit, createdAt: ws.createdAt.toISOString(),
  });
});

export const getMembers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: req.params.workspaceId },
    include: { user: true },
    orderBy: { joinedAt: 'asc' },
  });

  sendSuccess(res, members.map((m) => ({
    id: m.id, role: m.role.toLowerCase(), joinedAt: m.joinedAt.toISOString(),
    user: serializeUser(m.user),
  })));
});

export const inviteMember = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const { email, role = 'MEMBER' } = req.body;

  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { _count: { select: { members: true } } },
  });
  if (!ws) throw AppError.notFound();

  if (ws._count.members >= ws.memberLimit) {
    throw AppError.badRequest(`Member limit (${ws.memberLimit}) reached. Upgrade your plan.`);
  }

  const invitedUser = await prisma.user.findUnique({ where: { email } });
  if (!invitedUser) throw AppError.notFound('No account with that email. Ask them to register first.');

  const existing = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: invitedUser.id } },
  });
  if (existing) throw AppError.conflict('User is already a member');

  const member = await prisma.workspaceMember.create({
    data: { workspaceId, userId: invitedUser.id, role: role.toUpperCase() as any },
    include: { user: true },
  });

  const inviter = await prisma.user.findUnique({ where: { id: req.userId } });
  await enqueueNotification({
    type: 'member_invited',
    userId: invitedUser.id,
    workspaceId,
    message: `${inviter?.name ?? inviter?.username} invited you to ${ws.name}`,
    emailTo: invitedUser.email,
    emailPayload: {
      workspaceName: ws.name,
      inviterName: inviter?.name ?? inviter?.username ?? 'Someone',
    },
  });

  sendSuccess(res, { id: member.id, role: member.role.toLowerCase(), joinedAt: member.joinedAt.toISOString(), user: serializeUser(member.user) }, 'Member invited', 201);
});

export const removeMember = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, memberId } = req.params;
  const member = await prisma.workspaceMember.findUnique({ where: { id: memberId } });
  if (!member || member.workspaceId !== workspaceId) throw AppError.notFound('Member not found');
  if (member.role === 'OWNER') throw AppError.forbidden('Cannot remove the workspace owner');
  await prisma.workspaceMember.delete({ where: { id: memberId } });
  sendSuccess(res, null, 'Member removed');
});

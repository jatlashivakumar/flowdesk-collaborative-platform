import { Response } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../utils/AppError';
import { asyncHandler, sendSuccess, serializeProject, generateProjectKey } from '../utils/helpers';
import type { AuthRequest } from '../middleware/auth.middleware';

export const createProject = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const { name, key, description, color, icon } = req.body;

  const projectKey = key ?? generateProjectKey(name);

  const existing = await prisma.project.findUnique({
    where: { workspaceId_key: { workspaceId, key: projectKey } },
  });
  if (existing) throw AppError.conflict(`Project key "${projectKey}" already exists`);

  const project = await prisma.project.create({
    data: { workspaceId, name, key: projectKey, description, color, icon },
    include: { _count: { select: { tasks: true } } },
  });

  sendSuccess(res, serializeProject(project), 'Project created', 201);
});

export const getProjects = asyncHandler(async (req: AuthRequest, res: Response) => {
  const projects = await prisma.project.findMany({
    where: { workspaceId: req.params.workspaceId, isArchived: false },
    include: { _count: { select: { tasks: true } } },
    orderBy: { createdAt: 'desc' },
  });
  sendSuccess(res, projects.map(serializeProject));
});

export const getProject = asyncHandler(async (req: AuthRequest, res: Response) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.projectId, workspaceId: req.params.workspaceId },
    include: { _count: { select: { tasks: true } } },
  });
  if (!project) throw AppError.notFound('Project not found');
  sendSuccess(res, serializeProject(project));
});

export const archiveProject = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { projectId, workspaceId } = req.params;
  const project = await prisma.project.findFirst({ where: { id: projectId, workspaceId } });
  if (!project) throw AppError.notFound('Project not found');
  await prisma.project.update({ where: { id: projectId }, data: { isArchived: true } });
  sendSuccess(res, null, 'Project archived');
});

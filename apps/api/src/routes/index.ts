import { Router } from 'express';
import { authenticate, requireMembership, requirePermission } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { RegisterSchema, LoginSchema, CreateWorkspaceSchema, CreateProjectSchema, CreateTaskSchema, UpdateTaskSchema } from '@flowdesk/shared-types';
import * as auth from '../controllers/auth.controller';
import * as workspace from '../controllers/workspace.controller';
import * as project from '../controllers/project.controller';
import * as task from '../controllers/task.controller';
import { z } from 'zod';

const router = Router();

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.post('/auth/register', validate(RegisterSchema), auth.register);
router.post('/auth/login', validate(LoginSchema), auth.login);
router.post('/auth/refresh-token', auth.refreshToken);
router.post('/auth/logout', auth.logout);
router.get('/auth/me', authenticate, auth.getMe);
router.patch('/auth/me', authenticate, validate(z.object({ name: z.string().optional(), bio: z.string().optional() })), auth.updateProfile);

// ─── Workspaces ───────────────────────────────────────────────────────────────
router.post('/workspaces', authenticate, validate(CreateWorkspaceSchema), workspace.createWorkspace);
router.get('/workspaces', authenticate, workspace.getWorkspaces);
router.get('/workspaces/:workspaceId', authenticate, requireMembership, workspace.getWorkspace);
router.get('/workspaces/:workspaceId/members', authenticate, requireMembership, workspace.getMembers);
router.post('/workspaces/:workspaceId/members', authenticate, requireMembership, requirePermission('member:invite'), validate(z.object({ email: z.string().email(), role: z.string().optional() })), workspace.inviteMember);
router.delete('/workspaces/:workspaceId/members/:memberId', authenticate, requireMembership, requirePermission('member:remove'), workspace.removeMember);

// ─── Projects ─────────────────────────────────────────────────────────────────
router.post('/workspaces/:workspaceId/projects', authenticate, requireMembership, requirePermission('project:create'), validate(CreateProjectSchema), project.createProject);
router.get('/workspaces/:workspaceId/projects', authenticate, requireMembership, project.getProjects);
router.get('/workspaces/:workspaceId/projects/:projectId', authenticate, requireMembership, project.getProject);
router.delete('/workspaces/:workspaceId/projects/:projectId', authenticate, requireMembership, requirePermission('project:archive'), project.archiveProject);

// ─── Tasks ────────────────────────────────────────────────────────────────────
router.post('/workspaces/:workspaceId/projects/:projectId/tasks', authenticate, requireMembership, requirePermission('task:create'), validate(CreateTaskSchema), task.createTask);
router.get('/workspaces/:workspaceId/projects/:projectId/tasks', authenticate, requireMembership, task.getTasks);
router.get('/workspaces/:workspaceId/projects/:projectId/tasks/:taskId', authenticate, requireMembership, task.getTask);
router.patch('/workspaces/:workspaceId/projects/:projectId/tasks/:taskId', authenticate, requireMembership, requirePermission('task:update'), validate(UpdateTaskSchema), task.updateTask);
router.delete('/workspaces/:workspaceId/projects/:projectId/tasks/:taskId', authenticate, requireMembership, requirePermission('task:delete'), task.deleteTask);
router.post('/workspaces/:workspaceId/projects/:projectId/tasks/:taskId/comments', authenticate, requireMembership, requirePermission('task:comment'), validate(z.object({ body: z.string().min(1) })), task.addComment);
router.get('/workspaces/:workspaceId/projects/:projectId/tasks/:taskId/comments', authenticate, requireMembership, task.getComments);

export default router;

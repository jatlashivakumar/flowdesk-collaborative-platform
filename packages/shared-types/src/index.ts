import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const WorkspaceRole = z.enum(['owner', 'admin', 'member', 'viewer']);
export type WorkspaceRole = z.infer<typeof WorkspaceRole>;

export const TaskStatus = z.enum(['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled']);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const TaskPriority = z.enum(['no_priority', 'urgent', 'high', 'medium', 'low']);
export type TaskPriority = z.infer<typeof TaskPriority>;

export const NotificationType = z.enum(['task_assigned', 'task_commented', 'task_due', 'member_invited', 'mention']);
export type NotificationType = z.infer<typeof NotificationType>;

export const SubscriptionPlan = z.enum(['free', 'pro', 'business']);
export type SubscriptionPlan = z.infer<typeof SubscriptionPlan>;

// ─── User ─────────────────────────────────────────────────────────────────────

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  username: z.string(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  bio: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type User = z.infer<typeof UserSchema>;

export const RegisterSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/, 'lowercase letters, numbers, underscores only'),
  password: z.string().min(8).regex(/[A-Z]/, 'must contain uppercase').regex(/[0-9]/, 'must contain number'),
  name: z.string().min(1).max(100).optional(),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof LoginSchema>;

// ─── Workspace ────────────────────────────────────────────────────────────────

export const WorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logoUrl: z.string().nullable(),
  plan: SubscriptionPlan,
  memberLimit: z.number(),
  createdAt: z.string(),
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

export const WorkspaceMemberSchema = z.object({
  id: z.string(),
  role: WorkspaceRole,
  joinedAt: z.string(),
  user: UserSchema,
});
export type WorkspaceMember = z.infer<typeof WorkspaceMemberSchema>;

export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
});

// ─── Project ──────────────────────────────────────────────────────────────────

export const ProjectSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  key: z.string(),
  description: z.string().nullable(),
  color: z.string(),
  icon: z.string().nullable(),
  isArchived: z.boolean(),
  taskCount: z.number(),
  createdAt: z.string(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  key: z.string().min(2).max(6).regex(/^[A-Z]+$/).optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1'),
  icon: z.string().optional(),
});

// ─── Task ─────────────────────────────────────────────────────────────────────

export const TaskSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  workspaceId: z.string(),
  taskNumber: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  status: TaskStatus,
  priority: TaskPriority,
  labels: z.array(z.string()),
  dueDate: z.string().nullable(),
  estimatedHours: z.number().nullable(),
  version: z.number(),
  position: z.number(),
  commentCount: z.number(),
  assignee: UserSchema.nullable(),
  reporter: UserSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Task = z.infer<typeof TaskSchema>;

export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(10000).optional(),
  status: TaskStatus.default('backlog'),
  priority: TaskPriority.default('no_priority'),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  estimatedHours: z.number().nullable().optional(),
  labels: z.array(z.string()).default([]),
});

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(10000).nullable().optional(),
  status: TaskStatus.optional(),
  priority: TaskPriority.optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  estimatedHours: z.number().nullable().optional(),
  labels: z.array(z.string()).optional(),
  expectedVersion: z.number(),
});

// ─── Comment ──────────────────────────────────────────────────────────────────

export const CommentSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  body: z.string(),
  author: UserSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Comment = z.infer<typeof CommentSchema>;

// ─── Notification ─────────────────────────────────────────────────────────────

export const NotificationSchema = z.object({
  id: z.string(),
  type: NotificationType,
  message: z.string(),
  read: z.boolean(),
  resourceId: z.string().nullable(),
  createdAt: z.string(),
});
export type Notification = z.infer<typeof NotificationSchema>;

// ─── RBAC ─────────────────────────────────────────────────────────────────────

export const PERMISSIONS = {
  owner: [
    'workspace:update', 'workspace:delete',
    'member:invite', 'member:remove', 'member:role:update',
    'project:create', 'project:update', 'project:delete', 'project:archive',
    'task:create', 'task:update', 'task:delete', 'task:comment',
  ],
  admin: [
    'member:invite', 'member:remove',
    'project:create', 'project:update', 'project:delete', 'project:archive',
    'task:create', 'task:update', 'task:delete', 'task:comment',
  ],
  member: [
    'project:create',
    'task:create', 'task:update', 'task:comment',
  ],
  viewer: [],
} as const;

export type Permission = typeof PERMISSIONS[WorkspaceRole][number];

export function hasPermission(role: WorkspaceRole, permission: string): boolean {
  return (PERMISSIONS[role] as readonly string[]).includes(permission);
}

// ─── Socket Events ────────────────────────────────────────────────────────────

export interface ServerToClientEvents {
  'task:created': (task: Task) => void;
  'task:updated': (task: Task) => void;
  'task:deleted': (payload: { taskId: string; projectId: string }) => void;
  'notification:new': (notification: Notification) => void;
  'typing:update': (payload: { taskId: string; users: Pick<User, 'id' | 'name' | 'username'>[] }) => void;
  'member:joined': (member: WorkspaceMember) => void;
  'member:left': (payload: { userId: string }) => void;
  error: (payload: { message: string; code?: string }) => void;
}

export interface ClientToServerEvents {
  'room:join': (workspaceId: string) => void;
  'room:leave': (workspaceId: string) => void;
  'task:move': (payload: { taskId: string; toStatus: TaskStatus; toIndex: number }) => void;
  'typing:start': (payload: { taskId: string }) => void;
  'typing:stop': (payload: { taskId: string }) => void;
}

// ─── API Response wrapper ─────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

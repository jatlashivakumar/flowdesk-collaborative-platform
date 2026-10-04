import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import type { Task, WorkspaceMember, Comment } from '@flowdesk/shared-types';
import { hasPermission } from '@flowdesk/shared-types';
import { useAuthStore } from '@/store/authStore';
import { X, Trash2, Send, Edit2, Check, XCircle, Loader2, Clock, Tag, User } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

const STATUS_OPTIONS = [
  { value: 'backlog', label: 'Backlog', color: '#94a3b8' },
  { value: 'todo', label: 'Todo', color: '#60a5fa' },
  { value: 'in_progress', label: 'In Progress', color: '#f59e0b' },
  { value: 'in_review', label: 'In Review', color: '#a78bfa' },
  { value: 'done', label: 'Done', color: '#34d399' },
  { value: 'cancelled', label: 'Cancelled', color: '#f87171' },
];

const PRIORITY_OPTIONS = [
  { value: 'no_priority', label: 'No priority', emoji: '—' },
  { value: 'urgent', label: 'Urgent', emoji: '🔴' },
  { value: 'high', label: 'High', emoji: '🟠' },
  { value: 'medium', label: 'Medium', emoji: '🟡' },
  { value: 'low', label: 'Low', emoji: '🔵' },
];

interface Props {
  task: Task;
  workspaceId: string;
  projectId: string;
  onClose: () => void;
  onUpdated: (task: Task) => void;
}

export default function TaskDrawer({ task, workspaceId, projectId, onClose, onUpdated }: Props) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [commentBody, setCommentBody] = useState('');

  const { data: members } = useQuery({
    queryKey: ['members', workspaceId],
    queryFn: () => api.get<{ data: WorkspaceMember[] }>(`/workspaces/${workspaceId}/members`).then((r) => r.data.data),
  });

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['comments', task.id],
    queryFn: () => api.get<{ data: Comment[] }>(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${task.id}/comments`).then((r) => r.data.data),
  });

  const myRole = members?.find((m) => m.user.id === user?.id)?.role ?? 'viewer';
  const canEdit = hasPermission(myRole, 'task:update');
  const canDelete = hasPermission(myRole, 'task:delete');

  const updateMutation = useMutation({
    mutationFn: (fields: Record<string, any>) =>
      api.patch<{ data: Task }>(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${task.id}`, {
        ...fields,
        expectedVersion: task.version,
      }).then((r) => r.data.data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      onUpdated(updated);
      toast.success('Updated');
    },
    onError: (e: any) => {
      if (e.response?.data?.code === 'VERSION_CONFLICT') {
        toast.error('Conflict! Someone else edited this task. Please close and reopen.');
      } else {
        toast.error(e.response?.data?.message ?? 'Update failed');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${task.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      toast.success('Task deleted');
      onClose();
    },
    onError: () => toast.error('Delete failed'),
  });

  const commentMutation = useMutation({
    mutationFn: (body: string) =>
      api.post(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${task.id}/comments`, { body }),
    onSuccess: () => {
      setCommentBody('');
      refetchComments();
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      toast.success('Comment added');
    },
    onError: () => toast.error('Failed to add comment'),
  });

  function patch(fields: Record<string, any>) {
    if (!canEdit) return;
    updateMutation.mutate(fields);
  }

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === task.status);
  const currentPriority = PRIORITY_OPTIONS.find((p) => p.value === task.priority);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-40 flex">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="flex-1 bg-black/20"
          onClick={onClose}
        />

        {/* Drawer */}
        <motion.div
          initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="w-full max-w-xl bg-white shadow-2xl border-l border-gray-200 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
            <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
              #{task.taskNumber}
            </span>
            <div className="flex-1" />
            {canDelete && (
              <button
                className="btn-icon text-red-400 hover:text-red-600 hover:bg-red-50"
                onClick={() => { if (confirm('Delete this task?')) deleteMutation.mutate(); }}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button className="btn-icon" onClick={onClose}><X className="w-4 h-4" /></button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="px-5 py-5 space-y-5">
              {/* Title */}
              <div>
                {editingTitle ? (
                  <div className="flex gap-2">
                    <input
                      className="input flex-1 font-semibold text-base"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { patch({ title }); setEditingTitle(false); }
                        if (e.key === 'Escape') { setTitle(task.title); setEditingTitle(false); }
                      }}
                    />
                    <button className="btn-primary p-2" onClick={() => { patch({ title }); setEditingTitle(false); }}>
                      <Check className="w-4 h-4" />
                    </button>
                    <button className="btn-secondary p-2" onClick={() => { setTitle(task.title); setEditingTitle(false); }}>
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 group">
                    <h2 className="text-lg font-semibold text-gray-900 flex-1 leading-snug">{task.title}</h2>
                    {canEdit && (
                      <button
                        className="btn-icon p-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5"
                        onClick={() => setEditingTitle(true)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="label flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentStatus?.color }} />Status</label>
                  <select className="input text-sm" value={task.status}
                    onChange={(e) => canEdit && patch({ status: e.target.value })}
                    disabled={!canEdit}>
                    {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Priority</label>
                  <select className="input text-sm" value={task.priority}
                    onChange={(e) => canEdit && patch({ priority: e.target.value })}
                    disabled={!canEdit}>
                    {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.emoji} {o.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label flex items-center gap-1"><User className="w-3 h-3" />Assignee</label>
                  <select className="input text-sm" value={task.assignee?.id ?? ''}
                    onChange={(e) => canEdit && patch({ assigneeId: e.target.value || null })}
                    disabled={!canEdit}>
                    <option value="">Unassigned</option>
                    {members?.map((m) => (
                      <option key={m.id} value={m.user.id}>{m.user.name ?? m.user.username}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label flex items-center gap-1"><Clock className="w-3 h-3" />Due date</label>
                  <input type="date" className="input text-sm"
                    value={task.dueDate ? task.dueDate.slice(0, 10) : ''}
                    onChange={(e) => canEdit && patch({ dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    disabled={!canEdit} />
                </div>
              </div>

              {/* Labels */}
              {task.labels.length > 0 && (
                <div>
                  <label className="label flex items-center gap-1"><Tag className="w-3 h-3" />Labels</label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {task.labels.map((l) => <span key={l} className="badge-brand">{l}</span>)}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="label">Description</label>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mt-1 min-h-[40px]">
                  {task.description || <span className="text-gray-300 italic text-xs">No description</span>}
                </p>
              </div>

              {/* Reporter + dates */}
              <div className="flex items-center gap-3 text-xs text-gray-400 pt-1 border-t border-gray-100">
                <span>Reported by <span className="font-medium text-gray-500">{task.reporter.name ?? task.reporter.username}</span></span>
                <span>·</span>
                <span>{format(new Date(task.createdAt), 'MMM d, yyyy')}</span>
                {task.estimatedHours && <><span>·</span><span>{task.estimatedHours}h estimated</span></>}
              </div>

              {/* Comments */}
              <div>
                <label className="label">Comments ({task.commentCount})</label>
                <div className="space-y-3 mt-2 mb-4">
                  {comments.map((c) => (
                    <div key={c.id} className="flex gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-indigo-500 flex items-center justify-center text-white font-semibold flex-shrink-0" style={{ fontSize: '10px' }}>
                        {((c.author as any).name ?? (c.author as any).username)?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-gray-700">{(c.author as any).name ?? (c.author as any).username}</span>
                          <span className="text-[10px] text-gray-400">{format(new Date(c.createdAt), 'MMM d, h:mm a')}</span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{c.body}</p>
                      </div>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-xs text-gray-400 italic">No comments yet. Be the first!</p>
                  )}
                </div>

                {/* Add comment */}
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-indigo-500 flex items-center justify-center text-white font-semibold flex-shrink-0" style={{ fontSize: '10px' }}>
                    {(user?.name ?? user?.username)?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 flex gap-2">
                    <input
                      className="input flex-1 text-sm"
                      placeholder="Add a comment… (Enter to send)"
                      value={commentBody}
                      onChange={(e) => setCommentBody(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && commentBody.trim()) commentMutation.mutate(commentBody.trim()); }}
                    />
                    <button
                      className="btn-primary p-2 flex-shrink-0"
                      disabled={!commentBody.trim() || commentMutation.isPending}
                      onClick={() => commentBody.trim() && commentMutation.mutate(commentBody.trim())}
                    >
                      {commentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

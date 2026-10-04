import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import type { Task, WorkspaceMember } from '@flowdesk/shared-types';
import { X, Loader2 } from 'lucide-react';

interface Props {
  workspaceId: string;
  projectId: string;
  onClose: () => void;
}

export default function CreateTaskModal({ workspaceId, projectId, onClose }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: '', description: '', priority: 'no_priority',
    assigneeId: '', dueDate: '', labels: '', estimatedHours: '',
  });

  const { data: members } = useQuery({
    queryKey: ['members', workspaceId],
    queryFn: () => api.get<{ data: WorkspaceMember[] }>(`/workspaces/${workspaceId}/members`).then((r) => r.data.data),
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.post<{ data: Task }>(`/workspaces/${workspaceId}/projects/${projectId}/tasks`, {
        title: form.title,
        description: form.description || undefined,
        priority: form.priority,
        assigneeId: form.assigneeId || null,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        labels: form.labels ? form.labels.split(',').map((l) => l.trim()).filter(Boolean) : [],
        estimatedHours: form.estimatedHours ? parseFloat(form.estimatedHours) : null,
      }).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      toast.success('Task created');
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to create task'),
  });

  const u = (field: string, val: string) => setForm((f) => ({ ...f, [field]: val }));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative card-shadow w-full max-w-lg p-6 z-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900">New task</h2>
            <button onClick={onClose} className="btn-icon"><X className="w-4 h-4" /></button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
            <div className="form-group">
              <label className="label">Title *</label>
              <input className="input" placeholder="What needs to be done?" value={form.title}
                onChange={(e) => u('title', e.target.value)} required autoFocus />
            </div>
            <div className="form-group">
              <label className="label">Description</label>
              <textarea className="input resize-none" rows={3} placeholder="Optional details…"
                value={form.description} onChange={(e) => u('description', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="label">Priority</label>
                <select className="input" value={form.priority} onChange={(e) => u('priority', e.target.value)}>
                  <option value="no_priority">No priority</option>
                  <option value="urgent">🔴 Urgent</option>
                  <option value="high">🟠 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🔵 Low</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label">Assignee</label>
                <select className="input" value={form.assigneeId} onChange={(e) => u('assigneeId', e.target.value)}>
                  <option value="">Unassigned</option>
                  {members?.map((m) => (
                    <option key={m.id} value={m.user.id}>{m.user.name ?? m.user.username}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Due date</label>
                <input type="date" className="input" value={form.dueDate} onChange={(e) => u('dueDate', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="label">Estimate (hours)</label>
                <input type="number" className="input" placeholder="e.g. 4" min="0" step="0.5"
                  value={form.estimatedHours} onChange={(e) => u('estimatedHours', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="label">Labels (comma separated)</label>
              <input className="input" placeholder="bug, frontend, urgent" value={form.labels}
                onChange={(e) => u('labels', e.target.value)} />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" className="btn-primary" disabled={mutation.isPending}>
                {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : 'Create task'}
              </button>
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

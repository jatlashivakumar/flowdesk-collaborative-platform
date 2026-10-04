import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import type { Project } from '@flowdesk/shared-types';
import { Plus, FolderKanban, Archive } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProjectsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', key: '', description: '', color: '#6366f1' });

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: () => api.get<{ data: Project[] }>(`/workspaces/${workspaceId}/projects`).then((r) => r.data.data),
    enabled: !!workspaceId,
  });

  const createMutation = useMutation({
    mutationFn: () => api.post<{ data: Project }>(`/workspaces/${workspaceId}/projects`, {
      name: form.name, key: form.key || undefined, description: form.description || undefined, color: form.color,
    }).then((r) => r.data.data),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['projects', workspaceId] });
      setCreating(false);
      setForm({ name: '', key: '', description: '', color: '#6366f1' });
      navigate(`/w/${workspaceId}/projects/${p.id}`);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed'),
  });

  return (
    <div className="page">
      <div className="max-w-4xl mx-auto">
        <div className="page-header">
          <div>
            <h1 className="page-title">Projects</h1>
            <p className="text-gray-500 text-xs mt-0.5">Manage all your team projects</p>
          </div>
          <button onClick={() => setCreating(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> New project
          </button>
        </div>

        {creating && (
          <motion.form initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="card-shadow p-5 mb-6 space-y-4"
            onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}>
            <h3 className="font-semibold text-gray-900">New project</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="label">Name *</label>
                <input className="input" placeholder="Engineering" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required autoFocus />
              </div>
              <div className="form-group">
                <label className="label">Key (auto-generated if empty)</label>
                <input className="input uppercase" placeholder="ENG" value={form.key} maxLength={6}
                  onChange={(e) => setForm(f => ({ ...f, key: e.target.value.toUpperCase() }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="label">Description</label>
              <textarea className="input resize-none" rows={2} placeholder="What's this project about?" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex items-center gap-3">
              <label className="label mb-0">Color</label>
              <input type="color" value={form.color} onChange={(e) => setForm(f => ({ ...f, color: e.target.value }))} className="w-9 h-9 rounded-lg border border-gray-300 cursor-pointer p-1" />
              <span className="text-xs text-gray-400">{form.color}</span>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create project'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setCreating(false)}>Cancel</button>
            </div>
          </motion.form>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading projects…</div>
        ) : !projects?.length ? (
          <div className="text-center py-20">
            <FolderKanban className="w-14 h-14 text-gray-200 mx-auto mb-4" />
            <p className="font-medium text-gray-500">No projects yet</p>
            <p className="text-xs text-gray-400 mt-1">Create your first project to track work</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p, i) => (
              <motion.button key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/w/${workspaceId}/projects/${p.id}`)}
                className="card p-5 text-left hover:border-brand-300 hover:shadow-md transition-all group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
                    style={{ backgroundColor: p.color }}>{p.key.slice(0, 2)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate text-sm">{p.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{p.key}</p>
                  </div>
                </div>
                {p.description && <p className="text-xs text-gray-500 line-clamp-2 mb-3">{p.description}</p>}
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{p.taskCount} task{p.taskCount !== 1 ? 's' : ''}</span>
                  <span className="text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity font-medium">Open →</span>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

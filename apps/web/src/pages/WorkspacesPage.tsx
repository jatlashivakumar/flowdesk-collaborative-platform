import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import type { Workspace } from '@flowdesk/shared-types';
import { Plus, LogOut, Layers, User, Zap, ChevronRight } from 'lucide-react';

export default function WorkspacesPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => api.get<{ data: Workspace[] }>('/workspaces').then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => api.post<{ data: Workspace }>('/workspaces', { name }).then((r) => r.data.data),
    onSuccess: (ws) => { qc.invalidateQueries({ queryKey: ['workspaces'] }); setCreating(false); setName(''); navigate(`/w/${ws.id}`); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to create workspace'),
  });

  function handleLogout() {
    api.post('/auth/logout').finally(() => { logout(); navigate('/login'); });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-600 rounded-xl flex items-center justify-center shadow-sm">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900">FlowDesk</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/profile" className="btn-icon"><User className="w-4 h-4" /></Link>
          <button onClick={handleLogout} className="btn-icon"><LogOut className="w-4 h-4" /></button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Workspaces</h1>
            <p className="text-gray-500 text-sm mt-0.5">Hi {user?.name || user?.username} 👋 Select a workspace to continue</p>
          </div>
          <button onClick={() => setCreating(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> New workspace
          </button>
        </div>

        {creating && (
          <motion.form
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="card-shadow p-4 mb-4 flex gap-3 items-center"
            onSubmit={(e) => { e.preventDefault(); if (name.trim()) createMutation.mutate(name.trim()); }}
          >
            <input className="input flex-1" placeholder="e.g. Acme Engineering" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <button className="btn-primary" type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setCreating(false)}>Cancel</button>
          </motion.form>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading…</div>
        ) : !data?.length ? (
          <div className="text-center py-20">
            <Layers className="w-14 h-14 text-gray-200 mx-auto mb-4" />
            <p className="font-medium text-gray-500">No workspaces yet</p>
            <p className="text-sm text-gray-400 mt-1">Create one to get started with your team</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.map((ws, i) => (
              <motion.button
                key={ws.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/w/${ws.id}`)}
                className="card w-full p-4 text-left flex items-center gap-4 hover:border-brand-300 hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-sm">
                  {ws.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{ws.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{(ws as any).myRole} · {ws.plan} plan</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 transition-colors" />
              </motion.button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

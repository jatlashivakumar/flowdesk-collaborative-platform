import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { hasPermission, type WorkspaceMember } from '@flowdesk/shared-types';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { Shield, CreditCard, Trash2, Info } from 'lucide-react';

export default function SettingsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { user } = useAuthStore();
  const { currentWorkspace } = useWorkspaceStore();

  const { data: members } = useQuery({
    queryKey: ['members', workspaceId],
    queryFn: () => api.get<{ data: WorkspaceMember[] }>(`/workspaces/${workspaceId}/members`).then((r) => r.data.data),
    enabled: !!workspaceId,
  });

  const myRole = members?.find((m) => m.user.id === user?.id)?.role ?? 'viewer';

  const planColors: Record<string, string> = {
    free: 'badge-gray',
    pro: 'badge bg-blue-100 text-blue-700',
    business: 'badge bg-purple-100 text-purple-700',
  };

  return (
    <div className="page">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="page-header">
          <h1 className="page-title">Settings</h1>
        </div>

        {/* Workspace info */}
        <section className="card-shadow p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Info className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900">Workspace details</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Name', value: currentWorkspace?.name },
              { label: 'Slug', value: currentWorkspace?.slug, mono: true },
              { label: 'Member limit', value: `${currentWorkspace?.memberLimit} seats` },
              { label: 'Created', value: currentWorkspace?.createdAt ? new Date(currentWorkspace.createdAt).toLocaleDateString() : '—' },
            ].map(({ label, value, mono }) => (
              <div key={label}>
                <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                <p className={`text-sm font-medium text-gray-900 ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</p>
              </div>
            ))}
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Plan</p>
              <span className={planColors[currentWorkspace?.plan ?? 'free'] ?? 'badge-gray'}>
                {currentWorkspace?.plan ?? 'free'}
              </span>
            </div>
          </div>
        </section>

        {/* Your role */}
        <section className="card-shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900">Your access</h2>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-indigo-500 flex items-center justify-center text-white font-semibold" style={{ fontSize: '14px' }}>
              {(user?.name ?? user?.username)?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">{user?.name ?? user?.username}</p>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>
            <span className="badge bg-purple-100 text-purple-700 capitalize">{myRole}</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              { perm: 'project:create', label: 'Create projects' },
              { perm: 'task:create', label: 'Create tasks' },
              { perm: 'task:delete', label: 'Delete tasks' },
              { perm: 'member:invite', label: 'Invite members' },
              { perm: 'member:remove', label: 'Remove members' },
              { perm: 'workspace:delete', label: 'Delete workspace' },
            ].map(({ perm, label }) => (
              <div key={perm} className="flex items-center gap-2 text-xs text-gray-600">
                <span className={`w-2 h-2 rounded-full ${hasPermission(myRole, perm) ? 'bg-green-400' : 'bg-gray-200'}`} />
                {label}
              </div>
            ))}
          </div>
        </section>

        {/* Plan */}
        <section className="card-shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900">Plan & billing</h2>
          </div>
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-brand-50 to-indigo-50 rounded-xl border border-brand-100">
            <div>
              <p className="font-semibold text-gray-900 capitalize">{currentWorkspace?.plan ?? 'Free'} plan</p>
              <p className="text-xs text-gray-500 mt-0.5">Up to {currentWorkspace?.memberLimit} members</p>
            </div>
            {myRole === 'owner' && (
              <button className="btn-primary btn-sm" onClick={() => alert('Billing integration coming soon!')}>
                Upgrade
              </button>
            )}
          </div>
        </section>

        {/* Danger zone */}
        {hasPermission(myRole, 'workspace:delete') && (
          <section className="card p-6 border-red-100 bg-red-50/30">
            <div className="flex items-center gap-2 mb-3">
              <Trash2 className="w-4 h-4 text-red-500" />
              <h2 className="font-semibold text-red-700">Danger zone</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">Permanently delete this workspace and all its data. This cannot be undone.</p>
            <button className="btn-danger" onClick={() => alert('Type workspace name to confirm delete — coming soon')}>
              Delete workspace
            </button>
          </section>
        )}
      </div>
    </div>
  );
}

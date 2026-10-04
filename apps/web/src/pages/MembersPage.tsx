import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { hasPermission, type WorkspaceMember } from '@flowdesk/shared-types';
import toast from 'react-hot-toast';
import { UserPlus, Trash2, Loader2, Users } from 'lucide-react';

const ROLE_BADGE: Record<string, string> = {
  owner: 'badge bg-purple-100 text-purple-700',
  admin: 'badge bg-blue-100 text-blue-700',
  member: 'badge bg-green-100 text-green-700',
  viewer: 'badge-gray',
};

export default function MembersPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');

  const { data: members, isLoading } = useQuery({
    queryKey: ['members', workspaceId],
    queryFn: () => api.get<{ data: WorkspaceMember[] }>(`/workspaces/${workspaceId}/members`).then((r) => r.data.data),
    enabled: !!workspaceId,
  });

  const myRole = members?.find((m) => m.user.id === user?.id)?.role ?? 'viewer';
  const canInvite = hasPermission(myRole, 'member:invite');
  const canRemove = hasPermission(myRole, 'member:remove');

  const inviteMutation = useMutation({
    mutationFn: () => api.post(`/workspaces/${workspaceId}/members`, { email, role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', workspaceId] });
      toast.success('Member invited!');
      setEmail(''); setShowInvite(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Invite failed'),
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => api.delete(`/workspaces/${workspaceId}/members/${memberId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['members', workspaceId] }); toast.success('Member removed'); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Remove failed'),
  });

  return (
    <div className="page">
      <div className="max-w-2xl mx-auto">
        <div className="page-header">
          <div>
            <h1 className="page-title">Members</h1>
            <p className="text-gray-500 text-xs mt-0.5">{members?.length ?? 0} people in this workspace</p>
          </div>
          {canInvite && (
            <button onClick={() => setShowInvite(true)} className="btn-primary">
              <UserPlus className="w-4 h-4" /> Invite member
            </button>
          )}
        </div>

        {showInvite && (
          <motion.form initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="card-shadow p-5 mb-6 space-y-4"
            onSubmit={(e) => { e.preventDefault(); inviteMutation.mutate(); }}>
            <h3 className="font-semibold text-gray-900">Invite a member</h3>
            <div className="flex gap-3">
              <input className="input flex-1" type="email" placeholder="colleague@company.com"
                value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
              <select className="input w-32" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary" disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Inviting…</> : 'Send invite'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowInvite(false)}>Cancel</button>
            </div>
          </motion.form>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading…</div>
        ) : !members?.length ? (
          <div className="text-center py-20">
            <Users className="w-14 h-14 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No members yet</p>
          </div>
        ) : (
          <div className="card divide-y divide-gray-100">
            {members.map((m, i) => (
              <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-indigo-500 flex items-center justify-center text-white font-semibold flex-shrink-0"
                  style={{ fontSize: '13px' }}>
                  {(m.user.name ?? m.user.username)[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{m.user.name ?? m.user.username}</p>
                  <p className="text-xs text-gray-400 truncate">@{m.user.username} · {m.user.email}</p>
                </div>
                <span className={ROLE_BADGE[m.role] ?? 'badge-gray'}>{m.role}</span>
                {canRemove && m.role !== 'owner' && m.user.id !== user?.id && (
                  <button
                    className="btn-icon text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => { if (confirm(`Remove ${m.user.name ?? m.user.username}?`)) removeMutation.mutate(m.id); }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

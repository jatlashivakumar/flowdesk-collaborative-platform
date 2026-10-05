import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2, User } from 'lucide-react';
import type { User as UserType } from '@flowdesk/shared-types';

export default function ProfilePage() {
  const { user, setAuth, accessToken } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: user?.name ?? '', bio: user?.bio ?? '' });

  const mutation = useMutation({
    mutationFn: () => api.patch<{ data: UserType }>('/auth/me', form).then((r) => r.data.data),
    onSuccess: (updated) => {
      setAuth(updated, accessToken!);
      toast.success('Profile updated!');
    },
    onError: () => toast.error('Update failed'),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="btn-icon text-gray-400">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="font-semibold text-gray-900">My Profile</h1>
      </header>

      <main className="max-w-lg mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-shadow p-8 space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-400 to-indigo-500 flex items-center justify-center text-white font-bold text-2xl shadow-md">
              {(user?.name ?? user?.username)?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-lg">{user?.name ?? user?.username}</p>
              <p className="text-sm text-gray-400">@{user?.username}</p>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>
          </div>

          <div className="divider" />

          <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
            <div className="form-group">
              <label className="label">Full name</label>
              <input className="input" placeholder="Your name" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Bio</label>
              <textarea className="input resize-none" rows={3} placeholder="Tell your team about yourself…"
                value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Username</label>
              <input className="input bg-gray-50 text-gray-500 cursor-not-allowed" value={user?.username ?? ''} disabled />
              <p className="text-xs text-gray-400 mt-1">Username cannot be changed</p>
            </div>
            <div className="form-group">
              <label className="label">Email</label>
              <input className="input bg-gray-50 text-gray-500 cursor-not-allowed" value={user?.email ?? ''} disabled />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={mutation.isPending}>
              {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save changes'}
            </button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { LoginSchema, type LoginInput, type User } from '@flowdesk/shared-types';
import { Loader2, Zap } from 'lucide-react';

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({ resolver: zodResolver(LoginSchema) });
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  async function onSubmit(data: LoginInput) {
    try {
      const res = await api.post<{ data: { accessToken: string; user: User } }>('/auth/login', data);
      setAuth(res.data.data.user, res.data.data.accessToken);
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Login failed');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-indigo-50 p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="card-shadow p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-600 rounded-2xl mb-4 shadow-lg shadow-brand-200">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
            <p className="text-gray-500 text-sm mt-1">Sign in to FlowDesk</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="form-group">
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="you@company.com" autoFocus {...register('email')} />
              {errors.email && <p className="error-msg">{errors.email.message}</p>}
            </div>
            <div className="form-group">
              <label className="label">Password</label>
              <input className="input" type="password" placeholder="••••••••" {...register('password')} />
              {errors.password && <p className="error-msg">{errors.password.message}</p>}
            </div>
            <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-600 hover:text-brand-700 font-medium">Create one free</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

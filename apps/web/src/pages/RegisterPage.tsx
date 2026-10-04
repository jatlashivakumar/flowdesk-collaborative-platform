import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { RegisterSchema, type RegisterInput, type User } from '@flowdesk/shared-types';
import { Loader2, Zap } from 'lucide-react';

export default function RegisterPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterInput>({ resolver: zodResolver(RegisterSchema) });
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  async function onSubmit(data: RegisterInput) {
    try {
      const res = await api.post<{ data: { accessToken: string; user: User } }>('/auth/register', data);
      setAuth(res.data.data.user, res.data.data.accessToken);
      toast.success('Welcome to FlowDesk! 🎉');
      navigate('/');
    } catch (err: any) {
      const fieldErrors = err.response?.data?.fieldErrors;
      if (fieldErrors) {
        const first = Object.values(fieldErrors)[0] as string[];
        toast.error(first?.[0] ?? 'Registration failed');
      } else {
        toast.error(err.response?.data?.message ?? 'Registration failed');
      }
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
            <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
            <p className="text-gray-500 text-sm mt-1">Free forever. No credit card needed.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="form-group">
              <label className="label">Full name</label>
              <input className="input" placeholder="Alex Johnson" autoFocus {...register('name')} />
            </div>
            <div className="form-group">
              <label className="label">Email *</label>
              <input className="input" type="email" placeholder="alex@company.com" {...register('email')} />
              {errors.email && <p className="error-msg">{errors.email.message}</p>}
            </div>
            <div className="form-group">
              <label className="label">Username *</label>
              <input className="input" placeholder="alexj (lowercase, no spaces)" {...register('username')} />
              {errors.username && <p className="error-msg">{errors.username.message}</p>}
            </div>
            <div className="form-group">
              <label className="label">Password *</label>
              <input className="input" type="password" placeholder="Min 8 chars, 1 uppercase, 1 number" {...register('password')} />
              {errors.password && <p className="error-msg">{errors.password.message}</p>}
            </div>
            <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</> : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

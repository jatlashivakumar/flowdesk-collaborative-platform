import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

export const api = axios.create({ baseURL: '/api', withCredentials: true });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (!refreshPromise) {
        refreshPromise = axios
          .post<{ data: { accessToken: string } }>('/api/auth/refresh-token', {}, { withCredentials: true })
          .then((r) => {
            const token = r.data.data.accessToken;
            useAuthStore.getState().setAccessToken(token);
            return token;
          })
          .catch(() => { useAuthStore.getState().logout(); return null; })
          .finally(() => { refreshPromise = null; });
      }
      const token = await refreshPromise;
      if (token) { original.headers.Authorization = `Bearer ${token}`; return api(original); }
    }
    return Promise.reject(error);
  }
);

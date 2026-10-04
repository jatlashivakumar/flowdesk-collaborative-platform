import { useEffect, useRef, useState } from 'react';
import { Outlet, useParams, useNavigate, NavLink } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { getSocket } from '@/lib/socket';
import type { Workspace, Project, Task } from '@flowdesk/shared-types';
import { LayoutGrid, Users, Settings, LogOut, ChevronDown, Bell, Zap, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WorkspaceLayout() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { logout, user } = useAuthStore();
  const qc = useQueryClient();
  const [notifCount, setNotifCount] = useState(0);
  const joinedRef = useRef(false);
  const { setCurrentWorkspace } = useWorkspaceStore();

  const { data: workspace } = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => api.get<{ data: Workspace }>(`/workspaces/${workspaceId}`).then((r) => r.data.data),
    enabled: !!workspaceId,
  });

  const { data: projects } = useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: () => api.get<{ data: Project[] }>(`/workspaces/${workspaceId}/projects`).then((r) => r.data.data),
    enabled: !!workspaceId,
  });

  useEffect(() => {
    if (workspace) setCurrentWorkspace(workspace);
  }, [workspace, setCurrentWorkspace]);

  useEffect(() => {
    if (!workspaceId || joinedRef.current) return;
    try {
      const socket = getSocket();
      socket.emit('room:join', workspaceId);
      joinedRef.current = true;

      socket.on('task:created', (task: Task) => {
        qc.invalidateQueries({ queryKey: ['tasks'] });
      });
      socket.on('task:updated', (task: Task) => {
        qc.setQueryData<Task[]>(['tasks', task.projectId], (prev = []) =>
          prev.map((t) => (t.id === task.id ? task : t))
        );
      });
      socket.on('task:deleted', ({ taskId, projectId }) => {
        qc.setQueryData<Task[]>(['tasks', projectId], (prev = []) => prev.filter((t) => t.id !== taskId));
      });
      socket.on('notification:new', (n) => {
        setNotifCount((c) => c + 1);
        toast(n.message, { icon: '🔔' });
      });

      return () => {
        socket.emit('room:leave', workspaceId);
        socket.off('task:created');
        socket.off('task:updated');
        socket.off('task:deleted');
        socket.off('notification:new');
        joinedRef.current = false;
      };
    } catch { /* socket not ready */ }
  }, [workspaceId, qc]);

  function handleLogout() {
    api.post('/auth/logout').finally(() => { logout(); navigate('/login'); });
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Logo + workspace */}
        <div className="px-3 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2 px-1">
            <div className="w-6 h-6 bg-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm truncate flex-1">{workspace?.name ?? 'FlowDesk'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-2 overflow-y-auto space-y-0.5">
          <NavLink to={`/w/${workspaceId}/projects`}
            className={({ isActive }) => isActive ? 'nav-link-active' : 'nav-link'}>
            <LayoutGrid className="w-4 h-4" /> Projects
          </NavLink>
          <NavLink to={`/w/${workspaceId}/members`}
            className={({ isActive }) => isActive ? 'nav-link-active' : 'nav-link'}>
            <Users className="w-4 h-4" /> Members
          </NavLink>
          <NavLink to={`/w/${workspaceId}/settings`}
            className={({ isActive }) => isActive ? 'nav-link-active' : 'nav-link'}>
            <Settings className="w-4 h-4" /> Settings
          </NavLink>

          {projects && projects.length > 0 && (
            <div className="pt-3">
              <p className="px-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Projects</p>
              {projects.map((p) => (
                <NavLink key={p.id} to={`/w/${workspaceId}/projects/${p.id}`}
                  className={({ isActive }) => isActive ? 'nav-link-active' : 'nav-link'}>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="truncate flex-1 text-xs">{p.name}</span>
                </NavLink>
              ))}
            </div>
          )}
        </nav>

        {/* Notifications badge */}
        {notifCount > 0 && (
          <div className="mx-3 mb-2 px-3 py-2 bg-brand-50 rounded-lg flex items-center gap-2">
            <Bell className="w-3.5 h-3.5 text-brand-600" />
            <span className="text-xs text-brand-700 font-medium">{notifCount} new notification{notifCount > 1 ? 's' : ''}</span>
            <button className="ml-auto text-xs text-brand-500 hover:text-brand-700" onClick={() => setNotifCount(0)}>Clear</button>
          </div>
        )}

        {/* User */}
        <div className="px-2 py-2 border-t border-gray-100">
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-50 group">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-400 to-indigo-500 flex items-center justify-center text-white font-semibold flex-shrink-0" style={{ fontSize: '10px' }}>
              {(user?.name || user?.username)?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{user?.name || user?.username}</p>
            </div>
            <button onClick={handleLogout} className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        <Outlet />
      </main>
    </div>
  );
}

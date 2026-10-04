import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import WorkspacesPage from '@/pages/WorkspacesPage';
import WorkspaceLayout from '@/components/layout/WorkspaceLayout';
import ProjectsPage from '@/pages/ProjectsPage';
import ProjectBoard from '@/pages/ProjectBoard';
import MembersPage from '@/pages/MembersPage';
import SettingsPage from '@/pages/SettingsPage';
import ProfilePage from '@/pages/ProfilePage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}
function RequireGuest({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  return !user ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  const { user, accessToken } = useAuthStore();
  useEffect(() => {
    if (user && accessToken) connectSocket(accessToken);
    else disconnectSocket();
  }, [user, accessToken]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<RequireGuest><LoginPage /></RequireGuest>} />
        <Route path="/register" element={<RequireGuest><RegisterPage /></RequireGuest>} />
        <Route path="/" element={<RequireAuth><WorkspacesPage /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="/w/:workspaceId" element={<RequireAuth><WorkspaceLayout /></RequireAuth>}>
          <Route index element={<ProjectsPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:projectId" element={<ProjectBoard />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

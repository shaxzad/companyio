import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@companyio/auth-react';
import { AppLayout } from '@companyio/platform-ui';
import { sidebarForRole } from '../../config/sidebar';
import { canAccessPath, roleOf } from './roles';

export function RoleGate() {
  const { user } = useAuth();
  const location = useLocation();
  const role = roleOf(user);

  if (!user || !role) return <Navigate to="/signin" replace />;
  if (!canAccessPath(role, location.pathname)) return <Navigate to="/" replace />;

  return <AppLayout config={sidebarForRole(role)} />;
}

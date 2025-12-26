'use client';

import { useAuth } from '@/lib/auth-context';
import { LoginForm } from '@/components/login-form';
import { AdminView } from '@/components/admin-view';
import { AsesorView } from '@/components/asesor-view';
import { SuperAdminView } from '@/components/superadmin-view';

export default function Home() {
  const { isAuthenticated, isAdmin, isAsesor, isSuperAdmin } = useAuth();

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  if (isSuperAdmin) {
    return <SuperAdminView />;
  }

  if (isAdmin) {
    return <AdminView />;
  }

  if (isAsesor) {
    return <AsesorView />;
  }

  return null;
}
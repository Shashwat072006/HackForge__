// src/components/RouteGuard.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { Role } from '../lib/auth';

interface Props {
  roles?: Role[];
  children: React.ReactNode;
}

export default function RouteGuard({ roles, children }: Props) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text-muted)' }}>
        <div>Loading…</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.some((r) => {
    // Check using role hierarchy – manager/hr/admin also have employee rights
    const roleOrder: Role[] = ['EMPLOYEE','MANAGER','HR','ADMIN'];
    const userIdx = roleOrder.indexOf(user.role as Role);
    const reqIdx = roleOrder.indexOf(r);
    return userIdx >= reqIdx;
  })) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

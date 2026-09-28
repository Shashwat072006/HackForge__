// src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import RouteGuard from './components/RouteGuard';
import AppShell from './components/layout/AppShell';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ApplyPage from './pages/ApplyPage';
import MyLeavesPage from './pages/MyLeavesPage';
import ApprovalsPage from './pages/manager/ApprovalsPage';
import CalendarPage from './pages/manager/CalendarPage';
import WorkloadPage from './pages/manager/WorkloadPage';
import SimulatePage from './pages/manager/SimulatePage';
import EmployeesPage from './pages/hr/EmployeesPage';
import SettingsPage from './pages/hr/SettingsPage';
import ReportsPage from './pages/hr/ReportsPage';
import AdminPage from './pages/AdminPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected shell */}
              <Route
                element={
                  <RouteGuard>
                    <AppShell />
                  </RouteGuard>
                }
              >
                {/* Employee routes (all roles) */}
                <Route index element={<DashboardPage />} />
                <Route path="apply" element={<ApplyPage />} />
                <Route path="my-leaves" element={<MyLeavesPage />} />

                {/* Manager routes */}
                <Route
                  path="manager/approvals"
                  element={
                    <RouteGuard roles={['MANAGER']}>
                      <ApprovalsPage isHR={false} />
                    </RouteGuard>
                  }
                />
                <Route
                  path="manager/calendar"
                  element={
                    <RouteGuard roles={['MANAGER']}>
                      <CalendarPage />
                    </RouteGuard>
                  }
                />
                <Route
                  path="workload"
                  element={
                    <RouteGuard roles={['MANAGER']}>
                      <WorkloadPage />
                    </RouteGuard>
                  }
                />
                <Route
                  path="simulate"
                  element={
                    <RouteGuard roles={['MANAGER']}>
                      <SimulatePage />
                    </RouteGuard>
                  }
                />

                {/* HR routes */}
                <Route
                  path="hr/approvals"
                  element={
                    <RouteGuard roles={['HR']}>
                      <ApprovalsPage isHR={true} />
                    </RouteGuard>
                  }
                />
                <Route
                  path="hr/employees"
                  element={
                    <RouteGuard roles={['HR']}>
                      <EmployeesPage />
                    </RouteGuard>
                  }
                />
                <Route
                  path="hr/settings"
                  element={
                    <RouteGuard roles={['HR']}>
                      <SettingsPage />
                    </RouteGuard>
                  }
                />
                <Route
                  path="hr/reports"
                  element={
                    <RouteGuard roles={['HR']}>
                      <ReportsPage />
                    </RouteGuard>
                  }
                />
                <Route
                  path="hr/calendar"
                  element={
                    <RouteGuard roles={['HR']}>
                      <CalendarPage />
                    </RouteGuard>
                  }
                />

                {/* Admin */}
                <Route
                  path="admin"
                  element={
                    <RouteGuard roles={['ADMIN']}>
                      <AdminPage />
                    </RouteGuard>
                  }
                />

                {/* 404 fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

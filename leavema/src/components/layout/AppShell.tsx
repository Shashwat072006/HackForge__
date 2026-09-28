// src/components/layout/AppShell.tsx
import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import NotificationBell from '../NotificationBell';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: '🌐', roles: ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'] },
  { to: '/apply', label: 'Apply for Leave', icon: '📝', roles: ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'] },
  { to: '/my-leaves', label: 'My Leave History', icon: '📋', roles: ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'] },
  { to: '/manager/approvals', label: 'Manager Approvals', icon: '✓', roles: ['MANAGER'] },
  { to: '/manager/calendar', label: 'Attendance Heatmap', icon: '📅', roles: ['MANAGER', 'HR'] },
  { to: '/workload', label: 'Workload Tasks', icon: '📊', roles: ['MANAGER', 'HR'] },
  { to: '/simulate', label: 'Simulation Engine', icon: '⚡', roles: ['MANAGER', 'HR'] },
  { to: '/hr/approvals', label: 'HR Approvals', icon: '✓', roles: ['HR'] },
  { to: '/hr/employees', label: 'Employee Registry', icon: '👥', roles: ['HR'] },
  { to: '/hr/settings', label: 'Holidays & Peak', icon: '⚙', roles: ['HR'] },
  { to: '/hr/reports', label: 'Attendance Reports', icon: '📄', roles: ['HR'] },
  { to: '/admin', label: 'System Admin', icon: '🔧', roles: ['ADMIN'] },
];

export default function AppShell() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [fontSizeOffset, setFontSizeOffset] = useState(0);

  const visibleNav = NAV_ITEMS.filter((item) =>
    item.roles.some((r) => hasRole(r as any)),
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getPageTitle = () => {
    const current = visibleNav.find((n) => n.to === location.pathname);
    return current ? current.label : 'Leave Management System';
  };

  return (
    <div className="app-shell" style={{ fontSize: `${14 + fontSizeOffset}px` }}>
      {/* ── Top Header Bar (Gov Style) ── */}
      <header className="gov-top-header">
        <div className="gov-logo-box">
          Attendance
        </div>
        <div className="gov-navbar">
          <div className="gov-nav-left">
            <button
              type="button"
              className="gov-btn-tool"
              title="Toggle Navigation"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              ☰
            </button>
            <button type="button" className="gov-btn-tool" title="Accessibility Options">♿</button>
            <button type="button" className="gov-btn-tool" onClick={() => setFontSizeOffset(-1)}>A-</button>
            <button type="button" className="gov-btn-tool" onClick={() => setFontSizeOffset(0)}>A</button>
            <button type="button" className="gov-btn-tool" onClick={() => setFontSizeOffset(1)}>A+</button>
          </div>

          <div className="gov-ticker-container">
            <span className="gov-ticker-text">
              LeaveMa AEBAS Biometric Platform v3.4 Active • Real-time AI Workload Feasibility Engine Connected • 24x7 Helpdesk Active
            </span>
          </div>

          <div className="gov-nav-right">
            <NotificationBell />

            <div className="gov-lang-select" title="Language Selector">
              English <span>▼</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 6 }}>
              <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#333' }}>
                  {user?.name || 'User'}
                </div>
                <div style={{ fontSize: '11px', color: '#777', fontWeight: 500 }}>
                  {user?.role} {user?.teamName ? `• ${user.teamName}` : ''}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-default btn-sm"
                onClick={handleLogout}
                id="btn-logout"
                title="Sign out of portal"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Body Container ── */}
      <div className="app-body-container">
        {/* ── Left Sidebar ── */}
        {sidebarOpen && (
          <aside className="app-sidebar">
            <div className="sidebar-user-panel">
              <div className="sidebar-user-avatar">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{user?.name}</div>
                <div className="sidebar-user-status">
                  <span style={{ fontSize: '9px' }}>●</span> Online ({user?.role})
                </div>
              </div>
            </div>

            <div className="sidebar-header-label">MAIN NAVIGATION</div>

            <ul className="sidebar-menu">
              {visibleNav.map((item) => (
                <li key={item.to} className="sidebar-item">
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) => (isActive ? 'active' : '')}
                  >
                    <span className="sidebar-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>

            <div style={{ marginTop: 'auto', padding: '16px', borderTop: '1px solid #1a2226', fontSize: '11px', color: '#8aa4af' }}>
              <div>Attendance ID: <strong>{user?.id ? 100000 + user.id : '100041'}</strong></div>
              <div>NIC Server: <strong>ae-node-01.gov</strong></div>
            </div>
          </aside>
        )}

        {/* ── Main Content Area ── */}
        <main className="app-content">
          <div className="content-header">
            <div>
              <h1>
                {getPageTitle()}
                <small>Biometric & Leave Management</small>
              </h1>
            </div>
            <div className="breadcrumb">
              <span>⌂</span>
              <a href="/">home</a>
              <span>&gt;</span>
              <span>{getPageTitle()}</span>
            </div>
          </div>

          <Outlet />
        </main>
      </div>

      {/* ── Gov Footer ── */}
      <footer className="gov-footer">
        <div className="gov-footer-content">
          <div>
            <div className="gov-footer-links">
              <a href="https://servicedesk.nic.in" target="_blank" rel="noreferrer">
                👤 https://servicedesk.nic.in
              </a>
              <span>|</span>
              <span>📞 Toll Free No. - 1800 111 555</span>
              <span>|</span>
              <span>© 2014 - 2026 Attendance.gov.in. All rights reserved.</span>
            </div>
            <div className="gov-footer-credits">
              © Site is designed and hosted by National Informatics Centre (NIC), Government of India.
            </div>
          </div>

          <div className="gov-footer-emblem">
            <div style={{ fontSize: '20px' }}>🏛</div>
            <div className="gov-emblem-text">
              NATIONAL<br />INFORMATICS<br />CENTRE
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

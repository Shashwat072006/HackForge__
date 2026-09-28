// src/pages/DashboardPage.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { LeaveBalance, LeaveRequest } from '../types';
import StatusBadge from '../components/StatusBadge';
import { SkeletonCard, TableSkeleton } from '../components/SkeletonRow';
import { fmtDate, fmtDays } from '../lib/format';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: balances, isLoading: balLoading, isError: balError } = useQuery<LeaveBalance[]>({
    queryKey: ['balances'],
    queryFn: () => api.get<LeaveBalance[]>('/balances/my').then((r) => r.data),
  });

  const { data: leaves, isLoading: lvLoading, isError: lvError } = useQuery<LeaveRequest[]>({
    queryKey: ['my-leaves'],
    queryFn: () => api.get<LeaveRequest[]>('/leaves/my').then((r) => r.data),
  });

  const recentLeaves = leaves?.slice(0, 5) ?? [];

  const BG_COLORS = ['bg-aqua', 'bg-green', 'bg-yellow', 'bg-red', 'bg-teal'];
  const ICONS = ['🏖', '🏥', '☕', '👶', '⭐'];

  return (
    <div>
      {/* ── Welcome Banner ── */}
      <div className="box box-teal" style={{ marginBottom: 20 }}>
        <div className="box-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#2c3e50', marginBottom: 4 }}>
              Welcome to Employee Leave Portal, {user?.name}
            </h3>
            <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>
              Attendance ID: <strong>{user?.id ? 100000 + user.id : '100041'}</strong> | Team: <strong>{user?.teamName || 'Core Platform'}</strong> | Role: <strong>{user?.role}</strong>
            </p>
          </div>
          <div>
            <Link to="/apply" className="btn btn-teal btn-lg">
              ＋ Apply for Leave
            </Link>
          </div>
        </div>
      </div>

      {/* ── Balance Small Boxes (Gov Style) ── */}
      <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#444', marginBottom: 14 }}>
        CURRENT LEAVE ENTITLEMENTS & BALANCES
      </h4>

      {balError ? (
        <div className="alert alert-red" style={{ padding: 12, marginBottom: 20 }}>
          Failed to load balances. <button className="btn btn-default btn-sm" onClick={() => window.location.reload()}>Retry</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 25 }}>
          {balLoading ? (
            Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} height={120} />)
          ) : (
            balances?.map((b, idx) => {
              const typeName = (b.leaveType || (b as any).code || (b as any).name || 'LEAVE').toString();
              return (
                <div key={b.leaveType || idx} className={`small-box ${BG_COLORS[idx % BG_COLORS.length]}`}>
                  <div className="inner">
                    <h3>{fmtDays(b.available)} <span style={{ fontSize: '16px', fontWeight: 400 }}>days</span></h3>
                    <p>{typeName.replace(/_/g, ' ')} LEAVE</p>
                    <div style={{ fontSize: '11.5px', marginTop: 6, opacity: 0.88 }}>
                      Total: {fmtDays(b.total ?? b.available)} | Used: {fmtDays(b.used)} | Pending: {fmtDays(b.pending)}
                    </div>
                  </div>
                  <div className="icon">
                    {ICONS[idx % ICONS.length]}
                  </div>
                  <Link to="/apply" className="small-box-footer">
                    Apply Now →
                  </Link>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Recent Leave Requests Box ── */}
      <div className="box box-primary">
        <div className="box-header">
          <h3 className="box-title">Recent Leave Applications</h3>
          <div className="box-tools">
            <Link to="/my-leaves" className="btn btn-default btn-sm">
              View All History →
            </Link>
          </div>
        </div>

        <div className="box-body" style={{ padding: 0 }}>
          {lvError ? (
            <div style={{ padding: 16, color: '#c0392b' }}>Error retrieving leave records.</div>
          ) : !lvLoading && recentLeaves.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#777' }}>
              No recent leave requests found. Click "Apply for Leave" to submit a new request.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="gov-table gov-table-striped">
                <thead>
                  <tr>
                    <th>Leave Type</th>
                    <th>Duration Dates</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Current Status</th>
                    <th>Applied On</th>
                  </tr>
                </thead>
                <tbody>
                  {lvLoading ? (
                    <TableSkeleton cols={6} rows={3} />
                  ) : (
                    recentLeaves.map((l) => (
                      <tr key={l.id}>
                        <td style={{ fontWeight: 600 }}>{(l.leaveType || (l as any).leaveTypeName || 'LEAVE').replace(/_/g, ' ')}</td>
                        <td>{fmtDate(l.startDate)} &rarr; {fmtDate(l.endDate)}</td>
                        <td><strong>{l.workingDays}</strong></td>
                        <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.reason}
                        </td>
                        <td>
                          <StatusBadge status={l.status} />
                        </td>
                        <td style={{ fontSize: '12px', color: '#777' }}>
                          {fmtDate(l.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="box-footer" style={{ fontSize: '12px', color: '#777', display: 'flex', justifyContent: 'space-between' }}>
          <span>Showing latest {recentLeaves.length} records</span>
          <span>Official AEBAS / LeaveMa Platform</span>
        </div>
      </div>
    </div>
  );
}

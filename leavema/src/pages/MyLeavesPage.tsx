// src/pages/MyLeavesPage.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, parseApiError, getErrorCode } from '../lib/api';
import type { LeaveRequest, LeaveHistory } from '../types';
import StatusBadge from '../components/StatusBadge';
import Countdown from '../components/Countdown';
import { TableSkeleton } from '../components/SkeletonRow';
import { fmtDate, fmtDays, fmtTimestamp } from '../lib/format';
import { useToast } from '../contexts/ToastContext';

const STATUSES = ['ALL', 'PENDING_MANAGER', 'PENDING_HR', 'ESCALATED', 'APPROVED', 'REJECTED', 'CANCELLED'];
const STATUS_LABELS: Record<string, string> = {
  ALL: 'All Requests',
  PENDING_MANAGER: 'Awaiting Manager',
  PENDING_HR: 'Awaiting HR',
  ESCALATED: 'Escalated',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

export default function MyLeavesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [cancelComment, setCancelComment] = useState('');
  const [showCancel, setShowCancel] = useState(false);

  const { data: leaves, isLoading, isError, refetch } = useQuery<LeaveRequest[]>({
    queryKey: ['my-leaves', statusFilter],
    queryFn: () => {
      const params = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
      return api.get<LeaveRequest[]>(`/leaves/my${params}`).then((r) => r.data);
    },
  });

  const selected = leaves?.find((l) => l.id === selectedId) ?? null;

  const { data: history, isLoading: histLoading } = useQuery<LeaveHistory[]>({
    queryKey: ['leave-history', selectedId],
    queryFn: () => api.get<LeaveHistory[]>(`/leaves/${selectedId}/history`).then((r) => r.data),
    enabled: !!selectedId,
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.post(`/leaves/${selectedId}/cancel`, { comment: cancelComment }),
    onSuccess: () => {
      toast('Leave request cancelled successfully', 'success');
      setShowCancel(false);
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ['my-leaves'] });
      qc.invalidateQueries({ queryKey: ['balances'] });
    },
    onError: (err) => {
      const code = getErrorCode(err);
      if (code === 'INVALID_STATE_TRANSITION') {
        toast('This request was already updated by another user', 'error');
        refetch();
      } else {
        toast(parseApiError(err), 'error');
      }
    },
  });

  const canCancel = (l: LeaveRequest) => {
    if (['PENDING_MANAGER', 'PENDING_HR', 'ESCALATED'].includes(l.status)) return true;
    if (l.status === 'APPROVED' && l.startDate > new Date().toISOString().slice(0, 10)) return true;
    return false;
  };

  return (
    <div>
      <div className="box box-primary">
        <div className="box-header">
          <h3 className="box-title">📋 My Leave History</h3>
          <div className="box-tools">
            <button
              type="button"
              className="btn btn-default btn-sm"
              onClick={() => refetch()}
              title="Refresh leave records"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #f4f4f4', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-default'}`}
              onClick={() => setStatusFilter(s)}
              id={`filter-${s.toLowerCase()}`}
            >
              {STATUS_LABELS[s] || s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className="box-body" style={{ padding: 0 }}>
          {isError ? (
            <div className="alert alert-danger" style={{ margin: 16 }}>
              Failed to load leave records. <button className="btn btn-default btn-sm" onClick={() => refetch()}>Retry</button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="gov-table gov-table-striped">
                <thead>
                  <tr>
                    <th>Leave Type</th>
                    <th>Duration</th>
                    <th>Days</th>
                    <th>Current Status</th>
                    <th>Approval Deadline</th>
                    <th>Applied On</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <TableSkeleton rows={5} cols={7} />
                  ) : !leaves?.length ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px 20px', color: '#aaa' }}>
                        <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
                        <div style={{ fontWeight: 600, color: '#888', fontSize: 15 }}>No leave records found</div>
                        <div style={{ fontSize: 12, marginTop: 6, color: '#aaa' }}>
                          {statusFilter !== 'ALL' ? 'Try selecting "All Requests" filter' : 'Submit a leave application to see records here'}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    leaves.map((l) => (
                      <tr
                        key={l.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedId(l.id)}
                      >
                        <td style={{ fontWeight: 600 }}>{l.leaveType.replace(/_/g, ' ')}</td>
                        <td>{fmtDate(l.startDate)} – {fmtDate(l.endDate)}</td>
                        <td><strong>{fmtDays(l.workingDays)}</strong></td>
                        <td>
                          <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
                            <StatusBadge status={l.status} />
                            {l.conflictBadge && <span className="label label-danger">⚡ Conflict</span>}
                          </div>
                        </td>
                        <td style={{ fontSize: 12 }}>
                          <Countdown deadline={l.stageDeadline} />
                        </td>
                        <td style={{ fontSize: 12, color: '#777' }}>
                          {fmtDate(l.createdAt)}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={(e) => { e.stopPropagation(); setSelectedId(l.id); }}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="box-footer" style={{ fontSize: 12, color: '#777' }}>
          Total Records: <strong>{leaves?.length ?? 0}</strong> | Filter: <strong>{STATUS_LABELS[statusFilter]}</strong>
        </div>
      </div>

      {/* Detail Drawer */}
      {selectedId && selected && (
        <>
          <div className="drawer-overlay" onClick={() => setSelectedId(null)} />
          <aside className="drawer" aria-label="Leave detail">
            <div className="box-header" style={{ borderBottom: '2px solid #3c8dbc', padding: '14px 18px' }}>
              <h3 className="box-title">Leave Request Details</h3>
              <button type="button" className="btn btn-default btn-sm" onClick={() => setSelectedId(null)}>✕ Close</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '18px' }}>
              {/* Meta grid */}
              <div className="box box-info" style={{ marginBottom: 14 }}>
                <div className="box-header" style={{ padding: '8px 14px' }}>
                  <span className="box-title" style={{ fontSize: 13 }}>Request Information</span>
                </div>
                <div className="box-body" style={{ padding: '12px 14px' }}>
                  <table style={{ width: '100%', fontSize: 13 }}>
                    <tbody>
                      <tr>
                        <td style={{ color: '#777', paddingBottom: 8, width: '40%' }}>Leave Type</td>
                        <td style={{ fontWeight: 600, paddingBottom: 8 }}>{selected.leaveType.replace(/_/g, ' ')}</td>
                      </tr>
                      <tr>
                        <td style={{ color: '#777', paddingBottom: 8 }}>Duration</td>
                        <td style={{ paddingBottom: 8 }}>{fmtDate(selected.startDate)} – {fmtDate(selected.endDate)}</td>
                      </tr>
                      <tr>
                        <td style={{ color: '#777', paddingBottom: 8 }}>Working Days</td>
                        <td style={{ fontWeight: 600, paddingBottom: 8 }}>{fmtDays(selected.workingDays)}</td>
                      </tr>
                      <tr>
                        <td style={{ color: '#777', paddingBottom: 8 }}>Status</td>
                        <td style={{ paddingBottom: 8 }}>
                          <StatusBadge status={selected.status} />
                        </td>
                      </tr>
                      {selected.stageDeadline && (
                        <tr>
                          <td style={{ color: '#777', paddingBottom: 8 }}>Deadline</td>
                          <td style={{ paddingBottom: 8 }}><Countdown deadline={selected.stageDeadline} /></td>
                        </tr>
                      )}
                      {selected.reason && (
                        <tr>
                          <td style={{ color: '#777', paddingBottom: 8 }}>Reason</td>
                          <td style={{ paddingBottom: 8 }}>{selected.reason}</td>
                        </tr>
                      )}
                      <tr>
                        <td style={{ color: '#777' }}>Applied On</td>
                        <td>{fmtTimestamp(selected.createdAt)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {canCancel(selected) && (
                <button
                  type="button"
                  className="btn btn-danger w-full"
                  onClick={() => setShowCancel(true)}
                  id="btn-cancel-leave"
                  style={{ marginBottom: 18 }}
                >
                  ✕ Withdraw / Cancel This Request
                </button>
              )}

              {/* Audit Timeline */}
              <div className="box box-teal">
                <div className="box-header" style={{ padding: '8px 14px' }}>
                  <span className="box-title" style={{ fontSize: 13 }}>📑 Audit Timeline</span>
                </div>
                <div className="box-body" style={{ padding: '12px 14px' }}>
                  {histLoading ? (
                    <div style={{ color: '#aaa', fontSize: 13 }}>Loading timeline...</div>
                  ) : !history?.length ? (
                    <div style={{ color: '#aaa', fontSize: 13 }}>No history entries found.</div>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      {history.map((h, i) => (
                        <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 14, paddingBottom: 14, borderBottom: i < history.length - 1 ? '1px dashed #e0e0e0' : 'none' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#16a085', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                            {h.actor ? h.actor.charAt(0) : 'S'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13, color: '#333' }}>
                              {h.actor ?? 'System (Automated)'}
                            </div>
                            <div style={{ fontSize: 12, color: '#3c8dbc', fontWeight: 700, marginTop: 2 }}>
                              {h.action.replace(/_/g, ' ')}
                            </div>
                            {h.comment && (
                              <div style={{ fontSize: 12, color: '#555', marginTop: 4, fontStyle: 'italic' }}>
                                "{h.comment}"
                              </div>
                            )}
                            <div style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>{fmtTimestamp(h.at)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Cancel Confirm Modal */}
      {showCancel && (
        <div className="modal-overlay" onClick={() => setShowCancel(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="box-header" style={{ borderTop: '3px solid #d9534f', padding: '12px 16px' }}>
              <h3 className="box-title" style={{ color: '#a94442' }}>Withdraw Leave Request</h3>
            </div>
            <div className="box-body">
              <div className="alert alert-warning" style={{ marginBottom: 14 }}>
                <strong>Warning:</strong> This action will cancel your leave request and restore your leave balance. This action cannot be undone.
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="cancel-comment">
                  Reason for Cancellation (optional)
                </label>
                <textarea
                  id="cancel-comment"
                  className="form-control"
                  value={cancelComment}
                  onChange={(e) => setCancelComment(e.target.value)}
                  rows={2}
                  placeholder="Enter reason for withdrawal..."
                />
              </div>
            </div>
            <div className="box-footer" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-default" onClick={() => setShowCancel(false)}>Keep Request</button>
              <button
                type="button"
                className="btn btn-danger"
                id="btn-confirm-cancel"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? '⏳ Cancelling...' : '✕ Yes, Cancel Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

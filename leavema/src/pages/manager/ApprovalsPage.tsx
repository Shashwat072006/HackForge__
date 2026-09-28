// src/pages/manager/ApprovalsPage.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, parseApiError, getErrorCode } from '../../lib/api';
import type { LeaveRequest, Recommendation } from '../../types';
import StatusBadge from '../../components/StatusBadge';
import Countdown from '../../components/Countdown';
import { TableSkeleton } from '../../components/SkeletonRow';
import { fmtDate, fmtDays } from '../../lib/format';
import { useToast } from '../../contexts/ToastContext';

interface ApprovalsPageProps {
  isHR?: boolean;
}

export default function ApprovalsPage({ isHR = false }: ApprovalsPageProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [approveComment, setApproveComment] = useState('');
  const [approveId, setApproveId] = useState<number | null>(null);
  const [recommendId, setRecommendId] = useState<number | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);

  const endpoint = isHR
    ? '/hr/approvals?status=PENDING_HR,ESCALATED'
    : '/manager/approvals?status=PENDING_MANAGER';

  const { data: leaves, isLoading, isError, refetch } = useQuery<LeaveRequest[]>({
    queryKey: ['approvals', isHR ? 'hr' : 'manager'],
    queryFn: () => api.get<LeaveRequest[]>(endpoint).then((r) => r.data),
  });

  const approvePath = isHR ? '/hr/approvals' : '/manager/approvals';

  const approveMutation = useMutation({
    mutationFn: (id: number) =>
      api.post(`${approvePath}/${id}/approve`, { comment: approveComment }),
    onSuccess: () => {
      toast('Leave request approved successfully ✓', 'success');
      setApproveId(null);
      setApproveComment('');
      qc.invalidateQueries({ queryKey: ['approvals'] });
    },
    onError: (err) => {
      const code = getErrorCode(err);
      if (code === 'CONCURRENT_MODIFICATION') { toast('Someone else just changed this record', 'error'); refetch(); }
      else toast(parseApiError(err), 'error');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) =>
      api.post(`${approvePath}/${id}/reject`, { comment: rejectComment }),
    onSuccess: () => {
      toast('Leave request rejected', 'info');
      setRejectId(null);
      setRejectComment('');
      qc.invalidateQueries({ queryKey: ['approvals'] });
    },
    onError: (err) => toast(parseApiError(err), 'error'),
  });

  const recommendMutation = useMutation({
    mutationFn: (id: number) => api.post<Recommendation>(`/leaves/${id}/recommendation`).then((r) => r.data),
    onSuccess: (data) => setRecommendation(data),
    onError: (err) => toast(parseApiError(err), 'error'),
  });

  const DECISION_STYLE: Record<string, { border: string; bg: string; text: string }> = {
    APPROVE: { border: '#3c763d', bg: '#dff0d8', text: '#3c763d' },
    APPROVE_WITH_CONDITIONS: { border: '#8a6d3b', bg: '#fcf8e3', text: '#8a6d3b' },
    RESCHEDULE_SUGGESTED: { border: '#a94442', bg: '#f2dede', text: '#a94442' },
  };

  return (
    <div>
      <div className="box box-teal">
        <div className="box-header">
          <h3 className="box-title">
            {isHR ? '🏛 HR Approvals Queue' : '✓ Manager Approvals Queue'}
          </h3>
          <div className="box-tools">
            <span className="label label-warning" style={{ marginRight: 8 }}>
              {leaves?.length ?? 0} Pending
            </span>
            <button type="button" className="btn btn-default btn-sm" onClick={() => refetch()}>
              ↻ Refresh
            </button>
          </div>
        </div>

        <div className="box-body" style={{ padding: 0 }}>
          {isError ? (
            <div className="alert alert-danger" style={{ margin: 16 }}>
              Failed to load approval queue.{' '}
              <button type="button" className="btn btn-default btn-sm" onClick={() => refetch()}>Retry</button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="gov-table gov-table-striped">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Leave Duration</th>
                    <th>Days</th>
                    <th>Type</th>
                    <th>Feasibility %</th>
                    <th>Stage Deadline</th>
                    <th>Status</th>
                    <th style={{ minWidth: 200 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <TableSkeleton rows={5} cols={8} />
                  ) : !leaves?.length ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '40px 20px', color: '#aaa' }}>
                        <div style={{ fontSize: 36, marginBottom: 10 }}>🎉</div>
                        <div style={{ fontWeight: 600, color: '#888', fontSize: 15 }}>All clear! No pending requests.</div>
                        <div style={{ fontSize: 12, marginTop: 6, color: '#aaa' }}>All leave requests have been actioned.</div>
                      </td>
                    </tr>
                  ) : (
                    leaves.map((l) => (
                      <tr key={l.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{l.employeeName}</div>
                          {l.overlappingEmployees && l.overlappingEmployees.length > 0 && (
                            <div style={{ fontSize: 11, color: '#e67e22', marginTop: 3 }}>
                              ⚡ Also out: {l.overlappingEmployees.join(', ')}
                            </div>
                          )}
                        </td>
                        <td>{fmtDate(l.startDate)} – {fmtDate(l.endDate)}</td>
                        <td><strong>{fmtDays(l.workingDays)}</strong></td>
                        <td>{l.leaveType.replace(/_/g, ' ')}</td>
                        <td>
                          {l.feasibilityPercent != null ? (
                            <span
                              className={`label ${l.feasibilityPercent >= 80 ? 'label-success' : l.feasibilityPercent >= 50 ? 'label-warning' : 'label-danger'}`}
                            >
                              {l.feasibilityPercent}%
                            </span>
                          ) : '—'}
                          {l.conflictBadge && (
                            <span className="label label-danger" style={{ marginLeft: 4 }}>⚡</span>
                          )}
                        </td>
                        <td style={{ fontSize: 12 }}>
                          <Countdown deadline={l.stageDeadline} />
                        </td>
                        <td>
                          <StatusBadge status={l.status} />
                          {(l.status === 'ESCALATED' || (l.escalationLevel ?? 0) > 0) && (
                            <div style={{ marginTop: 3 }}>
                              <span className="label label-danger" style={{ fontSize: 10 }}>⬆ ESCALATED</span>
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="btn btn-success btn-sm"
                              onClick={() => setApproveId(l.id)}
                              disabled={approveMutation.isPending}
                              id={`btn-approve-${l.id}`}
                            >
                              ✓ Approve
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => { setRejectId(l.id); setRejectComment(''); }}
                              id={`btn-reject-${l.id}`}
                            >
                              ✕ Reject
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => { setRecommendId(l.id); setRecommendation(null); recommendMutation.mutate(l.id); }}
                              id={`btn-recommend-${l.id}`}
                            >
                              🤖 AI Rec.
                            </button>
                          </div>
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
          {isHR ? 'HR Approval Portal — Final approvals before leave is confirmed' : 'Manager Approval Portal — First stage review'}
        </div>
      </div>

      {/* Approve Confirm Modal */}
      {approveId != null && (
        <div className="modal-overlay" onClick={() => setApproveId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="box-header" style={{ borderTop: '3px solid #00a65a' }}>
              <h3 className="box-title" style={{ color: '#3c763d' }}>✓ Approve Leave Request</h3>
            </div>
            <div className="box-body">
              <div className="alert alert-success" style={{ marginBottom: 14 }}>
                You are about to approve this leave request. The application will progress to the next approval stage.
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="approve-comment">Approval Remarks (optional)</label>
                <textarea
                  id="approve-comment"
                  className="form-control"
                  value={approveComment}
                  onChange={(e) => setApproveComment(e.target.value)}
                  rows={2}
                  placeholder="Add remarks or conditions..."
                />
              </div>
            </div>
            <div className="box-footer" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-default" onClick={() => setApproveId(null)}>Cancel</button>
              <button
                type="button"
                className="btn btn-success"
                id="btn-confirm-approve"
                onClick={() => approveMutation.mutate(approveId!)}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending ? '⏳ Approving...' : '✓ Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectId != null && (
        <div className="modal-overlay" onClick={() => setRejectId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="box-header" style={{ borderTop: '3px solid #d9534f' }}>
              <h3 className="box-title" style={{ color: '#a94442' }}>✕ Reject Leave Request</h3>
            </div>
            <div className="box-body">
              <div className="alert alert-danger" style={{ marginBottom: 14 }}>
                <strong>Note:</strong> A reason is mandatory for rejection. The employee will be notified.
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reject-comment">
                  Reason for Rejection <span style={{ color: '#d9534f' }}>*</span>
                </label>
                <textarea
                  id="reject-comment"
                  className="form-control"
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  rows={3}
                  placeholder="Explain the reason for rejection..."
                />
              </div>
            </div>
            <div className="box-footer" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-default" onClick={() => setRejectId(null)}>Cancel</button>
              <button
                type="button"
                className="btn btn-danger"
                id="btn-confirm-reject"
                onClick={() => rejectMutation.mutate(rejectId!)}
                disabled={!rejectComment.trim() || rejectMutation.isPending}
              >
                {rejectMutation.isPending ? '⏳ Rejecting...' : '✕ Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Recommendation Modal */}
      {recommendId != null && (
        <div className="modal-overlay" onClick={() => { setRecommendId(null); setRecommendation(null); }}>
          <div className="modal-content" style={{ maxWidth: 580 }} onClick={(e) => e.stopPropagation()}>
            <div className="box-header" style={{ borderTop: '3px solid #3c8dbc' }}>
              <h3 className="box-title">🤖 AI-Powered Leave Recommendation</h3>
              <button type="button" className="btn btn-default btn-sm" onClick={() => { setRecommendId(null); setRecommendation(null); }}>✕</button>
            </div>
            <div className="box-body">
              {recommendMutation.isPending ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#aaa' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
                  <div>Analysing team capacity, workload, and historical patterns...</div>
                </div>
              ) : recommendation ? (
                <div>
                  {/* Decision Banner */}
                  <div style={{
                    padding: '14px 16px',
                    background: (DECISION_STYLE[recommendation.decision] || DECISION_STYLE.APPROVE).bg,
                    borderLeft: `4px solid ${(DECISION_STYLE[recommendation.decision] || DECISION_STYLE.APPROVE).border}`,
                    borderRadius: 3,
                    marginBottom: 16,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#777', textTransform: 'uppercase' }}>AI Decision</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: (DECISION_STYLE[recommendation.decision] || DECISION_STYLE.APPROVE).text, marginTop: 4 }}>
                      {recommendation.decision.replace(/_/g, ' ')}
                    </div>
                  </div>

                  {recommendation.reasons.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#555', textTransform: 'uppercase', marginBottom: 8 }}>Analysis Factors</div>
                      <ul style={{ paddingLeft: 16, fontSize: 13, color: '#555', lineHeight: 1.7 }}>
                        {recommendation.reasons.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}

                  {recommendation.newlyAtRiskTasks.length > 0 && (
                    <div className="alert alert-warning" style={{ padding: '10px 12px', marginBottom: 14 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>⚠ Tasks at Risk If Approved</div>
                      <ul style={{ paddingLeft: 16, fontSize: 12 }}>
                        {recommendation.newlyAtRiskTasks.map((t, i) => <li key={i}>{t}</li>)}
                      </ul>
                    </div>
                  )}

                  {recommendation.alternatives.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#555', textTransform: 'uppercase', marginBottom: 8 }}>Suggested Alternative Windows</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {recommendation.alternatives.map((a, i) => (
                          <span key={i} className="label label-success">
                            {fmtDate(a.startDate)} – {fmtDate(a.endDate)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="alert alert-info" style={{ fontSize: 12, padding: '8px 12px' }}>
                    <strong>Advisory Only:</strong> This recommendation does not auto-approve or reject. The approve/reject buttons above remain active.
                  </div>
                </div>
              ) : (
                <div className="alert alert-danger">Failed to load recommendation. Please try again.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

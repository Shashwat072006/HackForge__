// src/pages/ApplyPage.tsx
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, parseApiError, getErrorCode } from '../lib/api';
import type { LeaveBalance, LeavePreview, Suggestion } from '../types';
import { fmtDate, fmtDays } from '../lib/format';
import { FeasibilityBadge } from '../components/StatusBadge';
import { useToast } from '../contexts/ToastContext';

const LEAVE_TYPES = ['ANNUAL', 'SICK', 'UNPAID', 'MATERNITY', 'PATERNITY', 'BEREAVEMENT', 'COMPASSIONATE'];

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  React.useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer.current);
  }, [value, ms]);
  return debounced;
}

export default function ApplyPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState({ leaveType: '', startDate: '', endDate: '', reason: '' });
  const [fieldError, setFieldError] = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm] = useState(false);

  const debouncedForm = useDebounce(form, 400);

  // Balances
  const { data: balances } = useQuery<LeaveBalance[]>({
    queryKey: ['balances'],
    queryFn: () => api.get<LeaveBalance[]>('/balances/my').then((r) => r.data),
  });

  const selectedBalance = balances?.find((b) => b.leaveType === form.leaveType);

  // Preview
  const previewEnabled =
    !!debouncedForm.leaveType &&
    !!debouncedForm.startDate &&
    !!debouncedForm.endDate &&
    debouncedForm.startDate <= debouncedForm.endDate;

  const { data: preview, isFetching: previewLoading } = useQuery<LeavePreview>({
    queryKey: ['preview', debouncedForm.leaveType, debouncedForm.startDate, debouncedForm.endDate],
    queryFn: () =>
      api.post<LeavePreview>('/leaves/preview', {
        leaveType: debouncedForm.leaveType,
        startDate: debouncedForm.startDate,
        endDate: debouncedForm.endDate,
      }).then((r) => r.data),
    enabled: previewEnabled,
  });

  // Submit
  const submit = useMutation({
    mutationFn: () => api.post('/leaves', form),
    onSuccess: () => {
      toast('Leave request submitted successfully!', 'success');
      qc.invalidateQueries({ queryKey: ['balances'] });
      qc.invalidateQueries({ queryKey: ['my-leaves'] });
      navigate('/my-leaves');
    },
    onError: (err) => {
      const code = getErrorCode(err);
      const detail = parseApiError(err);
      if (code === 'INSUFFICIENT_BALANCE') {
        setFieldError((p) => ({ ...p, balance: detail }));
      } else if (code === 'OVERLAPPING_REQUEST') {
        setFieldError((p) => ({ ...p, dates: detail }));
      } else {
        toast(detail, 'error');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError({});
    if (preview && preview.feasibility.status !== 'FULLY_FEASIBLE') {
      setShowConfirm(true);
    } else {
      submit.mutate();
    }
  };

  const fillSuggestion = (s: Suggestion) => {
    setForm((f) => ({ ...f, startDate: s.startDate, endDate: s.endDate }));
  };

  const feasBgColor = {
    FULLY_FEASIBLE: '#dff0d8',
    PARTIALLY_FEASIBLE: '#fcf8e3',
    NOT_FEASIBLE: '#f2dede',
  } as const;

  const feasTextColor = {
    FULLY_FEASIBLE: '#3c763d',
    PARTIALLY_FEASIBLE: '#8a6d3b',
    NOT_FEASIBLE: '#a94442',
  } as const;

  const feasBarColor = {
    FULLY_FEASIBLE: '#5cb85c',
    PARTIALLY_FEASIBLE: '#f0ad4e',
    NOT_FEASIBLE: '#d9534f',
  } as const;

  const balanceAfterIsNeg = preview && preview.balance.after < 0;

  return (
    <div>
      <div className="box box-primary">
        <div className="box-header">
          <h3 className="box-title">📝 Apply for Leave Request</h3>
          <span style={{ fontSize: 12, color: '#888' }}>Feasibility analysis is advisory — you can always submit</span>
        </div>
        <div className="box-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

            {/* ── Left: Form ── */}
            <div>
              <form onSubmit={handleSubmit} id="apply-form">

                <div className="form-group">
                  <label className="form-label" htmlFor="apply-type">
                    Leave Type <span style={{ color: '#d9534f' }}>*</span>
                  </label>
                  <select
                    id="apply-type"
                    className="form-control"
                    style={{ height: 38 }}
                    value={form.leaveType}
                    onChange={(e) => setForm((f) => ({ ...f, leaveType: e.target.value }))}
                    required
                  >
                    <option value="">-- Select Leave Type --</option>
                    {LEAVE_TYPES.map((t) => (
                      <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>

                {selectedBalance && (
                  <div className="alert alert-info" style={{ padding: '8px 12px', marginBottom: 14, fontSize: 13 }}>
                    Current Balance: <strong>{fmtDays(selectedBalance.available)}</strong> days available
                    {fieldError.balance && (
                      <div style={{ color: '#a94442', fontWeight: 600, marginTop: 4 }}>{fieldError.balance}</div>
                    )}
                  </div>
                )}

                <div className="grid-2" style={{ gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="apply-start">
                      Start Date <span style={{ color: '#d9534f' }}>*</span>
                    </label>
                    <input
                      id="apply-start"
                      type="date"
                      className="form-control"
                      value={form.startDate}
                      onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="apply-end">
                      End Date <span style={{ color: '#d9534f' }}>*</span>
                    </label>
                    <input
                      id="apply-end"
                      type="date"
                      className="form-control"
                      value={form.endDate}
                      min={form.startDate}
                      onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                      required
                    />
                    {fieldError.dates && (
                      <div style={{ color: '#a94442', fontSize: 12, marginTop: 4 }}>{fieldError.dates}</div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="apply-reason">Reason / Remarks</label>
                  <textarea
                    id="apply-reason"
                    className="form-control"
                    value={form.reason}
                    onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                    placeholder="Brief description of leave purpose..."
                    rows={3}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-teal btn-lg w-full"
                  disabled={submit.isPending}
                  id="btn-apply-submit"
                  style={{ marginTop: 6 }}
                >
                  {submit.isPending ? '⏳ Submitting...' : '📨 Submit Leave Request'}
                </button>
              </form>

              {/* Instruction Panel */}
              <div style={{ marginTop: 20, padding: '14px 16px', background: '#fcf8e3', border: '1px solid #faebcc', borderRadius: 3, fontSize: 12, color: '#8a6d3b', lineHeight: 1.7 }}>
                <strong>Instructions:</strong>
                <ul style={{ paddingLeft: 16, marginTop: 6 }}>
                  <li>Select leave type and date range to auto-calculate working days & feasibility.</li>
                  <li>The system checks team availability in real-time. Feasibility is <em>advisory</em>.</li>
                  <li>If the period is partially feasible, a confirmation dialog will appear before submission.</li>
                  <li>Approved leaves are deducted from your balance after HR final approval.</li>
                </ul>
              </div>
            </div>

            {/* ── Right: Live Preview Panel ── */}
            <div>
              <div className="box box-info" style={{ marginBottom: 0 }}>
                <div className="box-header" style={{ padding: '10px 14px' }}>
                  <h3 className="box-title" style={{ fontSize: 14 }}>🔮 Live Feasibility Preview</h3>
                  {previewLoading && (
                    <span style={{ fontSize: 12, color: '#31708f' }}>⏳ Analysing...</span>
                  )}
                </div>
                <div className="box-body">
                  {!previewEnabled ? (
                    <div style={{ textAlign: 'center', padding: '30px 16px', color: '#aaa' }}>
                      <div style={{ fontSize: 36, marginBottom: 10 }}>📅</div>
                      <div style={{ fontWeight: 600, color: '#888' }}>Select leave type and dates above</div>
                      <div style={{ fontSize: 12, marginTop: 6, color: '#aaa' }}>Feasibility analysis will appear here</div>
                    </div>
                  ) : preview ? (
                    <div>
                      {/* Summary row */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                        <div style={{ textAlign: 'center', padding: '12px', background: '#f9f9f9', border: '1px solid #ddd', borderRadius: 3 }}>
                          <div style={{ fontSize: 28, fontWeight: 700, color: '#3c8dbc' }}>{fmtDays(preview.workingDays)}</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#777', textTransform: 'uppercase' }}>Working Days</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '12px', background: balanceAfterIsNeg ? '#f2dede' : '#f9f9f9', border: `1px solid ${balanceAfterIsNeg ? '#ebccd1' : '#ddd'}`, borderRadius: 3 }}>
                          <div style={{ fontSize: 28, fontWeight: 700, color: balanceAfterIsNeg ? '#a94442' : '#00a65a' }}>{fmtDays(preview.balance.after)}</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#777', textTransform: 'uppercase' }}>Balance After</div>
                        </div>
                      </div>

                      {/* Feasibility Banner */}
                      <div style={{ padding: '12px 14px', background: feasBgColor[preview.feasibility.status], border: `1px solid`, borderColor: preview.feasibility.status === 'FULLY_FEASIBLE' ? '#d6e9c6' : preview.feasibility.status === 'PARTIALLY_FEASIBLE' ? '#faebcc' : '#ebccd1', borderRadius: 3, marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontWeight: 700, color: feasTextColor[preview.feasibility.status], fontSize: 13 }}>
                            Team Capacity Feasibility
                          </span>
                          <FeasibilityBadge status={preview.feasibility.status} />
                        </div>
                        <div className="feasibility-bar" style={{ marginBottom: 6 }}>
                          <div
                            className="feasibility-fill"
                            style={{ width: `${preview.feasibility.feasibilityPercent}%`, background: feasBarColor[preview.feasibility.status] }}
                          />
                        </div>
                        <div style={{ fontSize: 12, color: feasTextColor[preview.feasibility.status] }}>
                          {preview.feasibility.status === 'PARTIALLY_FEASIBLE' && (
                            <>{preview.feasibility.feasibleDays} of {preview.feasibility.totalWorkingDays} days are feasible ({preview.feasibility.feasibilityPercent}%)</>
                          )}
                          {preview.feasibility.status === 'FULLY_FEASIBLE' && <>All {preview.feasibility.totalWorkingDays} working days within team capacity</>}
                          {preview.feasibility.status === 'NOT_FEASIBLE' && <>Team capacity is insufficient for this period</>}
                        </div>
                      </div>

                      {/* Day Strip */}
                      {preview.feasibility.days.length > 0 && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#777', textTransform: 'uppercase', marginBottom: 6 }}>Day-by-Day Capacity</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {preview.feasibility.days.map((d) => (
                              <div
                                key={d.date}
                                className={`day-chip ${d.feasible ? 'feasible' : 'infeasible'}`}
                                title={`${d.date}: Supply ${d.supplyFte} FTE vs Demand ${d.demandFte} FTE`}
                              >
                                {d.date.slice(8)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Feasible Windows */}
                      {preview.feasibility.feasibleWindows.length > 0 && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#777', textTransform: 'uppercase', marginBottom: 6 }}>Feasible Windows</div>
                          {preview.feasibility.feasibleWindows.map((w, i) => (
                            <span key={i} className="label label-success" style={{ marginRight: 6, marginBottom: 4, display: 'inline-block' }}>
                              {fmtDate(w.startDate)} – {fmtDate(w.endDate)}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Suggestions */}
                      {preview.suggestions.length > 0 && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#777', textTransform: 'uppercase', marginBottom: 8 }}>✨ Suggested Alternative Dates</div>
                          {preview.suggestions.map((s, i) => (
                            <button
                              key={i}
                              type="button"
                              className="btn btn-default w-full"
                              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, padding: '8px 12px' }}
                              onClick={() => fillSuggestion(s)}
                              id={`btn-suggestion-${i}`}
                            >
                              <span style={{ fontSize: 13 }}>{fmtDate(s.startDate)} – {fmtDate(s.endDate)}</span>
                              <span className="label label-success">{s.feasibilityPercent}% Feasible</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Warnings */}
                      {preview.warnings.length > 0 && (
                        <div className="alert alert-warning" style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>⚠ Important Notices</div>
                          <ul style={{ paddingLeft: 16, fontSize: 12, margin: 0 }}>
                            {preview.warnings.map((w, i) => <li key={i} style={{ marginBottom: 4 }}>{w}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#aaa' }}>
                      <div style={{ fontSize: 24 }}>⏳</div>
                      <div style={{ fontSize: 13, marginTop: 8 }}>Calculating feasibility...</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Dialog */}
      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="box-header" style={{ borderTop: '3px solid #f0ad4e' }}>
              <h3 className="box-title" style={{ color: '#8a6d3b' }}>⚠ Confirm Submission</h3>
            </div>
            <div className="box-body">
              <p style={{ color: '#555', fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>
                Part of this leave request exceeds the team's available capacity. Feasibility analysis is <strong>advisory only</strong> — your manager can still approve or reject based on operational needs.
              </p>
              <p style={{ color: '#777', fontSize: 13 }}>Do you wish to submit the request regardless?</p>
            </div>
            <div className="box-footer" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-default" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button
                className="btn btn-warning"
                id="btn-confirm-submit"
                onClick={() => { setShowConfirm(false); submit.mutate(); }}
                disabled={submit.isPending}
              >
                Submit Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

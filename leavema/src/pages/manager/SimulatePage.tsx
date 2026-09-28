// src/pages/manager/SimulatePage.tsx
import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { api, parseApiError } from '../../lib/api';
import type { SimulationResult, LeaveRequest } from '../../types';
import { TaskStatusBadge, RiskBadge } from '../../components/StatusBadge';
import { fmtDate, fmtDays } from '../../lib/format';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

type Scenario = 'CONFIRMED_ONLY' | 'INCLUDE_PENDING' | 'WHAT_IF';

export default function SimulatePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const teamId = user?.teamId;

  const today = new Date().toISOString().slice(0, 10);
  const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(nextMonth);
  const [scenario, setScenario] = useState<Scenario>('CONFIRMED_ONLY');
  const [requestIds, setRequestIds] = useState<number[]>([]);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [batchRec, setBatchRec] = useState<any[] | null>(null);

  // Pending requests for WHAT_IF scenario
  const { data: pendingLeaves } = useQuery<LeaveRequest[]>({
    queryKey: ['approvals', 'manager'],
    queryFn: () => api.get<LeaveRequest[]>('/manager/approvals?status=PENDING_MANAGER').then((r) => r.data),
    enabled: scenario === 'WHAT_IF',
  });

  const simulateMutation = useMutation({
    mutationFn: () =>
      api.post<SimulationResult>(`/teams/${teamId}/simulate`, {
        from, to, scenario,
        ...(scenario === 'WHAT_IF' ? { requestIds } : {}),
      }).then((r) => r.data),
    onSuccess: (data) => setResult(data),
    onError: (err) => toast(parseApiError(err), 'error'),
  });

  const batchRecMutation = useMutation({
    mutationFn: () => api.post<any[]>(`/teams/${teamId}/recommendations/batch`).then((r) => r.data),
    onSuccess: (data) => setBatchRec(data),
    onError: (err) => toast(parseApiError(err), 'error'),
  });

  const riskColors: Record<string, string> = {
    LOW: '#22c55e', MEDIUM: '#f59e0b', HIGH: '#ef4444',
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Workload Simulation</h1>
        <p className="page-subtitle">Simulate team workload under different leave scenarios</p>
      </div>

      {/* Controls */}
      <div className="card" style={{ marginBottom: 28 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="sim-from">From</label>
            <input id="sim-from" type="date" className="form-control" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="sim-to">To</label>
            <input id="sim-to" type="date" className="form-control" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="sim-scenario">Scenario</label>
            <select id="sim-scenario" className="form-control" value={scenario} onChange={(e) => setScenario(e.target.value as Scenario)}>
              <option value="CONFIRMED_ONLY">Confirmed Only</option>
              <option value="INCLUDE_PENDING">Include Pending</option>
              <option value="WHAT_IF">What-If</option>
            </select>
          </div>
        </div>

        {/* What-if request selector */}
        {scenario === 'WHAT_IF' && pendingLeaves && pendingLeaves.length > 0 && (
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Pending Requests to Include</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
              {pendingLeaves.map((l) => (
                <label key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={requestIds.includes(l.id)}
                    onChange={(e) =>
                      setRequestIds((ids) =>
                        e.target.checked ? [...ids, l.id] : ids.filter((id) => id !== l.id)
                      )
                    }
                  />
                  {l.employeeName} · {fmtDate(l.startDate)}–{fmtDate(l.endDate)} ({fmtDays(l.workingDays)} days)
                </label>
              ))}
            </div>
          </div>
        )}

        <button
          className="btn btn-primary btn-lg"
          id="btn-run-simulation"
          onClick={() => { simulateMutation.mutate(); setResult(null); setBatchRec(null); }}
          disabled={simulateMutation.isPending}
        >
          {simulateMutation.isPending ? '⏳ Running…' : '⚡ Run Simulation'}
        </button>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Summary cards */}
          <div className="grid-4" style={{ marginBottom: 24 }}>
            {[
              { label: 'Peak Risk Date', value: fmtDate(result.summary.peakRiskDate), icon: '📅', color: 'var(--red-500)' },
              { label: 'Total Shortfall', value: `${result.summary.totalShortfallHours}h`, icon: '⬇', color: 'var(--amber-500)' },
              { label: 'At-Risk Tasks', value: String(result.summary.atRiskTasks), icon: '⚠', color: 'var(--amber-500)' },
              { label: 'Missed Tasks', value: String(result.summary.missedTasks), icon: '✕', color: 'var(--red-500)' },
            ].map((s) => (
              <div className="stat-card" key={s.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="stat-card-label">{s.label}</span>
                  <span style={{ fontSize: '1.2rem' }}>{s.icon}</span>
                </div>
                <div className="stat-card-value" style={{ fontSize: '1.5rem', color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {result.summary.extraFteNeeded > 0 && (
            <div className="alert alert-red" style={{ marginBottom: 24 }}>
              <strong>Extra FTE needed:</strong> {result.summary.extraFteNeeded} FTE
              {result.summary.extraFteWindow && (
                <span> · Window: {fmtDate(result.summary.extraFteWindow.startDate)} – {fmtDate(result.summary.extraFteWindow.endDate)}</span>
              )}
            </div>
          )}

          {/* Chart 1: Supply vs Demand */}
          {result.days.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, marginBottom: 16 }}>Supply vs Demand Hours</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={result.days} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
                  <Legend />
                  <Bar dataKey="supplyHours" name="Supply" fill="#6366f1" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="plannedDemandHours" name="Demand" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Chart 2: Backlog */}
          {result.days.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, marginBottom: 16 }}>Backlog Hours (Cumulative)</div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={result.days} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
                  <Area type="monotone" dataKey="backlogHours" name="Backlog" stroke="#ef4444" fill="rgba(239,68,68,0.15)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Task table */}
          {result.tasks.length > 0 && (
            <div className="table-wrap" style={{ marginBottom: 24 }}>
              <table>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Due</th>
                    <th>Effort</th>
                    <th>Completed</th>
                    <th>Status</th>
                    <th>Shortfall</th>
                  </tr>
                </thead>
                <tbody>
                  {result.tasks.map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 500 }}>{t.name}</td>
                      <td>{fmtDate(t.dueDate)}</td>
                      <td>{t.effortHours}h</td>
                      <td>{t.completedOn ? fmtDate(t.completedOn) : '—'}</td>
                      <td><TaskStatusBadge status={t.status} /></td>
                      <td style={{ color: t.shortfallHours > 0 ? 'var(--red-500)' : 'var(--green-500)' }}>
                        {t.shortfallHours > 0 ? `-${t.shortfallHours}h` : '✓'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Batch recommendation */}
          <button
            className="btn btn-secondary"
            id="btn-batch-recommend"
            onClick={() => batchRecMutation.mutate()}
            disabled={batchRecMutation.isPending}
          >
            {batchRecMutation.isPending ? 'Calculating…' : '🤖 Suggest Approval Order'}
          </button>

          {batchRec && (
            <div className="card" style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 12 }}>Suggested Approval Order</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {batchRec.map((r: any, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-surface)', borderRadius: 'var(--radius)' }}>
                    <span style={{ width: 24, height: 24, background: 'var(--brand-glow)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', color: 'var(--brand-400)' }}>
                      {i + 1}
                    </span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{r.employeeName ?? `Request #${r.requestId}`}</div>
                      {r.reason && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{r.reason}</div>}
                    </div>
                    <span className={`badge ${r.decision === 'APPROVE' ? 'badge-green' : 'badge-amber'}`} style={{ marginLeft: 'auto' }}>
                      {r.decision?.replace(/_/g, ' ') ?? ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

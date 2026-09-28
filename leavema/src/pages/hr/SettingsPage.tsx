// src/pages/hr/SettingsPage.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, parseApiError } from '../../lib/api';
import type { Holiday, PeakPeriod } from '../../types';
import { TableSkeleton } from '../../components/SkeletonRow';
import { fmtDate } from '../../lib/format';
import { useToast } from '../../contexts/ToastContext';

export default function SettingsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'holidays' | 'peaks'>('holidays');

  // ── Holidays ──
  const { data: holidays, isLoading: hLoading } = useQuery<Holiday[]>({
    queryKey: ['holidays'],
    queryFn: () => api.get<Holiday[]>('/hr/holidays').then((r) => r.data),
  });
  const [hForm, setHForm] = useState({ date: '', name: '' });
  const addHoliday = useMutation({
    mutationFn: () => api.post('/hr/holidays', hForm),
    onSuccess: () => { toast('Holiday added', 'success'); setHForm({ date: '', name: '' }); qc.invalidateQueries({ queryKey: ['holidays'] }); },
    onError: (err) => toast(parseApiError(err), 'error'),
  });

  // ── Peak Periods ──
  const { data: peaks, isLoading: pLoading } = useQuery<PeakPeriod[]>({
    queryKey: ['peak-periods'],
    queryFn: () => api.get<PeakPeriod[]>('/hr/peak-periods').then((r) => r.data),
  });
  const [pForm, setPForm] = useState({ startDate: '', endDate: '', description: '' });
  const addPeak = useMutation({
    mutationFn: () => api.post('/hr/peak-periods', pForm),
    onSuccess: () => { toast('Peak period added', 'success'); setPForm({ startDate: '', endDate: '', description: '' }); qc.invalidateQueries({ queryKey: ['peak-periods'] }); },
    onError: (err) => toast(parseApiError(err), 'error'),
  });

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="attendance-page-header">
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 500, color: '#333' }}>
            System Settings &amp; Calendar Configuration
          </h2>
          <div style={{ fontSize: 13, color: '#777' }}>
            HR Governance &gt; Gazetted Holidays &amp; Critical Peak Periods
          </div>
        </div>
      </div>

      {/* ── Nav Tabs ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        <button
          className={`btn ${tab === 'holidays' ? 'btn-gov-primary' : 'btn-default'}`}
          onClick={() => setTab('holidays')}
          id="tab-holidays"
          style={{ padding: '8px 20px', fontWeight: 600 }}
        >
          🗓 Gazetted &amp; Restricted Holidays ({holidays?.length ?? 0})
        </button>
        <button
          className={`btn ${tab === 'peaks' ? 'btn-gov-primary' : 'btn-default'}`}
          onClick={() => setTab('peaks')}
          id="tab-peaks"
          style={{ padding: '8px 20px', fontWeight: 600 }}
        >
          ⚠ Critical Peak Periods ({peaks?.length ?? 0})
        </button>
      </div>

      {tab === 'holidays' && (
        <>
          {/* Add holiday box */}
          <div className="box box-primary" style={{ marginBottom: 20 }}>
            <div className="box-header">
              <h3 className="box-title">Register New Gazetted Holiday</h3>
            </div>
            <div className="box-body" style={{ padding: 20 }}>
              <form
                id="add-holiday-form"
                style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}
                onSubmit={(e) => { e.preventDefault(); addHoliday.mutate(); }}
              >
                <div style={{ flex: '0 0 220px' }}>
                  <label className="gov-label" htmlFor="holiday-date">Holiday Date *</label>
                  <input
                    id="holiday-date"
                    type="date"
                    className="gov-input"
                    value={hForm.date}
                    onChange={(e) => setHForm((f) => ({ ...f, date: e.target.value }))}
                    required
                  />
                </div>
                <div style={{ flex: '1 1 300px' }}>
                  <label className="gov-label" htmlFor="holiday-name">Official Occasion / Description *</label>
                  <input
                    id="holiday-name"
                    className="gov-input"
                    value={hForm.name}
                    onChange={(e) => setHForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Republic Day / Diwali"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-gov-primary"
                  disabled={addHoliday.isPending}
                  id="btn-add-holiday"
                  style={{ height: 38 }}
                >
                  {addHoliday.isPending ? 'Adding…' : '+ Add Holiday'}
                </button>
              </form>
            </div>
          </div>

          {/* Holidays list box */}
          <div className="box box-info">
            <div className="box-header">
              <h3 className="box-title">Registered Official Holidays</h3>
              <div className="box-tools">
                <span className="badge badge-info">{holidays?.length ?? 0} Listed</span>
              </div>
            </div>
            <div className="box-body" style={{ padding: 0 }}>
              <div className="table-responsive">
                <table className="gov-table gov-table-striped">
                  <thead>
                    <tr>
                      <th style={{ width: 220 }}>Date Observed</th>
                      <th>Holiday Occasion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hLoading ? (
                      <TableSkeleton rows={4} cols={2} />
                    ) : !holidays?.length ? (
                      <tr>
                        <td colSpan={2} style={{ textAlign: 'center', padding: 36, color: '#777' }}>
                          <div style={{ fontSize: 32, marginBottom: 8 }}>🗓</div>
                          <div style={{ fontSize: 16, fontWeight: 600 }}>No holidays recorded</div>
                          <div style={{ fontSize: 13 }}>Use the form above to add holidays to the calendar.</div>
                        </td>
                      </tr>
                    ) : (
                      holidays.map((h) => (
                        <tr key={h.id}>
                          <td style={{ fontWeight: 600, color: 'var(--gov-blue)' }}>{fmtDate(h.date)}</td>
                          <td><strong>{h.name}</strong></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="box-footer" style={{ fontSize: 12, color: '#777' }}>
              Standard Government of India Gazetted Holiday Listing
            </div>
          </div>
        </>
      )}

      {tab === 'peaks' && (
        <>
          {/* Add peak period box */}
          <div className="box box-warning" style={{ marginBottom: 20 }}>
            <div className="box-header">
              <h3 className="box-title">Declare Critical Peak Work Period</h3>
            </div>
            <div className="box-body" style={{ padding: 20 }}>
              <form
                id="add-peak-form"
                style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}
                onSubmit={(e) => { e.preventDefault(); addPeak.mutate(); }}
              >
                <div style={{ flex: '0 0 180px' }}>
                  <label className="gov-label" htmlFor="peak-start">Period Start Date *</label>
                  <input
                    id="peak-start"
                    type="date"
                    className="gov-input"
                    value={pForm.startDate}
                    onChange={(e) => setPForm((f) => ({ ...f, startDate: e.target.value }))}
                    required
                  />
                </div>
                <div style={{ flex: '0 0 180px' }}>
                  <label className="gov-label" htmlFor="peak-end">Period End Date *</label>
                  <input
                    id="peak-end"
                    type="date"
                    className="gov-input"
                    value={pForm.endDate}
                    min={pForm.startDate}
                    onChange={(e) => setPForm((f) => ({ ...f, endDate: e.target.value }))}
                    required
                  />
                </div>
                <div style={{ flex: '1 1 280px' }}>
                  <label className="gov-label" htmlFor="peak-desc">Critical Reason / Operational Context *</label>
                  <input
                    id="peak-desc"
                    className="gov-input"
                    value={pForm.description}
                    onChange={(e) => setPForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="e.g. Fiscal Year Closing / Server Migration"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-warning"
                  disabled={addPeak.isPending}
                  id="btn-add-peak"
                  style={{ height: 38 }}
                >
                  {addPeak.isPending ? 'Declaring…' : 'Declare Peak Period'}
                </button>
              </form>
            </div>
          </div>

          {/* Peak periods list box */}
          <div className="box box-info">
            <div className="box-header">
              <h3 className="box-title">Active Peak Periods (AI Feasibility Penalty Enforced)</h3>
              <div className="box-tools">
                <span className="badge badge-warning">{peaks?.length ?? 0} Critical Periods</span>
              </div>
            </div>
            <div className="box-body" style={{ padding: 0 }}>
              <div className="table-responsive">
                <table className="gov-table gov-table-striped">
                  <thead>
                    <tr>
                      <th style={{ width: 260 }}>Critical Duration</th>
                      <th>Operational Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pLoading ? (
                      <TableSkeleton rows={3} cols={2} />
                    ) : !peaks?.length ? (
                      <tr>
                        <td colSpan={2} style={{ textAlign: 'center', padding: 36, color: '#777' }}>
                          <div style={{ fontSize: 32, marginBottom: 8 }}>⚠</div>
                          <div style={{ fontSize: 16, fontWeight: 600 }}>No peak periods declared</div>
                          <div style={{ fontSize: 13 }}>Leaves during peak periods incur automated risk flags.</div>
                        </td>
                      </tr>
                    ) : (
                      peaks.map((p) => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 600, color: '#e67e22' }}>
                            {fmtDate(p.startDate)} &rarr; {fmtDate(p.endDate)}
                          </td>
                          <td><strong>{p.description}</strong></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="box-footer" style={{ fontSize: 12, color: '#777' }}>
              Leaves submitted within these intervals trigger strict feasibility warnings.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// src/pages/hr/ReportsPage.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, downloadFile, parseApiError } from '../../lib/api';
import type { Report } from '../../types';
import { TableSkeleton } from '../../components/SkeletonRow';
import { fmtDate, fmtTimestamp } from '../../lib/format';
import { useToast } from '../../contexts/ToastContext';

export default function ReportsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [teamId, setTeamId] = useState('');

  const { data: reports, isLoading, isError, refetch } = useQuery<Report[]>({
    queryKey: ['reports'],
    queryFn: () => api.get<Report[]>('/hr/reports').then((r) => r.data),
  });

  const generateMutation = useMutation({
    mutationFn: () => api.post('/hr/reports/generate', { from, to }),
    onSuccess: () => {
      toast('Report generated successfully!', 'success');
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (err) => toast(parseApiError(err), 'error'),
  });

  const handleQuickDownload = () => {
    if (!from || !to) { toast('Please select date range', 'warning'); return; }
    const params = new URLSearchParams({ from, to, ...(teamId ? { teamId } : {}) });
    downloadFile(`/hr/reports/approved-leaves.xlsx?${params}`, `leaves-${from}-${to}.xlsx`);
  };

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="attendance-page-header">
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 500, color: '#333' }}>
            Leave Reports &amp; Analytics
          </h2>
          <div style={{ fontSize: 13, color: '#777' }}>
            HR Portal &gt; Audit Trails, Exported Spreadsheets &amp; Summary Reports
          </div>
        </div>
      </div>

      {/* ── Generate Report Box ── */}
      <div className="box box-primary" style={{ marginBottom: 20 }}>
        <div className="box-header">
          <h3 className="box-title">Generate or Download Official Leave Reports</h3>
        </div>
        <div className="box-body" style={{ padding: 20 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ minWidth: 160 }}>
              <label className="gov-label" htmlFor="report-from">From Date *</label>
              <input
                id="report-from"
                type="date"
                className="gov-input"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div style={{ minWidth: 160 }}>
              <label className="gov-label" htmlFor="report-to">To Date *</label>
              <input
                id="report-to"
                type="date"
                className="gov-input"
                value={to}
                min={from}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div style={{ minWidth: 140 }}>
              <label className="gov-label" htmlFor="report-team">Division / Team (Optional)</label>
              <input
                id="report-team"
                className="gov-input"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                placeholder="All Teams"
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn-gov-primary"
                id="btn-generate-report"
                disabled={!from || !to || generateMutation.isPending}
                onClick={() => generateMutation.mutate()}
              >
                {generateMutation.isPending ? 'Generating…' : 'Generate Archival Report'}
              </button>
              <button
                type="button"
                className="btn btn-default"
                id="btn-quick-download"
                onClick={handleQuickDownload}
              >
                ⬇ Quick Export (.xlsx)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Generated Reports Table Box ── */}
      <div className="box box-info">
        <div className="box-header">
          <h3 className="box-title">Generated Report Archive</h3>
          <div className="box-tools">
            <span className="badge badge-info">{reports?.length ?? 0} Archival Files</span>
          </div>
        </div>

        <div className="box-body" style={{ padding: 0 }}>
          {isError ? (
            <div style={{ padding: 20, color: '#c0392b' }}>
              Failed to load reports archive. <button className="btn btn-default btn-xs" onClick={() => refetch()}>Retry</button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="gov-table gov-table-striped">
                <thead>
                  <tr>
                    <th>Reporting Period</th>
                    <th>Timestamp Generated</th>
                    <th>Total Records</th>
                    <th>Initiated By</th>
                    <th style={{ textAlign: 'center' }}>Export Document</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <TableSkeleton rows={4} cols={5} />
                  ) : !reports?.length ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: 36, color: '#777' }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>No reports generated yet</div>
                        <div style={{ fontSize: 13 }}>Specify a date range above and click "Generate Archival Report".</div>
                      </td>
                    </tr>
                  ) : (
                    reports.map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>
                          {fmtDate(r.fromDate)} &rarr; {fmtDate(r.toDate)}
                        </td>
                        <td style={{ color: '#666', fontSize: 13 }}>{fmtTimestamp(r.generatedAt)}</td>
                        <td><span className="badge badge-primary">{r.rowCount} entries</span></td>
                        <td>{r.generatedBy ?? 'System Automatic'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-default btn-xs"
                            id={`btn-download-report-${r.id}`}
                            onClick={() => downloadFile(`/hr/reports/${r.id}/download`, `report-${r.id}.xlsx`)}
                          >
                            ⬇ Download Excel (.xlsx)
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
        <div className="box-footer" style={{ fontSize: 12, color: '#777', display: 'flex', justifyContent: 'space-between' }}>
          <span>Ministry / NIC Standards Leave Archive</span>
          <span>Verified Secure Output</span>
        </div>
      </div>
    </div>
  );
}

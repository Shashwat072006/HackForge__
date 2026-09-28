// src/pages/AdminPage.tsx
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, parseApiError } from '../lib/api';
import { useToast } from '../contexts/ToastContext';

export default function AdminPage() {
  const { toast } = useToast();
  const [demoTeams, setDemoTeams] = useState('2');
  const [demoEps, setDemoEps] = useState('5');
  const [escalationResult, setEscalationResult] = useState<string | null>(null);

  const escalation = useMutation({
    mutationFn: () => api.post<{ escalatedCount: number; message: string }>('/admin/escalation/run').then((r) => r.data),
    onSuccess: (data) => {
      const msg = data.message || `Escalation complete: ${data.escalatedCount ?? 0} requests escalated`;
      toast(msg, 'success');
      setEscalationResult(msg);
    },
    onError: (err) => toast(parseApiError(err), 'error'),
  });

  const monthlyReport = useMutation({
    mutationFn: () => api.post('/admin/reports/run'),
    onSuccess: () => toast('Monthly leave report generated and stored successfully', 'success'),
    onError: (err) => toast(parseApiError(err), 'error'),
  });

  const demoData = useMutation({
    mutationFn: () => api.post(`/admin/demo/generate?teams=${demoTeams}&employeesPerTeam=${demoEps}`),
    onSuccess: () => toast('Demo data seeded successfully! Refresh pages to see updated records.', 'success'),
    onError: (err) => toast(parseApiError(err), 'error'),
  });

  return (
    <div>
      <div className="alert alert-warning" style={{ marginBottom: 20, padding: '12px 16px' }}>
        <strong>⚠ Admin Panel — Restricted Access.</strong> Actions performed here affect the entire platform and all users. Proceed with caution.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>

        {/* Escalation Card */}
        <div className="box box-warning">
          <div className="box-header">
            <h3 className="box-title">⬆ Run Escalation Engine</h3>
          </div>
          <div className="box-body">
            <p style={{ fontSize: 13, color: '#555', marginBottom: 16, lineHeight: 1.7 }}>
              Process all pending leave requests that have surpassed their manager approval deadline. Overdue requests are automatically escalated to HR for review.
            </p>
            {escalationResult && (
              <div className="alert alert-success" style={{ fontSize: 12, padding: '8px 12px', marginBottom: 14 }}>
                ✓ {escalationResult}
              </div>
            )}
            <button
              type="button"
              className="btn btn-warning w-full"
              id="btn-admin-escalation"
              onClick={() => escalation.mutate()}
              disabled={escalation.isPending}
            >
              {escalation.isPending ? '⏳ Running Escalation...' : '⬆ Run Escalation Now'}
            </button>
          </div>
          <div className="box-footer" style={{ fontSize: 11, color: '#777' }}>
            This triggers the escalation cron job manually
          </div>
        </div>

        {/* Monthly Report Card */}
        <div className="box box-primary">
          <div className="box-header">
            <h3 className="box-title">📊 Generate Monthly Report</h3>
          </div>
          <div className="box-body">
            <p style={{ fontSize: 13, color: '#555', marginBottom: 16, lineHeight: 1.7 }}>
              Generate and store the official monthly approved leaves report for the current period. The report will be available in the HR Reports section.
            </p>
            <button
              type="button"
              className="btn btn-primary w-full"
              id="btn-admin-monthly-report"
              onClick={() => monthlyReport.mutate()}
              disabled={monthlyReport.isPending}
            >
              {monthlyReport.isPending ? '⏳ Generating...' : '📊 Generate Monthly Report'}
            </button>
          </div>
          <div className="box-footer" style={{ fontSize: 11, color: '#777' }}>
            Report is stored as a downloadable Excel file in HR Reports
          </div>
        </div>

        {/* Demo Data Card */}
        <div className="box box-success">
          <div className="box-header">
            <h3 className="box-title">🌱 Generate Demo Data</h3>
          </div>
          <div className="box-body">
            <p style={{ fontSize: 13, color: '#555', marginBottom: 14, lineHeight: 1.7 }}>
              Seed the system with realistic demo employees, teams, leave history, and workload data for demonstration and testing purposes.
            </p>
            <div className="grid-2" style={{ gap: 12, marginBottom: 14 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="demo-teams">Number of Teams</label>
                <input
                  id="demo-teams"
                  type="number"
                  min={1}
                  max={10}
                  className="form-control"
                  value={demoTeams}
                  onChange={(e) => setDemoTeams(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="demo-eps">Employees/Team</label>
                <input
                  id="demo-eps"
                  type="number"
                  min={1}
                  max={20}
                  className="form-control"
                  value={demoEps}
                  onChange={(e) => setDemoEps(e.target.value)}
                />
              </div>
            </div>
            <button
              type="button"
              className="btn btn-success w-full"
              id="btn-admin-demo"
              onClick={() => demoData.mutate()}
              disabled={demoData.isPending}
            >
              {demoData.isPending ? '⏳ Generating Demo Data...' : '🌱 Generate Demo Data'}
            </button>
          </div>
          <div className="box-footer" style={{ fontSize: 11, color: '#777' }}>
            Will generate {demoTeams} team(s) with {demoEps} employee(s) each
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="box box-info">
        <div className="box-header">
          <h3 className="box-title">ℹ System Information</h3>
        </div>
        <div className="box-body" style={{ padding: '14px 16px' }}>
          <table style={{ width: '100%', fontSize: 13 }}>
            <tbody>
              {[
                ['Platform', 'LeaveMa / AEBAS Biometric Leave System v3.4'],
                ['Backend', 'Spring Boot 3 | REST API | JWT Auth'],
                ['Database', 'PostgreSQL 16 | Connection Pool Active'],
                ['MSW Mock', import.meta.env.DEV ? '✓ Active (Development Mode)' : '✗ Disabled (Production)'],
                ['Environment', import.meta.env.DEV ? 'Development' : 'Production'],
                ['NIC Server', 'ae-node-01.gov.in | Status: Operational'],
              ].map(([key, val]) => (
                <tr key={key}>
                  <td style={{ color: '#777', fontWeight: 600, paddingBottom: 8, width: '35%' }}>{key}</td>
                  <td style={{ paddingBottom: 8 }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

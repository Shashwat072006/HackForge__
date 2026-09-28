// src/pages/hr/EmployeesPage.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, parseApiError } from '../../lib/api';
import type { Employee, LeaveBalance } from '../../types';
import { TableSkeleton } from '../../components/SkeletonRow';
import { fmtDate } from '../../lib/format';
import { useToast } from '../../contexts/ToastContext';

const ROLES = ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'];

interface CreateEmployeeResult {
  employee: Employee;
  balances: LeaveBalance[];
}

export default function EmployeesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [createdBalances, setCreatedBalances] = useState<LeaveBalance[] | null>(null);
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'EMPLOYEE', teamId: '', managerId: '',
    joinDate: new Date().toISOString().slice(0, 10),
    capacityFte: '1.0', jobRole: '',
  });

  const { data: employees, isLoading, isError, refetch } = useQuery<Employee[]>({
    queryKey: ['hr-employees'],
    queryFn: () => api.get<Employee[]>('/hr/employees').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.post<CreateEmployeeResult>('/hr/employees', {
        ...form,
        teamId: form.teamId ? Number(form.teamId) : undefined,
        managerId: form.managerId ? Number(form.managerId) : undefined,
        capacityFte: parseFloat(form.capacityFte),
      }).then((r) => r.data),
    onSuccess: (data) => {
      toast(`Employee ${data.employee.name} created!`, 'success');
      setCreatedBalances(data.balances);
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ['hr-employees'] });
    },
    onError: (err) => toast(parseApiError(err), 'error'),
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <span className="status-badge badge-danger">ADMIN</span>;
      case 'HR':
        return <span className="status-badge badge-warning">HR</span>;
      case 'MANAGER':
        return <span className="status-badge badge-info">MANAGER</span>;
      default:
        return <span className="status-badge badge-primary">EMPLOYEE</span>;
    }
  };

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="attendance-page-header">
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 500, color: '#333' }}>
            Employee Master Directory
          </h2>
          <div style={{ fontSize: 13, color: '#777' }}>
            HR Administration &gt; Personnel Records &amp; Leave Entitlements
          </div>
        </div>
        <button
          className="btn btn-gov-primary"
          id="btn-create-employee"
          onClick={() => { setShowForm(true); setCreatedBalances(null); }}
        >
          <span style={{ marginRight: 6 }}>+</span> Add New Employee
        </button>
      </div>

      {/* ── Pro-rated balances success notification ── */}
      {createdBalances && createdBalances.length > 0 && (
        <div className="callout callout-success" style={{ marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: 15 }}>Employee Created Successfully — Pro-rated Balances Generated</h4>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {createdBalances.map((b) => (
              <div key={b.leaveType} style={{ background: '#fff', border: '1px solid #d4edda', borderRadius: 3, padding: '6px 12px', fontSize: 13 }}>
                <strong>{b.leaveType.replace(/_/g, ' ')}:</strong> {b.available} / {b.total} days
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, marginTop: 8, color: '#155724' }}>
            * Entitlements have been pro-rated automatically according to the registered Joining Date.
          </div>
        </div>
      )}

      {/* ── Employees Directory Box ── */}
      <div className="box box-primary">
        <div className="box-header">
          <h3 className="box-title">Registered Personnel Records</h3>
          <div className="box-tools">
            <span className="badge badge-info">{employees?.length ?? 0} Employees Registered</span>
          </div>
        </div>

        <div className="box-body" style={{ padding: 0 }}>
          {isError ? (
            <div style={{ padding: 20, color: '#c0392b' }}>
              Failed to load employee records. <button className="btn btn-default btn-xs" onClick={() => refetch()}>Retry</button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="gov-table gov-table-striped">
                <thead>
                  <tr>
                    <th>Emp ID / Name</th>
                    <th>Email Address</th>
                    <th>Role</th>
                    <th>Assigned Team</th>
                    <th>Date of Joining</th>
                    <th>FTE Capacity</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <TableSkeleton rows={6} cols={6} />
                  ) : !employees?.length ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: 36, color: '#777' }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>No employees recorded yet</div>
                        <div style={{ fontSize: 13 }}>Click "+ Add New Employee" to register personnel.</div>
                      </td>
                    </tr>
                  ) : (
                    employees.map((e) => (
                      <tr key={e.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--gov-blue)' }}>{e.name}</div>
                          <div style={{ fontSize: 11, color: '#888' }}>ID: #{e.id}</div>
                        </td>
                        <td style={{ color: '#555' }}>{e.email}</td>
                        <td>{getRoleBadge(e.role)}</td>
                        <td>{e.teamName ? <span className="badge badge-secondary">{e.teamName}</span> : <span style={{ color: '#aaa' }}>—</span>}</td>
                        <td>{fmtDate(e.joinDate)}</td>
                        <td><strong>{e.capacityFte}</strong></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="box-footer" style={{ fontSize: 12, color: '#777', display: 'flex', justifyContent: 'space-between' }}>
          <span>National Informatics Centre (NIC) AEBAS Standard Directory</span>
          <span>Total Records: {employees?.length ?? 0}</span>
        </div>
      </div>

      {/* ── Add Employee Modal ── */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #eee', background: '#f9f9f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontWeight: 700, color: 'var(--gov-teal)' }}>Register New Employee</h4>
              <button onClick={() => setShowForm(false)} style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer' }}>&times;</button>
            </div>

            <form
              id="create-employee-form"
              onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}
            >
              <div className="modal-body" style={{ padding: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label className="gov-label" htmlFor="emp-name">Full Legal Name *</label>
                    <input id="emp-name" className="gov-input" value={form.name} onChange={set('name')} required placeholder="e.g. Ramesh Kumar" />
                  </div>
                  <div>
                    <label className="gov-label" htmlFor="emp-email">Official Email Address *</label>
                    <input id="emp-email" type="email" className="gov-input" value={form.email} onChange={set('email')} required placeholder="ramesh@nic.in" />
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label className="gov-label" htmlFor="emp-password">Portal Access Password *</label>
                  <input id="emp-password" type="password" className="gov-input" value={form.password} onChange={set('password')} required placeholder="Minimum 8 characters" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label className="gov-label" htmlFor="emp-role">Designated Role *</label>
                    <select id="emp-role" className="gov-select" value={form.role} onChange={set('role')}>
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="gov-label" htmlFor="emp-fte">Working Capacity (FTE) *</label>
                    <select id="emp-fte" className="gov-select" value={form.capacityFte} onChange={set('capacityFte')}>
                      <option value="1.0">1.0 (Full-time)</option>
                      <option value="0.5">0.5 (Part-time)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label className="gov-label" htmlFor="emp-team">Team / Division ID</label>
                    <input id="emp-team" className="gov-input" value={form.teamId} onChange={set('teamId')} placeholder="Optional (e.g. 1)" />
                  </div>
                  <div>
                    <label className="gov-label" htmlFor="emp-manager">Reporting Manager ID</label>
                    <input id="emp-manager" className="gov-input" value={form.managerId} onChange={set('managerId')} placeholder="Optional (e.g. 2)" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="gov-label" htmlFor="emp-joindate">Date of Joining *</label>
                    <input id="emp-joindate" type="date" className="gov-input" value={form.joinDate} onChange={set('joinDate')} required />
                  </div>
                  <div>
                    <label className="gov-label" htmlFor="emp-jobrole">Job Designation</label>
                    <input id="emp-jobrole" className="gov-input" value={form.jobRole} onChange={set('jobRole')} placeholder="e.g. Senior Officer" />
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '14px 20px', borderTop: '1px solid #eee', background: '#fdfdfd', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-default" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-gov-primary" id="btn-submit-employee" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Registering…' : 'Save & Allocate Balances'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// src/pages/manager/WorkloadPage.tsx
import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, downloadFile, parseApiError } from '../../lib/api';
import type { WorkloadTask } from '../../types';
import { TableSkeleton } from '../../components/SkeletonRow';
import { fmtDate } from '../../lib/format';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

export default function WorkloadPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [uploadErrors, setUploadErrors] = useState<{ row: number; message: string }[]>([]);
  const [deleteBatchId, setDeleteBatchId] = useState<number | null>(null);

  const teamId = user?.teamId;

  const { data: tasks, isLoading } = useQuery<WorkloadTask[]>({
    queryKey: ['workload-tasks', teamId, month],
    queryFn: () =>
      api.get<WorkloadTask[]>(`/workload/tasks?teamId=${teamId}&month=${month}`).then((r) => r.data),
    enabled: !!teamId,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('teamId', String(teamId));
      return api.post('/workload/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: (res) => {
      toast(`Uploaded successfully — ${(res.data as any)?.accepted ?? ''} tasks accepted`, 'success');
      setUploadErrors([]);
      qc.invalidateQueries({ queryKey: ['workload-tasks'] });
    },
    onError: (err: any) => {
      const data = err.response?.data;
      if (data?.code === 'UPLOAD_INVALID') {
        setUploadErrors(data.errors ?? []);
        toast('Upload had validation errors — nothing was saved', 'error');
      } else {
        toast(parseApiError(err), 'error');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/workload/batches/${id}`),
    onSuccess: () => {
      toast('Batch deleted', 'success');
      setDeleteBatchId(null);
      qc.invalidateQueries({ queryKey: ['workload-tasks'] });
    },
    onError: (err) => toast(parseApiError(err), 'error'),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = '';
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return <span className="status-badge badge-danger">HIGH</span>;
      case 'MEDIUM':
        return <span className="status-badge badge-warning">MEDIUM</span>;
      case 'LOW':
        return <span className="status-badge badge-success">LOW</span>;
      default:
        return <span className="status-badge badge-secondary">{priority}</span>;
    }
  };

  return (
    <div>
      {/* ── Page Header / Breadcrumb ── */}
      <div className="attendance-page-header">
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 500, color: '#333' }}>
          Team Workload Management
        </h2>
        <div style={{ fontSize: 13, color: '#777' }}>
          Management Portal &gt; Monthly Task Allocation &amp; Capacity
        </div>
      </div>

      {/* ── Upload & Filter Box ── */}
      <div className="box box-primary" style={{ marginBottom: 20 }}>
        <div className="box-header">
          <h3 className="box-title">Upload &amp; Filter Workload Schedule</h3>
        </div>
        <div className="box-body" style={{ padding: 20 }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <label className="gov-label" htmlFor="workload-month">
                  Target Workload Month
                </label>
                <input
                  id="workload-month"
                  type="month"
                  className="gov-input"
                  style={{ width: 220 }}
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                />
              </div>

              <div>
                <button
                  type="button"
                  className="btn btn-default"
                  id="btn-download-template"
                  onClick={() => downloadFile('/workload/template.xlsx', 'tasks-template.xlsx')}
                >
                  <span style={{ marginRight: 6 }}>⬇</span> Download Excel Template
                </button>
              </div>
            </div>

            <div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.csv"
                style={{ display: 'none' }}
                onChange={handleFileChange}
                id="input-workload-file"
              />
              <button
                type="button"
                className="btn btn-gov-primary"
                id="btn-upload-workload"
                disabled={uploadMutation.isPending}
                onClick={() => fileRef.current?.click()}
              >
                <span style={{ marginRight: 6 }}>⬆</span>
                {uploadMutation.isPending ? 'Uploading Spreadsheet…' : 'Upload .xlsx / .csv'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Upload Validation Errors ── */}
      {uploadErrors.length > 0 && (
        <div className="box box-danger" style={{ marginBottom: 20 }}>
          <div className="box-header" style={{ color: '#c0392b' }}>
            <h3 className="box-title">Upload Validation Errors — Nothing Was Saved</h3>
          </div>
          <div className="box-body" style={{ padding: 0 }}>
            <div className="table-responsive">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th style={{ width: 100 }}>Row #</th>
                    <th>Error Description</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadErrors.map((e, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700, color: '#c0392b' }}>Row {e.row}</td>
                      <td style={{ color: '#c0392b' }}>{e.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Tasks Table Box ── */}
      <div className="box box-info">
        <div className="box-header">
          <h3 className="box-title">Team Task Allocations for {month}</h3>
          <div className="box-tools">
            <span className="badge badge-info">{tasks?.length ?? 0} Tasks Listed</span>
          </div>
        </div>

        <div className="box-body" style={{ padding: 0 }}>
          <div className="table-responsive">
            <table className="gov-table gov-table-striped">
              <thead>
                <tr>
                  <th>Task Name</th>
                  <th>Effort (Hours)</th>
                  <th>Start Date</th>
                  <th>Due Date</th>
                  <th>Priority</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <TableSkeleton rows={5} cols={6} />
                ) : !tasks?.length ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 36, color: '#777' }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
                      <div style={{ fontSize: 16, fontWeight: 600 }}>No tasks found for {month}</div>
                      <div style={{ fontSize: 13 }}>Upload an Excel or CSV file to populate task schedules for this month.</div>
                    </td>
                  </tr>
                ) : (
                  tasks.map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600 }}>{t.name}</td>
                      <td><strong>{t.effortHours} hrs</strong></td>
                      <td>{fmtDate(t.startDate)}</td>
                      <td>{fmtDate(t.dueDate)}</td>
                      <td>{getPriorityBadge(t.priority)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn btn-default btn-xs"
                          style={{ color: '#c0392b', borderColor: '#f8d7da' }}
                          onClick={() => setDeleteBatchId(t.batchId)}
                          id={`btn-delete-batch-${t.batchId}`}
                        >
                          ✕ Delete Batch #{t.batchId}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="box-footer" style={{ fontSize: 12, color: '#777', display: 'flex', justifyContent: 'space-between' }}>
          <span>NIC / Attendance.gov.in Compliant Management Engine</span>
          <span>Target Team ID: #{teamId ?? 'N/A'}</span>
        </div>
      </div>

      {/* ── Delete Confirmation Modal ── */}
      {deleteBatchId != null && (
        <div className="modal-overlay" onClick={() => setDeleteBatchId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #eee', background: '#f9f9f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontWeight: 700, color: '#c0392b' }}>Confirm Batch Deletion</h4>
              <button className="close" onClick={() => setDeleteBatchId(null)} style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer' }}>&times;</button>
            </div>
            <div className="modal-body" style={{ padding: 20 }}>
              <p style={{ margin: 0, color: '#444', lineHeight: 1.5 }}>
                Are you sure you want to delete all tasks associated with <strong>Batch #{deleteBatchId}</strong>?
                This action is irreversible and will affect feasibility scoring.
              </p>
            </div>
            <div className="modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid #eee', background: '#fdfdfd', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-default" onClick={() => setDeleteBatchId(null)}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                id="btn-confirm-delete-batch"
                onClick={() => deleteMutation.mutate(deleteBatchId)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Yes, Delete Batch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

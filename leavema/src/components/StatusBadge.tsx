// src/components/StatusBadge.tsx
import React from 'react';
import type { LeaveStatus } from '../types';

const STATUS_MAP: Record<LeaveStatus, { label: string; cls: string }> = {
  PENDING_MANAGER: { label: 'Awaiting Manager', cls: 'label-warning' },
  PENDING_HR:      { label: 'Awaiting HR',      cls: 'label-primary' },
  ESCALATED:       { label: 'Escalated to HR',  cls: 'label-danger' },
  APPROVED:        { label: 'Approved',         cls: 'label-success' },
  REJECTED:        { label: 'Rejected',         cls: 'label-danger' },
  CANCELLED:       { label: 'Cancelled',        cls: 'label-default' },
};

export default function StatusBadge({ status }: { status: LeaveStatus }) {
  const { label, cls } = STATUS_MAP[status] ?? { label: status, cls: 'label-default' };
  return <span className={`label ${cls}`}>{label}</span>;
}

// Feasibility badge
type Feasibility = 'FULLY_FEASIBLE' | 'PARTIALLY_FEASIBLE' | 'NOT_FEASIBLE';
const FEAS_MAP: Record<Feasibility, { label: string; cls: string }> = {
  FULLY_FEASIBLE:     { label: 'Fully Feasible',     cls: 'label-success' },
  PARTIALLY_FEASIBLE: { label: 'Partially Feasible', cls: 'label-warning' },
  NOT_FEASIBLE:       { label: 'Not Feasible',       cls: 'label-danger' },
};
export function FeasibilityBadge({ status }: { status: Feasibility }) {
  const { label, cls } = FEAS_MAP[status] ?? { label: status, cls: 'label-default' };
  return <span className={`label ${cls}`}>{label}</span>;
}

// Risk badge
type Risk = 'LOW' | 'MEDIUM' | 'HIGH';
const RISK_MAP: Record<Risk, string> = { LOW: 'label-success', MEDIUM: 'label-warning', HIGH: 'label-danger' };
export function RiskBadge({ level }: { level: Risk }) {
  return <span className={`label ${RISK_MAP[level]}`}>{level}</span>;
}

// Simulation task status
type TaskStatus = 'ON_TRACK' | 'AT_RISK' | 'MISSED';
const TASK_MAP: Record<TaskStatus, { label: string; cls: string }> = {
  ON_TRACK: { label: 'On Track', cls: 'label-success' },
  AT_RISK:  { label: 'At Risk',  cls: 'label-warning' },
  MISSED:   { label: 'Missed',   cls: 'label-danger' },
};
export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const { label, cls } = TASK_MAP[status] ?? { label: status, cls: 'label-default' };
  return <span className={`label ${cls}`}>{label}</span>;
}

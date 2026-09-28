// src/types/index.ts

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'EMPLOYEE' | 'MANAGER' | 'HR' | 'ADMIN';
  teamId?: number;
  teamName?: string;
}

export interface LeaveBalance {
  leaveType: string;
  available: number;
  used: number;
  pending: number;
  total: number;
}

export interface LeaveRequest {
  id: number;
  employeeId: number;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  workingDays: number;
  reason: string;
  status: LeaveStatus;
  stageDeadline?: string;
  createdAt: string;
  conflictBadge?: boolean;
  overlappingEmployees?: string[];
  feasibilityPercent?: number;
  escalationLevel?: number;
  cancelledAt?: string;
}

export type LeaveStatus =
  | 'PENDING_MANAGER'
  | 'PENDING_HR'
  | 'ESCALATED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export interface LeaveHistory {
  at: string;
  actor: string | null;
  action: string;
  comment?: string;
}

export interface Notification {
  id: number;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface AvailabilityCell {
  date: string;
  absentFte: number;
  totalFte: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  employees?: string[];
}

export interface Holiday {
  id: number;
  date: string;
  name: string;
}

export interface PeakPeriod {
  id: number;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Employee {
  id: number;
  name: string;
  email: string;
  role: string;
  teamName?: string;
  managerName?: string;
  joinDate: string;
  capacityFte: number;
  jobRole?: string;
}

export interface WorkloadTask {
  id: number;
  name: string;
  effortHours: number;
  startDate: string;
  dueDate: string;
  priority: string;
  batchId: number;
  teamId: number;
}

export interface WorkloadBatch {
  id: number;
  teamId: number;
  month: string;
  uploadedAt: string;
  taskCount: number;
}

// ─── Leave Preview ────────────────────────────────────────────
export interface PreviewBalance {
  available: number;
  after: number;
  leaveType: string;
}

export interface FeasibilityDay {
  date: string;
  feasible: boolean;
  supplyFte: number;
  demandFte: number;
}

export interface FeasibilityWindow {
  startDate: string;
  endDate: string;
}

export interface Suggestion {
  startDate: string;
  endDate: string;
  feasibilityPercent: number;
}

export interface LeavePreview {
  workingDays: number;
  balance: PreviewBalance;
  feasibility: {
    status: 'FULLY_FEASIBLE' | 'PARTIALLY_FEASIBLE' | 'NOT_FEASIBLE';
    feasibleDays: number;
    totalWorkingDays: number;
    feasibilityPercent: number;
    days: FeasibilityDay[];
    feasibleWindows: FeasibilityWindow[];
  };
  suggestions: Suggestion[];
  warnings: string[];
}

// ─── Simulation ───────────────────────────────────────────────
export interface SimulationDay {
  date: string;
  supplyHours: number;
  plannedDemandHours: number;
  backlogHours: number;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface SimulationTask {
  id: number;
  name: string;
  dueDate: string;
  effortHours: number;
  completedOn?: string;
  status: 'ON_TRACK' | 'AT_RISK' | 'MISSED';
  shortfallHours: number;
}

export interface SimulationResult {
  summary: {
    peakRiskDate: string;
    totalShortfallHours: number;
    atRiskTasks: number;
    missedTasks: number;
    extraFteNeeded: number;
    extraFteWindow?: { startDate: string; endDate: string };
  };
  days: SimulationDay[];
  tasks: SimulationTask[];
}

// ─── Recommendation ───────────────────────────────────────────
export interface Recommendation {
  decision: 'APPROVE' | 'APPROVE_WITH_CONDITIONS' | 'RESCHEDULE_SUGGESTED';
  reasons: string[];
  newlyAtRiskTasks: string[];
  alternatives: { startDate: string; endDate: string }[];
}

// ─── Reports ──────────────────────────────────────────────────
export interface Report {
  id: number;
  fromDate: string;
  toDate: string;
  generatedAt: string;
  rowCount: number;
  generatedBy: string | null;
}

// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';
import type {
  User,
  LeaveBalance,
  LeaveRequest,
  LeaveHistory,
  Notification,
  AvailabilityCell,
  Holiday,
  PeakPeriod,
  Employee,
  WorkloadTask,
  WorkloadBatch,
  LeavePreview,
  SimulationResult,
  Recommendation,
  Report,
} from '../types';

// Initial Users
const USERS: Record<string, User> = {
  'admin@demo.com': { id: 1, name: 'Alex Rivera', email: 'admin@demo.com', role: 'ADMIN', teamId: 1, teamName: 'Core Platform' },
  'hr@demo.com': { id: 2, name: 'Helena Vance', email: 'hr@demo.com', role: 'HR', teamId: 1, teamName: 'Core Platform' },
  'manager@demo.com': { id: 3, name: 'Marcus Sterling', email: 'manager@demo.com', role: 'MANAGER', teamId: 1, teamName: 'Core Platform' },
  'alice@demo.com': { id: 4, name: 'Alice Chen', email: 'alice@demo.com', role: 'EMPLOYEE', teamId: 1, teamName: 'Core Platform' },
  'bob@demo.com': { id: 5, name: 'Bob Martinez', email: 'bob@demo.com', role: 'EMPLOYEE', teamId: 1, teamName: 'Core Platform' },
  'carol@demo.com': { id: 6, name: 'Carol Danvers', email: 'carol@demo.com', role: 'EMPLOYEE', teamId: 1, teamName: 'Core Platform' },
  'jack@demo.com': { id: 7, name: 'Jack Daniels', email: 'jack@demo.com', role: 'EMPLOYEE', teamId: 1, teamName: 'Core Platform' },
};

// Initial Balances keyed by employeeId
const BALANCES: Record<number, LeaveBalance[]> = {
  4: [
    { leaveType: 'ANNUAL', available: 14, used: 6, pending: 0, total: 20 },
    { leaveType: 'SICK', available: 8, used: 2, pending: 0, total: 10 },
    { leaveType: 'CASUAL', available: 4, used: 1, pending: 0, total: 5 },
  ],
  5: [
    { leaveType: 'ANNUAL', available: 16, used: 4, pending: 0, total: 20 },
    { leaveType: 'SICK', available: 10, used: 0, pending: 0, total: 10 },
    { leaveType: 'CASUAL', available: 5, used: 0, pending: 0, total: 5 },
  ],
  3: [
    { leaveType: 'ANNUAL', available: 18, used: 2, pending: 0, total: 20 },
    { leaveType: 'SICK', available: 9, used: 1, pending: 0, total: 10 },
    { leaveType: 'CASUAL', available: 5, used: 0, pending: 0, total: 5 },
  ],
  2: [
    { leaveType: 'ANNUAL', available: 15, used: 5, pending: 0, total: 20 },
    { leaveType: 'SICK', available: 10, used: 0, pending: 0, total: 10 },
    { leaveType: 'CASUAL', available: 5, used: 0, pending: 0, total: 5 },
  ],
  1: [
    { leaveType: 'ANNUAL', available: 20, used: 0, pending: 0, total: 20 },
    { leaveType: 'SICK', available: 10, used: 0, pending: 0, total: 10 },
    { leaveType: 'CASUAL', available: 5, used: 0, pending: 0, total: 5 },
  ],
};

// Initial Leave Requests
let LEAVES: LeaveRequest[] = [
  {
    id: 101,
    employeeId: 5, // Bob
    employeeName: 'Bob Martinez',
    leaveType: 'ANNUAL',
    startDate: '2026-10-12',
    endDate: '2026-10-16',
    workingDays: 5,
    reason: 'Pre-scheduled family holiday',
    status: 'APPROVED',
    createdAt: '2026-09-15T09:00:00Z',
    feasibilityPercent: 95,
  },
  {
    id: 102,
    employeeId: 6, // Carol
    employeeName: 'Carol Danvers',
    leaveType: 'ANNUAL',
    startDate: '2026-10-15',
    endDate: '2026-10-19',
    workingDays: 3,
    reason: 'Medical procedure & recovery',
    status: 'PENDING_MANAGER',
    stageDeadline: new Date(Date.now() + 6 * 3600 * 1000 + 12 * 60 * 1000).toISOString(),
    createdAt: '2026-09-27T10:00:00Z',
    conflictBadge: true,
    overlappingEmployees: ['Bob Martinez'],
    feasibilityPercent: 60,
    escalationLevel: 0,
  },
  {
    id: 103,
    employeeId: 7, // Jack
    employeeName: 'Jack Daniels',
    leaveType: 'CASUAL',
    startDate: '2026-10-05',
    endDate: '2026-10-06',
    workingDays: 2,
    reason: 'Personal affairs',
    status: 'PENDING_MANAGER',
    stageDeadline: new Date(Date.now() - 3600 * 1000).toISOString(), // overdue for escalation test
    createdAt: '2026-09-20T08:30:00Z',
    conflictBadge: false,
    overlappingEmployees: [],
    feasibilityPercent: 100,
    escalationLevel: 0,
  },
];

// History logs keyed by leave id
const HISTORIES: Record<number, LeaveHistory[]> = {
  101: [
    { at: '2026-09-15T09:00:00Z', actor: 'Bob Martinez', action: 'SUBMITTED', comment: 'Annual leave requested' },
    { at: '2026-09-16T11:20:00Z', actor: 'Marcus Sterling', action: 'APPROVED', comment: 'Approved. Good to go.' },
    { at: '2026-09-16T14:15:00Z', actor: 'Helena Vance', action: 'FINAL_APPROVED', comment: 'HR approved.' },
  ],
  102: [
    { at: '2026-09-27T10:00:00Z', actor: 'Carol Danvers', action: 'SUBMITTED', comment: 'Need recovery time' },
  ],
  103: [
    { at: '2026-09-20T08:30:00Z', actor: 'Jack Daniels', action: 'SUBMITTED', comment: 'Personal' },
  ],
};

// Notifications
let NOTIFICATIONS: Notification[] = [
  { id: 1, message: 'Welcome to LeaveMa intelligent leave portal', read: false, createdAt: new Date().toISOString() },
  { id: 2, message: 'Q4 holiday calendar has been updated by HR', read: false, createdAt: new Date(Date.now() - 86400000).toISOString() },
];

// Employees list for HR
let EMPLOYEES: Employee[] = [
  { id: 1, name: 'Alex Rivera', email: 'admin@demo.com', role: 'ADMIN', teamName: 'Core Platform', joinDate: '2024-01-15', capacityFte: 1.0, jobRole: 'Systems Lead' },
  { id: 2, name: 'Helena Vance', email: 'hr@demo.com', role: 'HR', teamName: 'People & Culture', joinDate: '2024-03-01', capacityFte: 1.0, jobRole: 'HR Director' },
  { id: 3, name: 'Marcus Sterling', email: 'manager@demo.com', role: 'MANAGER', teamName: 'Core Platform', joinDate: '2024-02-10', capacityFte: 1.0, jobRole: 'Engineering Manager' },
  { id: 4, name: 'Alice Chen', email: 'alice@demo.com', role: 'EMPLOYEE', teamName: 'Core Platform', managerName: 'Marcus Sterling', joinDate: '2025-01-10', capacityFte: 1.0, jobRole: 'Senior Frontend Engineer' },
  { id: 5, name: 'Bob Martinez', email: 'bob@demo.com', role: 'EMPLOYEE', teamName: 'Core Platform', managerName: 'Marcus Sterling', joinDate: '2025-02-01', capacityFte: 1.0, jobRole: 'Backend Engineer' },
  { id: 6, name: 'Carol Danvers', email: 'carol@demo.com', role: 'EMPLOYEE', teamName: 'Core Platform', managerName: 'Marcus Sterling', joinDate: '2025-03-15', capacityFte: 0.5, jobRole: 'QA Specialist' },
  { id: 7, name: 'Jack Daniels', email: 'jack@demo.com', role: 'EMPLOYEE', teamName: 'Core Platform', managerName: 'Marcus Sterling', joinDate: '2025-05-01', capacityFte: 1.0, jobRole: 'DevOps Engineer' },
];

// Holidays
let HOLIDAYS: Holiday[] = [
  { id: 1, date: '2026-01-01', name: "New Year's Day" },
  { id: 2, date: '2026-05-01', name: 'Labor Day' },
  { id: 3, date: '2026-10-02', name: 'Gandhi Jayanti' },
  { id: 4, date: '2026-12-25', name: 'Christmas Day' },
];

// Peak Periods
let PEAK_PERIODS: PeakPeriod[] = [
  { id: 1, startDate: '2026-11-20', endDate: '2026-12-05', description: 'Black Friday / Cyber Monday Release freeze' },
  { id: 2, startDate: '2026-12-20', endDate: '2026-12-31', description: 'Year-end financial closing & audit' },
];

// Workload tasks
let WORKLOAD_TASKS: WorkloadTask[] = [
  { id: 1, name: 'Migrate Core Database to Cluster v4', effortHours: 40, startDate: '2026-10-05', dueDate: '2026-10-16', priority: 'HIGH', batchId: 1, teamId: 1 },
  { id: 2, name: 'OAuth2 Multi-Factor Auth Gateway', effortHours: 32, startDate: '2026-10-12', dueDate: '2026-10-20', priority: 'CRITICAL', batchId: 1, teamId: 1 },
  { id: 3, name: 'Real-time Webhook Notification Service', effortHours: 24, startDate: '2026-10-14', dueDate: '2026-10-22', priority: 'MEDIUM', batchId: 1, teamId: 1 },
  { id: 4, name: 'PCI-DSS Compliance Documentation', effortHours: 16, startDate: '2026-10-08', dueDate: '2026-10-15', priority: 'HIGH', batchId: 1, teamId: 1 },
];

let WORKLOAD_BATCHES: WorkloadBatch[] = [
  { id: 1, teamId: 1, month: '2026-10', uploadedAt: '2026-09-20T10:00:00Z', taskCount: 4 },
];

// Reports
let REPORTS: Report[] = [
  { id: 1, fromDate: '2026-08-01', toDate: '2026-08-31', generatedAt: '2026-09-01T08:00:00Z', rowCount: 14, generatedBy: 'Helena Vance' },
  { id: 2, fromDate: '2026-09-01', toDate: '2026-09-25', generatedAt: '2026-09-25T14:30:00Z', rowCount: 9, generatedBy: 'System' },
];

// Helper to get active user from request
function getUserFromRequest(request: Request): User {
  const auth = request.headers.get('Authorization');
  if (auth && auth.startsWith('Bearer ')) {
    const token = auth.replace('Bearer ', '');
    const found = Object.values(USERS).find((u) => `demo-token-${u.email}` === token);
    if (found) return found;
  }
  const stored = typeof window !== 'undefined' ? localStorage.getItem('lm_user') : null;
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // fallback
    }
  }
  return USERS['alice@demo.com'];
}

export const handlers = [
  // ── Auth: Login ──────────────────────────────────────────
  http.post('*/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.toLowerCase().trim() || '';
    const user = USERS[email];
    if (!user) {
      return HttpResponse.json(
        { title: 'Unauthorized', status: 401, detail: 'Invalid email or password', code: 'INVALID_CREDENTIALS', timestamp: new Date().toISOString() },
        { status: 401 }
      );
    }
    const token = `demo-token-${user.email}`;
    return HttpResponse.json({ token, user });
  }),

  // ── Auth: Me ─────────────────────────────────────────────
  http.get('*/api/me', ({ request }) => {
    const user = getUserFromRequest(request);
    return HttpResponse.json(user);
  }),

  // ── Balances: My ─────────────────────────────────────────
  http.get('*/api/balances/my', ({ request }) => {
    const user = getUserFromRequest(request);
    const balances = BALANCES[user.id] || BALANCES[4];
    return HttpResponse.json(balances);
  }),

  // ── Leaves: My list ──────────────────────────────────────
  http.get('*/api/leaves/my', ({ request }) => {
    const user = getUserFromRequest(request);
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status');

    let list = LEAVES.filter((l) => l.employeeId === user.id);
    if (statusFilter) {
      const statuses = statusFilter.split(',');
      list = list.filter((l) => statuses.includes(l.status));
    }
    return HttpResponse.json(list);
  }),

  // ── Leaves: Preview ──────────────────────────────────────
  http.post('*/api/leaves/preview', async ({ request }) => {
    const user = getUserFromRequest(request);
    const body = (await request.json()) as {
      leaveType: string;
      startDate: string;
      endDate: string;
      reason: string;
    };

    const s = new Date(body.startDate);
    const e = new Date(body.endDate);
    let workingDays = 0;
    const cur = new Date(s);
    const daysList: Array<{ date: string; feasible: boolean; supplyFte: number; demandFte: number }> = [];

    // Check if overlaps with conflict week (Oct 12-16, 2026 or similar)
    const isConflictPeriod =
      (body.startDate >= '2026-10-12' && body.startDate <= '2026-10-16') ||
      (body.endDate >= '2026-10-12' && body.endDate <= '2026-10-16') ||
      (body.startDate <= '2026-10-12' && body.endDate >= '2026-10-16');

    while (cur <= e) {
      const dayOfWeek = cur.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
        const dateStr = cur.toISOString().split('T')[0];
        // On conflict dates (Oct 15, 16), mark infeasible
        const isProblemDay = isConflictPeriod && (dateStr === '2026-10-15' || dateStr === '2026-10-16');
        daysList.push({
          date: dateStr,
          feasible: !isProblemDay,
          supplyFte: isProblemDay ? 1.5 : 3.5,
          demandFte: isProblemDay ? 2.5 : 1.0,
        });
      }
      cur.setDate(cur.getDate() + 1);
    }

    if (workingDays === 0) workingDays = 1;

    const userBalances = BALANCES[user.id] || BALANCES[4];
    const balObj = userBalances.find((b) => b.leaveType === body.leaveType) || userBalances[0];
    const available = balObj.available;
    const after = available - workingDays;

    let feasibilityStatus: 'FULLY_FEASIBLE' | 'PARTIALLY_FEASIBLE' | 'NOT_FEASIBLE' = 'FULLY_FEASIBLE';
    let feasibilityPercent = 100;
    const feasibleDays = daysList.filter((d) => d.feasible).length;

    if (isConflictPeriod && daysList.length > 0) {
      feasibilityPercent = Math.round((feasibleDays / daysList.length) * 100);
      feasibilityStatus = feasibilityPercent >= 100 ? 'FULLY_FEASIBLE' : feasibilityPercent > 0 ? 'PARTIALLY_FEASIBLE' : 'NOT_FEASIBLE';
    }

    const preview: LeavePreview = {
      workingDays,
      balance: {
        leaveType: body.leaveType,
        available,
        after,
      },
      feasibility: {
        status: isConflictPeriod ? 'PARTIALLY_FEASIBLE' : 'FULLY_FEASIBLE',
        feasibleDays: isConflictPeriod ? 3 : workingDays,
        totalWorkingDays: workingDays,
        feasibilityPercent: isConflictPeriod ? 60 : 100,
        days: daysList,
        feasibleWindows: isConflictPeriod
          ? [{ startDate: '2026-10-12', endDate: '2026-10-14' }]
          : [{ startDate: body.startDate, endDate: body.endDate }],
      },
      suggestions: isConflictPeriod
        ? [
            { startDate: '2026-10-19', endDate: '2026-10-23', feasibilityPercent: 100 },
            { startDate: '2026-10-26', endDate: '2026-10-30', feasibilityPercent: 100 },
          ]
        : [],
      warnings: isConflictPeriod
        ? [
            'Team capacity falls below the 70% threshold on Oct 15 & 16 due to overlapping leaves with Bob Martinez.',
            'Key milestone "Database Migration v4" is due during this window.',
          ]
        : [],
    };

    return HttpResponse.json(preview);
  }),

  // ── Leaves: Apply (Create) ───────────────────────────────
  http.post('*/api/leaves', async ({ request }) => {
    const user = getUserFromRequest(request);
    const body = (await request.json()) as {
      leaveType: string;
      startDate: string;
      endDate: string;
      reason: string;
    };

    // Calculate working days
    const s = new Date(body.startDate);
    const e = new Date(body.endDate);
    let workingDays = 0;
    const cur = new Date(s);
    while (cur <= e) {
      const d = cur.getDay();
      if (d !== 0 && d !== 6) workingDays++;
      cur.setDate(cur.getDate() + 1);
    }
    if (workingDays === 0) workingDays = 1;

    const isConflict =
      (body.startDate >= '2026-10-12' && body.startDate <= '2026-10-16') ||
      (body.endDate >= '2026-10-12' && body.endDate <= '2026-10-16');

    const newLeave: LeaveRequest = {
      id: Date.now(),
      employeeId: user.id,
      employeeName: user.name,
      leaveType: body.leaveType,
      startDate: body.startDate,
      endDate: body.endDate,
      workingDays,
      reason: body.reason,
      status: 'PENDING_MANAGER',
      stageDeadline: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      conflictBadge: isConflict,
      overlappingEmployees: isConflict ? ['Bob Martinez'] : [],
      feasibilityPercent: isConflict ? 60 : 100,
      escalationLevel: 0,
    };

    LEAVES.unshift(newLeave);

    // Update user balance: move available to pending
    const userBalances = BALANCES[user.id];
    if (userBalances) {
      const bal = userBalances.find((b) => b.leaveType === body.leaveType);
      if (bal) {
        bal.available = Math.max(0, bal.available - workingDays);
        bal.pending += workingDays;
      }
    }

    HISTORIES[newLeave.id] = [
      {
        at: new Date().toISOString(),
        actor: user.name,
        action: 'SUBMITTED',
        comment: body.reason || 'Leave requested',
      },
    ];

    return HttpResponse.json(newLeave, { status: 201 });
  }),

  // ── Leaves: Single & History ─────────────────────────────
  http.get('*/api/leaves/:id/history', ({ params }) => {
    const id = Number(params.id);
    const hist = HISTORIES[id] || [
      { at: new Date().toISOString(), actor: null, action: 'SUBMITTED', comment: 'Initial request' },
    ];
    return HttpResponse.json(hist);
  }),

  http.get('*/api/leaves/:id', ({ params }) => {
    const id = Number(params.id);
    const leave = LEAVES.find((l) => l.id === id);
    if (!leave) {
      return HttpResponse.json({ title: 'Not Found', status: 404, detail: 'Leave not found', code: 'NOT_FOUND' }, { status: 404 });
    }
    return HttpResponse.json(leave);
  }),

  // ── Leaves: Cancel ───────────────────────────────────────
  http.post('*/api/leaves/:id/cancel', async ({ params, request }) => {
    const id = Number(params.id);
    const user = getUserFromRequest(request);
    let body: { comment?: string } = {};
    try {
      body = (await request.json()) as { comment?: string };
    } catch {
      // optional
    }

    const leave = LEAVES.find((l) => l.id === id);
    if (!leave) {
      return HttpResponse.json({ title: 'Not Found', status: 404, detail: 'Leave not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    leave.status = 'CANCELLED';
    leave.cancelledAt = new Date().toISOString();

    // restore balance
    const userBalances = BALANCES[leave.employeeId];
    if (userBalances) {
      const bal = userBalances.find((b) => b.leaveType === leave.leaveType);
      if (bal) {
        bal.available += leave.workingDays;
        bal.pending = Math.max(0, bal.pending - leave.workingDays);
      }
    }

    if (!HISTORIES[id]) HISTORIES[id] = [];
    HISTORIES[id].push({
      at: new Date().toISOString(),
      actor: user.name,
      action: 'CANCELLED',
      comment: body.comment || 'Cancelled by employee',
    });

    return HttpResponse.json({ success: true, leave });
  }),

  // ── Notifications ────────────────────────────────────────
  http.get('*/api/notifications', () => {
    return HttpResponse.json(NOTIFICATIONS);
  }),

  http.post('*/api/notifications/:id/read', ({ params }) => {
    const id = Number(params.id);
    const notif = NOTIFICATIONS.find((n) => n.id === id);
    if (notif) notif.read = true;
    return HttpResponse.json({ success: true });
  }),

  // ── Manager: Approvals Queue ─────────────────────────────
  http.get('*/api/manager/approvals', ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'PENDING_MANAGER';
    const statuses = status.split(',');
    const list = LEAVES.filter((l) => statuses.includes(l.status));
    return HttpResponse.json(list);
  }),

  http.post('*/api/manager/leaves/:id/approve', async ({ params, request }) => {
    const id = Number(params.id);
    const user = getUserFromRequest(request);
    let body: { comment?: string } = {};
    try {
      body = (await request.json()) as { comment?: string };
    } catch {
      // optional
    }

    const leave = LEAVES.find((l) => l.id === id);
    if (!leave) {
      return HttpResponse.json({ title: 'Not Found', status: 404, detail: 'Leave request not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    leave.status = 'PENDING_HR';
    leave.stageDeadline = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    if (!HISTORIES[id]) HISTORIES[id] = [];
    HISTORIES[id].push({
      at: new Date().toISOString(),
      actor: user.name || 'Marcus Sterling',
      action: 'MANAGER_APPROVED',
      comment: body.comment || 'Approved by Manager. Forwarded to HR.',
    });

    return HttpResponse.json(leave);
  }),

  http.post('*/api/manager/leaves/:id/reject', async ({ params, request }) => {
    const id = Number(params.id);
    const user = getUserFromRequest(request);
    const body = (await request.json()) as { comment: string };

    if (!body.comment || !body.comment.trim()) {
      return HttpResponse.json(
        { title: 'Validation Error', status: 400, detail: 'Rejection reason is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const leave = LEAVES.find((l) => l.id === id);
    if (!leave) {
      return HttpResponse.json({ title: 'Not Found', status: 404, detail: 'Leave request not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    leave.status = 'REJECTED';

    // restore balance
    const userBalances = BALANCES[leave.employeeId];
    if (userBalances) {
      const bal = userBalances.find((b) => b.leaveType === leave.leaveType);
      if (bal) {
        bal.available += leave.workingDays;
        bal.pending = Math.max(0, bal.pending - leave.workingDays);
      }
    }

    if (!HISTORIES[id]) HISTORIES[id] = [];
    HISTORIES[id].push({
      at: new Date().toISOString(),
      actor: user.name || 'Marcus Sterling',
      action: 'MANAGER_REJECTED',
      comment: body.comment,
    });

    return HttpResponse.json(leave);
  }),

  // ── HR: Approvals Queue ──────────────────────────────────
  http.get('*/api/hr/approvals', ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'PENDING_HR,ESCALATED';
    const statuses = status.split(',');
    const list = LEAVES.filter((l) => statuses.includes(l.status));
    return HttpResponse.json(list);
  }),

  http.post('*/api/hr/leaves/:id/approve', async ({ params, request }) => {
    const id = Number(params.id);
    const user = getUserFromRequest(request);
    let body: { comment?: string } = {};
    try {
      body = (await request.json()) as { comment?: string };
    } catch {
      // optional
    }

    const leave = LEAVES.find((l) => l.id === id);
    if (!leave) {
      return HttpResponse.json({ title: 'Not Found', status: 404, detail: 'Leave request not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    leave.status = 'APPROVED';

    // Transfer pending to used in employee balance
    const userBalances = BALANCES[leave.employeeId];
    if (userBalances) {
      const bal = userBalances.find((b) => b.leaveType === leave.leaveType);
      if (bal) {
        bal.pending = Math.max(0, bal.pending - leave.workingDays);
        bal.used += leave.workingDays;
      }
    }

    if (!HISTORIES[id]) HISTORIES[id] = [];
    HISTORIES[id].push({
      at: new Date().toISOString(),
      actor: user.name || 'Helena Vance',
      action: 'HR_APPROVED',
      comment: body.comment || 'Final approval granted by HR.',
    });

    return HttpResponse.json(leave);
  }),

  http.post('*/api/hr/leaves/:id/reject', async ({ params, request }) => {
    const id = Number(params.id);
    const user = getUserFromRequest(request);
    const body = (await request.json()) as { comment: string };

    if (!body.comment || !body.comment.trim()) {
      return HttpResponse.json(
        { title: 'Validation Error', status: 400, detail: 'Rejection reason is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const leave = LEAVES.find((l) => l.id === id);
    if (!leave) {
      return HttpResponse.json({ title: 'Not Found', status: 404, detail: 'Leave request not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    leave.status = 'REJECTED';

    const userBalances = BALANCES[leave.employeeId];
    if (userBalances) {
      const bal = userBalances.find((b) => b.leaveType === leave.leaveType);
      if (bal) {
        bal.available += leave.workingDays;
        bal.pending = Math.max(0, bal.pending - leave.workingDays);
      }
    }

    if (!HISTORIES[id]) HISTORIES[id] = [];
    HISTORIES[id].push({
      at: new Date().toISOString(),
      actor: user.name || 'Helena Vance',
      action: 'HR_REJECTED',
      comment: body.comment,
    });

    return HttpResponse.json(leave);
  }),

  // ── AI Recommendation ────────────────────────────────────
  http.post('*/api/leaves/:id/recommendation', ({ params }) => {
    const id = Number(params.id);
    const leave = LEAVES.find((l) => l.id === id);

    const isConflict = leave ? leave.conflictBadge || leave.workingDays >= 3 : true;

    const recommendation: Recommendation = isConflict
      ? {
          decision: 'APPROVE_WITH_CONDITIONS',
          reasons: [
            'Team capacity is 60% during Oct 15-16 due to concurrent leave of Bob Martinez.',
            'Task "Database Migration v4" requires senior oversight.',
            'Recommendation: Approve provided Alice delegates code review duties to Jack.',
          ],
          newlyAtRiskTasks: ['Migrate Core Database to Cluster v4', 'PCI-DSS Compliance Documentation'],
          alternatives: [
            { startDate: '2026-10-19', endDate: '2026-10-23' },
            { startDate: '2026-10-26', endDate: '2026-10-30' },
          ],
        }
      : {
          decision: 'APPROVE',
          reasons: ['Full team capacity available (100% feasibility).', 'No critical release freezes active during this period.'],
          newlyAtRiskTasks: [],
          alternatives: [],
        };

    return HttpResponse.json(recommendation);
  }),

  // ── Team Availability Heatmap ────────────────────────────
  http.get('*/api/teams/:teamId/availability', ({ request }) => {
    const url = new URL(request.url);
    const from = url.searchParams.get('from') || '2026-10-01';
    const to = url.searchParams.get('to') || '2026-10-31';

    const cells: AvailabilityCell[] = [];
    const cur = new Date(from);
    const end = new Date(to);

    while (cur <= end) {
      const dayOfWeek = cur.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const dateStr = cur.toISOString().split('T')[0];
        // October 15 and 16 have high absence
        if (dateStr === '2026-10-15' || dateStr === '2026-10-16') {
          cells.push({
            date: dateStr,
            absentFte: 2.0,
            totalFte: 5.0,
            level: 'HIGH',
            employees: ['Bob Martinez', 'Carol Danvers'],
          });
        } else if (dateStr >= '2026-10-12' && dateStr <= '2026-10-14') {
          cells.push({
            date: dateStr,
            absentFte: 1.0,
            totalFte: 5.0,
            level: 'MEDIUM',
            employees: ['Bob Martinez'],
          });
        } else {
          cells.push({
            date: dateStr,
            absentFte: 0.0,
            totalFte: 5.0,
            level: 'LOW',
            employees: [],
          });
        }
      }
      cur.setDate(cur.getDate() + 1);
    }

    return HttpResponse.json(cells);
  }),

  // ── Workload & Tasks ─────────────────────────────────────
  http.get('*/api/workload/template.xlsx', () => {
    // Generate mock CSV/Excel content blob
    const csvContent = 'Task Name,Effort Hours,Start Date,Due Date,Priority\nAPI Gateway Setup,30,2026-10-01,2026-10-10,HIGH\nData Migration,40,2026-10-12,2026-10-20,CRITICAL\n';
    const blob = new Blob([csvContent], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    return new HttpResponse(blob, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="tasks-template.xlsx"',
      },
    });
  }),

  http.post('*/api/workload/upload', async () => {
    const newBatch: WorkloadBatch = {
      id: Date.now(),
      teamId: 1,
      month: '2026-10',
      uploadedAt: new Date().toISOString(),
      taskCount: 4,
    };
    WORKLOAD_BATCHES.unshift(newBatch);
    return HttpResponse.json({ batchId: newBatch.id, taskCount: 4, message: 'Successfully uploaded 4 tasks for October 2026.' });
  }),

  http.get('*/api/workload/tasks', () => {
    return HttpResponse.json(WORKLOAD_TASKS);
  }),

  http.delete('*/api/workload/batches/:id', ({ params }) => {
    const id = Number(params.id);
    WORKLOAD_BATCHES = WORKLOAD_BATCHES.filter((b) => b.id !== id);
    return HttpResponse.json({ success: true, message: 'Batch deleted' });
  }),

  // ── Simulation Engine ────────────────────────────────────
  http.post('*/api/teams/:id/simulate', async () => {
    const simulation: SimulationResult = {
      summary: {
        peakRiskDate: '2026-10-16',
        totalShortfallHours: 48,
        atRiskTasks: 2,
        missedTasks: 1,
        extraFteNeeded: 1.5,
        extraFteWindow: { startDate: '2026-10-14', endDate: '2026-10-20' },
      },
      days: [
        { date: '2026-10-12', supplyHours: 32, plannedDemandHours: 24, backlogHours: 0, risk: 'LOW' },
        { date: '2026-10-13', supplyHours: 32, plannedDemandHours: 30, backlogHours: 0, risk: 'LOW' },
        { date: '2026-10-14', supplyHours: 24, plannedDemandHours: 36, backlogHours: 12, risk: 'MEDIUM' },
        { date: '2026-10-15', supplyHours: 16, plannedDemandHours: 40, backlogHours: 36, risk: 'HIGH' },
        { date: '2026-10-16', supplyHours: 16, plannedDemandHours: 44, backlogHours: 48, risk: 'HIGH' },
        { date: '2026-10-19', supplyHours: 32, plannedDemandHours: 28, backlogHours: 24, risk: 'MEDIUM' },
        { date: '2026-10-20', supplyHours: 40, plannedDemandHours: 20, backlogHours: 4, risk: 'LOW' },
      ],
      tasks: [
        { id: 1, name: 'Migrate Core Database to Cluster v4', dueDate: '2026-10-16', effortHours: 40, shortfallHours: 16, status: 'MISSED' },
        { id: 2, name: 'OAuth2 Multi-Factor Auth Gateway', dueDate: '2026-10-20', effortHours: 32, shortfallHours: 8, status: 'AT_RISK' },
        { id: 3, name: 'PCI-DSS Compliance Documentation', dueDate: '2026-10-15', effortHours: 16, shortfallHours: 4, status: 'AT_RISK' },
        { id: 4, name: 'Real-time Webhook Notification Service', dueDate: '2026-10-22', effortHours: 24, completedOn: '2026-10-21', shortfallHours: 0, status: 'ON_TRACK' },
      ],
    };

    return HttpResponse.json(simulation);
  }),

  http.post('*/api/teams/:id/recommendations/batch', () => {
    return HttpResponse.json([
      { requestId: 102, employeeName: 'Carol Danvers', decision: 'APPROVE', reason: 'High priority medical leave; team can cover with 0.5 temporary FTE.' },
      { requestId: 103, employeeName: 'Jack Daniels', decision: 'RESCHEDULE', reason: 'Casual leave conflicts with DB Migration peak window on Oct 16.' },
    ]);
  }),

  // ── HR: Employees List & Create ──────────────────────────
  http.get('*/api/hr/employees', () => {
    return HttpResponse.json(EMPLOYEES);
  }),

  http.post('*/api/hr/employees', async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      email: string;
      role: string;
      team?: string;
      manager?: string;
      joinDate: string;
      capacityFte: number;
      jobRole?: string;
    };

    const newEmp: Employee = {
      id: Date.now(),
      name: body.name,
      email: body.email,
      role: body.role || 'EMPLOYEE',
      teamName: body.team || 'Core Platform',
      managerName: body.manager || 'Marcus Sterling',
      joinDate: body.joinDate,
      capacityFte: Number(body.capacityFte) || 1.0,
      jobRole: body.jobRole || 'Engineer',
    };

    EMPLOYEES.push(newEmp);

    // Calculate pro-rated balances based on joinDate
    // Demo highlight: mid-year joiner receives pro-rated annual leave!
    const joinMonth = new Date(body.joinDate).getMonth(); // 0 to 11
    const monthsRemaining = 12 - joinMonth;
    const proRatedAnnual = Math.round((20 * (monthsRemaining / 12)) * (newEmp.capacityFte)) || 10;
    const proRatedSick = Math.round((10 * (monthsRemaining / 12)) * (newEmp.capacityFte)) || 5;

    const proratedBalances: LeaveBalance[] = [
      { leaveType: 'ANNUAL', available: proRatedAnnual, used: 0, pending: 0, total: proRatedAnnual },
      { leaveType: 'SICK', available: proRatedSick, used: 0, pending: 0, total: proRatedSick },
      { leaveType: 'CASUAL', available: 2, used: 0, pending: 0, total: 2 },
    ];

    BALANCES[newEmp.id] = proratedBalances;

    return HttpResponse.json({ employee: newEmp, balances: proratedBalances }, { status: 201 });
  }),

  // ── HR: Settings (Holidays & Peak Periods) ────────────────
  http.get('*/api/hr/holidays', () => HttpResponse.json(HOLIDAYS)),

  http.post('*/api/hr/holidays', async ({ request }) => {
    const body = (await request.json()) as { date: string; name: string };
    const h: Holiday = { id: Date.now(), date: body.date, name: body.name };
    HOLIDAYS.push(h);
    return HttpResponse.json(h, { status: 201 });
  }),

  http.get('*/api/hr/peak-periods', () => HttpResponse.json(PEAK_PERIODS)),

  http.post('*/api/hr/peak-periods', async ({ request }) => {
    const body = (await request.json()) as { startDate: string; endDate: string; description: string };
    const p: PeakPeriod = { id: Date.now(), startDate: body.startDate, endDate: body.endDate, description: body.description };
    PEAK_PERIODS.push(p);
    return HttpResponse.json(p, { status: 201 });
  }),

  // ── HR: Reports & Excel Downloads ─────────────────────────
  http.get('*/api/hr/reports', () => HttpResponse.json(REPORTS)),

  http.post('*/api/hr/reports/generate', async ({ request }) => {
    const user = getUserFromRequest(request);
    const body = (await request.json()) as { from: string; to: string };
    const newRep: Report = {
      id: Date.now(),
      fromDate: body.from,
      toDate: body.to,
      generatedAt: new Date().toISOString(),
      rowCount: 18,
      generatedBy: user.name || 'Helena Vance',
    };
    REPORTS.unshift(newRep);
    return HttpResponse.json(newRep, { status: 201 });
  }),

  http.get('*/api/hr/reports/:id/download', ({ params }) => {
    const id = params.id;
    const content = `Leave Report ID: ${id}\nGenerated: ${new Date().toISOString()}\nEmployee,Leave Type,Start Date,End Date,Working Days,Status\nBob Martinez,ANNUAL,2026-10-12,2026-10-16,5,APPROVED\n`;
    const blob = new Blob([content], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    return new HttpResponse(blob, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="leave-report-${id}.xlsx"`,
      },
    });
  }),

  http.get('*/api/hr/reports/approved-leaves.xlsx', () => {
    const content = `Approved Leaves Export\nGenerated: ${new Date().toISOString()}\nEmployee,Leave Type,Start Date,End Date,Working Days\nBob Martinez,ANNUAL,2026-10-12,2026-10-16,5\n`;
    const blob = new Blob([content], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    return new HttpResponse(blob, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="approved-leaves.xlsx"',
      },
    });
  }),

  // ── Admin: Escalation & Utilities ────────────────────────
  http.post('*/api/admin/escalation/run', () => {
    // Escalate all pending manager requests whose deadline passed (e.g. Jack's request #103)
    let escalatedCount = 0;
    LEAVES.forEach((leave) => {
      if (leave.status === 'PENDING_MANAGER') {
        leave.status = 'ESCALATED';
        leave.escalationLevel = (leave.escalationLevel || 0) + 1;
        escalatedCount++;

        if (!HISTORIES[leave.id]) HISTORIES[leave.id] = [];
        HISTORIES[leave.id].push({
          at: new Date().toISOString(),
          actor: null, // System actor (per spec section 4.2 / 10.4)
          action: 'ESCALATED',
          comment: 'Manager approval deadline lapsed. Automatically escalated to HR by System.',
        });
      }
    });

    return HttpResponse.json({ success: true, escalatedCount, message: `Escalation job completed. ${escalatedCount} request(s) escalated to HR.` });
  }),

  http.post('*/api/admin/reports/run', () => {
    const report: Report = {
      id: Date.now(),
      fromDate: '2026-09-01',
      toDate: '2026-09-30',
      generatedAt: new Date().toISOString(),
      rowCount: 24,
      generatedBy: null, // System
    };
    REPORTS.unshift(report);
    return HttpResponse.json({ success: true, message: 'Monthly report batch executed successfully.' });
  }),

  http.post('*/api/admin/demo/generate', () => {
    return HttpResponse.json({ success: true, message: 'Demo data reset and seeded successfully.' });
  }),
];

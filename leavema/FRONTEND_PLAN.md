# Leave Management System — Frontend Plan

> **Source of truth:** `PLAN.md` section 7 (API contract) and the backend's Swagger UI at `/swagger-ui.html`. If anything is unclear or missing, ask the backend developer to update `PLAN.md`. Do not guess field names or invent endpoints.
> **Golden rule:** the frontend shows data, the backend decides. Never compute working days, balances, pro-rating, feasibility, or recommendations in the browser. Always display what the API returns.

## 1. Suggested Stack (any framework is fine, this is just a default)

React + Vite + TypeScript, React Router, TanStack Query (data fetching/caching), Axios, Tailwind or MUI, Recharts (charts), date-fns.
Tip: generate a typed API client from the backend OpenAPI spec (`openapi-typescript`) so field-name mistakes become compile errors.
Config: `VITE_API_BASE_URL=http://localhost:8080/api`.

## 2. Auth & Roles

- `POST /auth/login` → store `token` and `user` (memory + localStorage is fine for the prototype). Send `Authorization: Bearer <token>` on every call via an Axios interceptor.
- On **401**: clear session, redirect to `/login`. On **403**: toast "You don't have access to this action".
- On app load, call `GET /me` to restore the user.
- Roles: `EMPLOYEE`, `MANAGER`, `HR`, `ADMIN`. **Managers, HR and admin are also employees**: they keep the employee screens (apply, my leaves, balances) *plus* their role screens.
- Route guards and menu items are per role (table below). Hiding a menu item is UX only; the backend enforces access.

## 3. Screen & Route Map

| Route | Roles | Screen | API calls |
|---|---|---|---|
| `/login` | public | Login form | `POST /auth/login` |
| `/` | all | Dashboard: balance cards, recent requests, notification bell | `GET /balances/my`, `GET /leaves/my`, `GET /notifications` |
| `/apply` | all | Apply for leave with live preview (see 4.1) | `POST /leaves/preview`, `POST /leaves`, `GET /balances/my` |
| `/my-leaves` | all | List with status filter; row opens detail drawer (see 4.2) | `GET /leaves/my?status=`, `GET /leaves/{id}`, `GET /leaves/{id}/history`, `POST /leaves/{id}/cancel` |
| `/manager/approvals` | MANAGER | Approval queue (see 4.3) | `GET /manager/approvals?status=PENDING_MANAGER`, `POST /manager/leaves/{id}/approve`, `/reject`, `POST /leaves/{id}/recommendation` |
| `/manager/calendar` | MANAGER, HR | Team availability heatmap (see 4.4) | `GET /teams/{teamId}/availability?from=&to=` |
| `/workload` | MANAGER, HR | Upload monthly tasks + task list (see 4.5) | `GET /workload/template.xlsx`, `POST /workload/upload`, `GET /workload/tasks?teamId=&month=`, `DELETE /workload/batches/{id}` |
| `/simulate` | MANAGER, HR | Workload simulation (see 4.6) | `POST /teams/{id}/simulate`, `POST /teams/{id}/recommendations/batch` |
| `/hr/approvals` | HR | Approval queue for `PENDING_HR` and `ESCALATED` | `GET /hr/approvals?status=PENDING_HR,ESCALATED`, `POST /hr/leaves/{id}/approve`, `/reject`, `POST /leaves/{id}/recommendation` |
| `/hr/employees` | HR | Employee list + create form (see 4.7) | `GET /hr/employees`, `POST /hr/employees` |
| `/hr/settings` | HR | Holidays and peak periods (two tabs, table + add form) | `GET/POST /hr/holidays`, `GET/POST /hr/peak-periods` |
| `/hr/reports` | HR | Generate, list and download Excel reports (see 4.8) | `GET /hr/reports/approved-leaves.xlsx`, `POST /hr/reports/generate`, `GET /hr/reports`, `GET /hr/reports/{id}/download` |
| `/admin` | ADMIN | Three buttons: run escalation, run monthly report, generate demo data | `POST /admin/escalation/run`, `POST /admin/reports/run`, `POST /admin/demo/generate?teams=&employeesPerTeam=` |

Global: notification bell in the header (`GET /notifications`, `POST /notifications/{id}/read`), poll every 30 s.
Stretch (build only if time): `/hr/analytics` using `GET /hr/analytics/summary`.

## 4. Screen Details

### 4.1 Apply for leave (most important screen)
- Fields: leave type (dropdown), start date, end date, reason.
- When type + both dates are valid, call `POST /leaves/preview` (debounce ~400 ms) and render:
  - **Working days** (`workingDays`) and **balance** (`balance.available` → `balance.after`; show in red if `after < 0`).
  - **Feasibility banner** from `feasibility.status`: `FULLY_FEASIBLE` (green), `PARTIALLY_FEASIBLE` (amber, show "`feasibleDays` of `totalWorkingDays` days (`feasibilityPercent`%)"), `NOT_FEASIBLE` (red).
  - **Day strip:** one chip per entry in `feasibility.days` (green feasible / red not); tooltip shows `supplyFte` vs `demandFte`. Weekends and holidays are not in the list, so do not draw them.
  - **Feasible windows:** list each pair in `feasibility.feasibleWindows` as a range ("12 Oct–13 Oct").
  - **Suggestions:** each item in `suggestions` is a clickable card (`startDate`–`endDate`, `feasibilityPercent`). Clicking fills the date fields and re-runs the preview.
  - **Warnings:** render `warnings[]` as a list.
- Submit calls `POST /leaves`. **Never block submission because of feasibility** (it is advisory). If status is not `FULLY_FEASIBLE`, show a confirm dialog: "Part of this request exceeds team capacity. Submit anyway?"
- On success: toast, redirect to `/my-leaves`, invalidate `balances` and `leaves` queries.

### 4.2 My leaves + detail drawer
- Table columns: dates, type, working days, status chip, deadline (for pending), conflict badge.
- Drawer: request fields, **audit timeline** from `/leaves/{id}/history` (actor `null` = "System"), and for pending requests a **countdown** to `stageDeadline` ("Escalates in 6h 12m").
- Cancel button is shown when status is `PENDING_MANAGER`, `PENDING_HR`, `ESCALATED`, or `APPROVED` with a future `startDate`. Confirm first, optional comment.

### 4.3 Manager / HR approval queue
- Columns: employee, dates, working days, leave type, **feasibility %** (colour by band), conflict badge, `overlappingEmployees` (names; only these screens show names), deadline countdown, escalation badge if `status = ESCALATED` or `escalationLevel > 0`.
- Actions: **Approve** (optional comment), **Reject** (comment **required**; disable the button until filled).
- **"Get recommendation"** button → `POST /leaves/{id}/recommendation` → modal showing `decision` (`APPROVE` green, `APPROVE_WITH_CONDITIONS` amber, `RESCHEDULE_SUGGESTED` red), `reasons[]`, `newlyAtRiskTasks[]`, and `alternatives[]`. It is advice only; the approve/reject buttons stay available.
- After any action: refetch the queue.

### 4.4 Team availability heatmap
- Date-range picker (default: current month). One cell per entry from the API showing `absentFte`/`totalFte`; colour by `level` (`LOW` green, `MEDIUM` amber, `HIGH` red). Weekends and holidays are not returned, so leave them greyed out.
- Clicking a cell can show the list of who is on leave only if the API returns it; otherwise show counts only.

### 4.5 Workload upload
- "Download template" button (see 6 for authenticated downloads).
- Upload control: `.xlsx`/`.csv`, team selector (managers: fixed to own team), month filter for the task list.
- On `400` with `code = UPLOAD_INVALID`, show `errors[]` in a table (row, message) and state clearly that **nothing was saved**. On success show the number accepted and refresh the task list.
- Task table columns: name, effort hours, start, due, priority. Delete batch with confirm.

### 4.6 Simulation
- Inputs: team (own team for managers), `from`, `to`, scenario (`CONFIRMED_ONLY`, `INCLUDE_PENDING`, `WHAT_IF`). For `WHAT_IF`, add a multi-select of pending requests (`requestIds`).
- **Run Simulation** button → `POST /teams/{id}/simulate`. Show a loading state (it can take a second).
- Outputs:
  - **Summary cards** from `summary`: `peakRiskDate`, `totalShortfallHours`, `atRiskTasks`, `missedTasks`, and **extra FTE needed** with its window (`extraFteNeeded`, `extraFteWindow`).
  - **Chart 1 (bar/line):** per day `supplyHours` vs `plannedDemandHours`; colour days by `risk`.
  - **Chart 2 (area):** `backlogHours` per day.
  - **Task table:** name, due date, effort, `completedOn`, status chip (`ON_TRACK` green, `AT_RISK` amber, `MISSED` red), `shortfallHours`.
- Optional button "Suggest an approval order" → `POST /teams/{id}/recommendations/batch` → ordered list of decisions with reasons.

### 4.7 HR employees
- Table of employees (name, email, role, team, join date, FTE).
- Create form: name, email, password, role, team, manager, `joinDate`, `capacityFte` (1.0 or 0.5 dropdown/number), `jobRole`.
- After creating, show the returned pro-rated balances in a success panel (this is a demo highlight: joined mid-year → smaller entitlement).

### 4.8 Reports
- "Generate report" form (`from`, `to`) → `POST /hr/reports/generate`, then refresh the list.
- List: period, generated at, row count, generated by ("System" if null), Download button.
- "Quick download" for a range/team → `GET /hr/reports/approved-leaves.xlsx?from=&to=&teamId=`.

## 5. Status & Label Mapping

| Status | Label | Colour |
|---|---|---|
| `PENDING_MANAGER` | Awaiting manager | amber |
| `PENDING_HR` | Awaiting HR | blue |
| `ESCALATED` | Escalated to HR | orange |
| `APPROVED` | Approved | green |
| `REJECTED` | Rejected | red |
| `CANCELLED` | Cancelled | grey |

Feasibility: `FULLY_FEASIBLE` green, `PARTIALLY_FEASIBLE` amber, `NOT_FEASIBLE` red. Risk/levels: `LOW` green, `MEDIUM` amber, `HIGH` red.

## 6. Data & File Rules

- **Dates** (`startDate`, `endDate`, `date`) are plain `yyyy-MM-dd` strings. Do not convert them through `new Date()` with timezones (it shifts the day). Format them from the string.
- **Timestamps** (`createdAt`, `stageDeadline`, history `at`) are ISO UTC. Convert to local time for display; compute countdowns from `stageDeadline`.
- Balances and days can be halves (12.5). Display one decimal only when needed.
- **File downloads need the JWT**, so a plain `<a href>` will fail. Fetch with the auth header as a blob, then trigger a download (`URL.createObjectURL`). Use the filename from `Content-Disposition` if present.
- **Uploads** use `multipart/form-data` with fields `file` and `teamId`.
- Never send or store passwords beyond the login call.

## 7. Error Handling

Errors follow RFC 7807: `{ title, status, detail, code, timestamp }`. Show `detail` to the user, and branch on `code`:

| `code` | UX |
|---|---|
| `VALIDATION_ERROR` | Inline message under the form / toast with `detail` |
| `INSUFFICIENT_BALANCE` | Inline error on the apply form near the balance display |
| `OVERLAPPING_REQUEST` | Inline error on the date fields |
| `INVALID_STATE_TRANSITION` | Toast "This request was already updated", then refetch |
| `CONCURRENT_MODIFICATION` | Toast "Someone else just changed this", then refetch |
| `FORBIDDEN_ACTION` | Toast with `detail` |
| `NOT_FOUND` | Empty state / redirect to list |
| `UPLOAD_INVALID` | Row-error table (4.5) |

Every list needs three states: **loading** (skeleton), **empty** (friendly message), **error** (message + retry). Disable action buttons while a request is in flight to avoid double clicks.

## 8. Build Order (aligned with backend phases)

| Backend ready after | Frontend builds |
|---|---|
| Phase 1 | Project setup, login, auth guard, layout, role-based menu |
| Phase 2 | Dashboard balance cards, employee create form |
| Phase 3 | My leaves, apply form (without preview), manager and HR queues, audit timeline |
| Phase 4 | Deadline countdown, escalation badges, notification bell, admin buttons |
| Phase 5 | **Apply preview panel**, feasibility badges, heatmap, holidays/peak settings |
| Phase 6 | Reports page |
| Phase 7 | Workload upload, simulation page, recommendation modal |

Until the backend phase is ready, mock the endpoints with **MSW** (Mock Service Worker) using the example JSON in `PLAN.md` section 7, so the UI can be built in parallel. Switch to the real API by changing `VITE_API_BASE_URL`.

## 9. Demo Credentials (password for all: `Demo@123`)

`admin@demo.com` (ADMIN), `hr@demo.com` (HR), `manager@demo.com` (MANAGER), `alice@demo.com` … `jack@demo.com` (EMPLOYEE). Add a small "Fill demo login" dropdown on the login page for quick role switching during the pitch.

## 10. Demo Flow the UI Must Support (matches backend demo script)

1. Log in as alice → dashboard balances → `/apply` → pick the seeded conflict week → see **60% feasible**, day strip, windows and suggestions → click a suggestion, then go back and submit the original anyway (confirm dialog).
2. Log in as manager → `/manager/approvals` → conflict badge, overlapping names, countdown → "Get recommendation" → approve.
3. Log in as hr → `/hr/approvals` → final approve → log in as alice, balance moved from pending to used.
4. Leave another request untouched → as admin press "Run escalation" → as HR, the request shows **Escalated** and the timeline has a "System" entry.
5. As manager: `/workload` upload `tasks-sample.xlsx` → `/simulate` → run → see the missed task, charts, and extra FTE needed.
6. As HR: create a mid-year employee (pro-rated balances shown) → `/hr/reports` → generate and download the Excel report.

## 11. Definition of Done

- [ ] Every route in section 3 exists, is role-guarded, and calls the listed endpoints
- [ ] Apply page shows working days, balance after, feasibility %, day strip, windows and suggestions, and never blocks submission
- [ ] All status, feasibility and risk values use the colours in section 5
- [ ] Every API error `code` in section 7 is handled visibly
- [ ] File upload and Excel downloads work with authentication
- [ ] No business calculation is done in the frontend
- [ ] Each list has loading, empty and error states
- [ ] Works at laptop width (1280 px) and is usable at tablet width
- [ ] The full demo flow in section 10 runs end to end without a page refresh

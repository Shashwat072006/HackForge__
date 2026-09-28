# Leave Management System — Backend Build Plan (v2)

> **AGENT INSTRUCTIONS (read first)**
> You are building the backend of an industry-grade leave management system. A separate developer builds the frontend, so the **API contract in section 7 is the source of truth — do not change paths or JSON shapes without updating this file.**
> Work **phase by phase** (section 10). Write the tests for a phase *in that phase*. After each phase: run `./mvnw test`, make sure the app boots, then `git commit -m "phase N: ..."`. Do not start the next phase while tests fail. Stop after each phase and wait for the human.
> Total time budget is 4 hours. Prefer simple, correct, tested code over clever code. Never leave a TODO inside a business rule (state machine, balance, capacity, feasibility, proration).
> **No machine learning.** All "decisions" are deterministic, explainable calculations (see section 6). Every recommendation must return human-readable reasons.

---

## 1. Goal

Structured leave management where requests pass **Manager approval → HR approval**, with automatic escalation on timeout, team-level conflict/feasibility analysis, correct pro-rated balances, a workload-vs-workforce simulation driven by uploaded monthly tasks, and automated Excel reporting of approved leave. Must feel production-grade in a demo: audit trail, concurrency safety, clean errors, Swagger docs, seeded demo data.

## 2. Tech Stack

| Concern | Choice |
|---|---|
| Language / Framework | Java 21, Spring Boot 3.x (Web, Data JPA, Validation, Security, Scheduling) |
| Auth | Spring Security + JWT (stateless), roles `EMPLOYEE`, `MANAGER`, `HR`, `ADMIN` |
| DB | PostgreSQL via `docker-compose.yml`; H2 for `test` profile |
| Migrations | Flyway (`V1__init.sql`, `V2__seed.sql`) |
| Excel import/export | Apache POI (`poi-ooxml` 5.x) |
| API docs | springdoc-openapi → `/swagger-ui.html` (frontend dev uses this) |
| Build | Maven wrapper |
| Tests | JUnit 5, Mockito, `@SpringBootTest`, `@DataJpaTest` |

Profiles: `dev` (Postgres), `test` (H2), `demo` (short escalation timeouts, see 5.3).

## 3. Domain Model

```
Team(id, name, maxConcurrentLeavePercent default 30, productiveHoursPerDay default 6)
Employee(id, name, email unique, passwordHash, role, teamId, managerId nullable,
         joinDate, active, capacityFte default 1.0 [part-time 0.5], jobRole nullable)
LeaveType(id, code[ANNUAL|SICK|CASUAL|UNPAID], name, annualEntitlementDays, requiresBalance bool)
LeaveBalance(id, employeeId, leaveTypeId, year, entitled, used, pending, carriedForward default 0)  -- unique(employeeId, leaveTypeId, year)
Holiday(id, date, name, teamId nullable)                   -- teamId null = company-wide
PeakPeriod(id, teamId, fromDate, toDate, multiplier, name) -- e.g. month-end close x1.3
LeaveRequest(id, employeeId, leaveTypeId, startDate, endDate, workingDays decimal,
             reason, status, currentStageDeadline, escalationLevel int default 0,
             conflictFlag bool, feasibilityPercent decimal, conflictSummary json/text,
             createdAt, updatedAt, @Version version)
ApprovalHistory(id, leaveRequestId, actorId nullable[null = SYSTEM], fromStatus, toStatus,
                action, comment, createdAt)                 -- append-only audit trail
Notification(id, employeeId, message, read, createdAt)
WorkloadUploadBatch(id, teamId, fileName, uploadedBy, rowCount, createdAt)
WorkloadTask(id, batchId, teamId, name, effortHours, startDate, dueDate, priority[HIGH|MEDIUM|LOW], requiredRole nullable)
GeneratedReport(id, type, periodFrom, periodTo, filePath, rowCount, generatedAt, generatedBy nullable[SYSTEM])
```

`available = entitled + carriedForward - used - pending`

## 4. The Approval State Machine (explicit, no ad-hoc status setting)

**States:** `PENDING_MANAGER`, `PENDING_HR`, `ESCALATED`, `APPROVED`, `REJECTED`, `CANCELLED`
**Events:** `SUBMIT`, `MANAGER_APPROVE`, `MANAGER_REJECT`, `HR_APPROVE`, `HR_REJECT`, `ESCALATE`, `CANCEL`

| From | Event | To | Balance effect |
|---|---|---|---|
| (new) | SUBMIT | `PENDING_MANAGER` (or `PENDING_HR` if employee has no manager / is a manager) | pending += days |
| PENDING_MANAGER | MANAGER_APPROVE | PENDING_HR | — |
| PENDING_MANAGER | MANAGER_REJECT | REJECTED | pending -= days |
| PENDING_MANAGER | ESCALATE (timeout) | ESCALATED | — |
| PENDING_MANAGER | CANCEL | CANCELLED | pending -= days |
| ESCALATED | HR_APPROVE | APPROVED | pending -= days, used += days |
| ESCALATED | HR_REJECT | REJECTED | pending -= days |
| PENDING_HR | HR_APPROVE | APPROVED | pending -= days, used += days |
| PENDING_HR | HR_REJECT | REJECTED | pending -= days |
| PENDING_HR | ESCALATE (timeout) | PENDING_HR (escalationLevel++, notify HR + ADMIN) | — |
| PENDING_HR / ESCALATED | CANCEL | CANCELLED | pending -= days |
| APPROVED | CANCEL (only if startDate in the future) | CANCELLED | used -= days |

Any transition not in this table throws `InvalidStateTransitionException` (HTTP 409).

**Implementation rules**
- One class `LeaveStateMachine` holds the transition table — the *only* place status changes.
- Every transition writes an `ApprovalHistory` row and adjusts `LeaveBalance` **in the same transaction**.
- `@Version` on `LeaveRequest` (optimistic locking): concurrent approvals → 409, never corrupt balances.
- Guards: actor cannot approve own request; MANAGER only acts on direct reports; HR acts on `PENDING_HR`/`ESCALATED`; HR's own requests need a *different* HR/ADMIN.
- **Never auto-approve on timeout.** Timeout only escalates.

## 5. Core Business Rules

### 5.1 Holiday & working-day model
A **working day** is any date that is not Saturday, not Sunday, and not in `Holiday` (company-wide rows where `teamId IS NULL`, plus rows for the employee's team). Weekend days are configurable (`leave.weekend-days: SATURDAY,SUNDAY`).
Working days are used for: (a) days charged to the balance, (b) the feasibility/conflict sweep, (c) the simulation. Holidays and weekends inside a request are **not** charged and **not** evaluated. Leave adjacent to a holiday is never auto-extended.
Reject if working days = 0, if `end < start`, or if it overlaps another `PENDING_*`/`ESCALATED`/`APPROVED` request of the same employee (409). Retro-dated leave only for `SICK`.

### 5.2 Pro-rated balance (mid-year joiners)
```
if joinDate.year < year:   entitled = annualEntitlement
if joinDate.year == year:
    remainingDays = (Dec 31 - joinDate) + 1        // calendar days, inclusive
    entitled = roundToNearestHalf(annualEntitlement * remainingDays / daysInYear)   // Year.isLeap aware
```
Example: 24 days, joined 1 Jul 2026 → 184/365 × 24 = 12.1 → **12.0**. Balances are created on `POST /hr/employees` and lazily for a new year. Tests: Jan 1, Apr 1, Jul 1, Dec 31, leap year, previous-year joiner.

### 5.3 Auto-escalation
- `@Scheduled(fixedDelayString = "${leave.escalation.check-interval-ms}")` → `EscalationJob`.
- Finds `status IN (PENDING_MANAGER, PENDING_HR)` with `currentStageDeadline < now`, applies `ESCALATE` via the state machine with actor = SYSTEM, writes history + notifications, sets the next `currentStageDeadline`.
- Idempotent: re-running never double-escalates.
```yaml
leave:
  escalation:
    manager-timeout-minutes: 2880   # 48h
    hr-timeout-minutes: 4320        # 72h
    check-interval-ms: 300000
# application-demo.yml → manager-timeout-minutes: 1, hr-timeout-minutes: 2, check-interval-ms: 10000
```
- `POST /api/admin/escalation/run` (ADMIN) triggers it manually for live demos.

## 6. Capacity, Feasibility & Workload Simulation

Two layers share one idea: **capacity (supply) vs demand**. Layer A needs no extra data. Layer B uses uploaded monthly tasks.

### 6.1 Layer A — Capacity engine & feasibility (`CapacityService`)
For each **working day** `d` in the requested range:
```
team          = requester's team (active members who have joined by d)
totalFte      = Σ capacityFte of team members
T             = team.maxConcurrentLeavePercent / 100
allowedAbsent = max(1.0, totalFte * T)                  // FTE that may be off at once
baseDemandFte = totalFte - allowedAbsent                // minimum FTE that must be present
demandFte(d)  = min(totalFte, baseDemandFte * peakMultiplier(d))   // PeakPeriod, default 1.0
absentFte(d)  = Σ capacityFte of teammates with APPROVED / PENDING_* / ESCALATED leave on d
supplyAfter   = totalFte - absentFte(d) - requester.capacityFte
feasible(d)   = supplyAfter >= demandFte(d)             // compare with epsilon / BigDecimal
shortfallFte  = max(0, demandFte(d) - supplyAfter)
```
With all weights = 1.0 and no peak period this equals "at most `floor(N × T)` people out". Worked example: team of 10, T=30% → allowed 3, demand 7. Teammates out Mon–Fri = 1,2,3,3,2 → with requester 2,3,4,4,3 → supply 8,7,6,6,7 → Wed & Thu infeasible → **3 of 5 days = 60% feasible**.

**Feasibility result**
```
status = FULLY_FEASIBLE (all days) | PARTIALLY_FEASIBLE (some) | NOT_FEASIBLE (none)
feasibleDays, totalWorkingDays, feasibilityPercent = feasibleDays / totalWorkingDays * 100
feasibleWindows = maximal runs of consecutive *working* days where feasible = true
suggestions     = up to 3 windows of the same working-day length within ±21 days of the requested start,
                  fully feasible only, ranked by distance from requested start;
                  if none fully feasible, return the best partial windows (highest feasibilityPercent)
conflictFlag    = status != FULLY_FEASIBLE
```
- Feasibility is **advisory**: it never blocks submission or rejects a request (requirement: flag, don't auto-reject).
- Pending/escalated leave counts as absent (conservative). `scenario` on the simulate endpoint can switch to confirmed-only.
- Employees see counts and dates only. Teammate **names** appear only in manager/HR views (`overlappingEmployees`).
- Availability heatmap `GET /teams/{id}/availability`: per working day `{date, absentFte, totalFte, percent, level LOW(<50% of allowed)|MEDIUM|HIGH(>=allowed)}`.

### 6.2 Layer B — Task-driven workload simulation (`WorkloadSimulationService`)
**Upload:** manager (own team) or HR uploads an `.xlsx`/`.csv` of monthly tasks. Template columns:
`taskName | effortHours | startDate | dueDate | priority | requiredRole(optional)`
Validation is **all-or-nothing**: if any row is invalid nothing is saved and the response lists `{row, message}` errors (missing column, effortHours <= 0, dueDate < startDate, unknown priority, unparsable date). `GET /workload/template.xlsx` serves a template with an example row.

**Simulation (deterministic, day by day):**
```
for each working day d in [from, to]:
    present     = active team members who joined by d and are not on leave in the chosen scenario
    supplyHours = Σ present.capacityFte * team.productiveHoursPerDay
    plannedDemandHours(d) = Σ over tasks active on d of effortHours / workingDaysInTaskWindow   // for charting
    open tasks  = tasks with startDate <= d and remainingHours > 0,
                  sorted by dueDate asc, then priority (HIGH first), then id
    allocate supplyHours to open tasks in that order (work = min(remaining, supplyLeft))
    backlogHours(d) = Σ remaining of open tasks after allocation
    coverage(d) = supplyHours / plannedDemandHours(d);  risk = LOW (>=1.1) | MEDIUM (0.9–1.1) | HIGH (<0.9)
after loop: task.status = ON_TRACK (done by dueDate) | AT_RISK (finished within 2 working days after dueDate) | MISSED (else)
```
Simplifications to keep (state them in README): supply is pooled (requiredRole is stored but only used if time allows); one task may absorb all of a day's supply; demand is a planning input, not a prediction.

**Scenarios** (`scenario` field): `CONFIRMED_ONLY`, `INCLUDE_PENDING`, `WHAT_IF` (extra hypothetical leave: `requestIds[]` and/or ad-hoc `[{employeeId,startDate,endDate}]`).

**Workforce required:** re-run the simulation adding extra FTE in steps of 0.25 (max +totalFte) until no task is `MISSED`; report the smallest extra FTE and the dates where backlog > 0. Example: *"Need +1.5 FTE between 13 and 17 Oct."*

**Recommendation engine** (`RecommendationService`) — advisory, never changes state:
```
baseline = simulate(scenario without this request)
withLeave = simulate(scenario + this request)
newMissed = tasks MISSED in withLeave but not in baseline;  newAtRisk likewise
decision:
  APPROVE                  if Layer A fully feasible AND no newAtRisk AND no newMissed
  APPROVE_WITH_CONDITIONS  if partially feasible OR newAtRisk non-empty (no newMissed)
  RESCHEDULE_SUGGESTED     if newMissed non-empty OR feasibility NOT_FEASIBLE
return decision + reasons[] (plain sentences with numbers) + safe alternative windows
```
Batch mode `POST /teams/{id}/recommendations/batch`: take pending requests ordered by submittedAt then startDate; evaluate one by one, and **add each APPROVE/CONDITIONS result to the scenario before evaluating the next** (greedy). Output is a suggested order/decision list only.

**Stretch (only if ahead of schedule): Monte Carlo** `runs=500, sickProbability=0.03`, seeded RNG, returns `onTimeProbability` per task.

## 7. API Contract (source of truth for frontend)

Base path `/api`. All calls except login need `Authorization: Bearer <jwt>`. Dates are ISO `yyyy-MM-dd`. CORS enabled for `http://localhost:3000`, `:5173`, `:4200`.

**Errors:** RFC 7807 `ProblemDetail` plus stable `code`:
`{ "type":"about:blank","title":"Conflict","status":409,"detail":"...","code":"INVALID_STATE_TRANSITION","timestamp":"..." }`
Codes: `VALIDATION_ERROR`, `INSUFFICIENT_BALANCE`, `OVERLAPPING_REQUEST`, `INVALID_STATE_TRANSITION`, `CONCURRENT_MODIFICATION`, `FORBIDDEN_ACTION`, `NOT_FOUND`, `UPLOAD_INVALID`.

### Auth
| Method | Path | Notes |
|---|---|---|
| POST | `/auth/login` | `{email,password}` → `{token, expiresIn, user:{id,name,email,role,teamId}}` |
| GET | `/me` | user object |

### Employee
| Method | Path | Notes |
|---|---|---|
| GET | `/balances/my` | `[{leaveType, year, entitled, used, pending, carriedForward, available}]` |
| POST | `/leaves/preview` | body `{leaveTypeCode,startDate,endDate}` → preview object (below); dry run, no writes |
| POST | `/leaves` | body `{leaveTypeCode,startDate,endDate,reason}` → LeaveRequest (201) |
| GET | `/leaves/my?status=` | newest first |
| GET | `/leaves/{id}` , `/leaves/{id}/history` | detail; audit timeline `[{action,actor,fromStatus,toStatus,comment,at}]` |
| POST | `/leaves/{id}/cancel` | `{comment?}` |
| GET | `/notifications` , POST `/notifications/{id}/read` | |

Preview response:
```json
{
  "workingDays": 5,
  "balance": {"available": 12, "after": 7},
  "feasibility": {
    "status": "PARTIALLY_FEASIBLE", "totalWorkingDays": 5, "feasibleDays": 3, "feasibilityPercent": 60,
    "days": [{"date":"2026-10-12","feasible":true,"absentFte":2,"supplyFte":8,"demandFte":7,"shortfallFte":0},
             {"date":"2026-10-14","feasible":false,"absentFte":4,"supplyFte":6,"demandFte":7,"shortfallFte":1}],
    "feasibleWindows": [["2026-10-12","2026-10-13"],["2026-10-16","2026-10-16"]]
  },
  "suggestions": [{"startDate":"2026-10-19","endDate":"2026-10-23","feasibilityPercent":100}],
  "warnings": ["2 of 5 working days exceed team capacity"]
}
```

### Manager
| Method | Path | Notes |
|---|---|---|
| GET | `/manager/approvals?status=PENDING_MANAGER` | direct reports' requests incl. `conflictFlag`, `feasibilityPercent`, `conflictSummary`, `overlappingEmployees`, `stageDeadline` |
| POST | `/manager/leaves/{id}/approve` , `/reject` | `{comment?}`; reject requires comment |
| GET | `/teams/{teamId}/availability?from=&to=` | heatmap data (6.1) |
| POST | `/leaves/{id}/recommendation` | Manager/HR; returns `{decision, reasons[], newlyAtRiskTasks[], alternatives[]}` |

### Workload & simulation (MANAGER for own team, HR for any)
| Method | Path | Notes |
|---|---|---|
| GET | `/workload/template.xlsx` | download template |
| POST | `/workload/upload` | multipart `file`, `teamId` → `{batchId, accepted}` or 400 `UPLOAD_INVALID` with `errors:[{row,message}]` |
| GET | `/workload/tasks?teamId=&month=2026-10` | uploaded tasks |
| DELETE | `/workload/batches/{id}` | remove a batch |
| POST | `/teams/{id}/simulate` | body `{from,to,scenario,requestIds?,adHocLeaves?}` → `{days[{date,supplyHours,plannedDemandHours,coverage,backlogHours,risk}], tasks[{name,dueDate,effortHours,completedOn,status,shortfallHours}], summary{peakRiskDate,totalShortfallHours,atRiskTasks,missedTasks,extraFteNeeded,extraFteWindow}}` |
| POST | `/teams/{id}/recommendations/batch` | `{from,to}` → ordered decisions list |

### HR
| Method | Path | Notes |
|---|---|---|
| GET | `/hr/approvals?status=PENDING_HR,ESCALATED` | |
| POST | `/hr/leaves/{id}/approve` , `/reject` | same bodies |
| GET / POST | `/hr/employees` | create → auto pro-rated balances (accepts `capacityFte`, `jobRole`) |
| GET / POST | `/hr/holidays`, `/hr/peak-periods` | manage holiday & peak tables |
| GET | `/hr/reports/approved-leaves.xlsx?from=&to=&teamId=` | on-demand download |
| POST | `/hr/reports/generate` | `{from,to}` → stores GeneratedReport |
| GET | `/hr/reports` , `/hr/reports/{id}/download` | list / download stored reports |
| GET | `/hr/analytics/summary` | (stretch) counts by status, days by type |

### Admin
| POST | `/admin/escalation/run` | trigger escalation job now |
| POST | `/admin/reports/run` | trigger monthly report job now |
| POST | `/admin/demo/generate?teams=&employeesPerTeam=` | (`demo` profile only) generate random teams, employees, leave to show scale |

LeaveRequest JSON:
```json
{ "id":1,"employee":{"id":3,"name":"..."},"leaveType":"ANNUAL","startDate":"2026-10-12","endDate":"2026-10-16",
  "workingDays":5,"reason":"...","status":"PENDING_MANAGER","stageDeadline":"2026-10-14T10:00:00Z",
  "escalationLevel":0,"conflictFlag":true,"feasibilityPercent":60,
  "conflictSummary":{"peakDate":"2026-10-14","infeasibleDates":["2026-10-14","2026-10-15"],"overlappingCount":3},
  "createdAt":"...","version":0 }
```

## 8. Excel Report: Approved Leave (`ReportService`, Apache POI XSSF)

- Includes requests with status `APPROVED` overlapping `[from, to]` (cancelled/rejected excluded), optionally filtered by team.
- **Sheet 1 "Approved Leaves":** Request ID, Employee, Email, Team, Leave Type, Start, End, Working Days, Manager Approver, Manager Approved At, HR Approver, HR Approved At, Escalated (Y/N), Conflict Flagged (Y/N). Approver data comes from `ApprovalHistory`.
- **Sheet 2 "Team Summary":** team, approved requests, total days, average approval turnaround (hours).
- **Sheet 3 "Balances":** employee, type, entitled, used, pending, available.
- **Sheet 4 "Flagged Approvals":** approved requests that had `conflictFlag = true` (audit view).
- Formatting: bold header row, freeze top row, auto-size columns, real Excel date cells (not strings), totals row using `SUM` formulas.
- **Automation:** `@Scheduled(cron = "${leave.reports.cron:0 0 1 1 * *}")` generates the previous month's report into `${leave.reports.dir:./reports}` and inserts a `GeneratedReport` row. Idempotent: skip if a report of the same type and period already exists. Also triggerable manually (`POST /hr/reports/generate`, `POST /admin/reports/run`).

## 9. Project Structure

```
src/main/java/com/company/leave/
  config/        SecurityConfig, JwtService, JwtFilter, CorsConfig, OpenApiConfig, SchedulingConfig
  domain/        entities + enums
  repository/
  service/       LeaveService, LeaveStateMachine, BalanceService, ProrationCalculator, WorkingDayCalculator,
                 CapacityService, SuggestionService, WorkloadUploadService, WorkloadSimulationService,
                 RecommendationService, ReportService, NotificationService, DemoDataGenerator
  scheduler/     EscalationJob, MonthlyReportJob
  web/           controllers + dto/ + GlobalExceptionHandler
src/main/resources/
  application.yml, application-dev.yml, application-demo.yml, application-test.yml
  db/migration/  V1__init.sql, V2__seed.sql
docker-compose.yml, README.md
```

## 10. Build Phases (4 hours)

| # | Time | Deliverable | Done when |
|---|---|---|---|
| 0 | 0:00–0:15 | Maven project, docker-compose Postgres, profiles, Flyway V1, Swagger, CORS, exception handler | App boots, Swagger loads. **Share Swagger URL + section 7 with frontend dev now.** |
| 1 | 0:15–0:45 | Entities, repos, JWT auth, roles, seed data, `/auth/login`, `/me` | All seeded roles can log in |
| 2 | 0:45–1:10 | `WorkingDayCalculator` (with holidays), `ProrationCalculator`, `BalanceService`, `/balances/my`, `POST /hr/employees` | Proration + working-day tests pass |
| 3 | 1:10–1:55 | `LeaveStateMachine`, apply/cancel/manager/HR endpoints, audit history, guards, optimistic locking | Happy path, rejection, cancel work via Swagger; workflow + concurrency tests pass |
| 4 | 1:55–2:15 | `EscalationJob`, deadlines, notifications, admin trigger | Demo profile escalates a request in ~1 minute |
| 5 | 2:15–2:45 | `CapacityService`, feasibility (partial %), `/leaves/preview`, availability heatmap, alternative-date suggestions | Seeded conflict week gives 60% partial feasibility with suggestions |
| 6 | 2:45–3:05 | `ReportService`, on-demand + scheduled Excel report, stored reports | Downloaded .xlsx opens with 4 correct sheets |
| 7 | 3:05–3:45 | Task upload + validation, `WorkloadSimulationService`, `/simulate`, recommendation (+ batch) | Sample upload makes a task MISSED; extra-FTE answer is correct |
| 8 | 3:45–4:00 | Full test run, README (run steps, credentials, Mermaid state diagram, demo script), cleanup | `./mvnw test` green; README works from a clean clone |

**If behind schedule, cut in this order:** Monte Carlo → batch recommendations → demo data generator → analytics → alternative-date suggestions beyond a single best window → notification endpoints. Never cut: state machine, balances, escalation, feasibility, Excel report, tests for those.

## 11. Tests (written in the phase that builds the feature)

- `LeaveStateMachineTest` — all valid transitions, ≥6 invalid.
- `ProrationCalculatorTest` — cases in 5.2.
- `WorkingDayCalculatorTest` — weekends, company holiday, team holiday, single day, range starting on weekend, holiday-only range → rejected.
- `CapacityServiceTest` — equals percent rule when weights=1; part-time weights; peak multiplier tightens; team of 1; exactly at threshold (feasible); one over (infeasible); weekend-only overlap (no flag).
- `FeasibilityTest` — the 60% worked example; fully / partially / not feasible; `feasibleWindows` skip weekends; suggestions are fully feasible.
- `LeaveWorkflowIntegrationTest` — submit → manager → HR; balances correct; reject releases pending; cancelling approved future leave restores balance.
- `EscalationJobTest` — escalates once, idempotent, HR-stage increments level.
- `SecurityTest` — employee gets 403 on manager/HR endpoints; manager cannot act on non-reports.
- `ConcurrencyTest` — two simultaneous approvals: one wins, one gets 409.
- `WorkloadUploadTest` — valid file accepted; bad rows reject the whole batch with row-level errors.
- `WorkloadSimulationTest` — task on track; task missed when leave removes capacity; earliest-due-date ordering; extra-FTE search returns minimal step.
- `RecommendationServiceTest` — APPROVE, APPROVE_WITH_CONDITIONS, RESCHEDULE_SUGGESTED each reachable, with reasons.
- `ReportServiceTest` — workbook has the 4 sheets; only APPROVED rows; scheduled job idempotent.

## 12. Seed Data (Flyway V2) — built for the demo

Password for everyone: `Demo@123`

| Email | Role | Notes |
|---|---|---|
| admin@demo.com | ADMIN | |
| hr@demo.com | HR | |
| manager@demo.com | MANAGER | manages the Engineering team |
| alice@demo.com … jack@demo.com | EMPLOYEE | Engineering team of 10; two part-time (0.5 FTE); one joined 1 Jul this year (pro-rating demo); one joined last year |

- Engineering team: threshold 30%, 6 productive hours/day.
- Seed approved leave so the week starting on the second Monday of next month has teammates out 1,2,3,3,2 (the worked example), so a request for that week is 60% feasible.
- Seed a company holiday, a `PeakPeriod` (month-end ×1.3), a few historical requests in varied statuses, and a sample `tasks-sample.xlsx` in `src/main/resources/samples/` that makes at least one task `MISSED` when the conflict week is added.

## 13. Definition of Done ("industry-ready")

- [ ] Status changes only via `LeaveStateMachine`; invalid transitions → 409
- [ ] Balance never negative; pending/used always consistent
- [ ] Optimistic locking prevents double approval
- [ ] Every transition audited (actor, from, to, comment, time), including SYSTEM escalations
- [ ] Passwords BCrypt-hashed; JWT secret from env var
- [ ] Validation on all DTOs; consistent error format; upload errors are row-level
- [ ] Role checks server-side (`@PreAuthorize`) plus ownership checks
- [ ] Flyway migrations; no `ddl-auto=update` outside `test`
- [ ] Swagger complete and matches section 7
- [ ] `docker compose up` + `./mvnw spring-boot:run` works from a clean clone
- [ ] Feasibility, simulation and recommendation return reasons a human can read
- [ ] README includes setup, credentials, Mermaid state diagram, simulation assumptions, demo script

## 14. Demo Script (6 minutes)

1. **alice**: check balance → preview leave for the conflict week → "60% feasible: 12–13 Oct and 16 Oct OK; 14–15 over capacity" plus alternative fully-clear dates.
2. Submit anyway → **manager**: red flag, heatmap, deadline countdown → open the recommendation (reasons + safe dates) → approve.
3. **hr**: final approval → alice's balance moves pending → used.
4. Leave another request untouched → trigger escalation → shows `ESCALATED` with a SYSTEM entry in the timeline.
5. **Manager** uploads `tasks-sample.xlsx` → press **Simulate** → chart of supply vs demand, a MISSED task, and "need +1.5 FTE on 14–15 Oct".
6. **HR** creates a mid-year joiner → pro-rated balance appears instantly → downloads the approved-leave Excel report.
7. Close with the state-machine diagram, green test suite, and Swagger.

## 15. Assumptions (edit here if wrong)

- Single company; one team and one manager per employee; calendar-year leave cycle.
- Full-day leave only (half-days are a stretch goal); carry-forward stored but not auto-computed.
- Workload demand comes from uploaded tasks (a planning input, not a forecast); supply is pooled across roles.
- Notifications are in-app only; email is a stretch goal behind an interface.
- No ML anywhere. Forecasting demand from historical data is a possible phase-2 feature once real data exists.

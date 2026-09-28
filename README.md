# Hackforge — Enterprise Leave Management & Workload Optimization Platform

An end-to-end, industry-grade leave management and workforce capacity planning system. Built with **Spring Boot 3 (Java 21)** and **React 19 + TypeScript + Vite**.

---

## 🌟 Key Features

1. **Two-Stage Approval Workflow**:
   - `SUBMIT` → `PENDING_MANAGER` → `PENDING_HR` → `APPROVED`.
   - Automatic escalation on stage deadlines (e.g. 48h manager / 72h HR).
   - Optimistic concurrency control via `@Version` prevents race conditions.
   - Comprehensive audit trail (`ApprovalHistory`) tracking every event and actor.

2. **Capacity & Feasibility Engine (Deterministic & Explainable)**:
   - Proactive preview calculation before submission: `FULLY_FEASIBLE`, `PARTIALLY_FEASIBLE`, or `NOT_FEASIBLE`.
   - Team concurrent absence cap (e.g. max 30% out).
   - Peak period multipliers (e.g. month-end close).
   - Alternative safe-window date suggestions ranked by proximity.
   - Visual team availability calendar heatmap (`LOW`, `MEDIUM`, `HIGH` absence levels).

3. **Task-Driven Workload Simulation & AI Recommendation**:
   - Upload monthly team task sheets (`.xlsx`) with effort hours, deadlines, and priorities.
   - Day-by-day capacity-demand simulation showing coverage, backlog, and task completion.
   - Automated workforce shortfall detection (e.g. *"Need +1.5 FTE between Oct 14-16"*).
   - Decision engine recommending `APPROVE`, `APPROVE_WITH_CONDITIONS`, or `RESCHEDULE_SUGGESTED` with human-readable rationale.

4. **Automated Excel Reporting**:
   - Multi-sheet Excel workbook export powered by Apache POI:
     - Sheet 1: Approved Leaves with approver timeline
     - Sheet 2: Team Summary & turnaround metrics
     - Sheet 3: Entitlement & Balance breakdown
     - Sheet 4: Flagged conflict approvals audit view
   - Scheduled monthly generation and on-demand download.

5. **AEBAS Government-Themed Biometric UI**:
   - Accessible interface with text scaling, quick demo logins, and real-time validation.
   - Manager and HR review queues with live countdown timers and batch actioning.
   - Employee dashboard with entitlement cards and leave status history.

---

## 🏗 Project Architecture

```
Hackforge/
├── leave-management/          # Backend (Spring Boot 3.x, Java 21)
│   ├── src/main/java/com/company/leave/
│   │   ├── config/            # JWT Auth, Security, Swagger, CORS, Scheduling
│   │   ├── domain/            # JPA Entities & State Machine Enums
│   │   ├── repository/        # Spring Data Repositories
│   │   ├── service/           # Business Logic, Proration, Capacity, Simulation, Reports
│   │   ├── scheduler/         # Auto-escalation & Monthly report jobs
│   │   └── web/               # REST Controllers & DTOs
│   ├── src/main/resources/
│   │   ├── db/migration/      # Flyway SQL Migrations (V1 init, V2 demo seed, V3 leave types)
│   │   └── application.yml    # App profiles (dev, test, demo)
│   └── pom.xml
│
├── leavema/                   # Frontend (React 19, TypeScript, Vite)
│   ├── src/
│   │   ├── components/        # Reusable UI widgets, badges, skeletons, countdown
│   │   ├── contexts/          # Auth & Toast context providers
│   │   ├── lib/               # Axios API client, auth helpers, formatting
│   │   ├── pages/             # Employee, Manager, HR, and Admin views
│   │   └── types/             # TypeScript interfaces matching backend DTOs
│   ├── package.json
│   └── vite.config.ts
│
└── PLAN.md                    # Core System Specification & Blueprint
```

---

## 🚀 Getting Started

### Prerequisites
- **Java 21** (JDK 21)
- **Node.js** (v18+) and **npm**
- **Maven** (included via `./mvnw` wrapper)

---

### Quick Start (One-Click)

The frontend and backend run together as a single unified service on one link:
- **Windows Command Prompt**: `run.bat`
- **PowerShell**: `.\run.ps1`

Once launched, everything is accessible on **`http://localhost:8080`**:
- 🌐 **Web Application (Frontend + Backend)**: [http://localhost:8080](http://localhost:8080)
- 📖 **Swagger REST API Docs**: [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
- 🗄️ **H2 Database Console**: [http://localhost:8080/h2-console](http://localhost:8080/h2-console) (JDBC URL: `jdbc:h2:file:./data/leavedb`, User: `sa`)

---

### Manual Start

#### Running the Unified Application

Open a terminal in `leave-management`:

```powershell
cd leave-management
.\mvnw.cmd spring-boot:run
```

*Runs both the React SPA and Spring Boot REST API on port `8080`.*

To run the automated test suite (23 unit & integration tests):
```powershell
.\mvnw.cmd test
```

---

#### Optional: Frontend Hot-Reload Dev Server

For active frontend development with instant HMR:
```powershell
cd leavema
npm run dev
```
*Vite dev server starts on `http://localhost:3000/` and automatically proxies `/api` calls to port 8080.*

---

## 👥 Seed Demo Accounts

All demo accounts use password: **`Demo@123`**

| Role | Email | Attendance ID | Description |
|---|---|---|---|
| **Employee** | `alice@demo.com` | `100041` | Full-time engineering team member |
| **Employee** | `bob@demo.com` | `100052` | Mid-year joiner (pro-rated entitlement) |
| **Manager** | `manager@demo.com` | `100030` | Engineering team lead (approvals & calendar) |
| **HR Manager** | `hr@demo.com` | `100020` | Company HR (final approvals, reports & settings) |
| **Admin** | `admin@demo.com` | `100010` | System administrator (escalation job trigger) |

---

## ☁️ Cloud Deployment

### 1. One-Click Cloud Deployment (Render / Railway)
This repository includes a multi-stage [`Dockerfile`](file:///c:/Users/shash/OneDrive/Desktop/Hackforge/Dockerfile) and [`render.yaml`](file:///c:/Users/shash/OneDrive/Desktop/Hackforge/render.yaml) specification:
- **Render.com**: Connect this GitHub repo (`https://github.com/Shashwat072006/HackForge__`) → Select **Blueprint** or **Web Service (Docker)** → Deploy.
- **Railway.app**: New Project → Deploy from GitHub repo → Railway detects the `Dockerfile` automatically.

### 2. Docker Local Run
```bash
docker build -t hackforge-leave-system .
docker run -p 8080:8080 hackforge-leave-system
```

---

## 📜 License
MIT License. Created for Hackforge.

# DEADLINEDECK
### Academic Workload Planning and Student Productivity Platform

> B.Tech Computer Science and Engineering Minor Project — Web Development Course

---

## 1. Project Overview

**DeadlineDeck** is a full-stack academic workload management and student productivity platform designed to help university students balance coursework across assignments, practicals, projects, and examination preparation.

### The Central Problem
Traditional student to-do apps cluster tasks purely on their final submission due date. Students often do not realize that multiple heavy assignments require study on the *same day*, leading to unexpected burnout, all-nighters, and missed deadlines.

### The Differentiating Solution: Workload Pressure Engine
DeadlineDeck strictly separates the **Submission Due Date** from the **Planned Study Date**. For every date, it calculates:

$$\text{Total Workload} = \sum \text{estimated\_hours of active tasks planned for that date}$$

$$\text{Workload Gap} = \text{Total Workload} - \text{Available Study Hours}$$

$$\text{Utilization Percentage} = \left(\frac{\text{Total Workload}}{\text{Available Study Hours}}\right) \times 100$$

#### Workload Status Thresholds
- **Balanced** ($\le 80\%$): Planned workload is manageable within available time (Teal indicator).
- **Near Capacity** ($80.1\% - 100\%$): Workload is approaching daily capacity buffer (Amber indicator).
- **Overloaded** ($> 100\%$): Planned workload exceeds study capacity (Coral indicator with diagonal overflow hatch).

*Worked Example:* With 3.0 hours capacity and tasks requiring 1.5h + 1.0h + 1.0h = 3.5h, utilization is 116.7%. The platform warns:  
`"Your planned workload exceeds your available study time by 30 minutes."`

---

## 2. Technology Stack & Creative Direction

Follows the university's prescribed technology requirements with zero prohibited frontend frameworks:

- **Frontend**: Semantic HTML5, CSS3, Vanilla JavaScript (ES6+), Fetch API, native SVG icons.
- **Visual Identity**: **Premium Editorial Product Design** (`#F8F8F6` canvas, `#111111` typography, `#4A64D8` primary accent, `#438875` success, `#D29A48` warning, `#C96865` danger, `#E5E5E1` border).
- **Navigation Architecture**: Horizontal top navigation bar with brand symbol, central navigation links, student profile avatar, settings, and responsive mobile drawer (no clunky primary sidebar).
- **Original Visual Artwork**: Bespoke CSS/SVG 3D-inspired academic sculpture featuring layered floating calendar tiles, isometric clock rings, and perspective depth shadows.
- **Backend**: Node.js & Express.js with a strict 5-stage initialization sequence and uniform JSON response envelope (`{ success: true, message, data: { ... } }`).
- **Database**: MySQL with normalized relational schema, foreign key constraints, indexes, and connection pool via `mysql2/promise`.
- **Authentication & Security**: Express session store backed by MySQL (`express-mysql-session`), bcrypt password hashing (10 salt rounds), SameSite HTTP-only session cookies (`deadlinedeck.sid`), parameterized queries preventing SQL injection, and ownership verification middleware.
- **Unit & Integration Testing**: Node.js native test runner (`node:test`) covering 30 tests across 5 test suites.

*Strict Academic Restrictions Enforced:* No React, Next.js, Vue, Angular, TypeScript, Tailwind CSS, Bootstrap, MongoDB, Firebase, Python, PHP, or external AI APIs.

---

## 3. Project Structure

```text
deadline-deck/
├── public/
│   ├── index.html                 # Editorial landing page with 3D CSS/SVG sculpture
│   ├── login.html                 # Student authentication with sample workload preview
│   ├── register.html              # Registration with default B.Tech CSE subjects
│   ├── dashboard.html             # Overview ribbon, 7-day workload map & algorithmic focus
│   ├── planner.html               # 7-day academic board, capacity adjustments & quick reschedule
│   ├── tasks.html                 # Full CRUD academic task ledger with status toggles
│   ├── calendar.html              # Month view distinguishing planned study vs due dates
│   ├── subjects.html              # Enrolled subjects ledger with safe deletion protection
│   ├── insights.html              # Completion metrics, workload distribution & overload risk
│   ├── toolkit.html               # 6-utility Student Toolkit hub
│   ├── settings.html              # Study capacity defaults, date overrides & password management
│   ├── icons.svg                  # Scalable SVG sprite with accessible icons
│   ├── tools/
│   │   ├── word-counter.html      # Tool 1: Live metrics, reading time & target goal progress
│   │   ├── citation-generator.html# Tool 2: APA 7th & IEEE reference formatter
│   │   ├── study-planner.html     # Tool 3: Focus block timer & MySQL session history
│   │   ├── checklist.html         # Tool 4: Assignment deliverables breakdown checklist
│   │   ├── notes.html             # Tool 5: Subject-linked quick notes with pinning & search
│   │   └── marks-calculator.html  # Tool 6: Assessment percentage & target exam score calculator
│   ├── css/
│   │   ├── design-system.css      # Core tokens, color palette, buttons & editorial cards
│   │   ├── base.css               # Reset, typography & base rules
│   │   ├── layout.css             # Horizontal navigation bar, mobile drawer & container layouts
│   │   ├── components.css         # Form elements, pills, tables, modals & gauges
│   │   ├── dashboard.css          # Overview ribbon & 7-day workload map
│   │   ├── toolkit.css            # Toolkit utilities styling
│   │   └── responsive.css         # Responsive media query breakpoints
│   └── js/
│       ├── api.js                 # Unified Fetch API client with JSON error handling
│       ├── auth.js                # Session management, header profile sync & logout
│       ├── ui.js                  # Navigation active state, drawer, toasts & modal management
│       ├── workload.js            # Mirrored client-side workload calculation utilities
│       ├── dashboard.js           # Dashboard controller & live ribbon updates
│       ├── planner.js             # Week planner controller & rescheduling logic
│       ├── tasks.js               # Task ledger filters, search & CRUD modals
│       ├── calendar.js            # Calendar month grid & date inspector shelf
│       ├── subjects.js            # Subject management & safe deletion handling
│       ├── insights.js            # Reports & data-grounded performance charts
│       ├── settings.js            # Profile, default capacity & date overrides
│       └── tools/                 # Tool-specific JavaScript modules
├── config/
│   └── db.js                      # MySQL connection pool with literal date strings
├── middleware/
│   └── auth.js                    # requireAuth & ownership verification
├── routes/
│   ├── auth.js                    # Register, login, logout, me, profile
│   ├── subjects.js                # Subjects CRUD with 409 safe delete protection
│   ├── tasks.js                   # Tasks CRUD & status updates
│   ├── dashboard.js               # Ribbon summary & 7-day workload map
│   ├── planner.js                 # Day details & date rescheduling
│   ├── capacity.js                # Default & date-specific study hours
│   ├── calendar.js                # Events partitioned by planned vs due
│   ├── reports.js                 # Aggregated analytics & completion rates
│   ├── notes.js                   # Quick notes CRUD & pinning
│   ├── checklists.js              # Checklists & sub-items
│   └── studySessions.js           # Focus study session logging
├── services/
│   ├── workloadService.js         # Core workload pressure engine & threshold formulas
│   └── priorityService.js         # Rule-based explainable focus ranking algorithm
├── database/
│   ├── schema.sql                 # MySQL relational schema (9 normalized tables)
│   ├── seed.sql                   # Believable B.Tech demo seed data
│   └── setup.js                   # Automatic schema & seed bootstrap runner
├── scripts/
│   ├── check-db.js                # Database connection sanity checker
│   └── verify-schema.js           # Table and foreign key inspector
├── tests/
│   ├── workload.test.js           # Workload engine test cases & thresholds
│   ├── priority.test.js           # Algorithmic ranking & tie-breaker tests
│   ├── api.test.js                # API constraints & capacity override precedence tests
│   ├── boot.test.js               # Application instance initialization test
│   └── vertical-workflow.test.js  # Phase 3 10-step end-to-end integration test
├── app.js                         # Express application entry point (5-stage boot)
├── package.json                   # Dependencies and scripts
├── .env.example                   # Environment configuration template
└── README.md                      # Comprehensive project documentation
```

---

## 4. Setup and Installation

### Prerequisites
- Node.js (v18.0.0 or higher)
- MySQL Server (v8.0 or MariaDB)

### Step 1: Clone and Install Dependencies
```bash
cd deadlineDeck
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Update `.env` with your local MySQL credentials:
```ini
PORT=3000
NODE_ENV=development
SESSION_SECRET=deadlinedeck_secure_session_key_2026
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=deadlinedeck
```

### Step 3: Check and Initialize MySQL Database
Run the included verification and setup scripts:
```bash
# 1. Test database connection
npm run db:check

# 2. Automatically create database, run schema and seed demo records
npm run db:setup

# 3. Verify all 9 relational tables and foreign keys
npm run db:verify
```

Default seeded student accounts:
- **Email:** `kamlesh@example.com` | **Password:** `Student@123`
- **Email:** `aarav.sharma@college.edu` | **Password:** `Student@123`

### Step 4: Run the Application
```bash
# Start server
npm start

# Or with live reload in development
npm run dev
```
Open your browser and navigate to:  
`http://localhost:3000`

---

## 5. Running Automated Tests

Run the full automated test suite using Node.js built-in test runner:
```bash
npm test
```
All **30 tests across 5 test suites pass cleanly with 0 failures**, validating:
1. **Workload Invariant Rules:** Exact specification worked example (3.5h tasks on 3.0h capacity = 116.7% Overloaded by 30 minutes).
2. **Threshold Boundaries:** Exactly 80.0% is Balanced, 100.0% is Near Capacity, $>100\%$ is Overloaded.
3. **Completed Task Exclusion:** Tasks marked as 'Completed' are strictly excluded from pending workload calculations.
4. **Capacity Precedence:** Date-specific capacity overrides always take precedence over the student's default daily study capacity.
5. **Zero-Division Safeguards:** Zero-capacity days are safely handled without `NaN` or unhandled exceptions.
6. **Algorithmic Priority Ranking:** Due date urgency sorting, overdue penalty elevation, and priority tie-breaking.
7. **Phase 3 Vertical Workflow (10 Steps):** Full end-to-end integration journey:
   - Register $\rightarrow$ Login $\rightarrow$ Create subject $\rightarrow$ Create task $\rightarrow$ Read task $\rightarrow$ Update task $\rightarrow$ Mark completed $\rightarrow$ Verify MySQL directly $\rightarrow$ Delete task $\rightarrow$ Confirm deletion in MySQL.

---

## 6. Viva Examination Guide for B.Tech Evaluators

When presenting this project during a university viva:

1. **Why separate planned_date from due_date?**  
   *"Most student productivity apps fail because they schedule tasks on the submission deadline. If three major projects are due on Friday, the student gets crushed on Thursday night. DeadlineDeck introduces an independent `planned_date` so students plan when they will actually execute the work, enabling the platform to calculate daily workload pressure days in advance."*

2. **How does the Workload Pressure Engine work?**  
   *"For any given date, the engine queries all active (`Pending` or `In Progress`) tasks planned for that day, sums their `estimated_hours`, and compares this against the student's study capacity. If utilization is $\le 80\%$, it displays as Balanced. If $81\% - 100\%$, it indicates Near Capacity. If $>100\%$, it flags an Overload condition, computes the exact time deficit in minutes, and suggests rescheduling."*

3. **How does session security and authentication work?**  
   *"We use Express session management with MySQL persistence via `express-mysql-session`. Sessions are stored server-side in the `sessions` table. Client browsers only store a cryptographically signed, HTTP-only, SameSite session cookie (`deadlinedeck.sid`). When logging in, `req.session.regenerate()` is executed to prevent session fixation attacks. Passwords are never stored in plaintext—they are hashed using bcrypt with 10 salt rounds."*

4. **How do you prevent SQL injection?**  
   *"All database queries in `config/db.js` and Express route handlers use parameterized prepared statements (`?` placeholders) executed via `mysql2/promise`. User inputs are never concatenated directly into SQL query strings."*

5. **Why enforce referential integrity and safe subject deletion?**  
   *"Foreign keys link tasks and notes to subjects. If a student tries to delete a subject that still has active tasks, the server checks `SELECT COUNT(*) FROM tasks WHERE subject_id = ?` and returns HTTP 409 Conflict. This prevents orphan records and ensures database consistency without requiring reckless CASCADE deletions."*

6. **What is the design philosophy of the user interface?**  
   *"We created a custom design language called Premium Editorial Product Design. It eschews generic dashboard templates in favor of a modern horizontal navigation bar, generous whitespace, refined monochromatic tones with purposeful accents, and bespoke CSS/SVG visual elements."*

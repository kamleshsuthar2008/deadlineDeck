# DEADLINEDECK
### Academic Workload Planning and Student Productivity Platform

> B.Tech Computer Science and Engineering Minor Project — Web Development Course

---

## 1. Project Overview

**DeadlineDeck** is an academic workload management platform designed to help university students balance coursework across assignments, practicals, projects, and examination preparation.

### The Central Problem
Traditional to-do apps cluster tasks on their final submission deadlines. Students often do not realize that multiple heavy assignments require study on the *same day*, leading to unexpected burnout and missed deadlines.

### The Differentiating Solution: Workload Pressure Indicator
DeadlineDeck strictly separates the **Submission Due Date** from the **Planned Study Date**. For every date, it calculates:

$$\text{Total Workload} = \sum \text{estimated\_hours of active tasks planned for that date}$$

$$\text{Workload Gap} = \text{Total Workload} - \text{Available Study Hours}$$

$$\text{Utilization Percentage} = \left(\frac{\text{Total Workload}}{\text{Available Study Hours}}\right) \times 100$$

#### Workload Status Thresholds
- **Balanced** ($\le 80\%$): Planned workload is manageable within available time. (Teal indicator)
- **Near Capacity** ($80.1\% - 100\%$): Workload is approaching daily capacity buffer. (Amber indicator)
- **Overloaded** ($> 100\%$): Planned workload exceeds study capacity. (Coral indicator with diagonal overflow hatch)

*Worked Example:* With 3.0 hours capacity and tasks requiring 1.5h + 1.0h + 1.0h = 3.5h, utilization is 116.7%. The platform warns:  
`"Your planned workload exceeds your available study time by 30 minutes."`

---

## 2. Technology Stack

Follows the university's prescribed stack with zero prohibited frontend frameworks:

- **Frontend**: Semantic HTML5, CSS3, Vanilla JavaScript (ES6+), Fetch API, SVG icons.
- **Typography**: Newsreader (display titles/numerals) + Instrument Sans (UI/body) with system fallbacks. Tabular numerals (`tnum`) enabled on all figures.
- **Backend**: Node.js, Express.js.
- **Database**: MySQL with prepared statements via `mysql2/promise`.
- **Authentication**: `express-session` with `express-mysql-session`, `bcrypt` (10 salt rounds), SameSite HTTP-only session cookies.
- **Unit Testing**: Node.js built-in test runner (`node:test`).

*Strict Restrictions Enforced:* No React, Next, Vue, Angular, TypeScript, Tailwind, Bootstrap, MongoDB, Firebase, or external AI APIs. Hand-drawn SVG and custom CSS for all gauges and visualizations.

---

## 3. Project Structure

```text
deadline-deck/
├── public/
│   ├── index.html                 # Concise landing page
│   ├── login.html                 # Split auth page with workload sample
│   ├── register.html              # Registration with starter CSE curriculum
│   ├── dashboard.html             # 3-zone workspace & signature workload map
│   ├── planner.html               # Day-by-day workload balancing & rescheduling
│   ├── tasks.html                 # Academic ledger with search, filters & sort
│   ├── calendar.html              # Month view (distinguishes planned vs due)
│   ├── subjects.html              # Enrolled subjects ledger with safe deletion
│   ├── insights.html              # Workload analytics & written editorial summary
│   ├── toolkit.html               # 3x2 utility library grid
│   ├── settings.html              # Profile & date-specific capacity overrides
│   ├── design-system.html         # Living component matrix & token spec
│   ├── icons.svg                  # Hand-built 20x20 SVG sprite
│   ├── tools/
│   │   ├── word-counter.html      # Tool 1: Live stats & target progress
│   │   ├── citation-generator.html# Tool 2: APA 7th & IEEE reference formatter
│   │   ├── study-planner.html     # Tool 3: Focus timer & session logger
│   │   ├── checklist.html         # Tool 4: Task sub-steps checklist
│   │   ├── notes.html             # Tool 5: Subject notes with pinning
│   │   └── marks-calculator.html  # Tool 6: Target exam score calculator
│   ├── css/
│   │   ├── base.css               # Design tokens, typography & reset
│   │   ├── layout.css             # 248px navy sidebar & 3-zone grid
│   │   ├── components.css         # Buttons, inputs, chips, modal, gauges
│   │   ├── dashboard.css          # Overview ribbon & 7-day workload map
│   │   ├── toolkit.css            # Light, airy library grid & workspaces
│   │   └── responsive.css         # Breakpoints (1440, 1024, 768, 390px)
│   └── js/
│       ├── api.js                 # Centralized fetch client wrapper
│       ├── auth.js                # Session management & user profile
│       ├── ui.js                  # Modal focus trap, toasts, drawer
│       ├── workload.js            # Mirrored client workload calculations
│       ├── dashboard.js           # Dashboard interactive controller
│       ├── planner.js             # Week board & task rescheduling
│       ├── tasks.js               # Task ledger filters & CRUD
│       ├── calendar.js            # Calendar month grid & day inspector
│       ├── subjects.js            # Subject management
│       ├── insights.js            # Reports & data-grounded summaries
│       ├── settings.js            # Profile & capacity overrides
│       └── tools/                 # Tool-specific JavaScript modules
├── config/
│   └── db.js                      # MySQL connection pool & prepared statements
├── middleware/
│   └── auth.js                    # requireAuth & ownership verification
├── routes/
│   ├── auth.js                    # Register, login, logout, me, profile
│   ├── subjects.js                # Subjects CRUD with 409 safe delete
│   ├── tasks.js                   # Tasks CRUD & status updates
│   ├── dashboard.js               # Ribbon summary & 7-day workload map
│   ├── planner.js                 # Day details & date rescheduling
│   ├── capacity.js                # Default & date-specific study hours
│   ├── calendar.js                # Events partitioned by planned vs due
│   ├── reports.js                 # Aggregated analytics & frequency
│   ├── notes.js                   # Quick notes CRUD & pinning
│   ├── checklists.js              # Checklists & sub-items
│   └── studySessions.js           # Focus study session logging
├── services/
│   ├── workloadService.js         # Core workload pressure engine
│   └── priorityService.js         # Rule-based explainable task ranking
├── database/
│   ├── schema.sql                 # MySQL relational schema & indexes
│   └── seed.sql                   # Believable B.Tech demo seed data
├── tests/
│   ├── workload.test.js           # Workload calculation & threshold tests
│   ├── priority.test.js           # Smart ranking & tie-breaker tests
│   └── api.test.js                # API constraints & override tests
├── app.js                         # Express application entry point
├── package.json                   # Dependencies and scripts
├── .env.example                   # Environment configuration template
├── .gitignore                     # Git ignore rules
├── TESTING.md                     # Test execution results audit
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
SESSION_SECRET=your_secret_session_key_here
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=deadlinedeck
```

### Step 3: Initialize Database Schema and Demo Seed
In your MySQL client or terminal:
```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

The seed data provisions:
- Core subjects: DBMS (CS301), OS (CS302), Web Dev (CS303), DSA (CS304), Discrete Math (MA301)
- Demo student account (`aarav.sharma@college.edu`)
- Demonstrates:
  - Balanced day ($\le 80\%$)
  - Near capacity day ($80\% - 100\%$)
  - Overloaded day ($> 100\%$ with coral diagonal hatch)

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

Run the test suite using Node.js built-in runner:
```bash
npm test
```
All 16 unit tests test core invariant rules:
- Workload thresholds (Balanced, Near Capacity, Overloaded)
- Exact specification worked example (3.5h on 3h capacity = 116.7%)
- Completed task exclusion
- Date-specific capacity override precedence
- Division by zero prevention (`Capacity not set`)
- Explainable priority ranking order & tie-breakers

---

## 6. Viva Explanation Points for B.Tech Evaluators

When explaining this project to a viva examiner:

1. **Why separate planned_date from due_date?**  
   "Most students fail to meet deadlines because all tasks cluster on submission day. By recording `planned_date` independently, DeadlineDeck spreads study sessions across available days and predicts crunch days in advance."
2. **How does the Workload Pressure Indicator prevent SQL injection?**  
   "All database operations in `config/db.js` and Express routes use prepared statements with parameterized queries (`?` placeholders). No user inputs are concatenated directly into SQL."
3. **How does session security work?**  
   "We use HTTP-only, SameSite session cookies. On every login, `req.session.regenerate()` is invoked to prevent session fixation attacks. Passwords are never stored in plaintext—they are hashed using `bcrypt` with 10 salt rounds."
4. **How is the signature gauge rendered without chart libraries?**  
   "The vertical capacity gauge uses pure semantic CSS. The track height represents the maximum of planned and available hours. If planned hours exceed capacity, the base capacity is filled in coral, and the overflow section is rendered using CSS `repeating-linear-gradient` at -45 degrees."
5. **Why block subject deletion if tasks exist?**  
   "Referential integrity in relational databases requires that foreign keys remain consistent. Deleting a subject with pending tasks would orphan those records; the platform responds with HTTP 409 Conflict and instructs the student to reassign or delete tasks first."

# DeadlineDeck — Test Verification & Quality Audit

This document records the actual testing execution, test coverage, and validation outcomes for the DeadlineDeck academic workload planning platform.

---

## 1. Automated Test Suite Execution

Ran via Node.js built-in test runner:
```bash
node --test tests/workload.test.js tests/priority.test.js tests/api.test.js
```

### Execution Output:
```text
✔ API validation: Task type constraints (0.786ms)
✔ API validation: Hours decimal stepping (0.2073ms)
✔ Workload calculation: Date-specific override precedence over default capacity (0.3614ms)
✔ Workload calculation: Exactly 80.0% boundary is Balanced (0.1455ms)
✔ Workload calculation: Exactly 100.0% boundary is Near capacity (0.1398ms)
✔ Workload calculation: 100.1% or higher is Overloaded (0.1385ms)
✔ getDaysDifference computes correct positive, negative, and zero day offsets (0.8297ms)
✔ Overdue tasks rank first before tasks due today or upcoming (0.3953ms)
✔ Completed tasks are excluded from focus ranking (0.1496ms)
✔ Tie breaker favors higher priority when due dates are identical (0.1582ms)
✔ formatHourDifference formats minutes and hours cleanly (0.9808ms)
✔ Exact specification worked example: 3h capacity, 3.5h tasks -> 116.7% Overloaded (0.4723ms)
✔ Workload threshold: Balanced (utilization <= 80%) (0.1704ms)
✔ Workload threshold: Near capacity (utilization > 80% and <= 100%) (0.1675ms)
✔ Completed tasks are strictly excluded from pending workload (0.1636ms)
✔ Zero study capacity is handled gracefully without NaN or Infinity (0.1395ms)
ℹ tests 16
ℹ suites 0
ℹ pass 16
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 110.164ms
```

---

## 2. Specification Verification Matrix

| Requirement | Test / Audit Verification | Status |
|---|---|---|
| **Workload Pressure Formula** | Evaluated with 3.0h capacity and 3.5h tasks -> 116.7% utilization, 0.5h gap. Produced message: *"Your planned workload exceeds your available study time by 30 minutes."* | **PASS** |
| **Threshold Invariants** | &le; 80.0% = Balanced; 80.1%–100.0% = Near capacity; &gt; 100.0% = Overloaded | **PASS** |
| **Capacity Override** | Verified date-specific override overrides default daily study hours | **PASS** |
| **Completed Task Exclusion** | Completed tasks strictly filtered out from pending workload calculation | **PASS** |
| **Zero Capacity Division** | Capacity 0 or null returns status `Capacity not set` without NaN or Infinity | **PASS** |
| **Smart Priority Order** | Overdue &rarr; Due today &rarr; Nearest deadline &rarr; High priority &rarr; In Progress | **PASS** |
| **Tie Breaker** | Earlier due date &rarr; Higher priority &rarr; Larger estimated hours &rarr; Title | **PASS** |
| **Due Date vs Planned Date** | Independent database columns; rescheduling changes planned date without altering due date | **PASS** |
| **Subject Deletion Safety** | Server refuses deletion of subject with active tasks with 409 Conflict | **PASS** |
| **Student Toolkit Tools** | 6 independent tools built: Word Counter, Citation Generator, Study Planner, Checklist, Quick Notes, Marks Calculator | **PASS** |
| **Persistence Verification** | MySQL tables for users, subjects, tasks, study_capacity, notes, checklists, checklist_items, study_sessions, sessions | **PASS** |

---

## 3. Design Review Checklist (Part D)

1. **Squint test**: Weekly Workload Map and Overview Ribbon dominate visual hierarchy immediately.
2. **Color discipline**: Accent blue (`#4567D8`) reserved for actions/selection only. Status colors (`#36978C`, `#E6A13A`, `#D76B67`) used strictly for workload states.
3. **Typography**: Newsreader serif for titles/numerals, Instrument Sans for UI/body. Tabular numerals (`tnum`) applied across all numbers, dates, hours, and percentages.
4. **Anti-template rules**: Zero emoji in UI, no rounded stat cards, no glassmorphism, no box-shadows on panels, no marketing hype copy.
5. **Accessibility**: Visible focus rings (`2px solid var(--accent)`), proper semantic landmarks (`<aside>`, `<main>`, `<header>`, `<nav>`), WCAG AA contrast compliant status text.
6. **Responsive behavior**: Tested for desktop (1440px), tablet (1024px, 768px), and mobile (390px) with bottom tab bar, stacked overview ribbon, and mobile workload list.

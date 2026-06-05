# Architecture — Worktime Tracker

## Overview

Pure **In-Memory** Node.js service — no database, no HTTP server, no external dependencies.

## Layer Map

```
┌──────────────────────────────────────────────────────┐
│                    Business Logic                     │
│   EmployeeService  TimeTrackingService  LeaveService  │
│   ReportService    OvertimeStrategy (Strategy GoF)    │
├──────────────────────────────────────────────────────┤
│                   Domain Models                       │
│        Employee    TimeEntry    Leave                 │
├──────────────────────────────────────────────────────┤
│                Storage Interfaces                     │
│  IEmployeeRepository  ITimeEntryRepository            │
│  ILeaveRepository                                     │
├──────────────────────────────────────────────────────┤
│              In-Memory Implementations                │
│  InMemoryEmployeeRepository                          │
│  InMemoryTimeEntryRepository                         │
│  InMemoryLeaveRepository                             │
├──────────────────────────────────────────────────────┤
│                    Utilities                          │
│  validators   dateUtils   idGenerator   EventEmitter │
└──────────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. No external dependencies at runtime
All persistence is in `Map<string, Entity>` collections inside InMemory* classes.
Repositories are swappable via their interfaces (DIP).

### 2. Strategy Pattern (OvertimeStrategy)
`ReportService` accepts an `IOvertimeStrategy` via constructor or `setOvertimeStrategy()`.
Current implementations: `Standard (1.5×)`, `DoubleTime (2×)`, `Tiered`, `CompTime`.

### 3. Observer Pattern (EventEmitter)
`EmployeeService` and `TimeTrackingService` extend `EventEmitter`.
Domain events: `employee:registered`, `employee:blocked`, `timeEntry:clockedIn`, `timeEntry:clockedOut`, `timeEntry:adjusted`, `leave:requested`, `leave:approved`, `leave:rejected`, `leave:cancelled`.

### 4. Constructor Injection (DIP)
```js
const empRepo   = new InMemoryEmployeeRepository();
const timeRepo  = new InMemoryTimeEntryRepository();
const leaveRepo = new InMemoryLeaveRepository();

const employeeService  = new EmployeeService(empRepo);
const timeService      = new TimeTrackingService(timeRepo, empRepo);
const leaveService     = new LeaveService(leaveRepo, empRepo);
const reportService    = new ReportService(timeRepo, empRepo, new TieredOvertimeStrategy());
```

## File Reference

| Path | Responsibility |
|------|---------------|
| `src/models/Employee.js` | Employee entity, status transitions |
| `src/models/TimeEntry.js` | Clock-in/out record, duration calc |
| `src/models/Leave.js` | Leave request lifecycle |
| `src/services/EmployeeService.js` | CRUD + block/activate/deactivate |
| `src/services/TimeTrackingService.js` | clockIn / clockOut / adjust |
| `src/services/LeaveService.js` | Request / approve / reject / cancel |
| `src/services/ReportService.js` | Daily, weekly, monthly, dept reports |
| `src/services/OvertimeStrategy.js` | Strategy implementations |
| `src/storage/I*.js` | Repository interfaces |
| `src/storage/InMemory*.js` | Map-backed implementations |
| `src/utils/validators.js` | Pure input validation |
| `src/utils/dateUtils.js` | Pure date helpers |
| `src/utils/idGenerator.js` | Prefix + timestamp + counter IDs |
| `src/utils/EventEmitter.js` | Observer implementation |

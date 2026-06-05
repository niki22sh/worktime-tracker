'use strict';

/**
 * Worktime Tracker — entry point (demo / smoke test)
 * For production use, import services and wire them in your application layer.
 */

const { EmployeeService } = require('./services/EmployeeService');
const { TimeTrackingService } = require('./services/TimeTrackingService');
const { LeaveService } = require('./services/LeaveService');
const { ReportService } = require('./services/ReportService');
const { InMemoryEmployeeRepository } = require('./storage/InMemoryEmployeeRepository');
const { InMemoryTimeEntryRepository } = require('./storage/InMemoryTimeEntryRepository');
const { InMemoryLeaveRepository } = require('./storage/InMemoryLeaveRepository');
const { EMPLOYEE_ROLE } = require('./models/Employee');
const { LEAVE_TYPE } = require('./models/Leave');
const { TieredOvertimeStrategy } = require('./services/OvertimeStrategy');

// ─── Bootstrap ────────────────────────────────────────────────────────────────
const empRepo   = new InMemoryEmployeeRepository();
const timeRepo  = new InMemoryTimeEntryRepository();
const leaveRepo = new InMemoryLeaveRepository();

const employeeService = new EmployeeService(empRepo);
const timeService     = new TimeTrackingService(timeRepo, empRepo);
const leaveService    = new LeaveService(leaveRepo, empRepo);
const reportService   = new ReportService(timeRepo, empRepo, new TieredOvertimeStrategy());

// ─── Observer hooks ───────────────────────────────────────────────────────────
employeeService.on('employee:registered', e => console.log(`[EVENT] Employee registered: ${e.fullName}`));
timeService.on('timeEntry:clockedIn',  ({ employee }) => console.log(`[EVENT] ${employee.fullName} clocked in`));
timeService.on('timeEntry:clockedOut', ({ employee, entry }) => console.log(`[EVENT] ${employee.fullName} clocked out — ${entry.getDurationHours()}h`));

// ─── Demo ─────────────────────────────────────────────────────────────────────
const alice = employeeService.register({ firstName: 'Alice', lastName: 'Dev', email: 'alice@company.com', department: 'Engineering', role: EMPLOYEE_ROLE.EMPLOYEE });
const bob   = employeeService.register({ firstName: 'Bob',   lastName: 'QA',  email: 'bob@company.com',   department: 'QA',          role: EMPLOYEE_ROLE.EMPLOYEE });

timeService.clockIn(alice.id,  new Date('2024-03-15T09:00:00'));
timeService.clockOut(alice.id, new Date('2024-03-15T18:30:00')); // 9.5h

timeService.clockIn(bob.id,  new Date('2024-03-15T08:45:00'));
timeService.clockOut(bob.id, new Date('2024-03-15T17:00:00')); // 8.25h

const leave = leaveService.requestLeave({ employeeId: alice.id, type: LEAVE_TYPE.VACATION, startDate: new Date('2024-04-01'), endDate: new Date('2024-04-07') });
leaveService.approve(leave.id, bob.id);

const daily   = reportService.getDailyReport(new Date('2024-03-15'));
const weekly  = reportService.getWeeklyReport(alice.id, new Date('2024-03-15'), 50);
const monthly = reportService.getMonthlyReport(alice.id, 2024, 3, 50);

console.log('\n── Daily Report ──');
daily.employees.forEach(e => console.log(`  ${e.fullName}: ${e.hoursWorked}h`));

console.log('\n── Weekly Report (Alice) ──');
console.log(`  Worked: ${weekly.workedHours}h | OT: ${weekly.overtime.overtimeHours}h | OT Pay: $${weekly.overtime.overtimePay}`);

console.log('\n── Monthly Report (Alice, March 2024) ──');
console.log(`  Worked: ${monthly.workedHours}h / ${monthly.regularHours}h regular (${monthly.workingDays} working days)`);

console.log('\n── Department Summary ──');
reportService.getDepartmentSummary(new Date('2024-03-01'), new Date('2024-03-31'))
  .forEach(d => console.log(`  ${d.department}: ${d.totalHours}h across ${d.uniqueEmployees} employees`));

module.exports = { employeeService, timeService, leaveService, reportService };

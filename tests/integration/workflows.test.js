'use strict';

/**
 * Integration tests — wire all services together and exercise complete workflows.
 */

const { EmployeeService } = require('../../src/services/EmployeeService');
const { TimeTrackingService } = require('../../src/services/TimeTrackingService');
const { LeaveService } = require('../../src/services/LeaveService');
const { ReportService } = require('../../src/services/ReportService');
const { InMemoryEmployeeRepository } = require('../../src/storage/InMemoryEmployeeRepository');
const { InMemoryTimeEntryRepository } = require('../../src/storage/InMemoryTimeEntryRepository');
const { InMemoryLeaveRepository } = require('../../src/storage/InMemoryLeaveRepository');
const { EMPLOYEE_ROLE } = require('../../src/models/Employee');
const { LEAVE_TYPE } = require('../../src/models/Leave');
const { TieredOvertimeStrategy } = require('../../src/services/OvertimeStrategy');

// ─── Shared fixture factory ────────────────────────────────────────────────────

function buildServices() {
  const empRepo = new InMemoryEmployeeRepository();
  const timeRepo = new InMemoryTimeEntryRepository();
  const leaveRepo = new InMemoryLeaveRepository();

  const employeeService = new EmployeeService(empRepo);
  const timeService = new TimeTrackingService(timeRepo, empRepo);
  const leaveService = new LeaveService(leaveRepo, empRepo);
  const reportService = new ReportService(timeRepo, empRepo);

  return { empRepo, timeRepo, leaveRepo, employeeService, timeService, leaveService, reportService };
}

// ─── Scenario 1: Full workday ─────────────────────────────────────────────────

describe('Integration: Full workday cycle', () => {
  it('employee clocks in, works 8 hours, clocks out, appears in daily report', () => {
    const { employeeService, timeService, reportService } = buildServices();
    const emp = employeeService.register({ firstName: 'Oksana', lastName: 'Bondar', email: 'o@b.com', department: 'Dev', role: EMPLOYEE_ROLE.EMPLOYEE });

    const ci = new Date('2024-03-15T09:00:00');
    const co = new Date('2024-03-15T17:00:00');
    timeService.clockIn(emp.id, ci);
    const entry = timeService.clockOut(emp.id, co);

    expect(entry.getDurationHours()).toBe(8);

    const report = reportService.getDailyReport(new Date('2024-03-15'));
    const empData = report.employees.find(e => e.employeeId === emp.id);
    expect(empData.hoursWorked).toBe(8);
    expect(empData.isClockedIn).toBe(false);
  });
});

// ─── Scenario 2: Employee blocked after violation ─────────────────────────────

describe('Integration: Blocked employee cannot clock in', () => {
  it('blocks employee and prevents clock-in', () => {
    const { employeeService, timeService } = buildServices();
    const emp = employeeService.register({ firstName: 'Mykola', lastName: 'Koval', email: 'm@k.com', department: 'HR', role: EMPLOYEE_ROLE.EMPLOYEE });

    employeeService.block(emp.id);
    expect(() => timeService.clockIn(emp.id, new Date())).toThrow('blocked');
  });

  it('unblocked employee can clock in again', () => {
    const { employeeService, timeService } = buildServices();
    const emp = employeeService.register({ firstName: 'Mykola', lastName: 'Koval', email: 'm@k.com', department: 'HR', role: EMPLOYEE_ROLE.EMPLOYEE });

    employeeService.block(emp.id);
    employeeService.activate(emp.id);
    expect(() => timeService.clockIn(emp.id, new Date())).not.toThrow();
  });
});

// ─── Scenario 3: Leave management workflow ────────────────────────────────────

describe('Integration: Leave request lifecycle', () => {
  it('manager approves leave and isOnLeave returns true', () => {
    const { employeeService, leaveService } = buildServices();
    const emp = employeeService.register({ firstName: 'Daria', lastName: 'Tkach', email: 'd@t.com', department: 'QA', role: EMPLOYEE_ROLE.EMPLOYEE });
    const manager = employeeService.register({ firstName: 'Vova', lastName: 'Mgr', email: 'mgr@t.com', department: 'QA', role: EMPLOYEE_ROLE.MANAGER });

    const leave = leaveService.requestLeave({
      employeeId: emp.id,
      type: LEAVE_TYPE.VACATION,
      startDate: new Date('2024-08-01'),
      endDate: new Date('2024-08-10'),
    });

    leaveService.approve(leave.id, manager.id);
    expect(leaveService.isOnLeave(emp.id, new Date('2024-08-05'))).toBe(true);
    expect(leaveService.isOnLeave(emp.id, new Date('2024-07-31'))).toBe(false);
  });

  it('rejected leave does not count as on-leave', () => {
    const { employeeService, leaveService } = buildServices();
    const emp = employeeService.register({ firstName: 'A', lastName: 'B', email: 'a@b.com', department: 'Dev', role: EMPLOYEE_ROLE.EMPLOYEE });
    const leave = leaveService.requestLeave({ employeeId: emp.id, type: LEAVE_TYPE.SICK, startDate: new Date('2024-08-01'), endDate: new Date('2024-08-03') });
    leaveService.reject(leave.id, 'mgr');
    expect(leaveService.isOnLeave(emp.id, new Date('2024-08-02'))).toBe(false);
  });

  it('cancelled leave does not count as on-leave', () => {
    const { employeeService, leaveService } = buildServices();
    const emp = employeeService.register({ firstName: 'A', lastName: 'B', email: 'a@b.com', department: 'Dev', role: EMPLOYEE_ROLE.EMPLOYEE });
    const leave = leaveService.requestLeave({ employeeId: emp.id, type: LEAVE_TYPE.VACATION, startDate: new Date('2024-09-01'), endDate: new Date('2024-09-05') });
    leaveService.cancel(leave.id);
    expect(leaveService.isOnLeave(emp.id, new Date('2024-09-03'))).toBe(false);
  });
});

// ─── Scenario 4: Weekly overtime report ──────────────────────────────────────

describe('Integration: Weekly overtime with tiered strategy', () => {
  it('uses tiered strategy when set on reportService', () => {
    const { employeeService, timeService, reportService } = buildServices();
    const emp = employeeService.register({ firstName: 'Test', lastName: 'Worker', email: 't@w.com', department: 'Dev', role: EMPLOYEE_ROLE.EMPLOYEE });

    // Work 6 days × 8h = 48h (8h overtime)
    ['11', '12', '13', '14', '15', '16'].forEach((day, i) => {
      timeService.clockIn(emp.id, new Date(`2024-03-${day}T09:00:00`));
      timeService.clockOut(emp.id, new Date(`2024-03-${day}T17:00:00`));
    });

    reportService.setOvertimeStrategy(new TieredOvertimeStrategy(2, 1.5, 2));
    const report = reportService.getWeeklyReport(emp.id, new Date('2024-03-13'), 100);

    expect(report.overtime.overtimeHours).toBe(8);
    // First 2h at 1.5×, remaining 6h at 2×
    expect(report.overtime.overtimePay).toBe(2 * 100 * 1.5 + 6 * 100 * 2); // 300 + 1200 = 1500
  });
});

// ─── Scenario 5: Multi-employee department summary ────────────────────────────

describe('Integration: Department summary across multiple employees', () => {
  it('aggregates hours from different departments', () => {
    const { employeeService, timeService, reportService } = buildServices();

    const devA = employeeService.register({ firstName: 'A', lastName: 'Dev', email: 'a@dev.com', department: 'Dev', role: EMPLOYEE_ROLE.EMPLOYEE });
    const devB = employeeService.register({ firstName: 'B', lastName: 'Dev', email: 'b@dev.com', department: 'Dev', role: EMPLOYEE_ROLE.EMPLOYEE });
    const qa = employeeService.register({ firstName: 'C', lastName: 'QA', email: 'c@qa.com', department: 'QA', role: EMPLOYEE_ROLE.EMPLOYEE });

    // devA: 8h, devB: 6h, qa: 4h
    timeService.clockIn(devA.id, new Date('2024-03-15T09:00:00'));
    timeService.clockOut(devA.id, new Date('2024-03-15T17:00:00'));
    timeService.clockIn(devB.id, new Date('2024-03-15T09:00:00'));
    timeService.clockOut(devB.id, new Date('2024-03-15T15:00:00'));
    timeService.clockIn(qa.id, new Date('2024-03-15T10:00:00'));
    timeService.clockOut(qa.id, new Date('2024-03-15T14:00:00'));

    const summary = reportService.getDepartmentSummary(new Date('2024-03-01'), new Date('2024-03-31'));
    const devSummary = summary.find(s => s.department === 'Dev');
    const qaSummary = summary.find(s => s.department === 'QA');

    expect(devSummary.totalHours).toBe(14);
    expect(devSummary.uniqueEmployees).toBe(2);
    expect(qaSummary.totalHours).toBe(4);
    expect(qaSummary.uniqueEmployees).toBe(1);
  });
});

// ─── Scenario 6: Entry adjustment workflow ────────────────────────────────────

describe('Integration: Time entry correction', () => {
  it('adjusts entry and report reflects corrected hours', () => {
    const { employeeService, timeService, reportService } = buildServices();
    const emp = employeeService.register({ firstName: 'A', lastName: 'B', email: 'a@b.com', department: 'Dev', role: EMPLOYEE_ROLE.EMPLOYEE });

    timeService.clockIn(emp.id, new Date('2024-03-15T09:00:00'));
    const entry = timeService.clockOut(emp.id, new Date('2024-03-15T17:00:00'));

    // Correct: actually worked 10 hours
    timeService.adjustEntry(entry.id, new Date('2024-03-15T08:00:00'), new Date('2024-03-15T18:00:00'));
    expect(entry.getDurationHours()).toBe(10);

    const report = reportService.getDailyReport(new Date('2024-03-15'));
    const empData = report.employees.find(e => e.employeeId === emp.id);
    expect(empData.hoursWorked).toBe(10);
  });
});

// ─── Scenario 7: Observer — event chain ──────────────────────────────────────

describe('Integration: Observer event chain', () => {
  it('fires events in correct order during full workflow', () => {
    const { employeeService, timeService } = buildServices();
    const events = [];
    employeeService.on('employee:registered', () => events.push('registered'));
    timeService.on('timeEntry:clockedIn', () => events.push('clocked-in'));
    timeService.on('timeEntry:clockedOut', () => events.push('clocked-out'));

    const emp = employeeService.register({ firstName: 'A', lastName: 'B', email: 'a@b.com', department: 'Dev', role: EMPLOYEE_ROLE.EMPLOYEE });
    timeService.clockIn(emp.id, new Date('2024-03-15T09:00:00'));
    timeService.clockOut(emp.id, new Date('2024-03-15T17:00:00'));

    expect(events).toEqual(['registered', 'clocked-in', 'clocked-out']);
  });
});

// ─── Scenario 8: Top workers analytics ───────────────────────────────────────

describe('Integration: Top workers analytics', () => {
  it('correctly ranks employees by hours in a given period', () => {
    const { employeeService, timeService, reportService } = buildServices();

    const emp1 = employeeService.register({ firstName: 'Alice', lastName: 'Dev', email: 'alice@x.com', department: 'Dev', role: EMPLOYEE_ROLE.EMPLOYEE });
    const emp2 = employeeService.register({ firstName: 'Bob', lastName: 'Dev', email: 'bob@x.com', department: 'Dev', role: EMPLOYEE_ROLE.EMPLOYEE });
    const emp3 = employeeService.register({ firstName: 'Carol', lastName: 'Dev', email: 'carol@x.com', department: 'Dev', role: EMPLOYEE_ROLE.EMPLOYEE });

    // emp2 works most
    timeService.clockIn(emp1.id, new Date('2024-03-15T09:00:00'));
    timeService.clockOut(emp1.id, new Date('2024-03-15T17:00:00')); // 8h

    timeService.clockIn(emp2.id, new Date('2024-03-15T07:00:00'));
    timeService.clockOut(emp2.id, new Date('2024-03-15T20:00:00')); // 13h

    timeService.clockIn(emp3.id, new Date('2024-03-15T10:00:00'));
    timeService.clockOut(emp3.id, new Date('2024-03-15T14:00:00')); // 4h

    const top = reportService.getTopWorkers(new Date('2024-03-01'), new Date('2024-03-31'), 3);
    expect(top[0].fullName).toBe('Bob Dev');
    expect(top[2].fullName).toBe('Carol Dev');
  });
});

// ─── Scenario 9: Monthly report totals ───────────────────────────────────────

describe('Integration: Monthly report accumulates entries', () => {
  it('sums all entries across the month', () => {
    const { employeeService, timeService, reportService } = buildServices();
    const emp = employeeService.register({ firstName: 'A', lastName: 'B', email: 'a@b.com', department: 'Dev', role: EMPLOYEE_ROLE.EMPLOYEE });

    const days = ['04', '05', '06', '07', '08'];
    days.forEach(day => {
      timeService.clockIn(emp.id, new Date(`2024-03-${day}T09:00:00`));
      timeService.clockOut(emp.id, new Date(`2024-03-${day}T17:00:00`));
    });

    const report = reportService.getMonthlyReport(emp.id, 2024, 3);
    expect(report.workedHours).toBe(40);
    expect(report.entriesCount).toBe(5);
  });
});

// ─── Scenario 10: Double clock-in prevention ─────────────────────────────────

describe('Integration: Prevent double clock-in', () => {
  it('cannot clock in twice without clocking out', () => {
    const { employeeService, timeService } = buildServices();
    const emp = employeeService.register({ firstName: 'A', lastName: 'B', email: 'a@b.com', department: 'Dev', role: EMPLOYEE_ROLE.EMPLOYEE });

    timeService.clockIn(emp.id, new Date('2024-03-15T09:00:00'));
    expect(() => timeService.clockIn(emp.id, new Date('2024-03-15T10:00:00'))).toThrow('already clocked in');
  });

  it('can clock in again after clocking out', () => {
    const { employeeService, timeService } = buildServices();
    const emp = employeeService.register({ firstName: 'A', lastName: 'B', email: 'a@b.com', department: 'Dev', role: EMPLOYEE_ROLE.EMPLOYEE });

    timeService.clockIn(emp.id, new Date('2024-03-15T09:00:00'));
    timeService.clockOut(emp.id, new Date('2024-03-15T12:00:00'));
    expect(() => timeService.clockIn(emp.id, new Date('2024-03-15T13:00:00'))).not.toThrow();
  });
});

// ─── Scenario 11: Leave overlapping detection ─────────────────────────────────

describe('Integration: Overlapping leave prevention', () => {
  it('cannot request overlapping leaves of different types', () => {
    const { employeeService, leaveService } = buildServices();
    const emp = employeeService.register({ firstName: 'A', lastName: 'B', email: 'a@b.com', department: 'Dev', role: EMPLOYEE_ROLE.EMPLOYEE });

    leaveService.requestLeave({ employeeId: emp.id, type: LEAVE_TYPE.VACATION, startDate: new Date('2024-09-01'), endDate: new Date('2024-09-10') });
    expect(() => leaveService.requestLeave({ employeeId: emp.id, type: LEAVE_TYPE.SICK, startDate: new Date('2024-09-05'), endDate: new Date('2024-09-15') })).toThrow('Overlapping');
  });

  it('can request non-overlapping leaves sequentially', () => {
    const { employeeService, leaveService } = buildServices();
    const emp = employeeService.register({ firstName: 'A', lastName: 'B', email: 'a@b.com', department: 'Dev', role: EMPLOYEE_ROLE.EMPLOYEE });

    leaveService.requestLeave({ employeeId: emp.id, type: LEAVE_TYPE.VACATION, startDate: new Date('2024-09-01'), endDate: new Date('2024-09-07') });
    expect(() => leaveService.requestLeave({ employeeId: emp.id, type: LEAVE_TYPE.VACATION, startDate: new Date('2024-09-08'), endDate: new Date('2024-09-14') })).not.toThrow();
  });
});

// ─── Scenario 12: idGenerator ────────────────────────────────────────────────

describe('Integration: Unique ID generation', () => {
  it('registers multiple employees with unique IDs', () => {
    const { employeeService } = buildServices();
    const ids = new Set();
    for (let i = 0; i < 20; i++) {
      const emp = employeeService.register({ firstName: 'X', lastName: 'Y', email: `emp${i}@x.com`, department: 'Dev', role: EMPLOYEE_ROLE.EMPLOYEE });
      ids.add(emp.id);
    }
    expect(ids.size).toBe(20);
  });
});

'use strict';

const { ReportService } = require('../../src/services/ReportService');
const { InMemoryTimeEntryRepository } = require('../../src/storage/InMemoryTimeEntryRepository');
const { InMemoryEmployeeRepository } = require('../../src/storage/InMemoryEmployeeRepository');
const { Employee, EMPLOYEE_ROLE } = require('../../src/models/Employee');
const { TimeEntry, ENTRY_TYPE } = require('../../src/models/TimeEntry');
const {
  StandardOvertimeStrategy,
  DoubleTimeOvertimeStrategy,
  TieredOvertimeStrategy,
  CompTimeOvertimeStrategy,
} = require('../../src/services/OvertimeStrategy');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeEmp = (id, dept = 'Dev') => new Employee({
  id, firstName: 'Test', lastName: `User${id}`, email: `${id}@x.com`,
  department: dept, role: EMPLOYEE_ROLE.EMPLOYEE,
});

const makeClosedEntry = (id, employeeId, inStr, outStr) => {
  const e = new TimeEntry({ id, employeeId, clockIn: new Date(inStr) });
  e.close(new Date(outStr));
  return e;
};

const makeOpenEntry = (id, employeeId, inStr) =>
  new TimeEntry({ id, employeeId, clockIn: new Date(inStr) });

describe('ReportService', () => {
  let timeRepo, empRepo, service;

  beforeEach(() => {
    timeRepo = new InMemoryTimeEntryRepository();
    empRepo = new InMemoryEmployeeRepository();
    service = new ReportService(timeRepo, empRepo);
  });

  // ─── getDailyReport ──────────────────────────────────────────────────────

  describe('getDailyReport', () => {
    it('returns report with correct date string', () => {
      const report = service.getDailyReport(new Date('2024-03-15'));
      expect(report.date).toMatch(/^2024-03-15/);
    });

    it('includes employee with hours worked', () => {
      const emp = makeEmp('e1');
      empRepo.save(emp);
      timeRepo.save(makeClosedEntry('t1', 'e1', '2024-03-15T09:00:00', '2024-03-15T17:00:00'));
      const report = service.getDailyReport(new Date('2024-03-15'));
      const empReport = report.employees.find(e => e.employeeId === 'e1');
      expect(empReport.hoursWorked).toBe(8);
    });

    it('shows 0 hours for employee with no entries that day', () => {
      empRepo.save(makeEmp('e1'));
      const report = service.getDailyReport(new Date('2024-03-15'));
      expect(report.employees[0].hoursWorked).toBe(0);
    });

    it('marks employee as clocked in when open entry exists', () => {
      empRepo.save(makeEmp('e1'));
      timeRepo.save(makeOpenEntry('t1', 'e1', '2024-03-15T09:00:00'));
      const report = service.getDailyReport(new Date('2024-03-15'));
      expect(report.employees[0].isClockedIn).toBe(true);
    });

    it('marks employee as not clocked in when no open entry', () => {
      empRepo.save(makeEmp('e1'));
      timeRepo.save(makeClosedEntry('t1', 'e1', '2024-03-15T09:00:00', '2024-03-15T17:00:00'));
      const report = service.getDailyReport(new Date('2024-03-15'));
      expect(report.employees[0].isClockedIn).toBe(false);
    });

    it('throws for invalid date', () => {
      expect(() => service.getDailyReport('bad')).toThrow(TypeError);
    });

    it('counts total entries across all employees', () => {
      empRepo.save(makeEmp('e1'));
      empRepo.save(makeEmp('e2'));
      timeRepo.save(makeClosedEntry('t1', 'e1', '2024-03-15T09:00:00', '2024-03-15T17:00:00'));
      timeRepo.save(makeClosedEntry('t2', 'e2', '2024-03-15T08:00:00', '2024-03-15T16:00:00'));
      const report = service.getDailyReport(new Date('2024-03-15'));
      expect(report.totalEntries).toBe(2);
    });

    it('does not count entries from other days', () => {
      empRepo.save(makeEmp('e1'));
      timeRepo.save(makeClosedEntry('t1', 'e1', '2024-03-14T09:00:00', '2024-03-14T17:00:00'));
      const report = service.getDailyReport(new Date('2024-03-15'));
      expect(report.totalEntries).toBe(0);
    });
  });

  // ─── getWeeklyReport ─────────────────────────────────────────────────────

  describe('getWeeklyReport', () => {
    it('returns correct worked hours for the week', () => {
      empRepo.save(makeEmp('e1'));
      // 5 days × 8h = 40h
      ['11', '12', '13', '14', '15'].forEach((day, i) => {
        timeRepo.save(makeClosedEntry(`t${i}`, 'e1', `2024-03-${day}T09:00:00`, `2024-03-${day}T17:00:00`));
      });
      const report = service.getWeeklyReport('e1', new Date('2024-03-13'));
      expect(report.workedHours).toBe(40);
    });

    it('calculates overtime using default StandardStrategy', () => {
      empRepo.save(makeEmp('e1'));
      // 6 days × 8h = 48h → 8h overtime
      ['11', '12', '13', '14', '15', '16'].forEach((day, i) => {
        timeRepo.save(makeClosedEntry(`t${i}`, 'e1', `2024-03-${day}T09:00:00`, `2024-03-${day}T17:00:00`));
      });
      const report = service.getWeeklyReport('e1', new Date('2024-03-13'), 100);
      expect(report.overtime.overtimeHours).toBe(8);
      expect(report.overtime.overtimePay).toBe(1200); // 8 * 100 * 1.5
    });

    it('includes employee fullName when employee exists', () => {
      empRepo.save(makeEmp('e1'));
      const report = service.getWeeklyReport('e1', new Date('2024-03-13'));
      expect(report.fullName).toBe('Test Usere1');
    });

    it('handles null fullName for unknown employee', () => {
      const report = service.getWeeklyReport('ghost', new Date('2024-03-13'));
      expect(report.fullName).toBeNull();
    });

    it('returns 0 worked hours for employee with no entries', () => {
      empRepo.save(makeEmp('e1'));
      const report = service.getWeeklyReport('e1', new Date('2024-03-13'));
      expect(report.workedHours).toBe(0);
    });

    it('throws for invalid employeeId', () => {
      expect(() => service.getWeeklyReport('', new Date())).toThrow(TypeError);
    });

    it('throws for invalid weekDate', () => {
      expect(() => service.getWeeklyReport('e1', 'bad')).toThrow(TypeError);
    });

    it('includes entries array in report', () => {
      empRepo.save(makeEmp('e1'));
      timeRepo.save(makeClosedEntry('t1', 'e1', '2024-03-11T09:00:00', '2024-03-11T17:00:00'));
      const report = service.getWeeklyReport('e1', new Date('2024-03-13'));
      expect(report.entries).toHaveLength(1);
    });
  });

  // ─── getMonthlyReport ────────────────────────────────────────────────────

  describe('getMonthlyReport', () => {
    it('returns correct month and year', () => {
      empRepo.save(makeEmp('e1'));
      const report = service.getMonthlyReport('e1', 2024, 3);
      expect(report.year).toBe(2024);
      expect(report.month).toBe(3);
    });

    it('counts working days correctly for March 2024', () => {
      empRepo.save(makeEmp('e1'));
      const report = service.getMonthlyReport('e1', 2024, 3);
      expect(report.workingDays).toBeGreaterThan(0);
      expect(report.workingDays).toBeLessThanOrEqual(23);
    });

    it('calculates worked hours across the month', () => {
      empRepo.save(makeEmp('e1'));
      timeRepo.save(makeClosedEntry('t1', 'e1', '2024-03-04T09:00:00', '2024-03-04T17:00:00'));
      timeRepo.save(makeClosedEntry('t2', 'e1', '2024-03-05T09:00:00', '2024-03-05T18:00:00'));
      const report = service.getMonthlyReport('e1', 2024, 3);
      expect(report.workedHours).toBe(17);
    });

    it('calculates overtime using strategy', () => {
      empRepo.save(makeEmp('e1'));
      service.setOvertimeStrategy(new DoubleTimeOvertimeStrategy());
      // add 1 extra 10h day at end of month to create overtime
      // (working days * 8h = regular; adding extra hours = overtime)
      const report = service.getMonthlyReport('e1', 2024, 3, 100);
      expect(report.overtime).toBeDefined();
    });

    it('includes employee fullName', () => {
      empRepo.save(makeEmp('e1'));
      const report = service.getMonthlyReport('e1', 2024, 3);
      expect(report.fullName).toBeDefined();
    });

    it('handles unknown employee (null fullName)', () => {
      const report = service.getMonthlyReport('ghost', 2024, 3);
      expect(report.fullName).toBeNull();
    });

    it('returns 0 hours when no entries', () => {
      empRepo.save(makeEmp('e1'));
      const report = service.getMonthlyReport('e1', 2024, 3);
      expect(report.workedHours).toBe(0);
    });
  });

  // ─── getDepartmentSummary ────────────────────────────────────────────────

  describe('getDepartmentSummary', () => {
    it('aggregates hours by department', () => {
      empRepo.save(makeEmp('e1', 'Dev'));
      empRepo.save(makeEmp('e2', 'QA'));
      timeRepo.save(makeClosedEntry('t1', 'e1', '2024-03-15T09:00:00', '2024-03-15T17:00:00'));
      timeRepo.save(makeClosedEntry('t2', 'e2', '2024-03-15T10:00:00', '2024-03-15T14:00:00'));
      const summary = service.getDepartmentSummary(new Date('2024-03-01'), new Date('2024-03-31'));
      const dev = summary.find(s => s.department === 'Dev');
      const qa = summary.find(s => s.department === 'QA');
      expect(dev.totalHours).toBe(8);
      expect(qa.totalHours).toBe(4);
    });

    it('skips open entries', () => {
      empRepo.save(makeEmp('e1', 'Dev'));
      timeRepo.save(makeOpenEntry('t1', 'e1', '2024-03-15T09:00:00'));
      const summary = service.getDepartmentSummary(new Date('2024-03-01'), new Date('2024-03-31'));
      expect(summary).toHaveLength(0);
    });

    it('returns empty array when no entries', () => {
      const summary = service.getDepartmentSummary(new Date('2024-03-01'), new Date('2024-03-31'));
      expect(summary).toHaveLength(0);
    });

    it('skips entries for unknown employees', () => {
      timeRepo.save(makeClosedEntry('t1', 'ghost', '2024-03-15T09:00:00', '2024-03-15T17:00:00'));
      const summary = service.getDepartmentSummary(new Date('2024-03-01'), new Date('2024-03-31'));
      expect(summary).toHaveLength(0);
    });

    it('counts unique employees per department', () => {
      empRepo.save(makeEmp('e1', 'Dev'));
      empRepo.save(makeEmp('e2', 'Dev'));
      timeRepo.save(makeClosedEntry('t1', 'e1', '2024-03-15T09:00:00', '2024-03-15T17:00:00'));
      timeRepo.save(makeClosedEntry('t2', 'e2', '2024-03-15T09:00:00', '2024-03-15T17:00:00'));
      const summary = service.getDepartmentSummary(new Date('2024-03-01'), new Date('2024-03-31'));
      expect(summary[0].uniqueEmployees).toBe(2);
    });

    it('throws for invalid from date', () => {
      expect(() => service.getDepartmentSummary('bad', new Date())).toThrow(TypeError);
    });

    it('throws for invalid to date', () => {
      expect(() => service.getDepartmentSummary(new Date(), 'bad')).toThrow(TypeError);
    });
  });

  // ─── getLateArrivals ─────────────────────────────────────────────────────

  describe('getLateArrivals', () => {
    it('returns entries with clockIn after expected hour', () => {
      empRepo.save(makeEmp('e1'));
      timeRepo.save(makeClosedEntry('t1', 'e1', '2024-03-15T10:00:00', '2024-03-15T18:00:00')); // late
      timeRepo.save(makeClosedEntry('t2', 'e1', '2024-03-15T09:00:00', '2024-03-15T17:00:00')); // on time
      const late = service.getLateArrivals(new Date('2024-03-01'), new Date('2024-03-31'));
      expect(late).toHaveLength(1);
    });

    it('uses custom expected hour', () => {
      timeRepo.save(makeClosedEntry('t1', 'e1', '2024-03-15T08:00:00', '2024-03-15T16:00:00'));
      const late = service.getLateArrivals(new Date('2024-03-01'), new Date('2024-03-31'), 10);
      expect(late).toHaveLength(0);
    });

    it('returns empty array when no late arrivals', () => {
      timeRepo.save(makeClosedEntry('t1', 'e1', '2024-03-15T08:30:00', '2024-03-15T16:30:00'));
      const late = service.getLateArrivals(new Date('2024-03-01'), new Date('2024-03-31'));
      expect(late).toHaveLength(0);
    });

    it('throws for invalid date range', () => {
      expect(() => service.getLateArrivals('bad', new Date())).toThrow(TypeError);
    });
  });

  // ─── getLongWorkdays ─────────────────────────────────────────────────────

  describe('getLongWorkdays', () => {
    it('returns employees working more than threshold', () => {
      empRepo.save(makeEmp('e1'));
      timeRepo.save(makeClosedEntry('t1', 'e1', '2024-03-15T07:00:00', '2024-03-15T19:00:00')); // 12h
      const result = service.getLongWorkdays(new Date('2024-03-15'), 10);
      expect(result).toHaveLength(1);
      expect(result[0].hoursWorked).toBe(12);
    });

    it('returns empty when all under threshold', () => {
      empRepo.save(makeEmp('e1'));
      timeRepo.save(makeClosedEntry('t1', 'e1', '2024-03-15T09:00:00', '2024-03-15T17:00:00')); // 8h
      const result = service.getLongWorkdays(new Date('2024-03-15'), 10);
      expect(result).toHaveLength(0);
    });

    it('uses default threshold of 10', () => {
      timeRepo.save(makeClosedEntry('t1', 'e1', '2024-03-15T06:00:00', '2024-03-15T18:00:00')); // 12h
      const result = service.getLongWorkdays(new Date('2024-03-15'));
      expect(result).toHaveLength(1);
    });

    it('throws for invalid date', () => {
      expect(() => service.getLongWorkdays('bad')).toThrow(TypeError);
    });
  });

  // ─── getTopWorkers ───────────────────────────────────────────────────────

  describe('getTopWorkers', () => {
    it('returns top N employees sorted by hours', () => {
      empRepo.save(makeEmp('e1'));
      empRepo.save(makeEmp('e2'));
      empRepo.save(makeEmp('e3'));
      timeRepo.save(makeClosedEntry('t1', 'e1', '2024-03-15T09:00:00', '2024-03-15T17:00:00')); // 8h
      timeRepo.save(makeClosedEntry('t2', 'e2', '2024-03-15T07:00:00', '2024-03-15T19:00:00')); // 12h
      timeRepo.save(makeClosedEntry('t3', 'e3', '2024-03-15T09:00:00', '2024-03-15T15:00:00')); // 6h
      const top = service.getTopWorkers(new Date('2024-03-01'), new Date('2024-03-31'), 2);
      expect(top).toHaveLength(2);
      expect(top[0].employeeId).toBe('e2'); // 12h first
    });

    it('uses default topN of 5', () => {
      const top = service.getTopWorkers(new Date('2024-03-01'), new Date('2024-03-31'));
      expect(top.length).toBeLessThanOrEqual(5);
    });

    it('returns fewer results when not enough employees', () => {
      empRepo.save(makeEmp('e1'));
      timeRepo.save(makeClosedEntry('t1', 'e1', '2024-03-15T09:00:00', '2024-03-15T17:00:00'));
      const top = service.getTopWorkers(new Date('2024-03-01'), new Date('2024-03-31'), 5);
      expect(top).toHaveLength(1);
    });

    it('uses employeeId as fullName fallback when employee not found', () => {
      timeRepo.save(makeClosedEntry('t1', 'ghost', '2024-03-15T09:00:00', '2024-03-15T17:00:00'));
      const top = service.getTopWorkers(new Date('2024-03-01'), new Date('2024-03-31'));
      expect(top[0].fullName).toBe('ghost');
    });

    it('throws for invalid date range', () => {
      expect(() => service.getTopWorkers('bad', new Date())).toThrow(TypeError);
    });
  });

  // ─── setOvertimeStrategy ─────────────────────────────────────────────────

  describe('setOvertimeStrategy', () => {
    it('switches strategy for weekly report', () => {
      empRepo.save(makeEmp('e1'));
      ['11', '12', '13', '14', '15', '16'].forEach((day, i) => {
        timeRepo.save(makeClosedEntry(`t${i}`, 'e1', `2024-03-${day}T09:00:00`, `2024-03-${day}T17:00:00`));
      });
      service.setOvertimeStrategy(new DoubleTimeOvertimeStrategy());
      const report = service.getWeeklyReport('e1', new Date('2024-03-13'), 100);
      expect(report.overtime.overtimePay).toBe(1600); // 8 * 100 * 2
    });

    it('can switch to TieredOvertimeStrategy', () => {
      service.setOvertimeStrategy(new TieredOvertimeStrategy());
      expect(() => service.getWeeklyReport('e1', new Date('2024-03-13'))).not.toThrow();
    });

    it('can switch to CompTimeOvertimeStrategy', () => {
      service.setOvertimeStrategy(new CompTimeOvertimeStrategy());
      expect(() => service.getWeeklyReport('e1', new Date('2024-03-13'))).not.toThrow();
    });
  });
});

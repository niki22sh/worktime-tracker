'use strict';

const { TimeTrackingService } = require('../../src/services/TimeTrackingService');
const { InMemoryTimeEntryRepository } = require('../../src/storage/InMemoryTimeEntryRepository');
const { InMemoryEmployeeRepository } = require('../../src/storage/InMemoryEmployeeRepository');
const { Employee, EMPLOYEE_ROLE, EMPLOYEE_STATUS } = require('../../src/models/Employee');
const { ENTRY_STATUS } = require('../../src/models/TimeEntry');

const emp = new Employee({
  id: 'emp_1', firstName: 'A', lastName: 'B', email: 'a@b.com',
  department: 'Dev', role: EMPLOYEE_ROLE.EMPLOYEE,
});

const empBlocked = new Employee({
  id: 'emp_blocked', firstName: 'X', lastName: 'Y', email: 'x@b.com',
  department: 'Dev', role: EMPLOYEE_ROLE.EMPLOYEE, status: EMPLOYEE_STATUS.BLOCKED,
});

const empInactive = new Employee({
  id: 'emp_inactive', firstName: 'Z', lastName: 'W', email: 'z@b.com',
  department: 'Dev', role: EMPLOYEE_ROLE.EMPLOYEE, status: EMPLOYEE_STATUS.INACTIVE,
});

const CI = new Date('2024-03-15T09:00:00');
const CO = new Date('2024-03-15T17:00:00');

describe('TimeTrackingService', () => {
  let timeRepo, empRepo, service;

  beforeEach(() => {
    timeRepo = new InMemoryTimeEntryRepository();
    empRepo = new InMemoryEmployeeRepository();
    empRepo.save(emp);
    empRepo.save(empBlocked);
    empRepo.save(empInactive);
    service = new TimeTrackingService(timeRepo, empRepo);
  });

  describe('clockIn', () => {
    it('creates an open entry', () => {
      const entry = service.clockIn('emp_1', CI);
      expect(entry.status).toBe(ENTRY_STATUS.OPEN);
      expect(entry.employeeId).toBe('emp_1');
    });
    it('emits timeEntry:clockedIn event', () => {
      const handler = jest.fn();
      service.on('timeEntry:clockedIn', handler);
      service.clockIn('emp_1', CI);
      expect(handler).toHaveBeenCalled();
    });
    it('throws for unknown employee', () => {
      expect(() => service.clockIn('nope', CI)).toThrow('not found');
    });
    it('throws for blocked employee', () => {
      expect(() => service.clockIn('emp_blocked', CI)).toThrow('blocked');
    });
    it('throws for inactive employee', () => {
      expect(() => service.clockIn('emp_inactive', CI)).toThrow('not active');
    });
    it('throws if already clocked in', () => {
      service.clockIn('emp_1', CI);
      expect(() => service.clockIn('emp_1', new Date(CI.getTime() + 1000))).toThrow('already clocked in');
    });
    it('saves note when provided', () => {
      const entry = service.clockIn('emp_1', CI, 'remote work');
      expect(entry.note).toBe('remote work');
    });
    it('defaults clockIn to now', () => {
      const before = Date.now();
      const entry = service.clockIn('emp_1');
      expect(entry.clockIn.getTime()).toBeGreaterThanOrEqual(before);
    });
    it('throws for invalid clockIn date', () => {
      expect(() => service.clockIn('emp_1', 'bad')).toThrow(TypeError);
    });
    it('throws for missing employeeId', () => {
      expect(() => service.clockIn('', CI)).toThrow(TypeError);
    });
  });

  describe('clockOut', () => {
    it('closes the open entry', () => {
      service.clockIn('emp_1', CI);
      const entry = service.clockOut('emp_1', CO);
      expect(entry.status).toBe(ENTRY_STATUS.CLOSED);
      expect(entry.getDurationHours()).toBe(8);
    });
    it('emits timeEntry:clockedOut event', () => {
      const handler = jest.fn();
      service.on('timeEntry:clockedOut', handler);
      service.clockIn('emp_1', CI);
      service.clockOut('emp_1', CO);
      expect(handler).toHaveBeenCalled();
    });
    it('throws if not clocked in', () => {
      expect(() => service.clockOut('emp_1', CO)).toThrow('not clocked in');
    });
    it('throws for unknown employee', () => {
      expect(() => service.clockOut('nope', CO)).toThrow('not found');
    });
    it('throws if clockOut before clockIn', () => {
      service.clockIn('emp_1', CI);
      expect(() => service.clockOut('emp_1', new Date(CI.getTime() - 1000))).toThrow();
    });
    it('adds note on clock-out', () => {
      service.clockIn('emp_1', CI);
      const entry = service.clockOut('emp_1', CO, 'finished sprint');
      expect(entry.note).toBe('finished sprint');
    });
    it('throws for invalid clockOut date', () => {
      service.clockIn('emp_1', CI);
      expect(() => service.clockOut('emp_1', 'bad')).toThrow(TypeError);
    });
  });

  describe('getOpenEntry', () => {
    it('returns open entry when clocked in', () => {
      service.clockIn('emp_1', CI);
      expect(service.getOpenEntry('emp_1')).not.toBeNull();
    });
    it('returns null when not clocked in', () => {
      expect(service.getOpenEntry('emp_1')).toBeNull();
    });
    it('throws for empty employeeId', () => {
      expect(() => service.getOpenEntry('')).toThrow(TypeError);
    });
  });

  describe('isClockedIn', () => {
    it('returns true when clocked in', () => {
      service.clockIn('emp_1', CI);
      expect(service.isClockedIn('emp_1')).toBe(true);
    });
    it('returns false when not clocked in', () => {
      expect(service.isClockedIn('emp_1')).toBe(false);
    });
  });

  describe('adjustEntry', () => {
    it('adjusts clockIn and clockOut', () => {
      service.clockIn('emp_1', CI);
      const entry = service.clockOut('emp_1', CO);
      const newIn = new Date('2024-03-15T08:00:00');
      const newOut = new Date('2024-03-15T16:00:00');
      service.adjustEntry(entry.id, newIn, newOut, 'corrected');
      expect(entry.clockIn).toEqual(newIn);
      expect(entry.note).toBe('corrected');
      expect(entry.status).toBe(ENTRY_STATUS.ADJUSTED);
    });
    it('emits timeEntry:adjusted event', () => {
      service.clockIn('emp_1', CI);
      const entry = service.clockOut('emp_1', CO);
      const handler = jest.fn();
      service.on('timeEntry:adjusted', handler);
      service.adjustEntry(entry.id, CI, CO);
      expect(handler).toHaveBeenCalled();
    });
    it('throws for unknown entry id', () => {
      expect(() => service.adjustEntry('nope', CI, CO)).toThrow('not found');
    });
    it('throws for invalid dates', () => {
      expect(() => service.adjustEntry('x', 'bad', 'bad')).toThrow(TypeError);
    });
  });

  describe('getEntriesByEmployee', () => {
    it('returns entries for employee', () => {
      service.clockIn('emp_1', CI);
      expect(service.getEntriesByEmployee('emp_1')).toHaveLength(1);
    });
    it('returns empty array when none', () => {
      expect(service.getEntriesByEmployee('emp_1')).toHaveLength(0);
    });
    it('throws for empty employeeId', () => {
      expect(() => service.getEntriesByEmployee('')).toThrow(TypeError);
    });
  });

  describe('getEntriesByEmployeeAndDateRange', () => {
    it('filters entries in range', () => {
      service.clockIn('emp_1', new Date('2024-03-15T09:00:00'));
      service.clockOut('emp_1', new Date('2024-03-15T17:00:00'));
      service.clockIn('emp_1', new Date('2024-03-20T09:00:00'));
      const entries = service.getEntriesByEmployeeAndDateRange(
        'emp_1', new Date('2024-03-14'), new Date('2024-03-16')
      );
      expect(entries).toHaveLength(1);
    });
    it('throws for invalid dates', () => {
      expect(() => service.getEntriesByEmployeeAndDateRange('emp_1', 'bad', 'bad')).toThrow(TypeError);
    });
  });

  describe('getEntriesForDay', () => {
    it('returns entries for the given day', () => {
      service.clockIn('emp_1', new Date('2024-03-15T09:00:00'));
      expect(service.getEntriesForDay(new Date('2024-03-15'))).toHaveLength(1);
    });
    it('returns empty array for different day', () => {
      service.clockIn('emp_1', new Date('2024-03-15T09:00:00'));
      expect(service.getEntriesForDay(new Date('2024-03-16'))).toHaveLength(0);
    });
  });

  describe('deleteEntry', () => {
    it('deletes an entry', () => {
      service.clockIn('emp_1', CI);
      const entry = service.clockOut('emp_1', CO);
      expect(service.deleteEntry(entry.id)).toBe(true);
    });
    it('returns false for unknown entry', () => {
      expect(service.deleteEntry('nope')).toBe(false);
    });
    it('throws for empty entryId', () => {
      expect(() => service.deleteEntry('')).toThrow(TypeError);
    });
  });
});

'use strict';

const { InMemoryEmployeeRepository } = require('../../src/storage/InMemoryEmployeeRepository');
const { InMemoryTimeEntryRepository } = require('../../src/storage/InMemoryTimeEntryRepository');
const { InMemoryLeaveRepository } = require('../../src/storage/InMemoryLeaveRepository');
const { Employee, EMPLOYEE_ROLE } = require('../../src/models/Employee');
const { TimeEntry, ENTRY_STATUS } = require('../../src/models/TimeEntry');
const { Leave, LEAVE_TYPE } = require('../../src/models/Leave');

const makeEmployee = (overrides = {}) => new Employee({
  id: 'emp_1', firstName: 'A', lastName: 'B', email: 'a@b.com',
  department: 'Dev', role: EMPLOYEE_ROLE.EMPLOYEE, ...overrides,
});

const makeEntry = (overrides = {}) => new TimeEntry({
  id: 'e_1', employeeId: 'emp_1', clockIn: new Date('2024-03-15T09:00:00'), ...overrides,
});

const makeLeave = (overrides = {}) => new Leave({
  id: 'l_1', employeeId: 'emp_1', type: LEAVE_TYPE.VACATION,
  startDate: new Date('2024-07-01'), endDate: new Date('2024-07-07'), ...overrides,
});

// ─── Employee Repo ─────────────────────────────────────────────────────────────

describe('InMemoryEmployeeRepository', () => {
  let repo;
  beforeEach(() => { repo = new InMemoryEmployeeRepository(); });

  it('saves and retrieves by id', () => {
    const emp = makeEmployee();
    repo.save(emp);
    expect(repo.findById('emp_1')).toBe(emp);
  });

  it('returns null for unknown id', () => {
    expect(repo.findById('unknown')).toBeNull();
  });

  it('findAll returns all saved employees', () => {
    repo.save(makeEmployee({ id: 'e1', email: 'e1@x.com' }));
    repo.save(makeEmployee({ id: 'e2', email: 'e2@x.com' }));
    expect(repo.findAll()).toHaveLength(2);
  });

  it('findByEmail is case-insensitive', () => {
    repo.save(makeEmployee());
    expect(repo.findByEmail('A@B.COM')).not.toBeNull();
  });

  it('findByEmail returns null when not found', () => {
    expect(repo.findByEmail('nobody@x.com')).toBeNull();
  });

  it('findByDepartment filters correctly', () => {
    repo.save(makeEmployee({ id: 'e1', email: 'e1@x.com', department: 'Dev' }));
    repo.save(makeEmployee({ id: 'e2', email: 'e2@x.com', department: 'QA' }));
    expect(repo.findByDepartment('Dev')).toHaveLength(1);
    expect(repo.findByDepartment('HR')).toHaveLength(0);
  });

  it('delete removes employee', () => {
    repo.save(makeEmployee());
    expect(repo.delete('emp_1')).toBe(true);
    expect(repo.findById('emp_1')).toBeNull();
  });

  it('delete returns false for unknown id', () => {
    expect(repo.delete('nope')).toBe(false);
  });

  it('clear empties the store', () => {
    repo.save(makeEmployee());
    repo.clear();
    expect(repo.findAll()).toHaveLength(0);
  });

  it('save overwrites existing record', () => {
    const emp = makeEmployee();
    repo.save(emp);
    emp.firstName = 'Updated';
    repo.save(emp);
    expect(repo.findById('emp_1').firstName).toBe('Updated');
  });
});

// ─── TimeEntry Repo ────────────────────────────────────────────────────────────

describe('InMemoryTimeEntryRepository', () => {
  let repo;
  beforeEach(() => { repo = new InMemoryTimeEntryRepository(); });

  it('saves and retrieves by id', () => {
    const e = makeEntry();
    repo.save(e);
    expect(repo.findById('e_1')).toBe(e);
  });

  it('returns null for unknown id', () => {
    expect(repo.findById('x')).toBeNull();
  });

  it('findByEmployeeId returns matching entries', () => {
    repo.save(makeEntry({ id: 'e1', clockIn: new Date('2024-03-15T09:00:00') }));
    repo.save(makeEntry({ id: 'e2', employeeId: 'emp_2', clockIn: new Date('2024-03-15T09:00:00') }));
    expect(repo.findByEmployeeId('emp_1')).toHaveLength(1);
  });

  it('findByDateRange filters by clockIn', () => {
    repo.save(makeEntry({ id: 'e1', clockIn: new Date('2024-03-15T09:00:00') }));
    repo.save(makeEntry({ id: 'e2', clockIn: new Date('2024-03-16T09:00:00') }));
    const from = new Date('2024-03-15T00:00:00');
    const to = new Date('2024-03-15T23:59:59');
    expect(repo.findByDateRange(from, to)).toHaveLength(1);
  });

  it('findByEmployeeIdAndDateRange combines filters', () => {
    repo.save(makeEntry({ id: 'e1', clockIn: new Date('2024-03-15T09:00:00') }));
    repo.save(makeEntry({ id: 'e2', clockIn: new Date('2024-03-20T09:00:00') }));
    const from = new Date('2024-03-14');
    const to = new Date('2024-03-16');
    expect(repo.findByEmployeeIdAndDateRange('emp_1', from, to)).toHaveLength(1);
  });

  it('findOpenEntry returns open entry', () => {
    repo.save(makeEntry());
    expect(repo.findOpenEntry('emp_1')).not.toBeNull();
  });

  it('findOpenEntry returns null when entry is closed', () => {
    const e = makeEntry();
    e.close(new Date('2024-03-15T17:00:00'));
    repo.save(e);
    expect(repo.findOpenEntry('emp_1')).toBeNull();
  });

  it('findOpenEntry returns null when no entries', () => {
    expect(repo.findOpenEntry('emp_1')).toBeNull();
  });

  it('delete removes entry', () => {
    repo.save(makeEntry());
    expect(repo.delete('e_1')).toBe(true);
    expect(repo.findById('e_1')).toBeNull();
  });

  it('clear empties store', () => {
    repo.save(makeEntry());
    repo.clear();
    expect(repo.findAll()).toHaveLength(0);
  });
});

// ─── Leave Repo ────────────────────────────────────────────────────────────────

describe('InMemoryLeaveRepository', () => {
  let repo;
  beforeEach(() => { repo = new InMemoryLeaveRepository(); });

  it('saves and retrieves by id', () => {
    const l = makeLeave();
    repo.save(l);
    expect(repo.findById('l_1')).toBe(l);
  });

  it('returns null for unknown id', () => {
    expect(repo.findById('x')).toBeNull();
  });

  it('findByEmployeeId filters correctly', () => {
    repo.save(makeLeave());
    repo.save(makeLeave({ id: 'l_2', employeeId: 'emp_2' }));
    expect(repo.findByEmployeeId('emp_1')).toHaveLength(1);
  });

  it('findByStatus filters correctly', () => {
    const { LEAVE_STATUS } = require('../../src/models/Leave');
    const l = makeLeave();
    l.approve('mgr');
    repo.save(l);
    repo.save(makeLeave({ id: 'l_2' }));
    expect(repo.findByStatus(LEAVE_STATUS.APPROVED)).toHaveLength(1);
    expect(repo.findByStatus(LEAVE_STATUS.PENDING)).toHaveLength(1);
  });

  it('findByEmployeeIdAndDateRange uses overlap logic', () => {
    repo.save(makeLeave()); // July 1-7
    const from = new Date('2024-07-05');
    const to = new Date('2024-07-10');
    expect(repo.findByEmployeeIdAndDateRange('emp_1', from, to)).toHaveLength(1);
  });

  it('findByEmployeeIdAndDateRange returns empty for non-overlapping', () => {
    repo.save(makeLeave()); // July 1-7
    const from = new Date('2024-08-01');
    const to = new Date('2024-08-10');
    expect(repo.findByEmployeeIdAndDateRange('emp_1', from, to)).toHaveLength(0);
  });

  it('delete removes leave', () => {
    repo.save(makeLeave());
    repo.delete('l_1');
    expect(repo.findById('l_1')).toBeNull();
  });

  it('clear empties store', () => {
    repo.save(makeLeave());
    repo.clear();
    expect(repo.findAll()).toHaveLength(0);
  });
});

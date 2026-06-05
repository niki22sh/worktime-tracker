'use strict';

const { LeaveService } = require('../../src/services/LeaveService');
const { InMemoryLeaveRepository } = require('../../src/storage/InMemoryLeaveRepository');
const { InMemoryEmployeeRepository } = require('../../src/storage/InMemoryEmployeeRepository');
const { Employee, EMPLOYEE_ROLE, EMPLOYEE_STATUS } = require('../../src/models/Employee');
const { LEAVE_TYPE, LEAVE_STATUS } = require('../../src/models/Leave');

const emp = new Employee({ id: 'emp_1', firstName: 'A', lastName: 'B', email: 'a@b.com', department: 'Dev', role: EMPLOYEE_ROLE.EMPLOYEE });
const blockedEmp = new Employee({ id: 'emp_blocked', firstName: 'X', lastName: 'Y', email: 'x@b.com', department: 'Dev', role: EMPLOYEE_ROLE.EMPLOYEE, status: EMPLOYEE_STATUS.BLOCKED });

const validRequest = (overrides = {}) => ({
  employeeId: 'emp_1',
  type: LEAVE_TYPE.VACATION,
  startDate: new Date('2024-07-01'),
  endDate: new Date('2024-07-07'),
  reason: 'holiday',
  ...overrides,
});

describe('LeaveService', () => {
  let leaveRepo, empRepo, service;
  beforeEach(() => {
    leaveRepo = new InMemoryLeaveRepository();
    empRepo = new InMemoryEmployeeRepository();
    empRepo.save(emp);
    empRepo.save(blockedEmp);
    service = new LeaveService(leaveRepo, empRepo);
  });

  describe('requestLeave', () => {
    it('creates and returns a pending leave', () => {
      const leave = service.requestLeave(validRequest());
      expect(leave.status).toBe(LEAVE_STATUS.PENDING);
      expect(leave.id).toBeDefined();
    });
    it('emits leave:requested event', () => {
      const handler = jest.fn();
      service.on('leave:requested', handler);
      service.requestLeave(validRequest());
      expect(handler).toHaveBeenCalled();
    });
    it('throws for unknown employee', () => {
      expect(() => service.requestLeave(validRequest({ employeeId: 'nope' }))).toThrow('not found');
    });
    it('throws for blocked employee', () => {
      expect(() => service.requestLeave(validRequest({ employeeId: 'emp_blocked' }))).toThrow('blocked');
    });
    it('throws for invalid type', () => {
      expect(() => service.requestLeave(validRequest({ type: 'PARTY' }))).toThrow(TypeError);
    });
    it('throws for invalid dates', () => {
      expect(() => service.requestLeave(validRequest({ startDate: 'bad' }))).toThrow(TypeError);
    });
    it('throws for overlapping pending leave', () => {
      service.requestLeave(validRequest());
      expect(() => service.requestLeave(validRequest({ startDate: new Date('2024-07-05'), endDate: new Date('2024-07-10') }))).toThrow('Overlapping');
    });
    it('throws for overlapping approved leave', () => {
      const leave = service.requestLeave(validRequest());
      service.approve(leave.id, 'mgr');
      expect(() => service.requestLeave(validRequest({ startDate: new Date('2024-07-05'), endDate: new Date('2024-07-10') }))).toThrow('Overlapping');
    });
    it('allows non-overlapping leaves', () => {
      service.requestLeave(validRequest());
      expect(() => service.requestLeave(validRequest({ startDate: new Date('2024-08-01'), endDate: new Date('2024-08-07') }))).not.toThrow();
    });
    it('uses empty string reason when not provided', () => {
      const leave = service.requestLeave({ ...validRequest(), reason: undefined });
      expect(leave.reason).toBe('');
    });
  });

  describe('approve', () => {
    it('approves a pending leave', () => {
      const leave = service.requestLeave(validRequest());
      service.approve(leave.id, 'mgr');
      expect(leave.isApproved()).toBe(true);
    });
    it('emits leave:approved', () => {
      const leave = service.requestLeave(validRequest());
      const handler = jest.fn();
      service.on('leave:approved', handler);
      service.approve(leave.id, 'mgr');
      expect(handler).toHaveBeenCalled();
    });
    it('throws for unknown leave', () => {
      expect(() => service.approve('nope', 'mgr')).toThrow('not found');
    });
    it('throws for empty approverId', () => {
      const leave = service.requestLeave(validRequest());
      expect(() => service.approve(leave.id, '')).toThrow(TypeError);
    });
    it('throws if already approved', () => {
      const leave = service.requestLeave(validRequest());
      service.approve(leave.id, 'mgr');
      expect(() => service.approve(leave.id, 'mgr')).toThrow();
    });
  });

  describe('reject', () => {
    it('rejects a pending leave', () => {
      const leave = service.requestLeave(validRequest());
      service.reject(leave.id, 'mgr');
      expect(leave.status).toBe(LEAVE_STATUS.REJECTED);
    });
    it('emits leave:rejected', () => {
      const leave = service.requestLeave(validRequest());
      const handler = jest.fn();
      service.on('leave:rejected', handler);
      service.reject(leave.id, 'mgr');
      expect(handler).toHaveBeenCalled();
    });
    it('throws for unknown leave', () => {
      expect(() => service.reject('nope', 'mgr')).toThrow('not found');
    });
  });

  describe('cancel', () => {
    it('cancels a leave', () => {
      const leave = service.requestLeave(validRequest());
      service.cancel(leave.id);
      expect(leave.status).toBe(LEAVE_STATUS.CANCELLED);
    });
    it('emits leave:cancelled', () => {
      const leave = service.requestLeave(validRequest());
      const handler = jest.fn();
      service.on('leave:cancelled', handler);
      service.cancel(leave.id);
      expect(handler).toHaveBeenCalled();
    });
    it('throws if already cancelled', () => {
      const leave = service.requestLeave(validRequest());
      service.cancel(leave.id);
      expect(() => service.cancel(leave.id)).toThrow();
    });
  });

  describe('getById', () => {
    it('returns leave by id', () => {
      const leave = service.requestLeave(validRequest());
      expect(service.getById(leave.id)).toBe(leave);
    });
    it('throws for unknown id', () => {
      expect(() => service.getById('nope')).toThrow('not found');
    });
  });

  describe('getByEmployee', () => {
    it('returns employee leaves', () => {
      service.requestLeave(validRequest());
      expect(service.getByEmployee('emp_1')).toHaveLength(1);
    });
    it('returns empty when none', () => {
      expect(service.getByEmployee('emp_1')).toHaveLength(0);
    });
  });

  describe('getPending / getApproved', () => {
    it('getPending returns pending leaves', () => {
      service.requestLeave(validRequest());
      expect(service.getPending()).toHaveLength(1);
    });
    it('getApproved returns approved leaves', () => {
      const leave = service.requestLeave(validRequest());
      service.approve(leave.id, 'mgr');
      expect(service.getApproved()).toHaveLength(1);
    });
  });

  describe('getTotalApprovedDays', () => {
    it('sums approved leave days in range', () => {
      const leave = service.requestLeave(validRequest()); // 7 days
      service.approve(leave.id, 'mgr');
      const total = service.getTotalApprovedDays('emp_1', new Date('2024-06-01'), new Date('2024-08-01'));
      expect(total).toBe(7);
    });
    it('excludes pending leaves', () => {
      service.requestLeave(validRequest());
      const total = service.getTotalApprovedDays('emp_1', new Date('2024-06-01'), new Date('2024-08-01'));
      expect(total).toBe(0);
    });
  });

  describe('isOnLeave', () => {
    it('returns true if employee is on approved leave', () => {
      const leave = service.requestLeave(validRequest());
      service.approve(leave.id, 'mgr');
      expect(service.isOnLeave('emp_1', new Date('2024-07-04'))).toBe(true);
    });
    it('returns false when not on leave', () => {
      expect(service.isOnLeave('emp_1', new Date('2024-07-04'))).toBe(false);
    });
    it('returns false for pending leave', () => {
      service.requestLeave(validRequest());
      expect(service.isOnLeave('emp_1', new Date('2024-07-04'))).toBe(false);
    });
    it('throws for invalid date', () => {
      expect(() => service.isOnLeave('emp_1', 'bad')).toThrow(TypeError);
    });
  });
});

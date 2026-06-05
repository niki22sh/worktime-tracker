'use strict';

const { Leave, LEAVE_TYPE, LEAVE_STATUS } = require('../../src/models/Leave');

const validParams = () => ({
  id: 'leave_001',
  employeeId: 'emp_001',
  type: LEAVE_TYPE.VACATION,
  startDate: new Date('2024-07-01'),
  endDate: new Date('2024-07-14'),
});

describe('Leave model', () => {
  describe('constructor', () => {
    it('creates leave with valid params', () => {
      const l = new Leave(validParams());
      expect(l.id).toBe('leave_001');
      expect(l.status).toBe(LEAVE_STATUS.PENDING);
    });
    it('throws if endDate before startDate', () => {
      expect(() => new Leave({ ...validParams(), startDate: new Date('2024-07-10'), endDate: new Date('2024-07-01') })).toThrow();
    });
    it('allows same start and end (single day)', () => {
      const d = new Date('2024-07-01');
      expect(() => new Leave({ ...validParams(), startDate: d, endDate: d })).not.toThrow();
    });
    it('throws for invalid type', () => {
      expect(() => new Leave({ ...validParams(), type: 'HOLIDAY' })).toThrow(TypeError);
    });
    it('throws for missing employeeId', () => {
      expect(() => new Leave({ ...validParams(), employeeId: '' })).toThrow(TypeError);
    });
    it('throws for invalid startDate', () => {
      expect(() => new Leave({ ...validParams(), startDate: 'bad' })).toThrow(TypeError);
    });
    it('throws for invalid endDate', () => {
      expect(() => new Leave({ ...validParams(), endDate: 'bad' })).toThrow(TypeError);
    });
  });

  describe('getDurationDays', () => {
    it('returns 14 for 2-week leave', () => {
      const l = new Leave(validParams());
      expect(l.getDurationDays()).toBe(14);
    });
    it('returns 1 for single-day leave', () => {
      const d = new Date('2024-07-01');
      const l = new Leave({ ...validParams(), startDate: d, endDate: d });
      expect(l.getDurationDays()).toBe(1);
    });
  });

  describe('approve', () => {
    it('approves pending leave', () => {
      const l = new Leave(validParams());
      l.approve('manager_001');
      expect(l.isApproved()).toBe(true);
      expect(l.approvedBy).toBe('manager_001');
    });
    it('throws if not pending', () => {
      const l = new Leave(validParams());
      l.approve('mgr');
      expect(() => l.approve('mgr')).toThrow();
    });
    it('throws for empty approverId', () => {
      const l = new Leave(validParams());
      expect(() => l.approve('')).toThrow(TypeError);
    });
  });

  describe('reject', () => {
    it('rejects pending leave', () => {
      const l = new Leave(validParams());
      l.reject('manager_001');
      expect(l.status).toBe(LEAVE_STATUS.REJECTED);
    });
    it('throws if not pending', () => {
      const l = new Leave(validParams());
      l.reject('mgr');
      expect(() => l.reject('mgr')).toThrow();
    });
  });

  describe('cancel', () => {
    it('cancels a leave', () => {
      const l = new Leave(validParams());
      l.cancel();
      expect(l.status).toBe(LEAVE_STATUS.CANCELLED);
    });
    it('throws if already cancelled', () => {
      const l = new Leave(validParams());
      l.cancel();
      expect(() => l.cancel()).toThrow();
    });
  });

  describe('isPending / isApproved', () => {
    it('new leave isPending', () => {
      const l = new Leave(validParams());
      expect(l.isPending()).toBe(true);
      expect(l.isApproved()).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('includes durationDays', () => {
      const l = new Leave(validParams());
      expect(l.toJSON()).toHaveProperty('durationDays', 14);
    });
  });
});

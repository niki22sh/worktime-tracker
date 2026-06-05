'use strict';

const { Employee, EMPLOYEE_STATUS, EMPLOYEE_ROLE } = require('../../src/models/Employee');

const validParams = () => ({
  id: 'emp_001',
  firstName: 'Іван',
  lastName: 'Петренко',
  email: 'ivan@example.com',
  department: 'Engineering',
  role: EMPLOYEE_ROLE.EMPLOYEE,
});

describe('Employee model', () => {
  describe('constructor', () => {
    it('creates employee with valid params', () => {
      const emp = new Employee(validParams());
      expect(emp.id).toBe('emp_001');
      expect(emp.firstName).toBe('Іван');
      expect(emp.email).toBe('ivan@example.com');
      expect(emp.status).toBe(EMPLOYEE_STATUS.ACTIVE);
    });
    it('normalises email to lowercase', () => {
      const emp = new Employee({ ...validParams(), email: 'IVAN@EXAMPLE.COM' });
      expect(emp.email).toBe('ivan@example.com');
    });
    it('accepts explicit status', () => {
      const emp = new Employee({ ...validParams(), status: EMPLOYEE_STATUS.INACTIVE });
      expect(emp.status).toBe(EMPLOYEE_STATUS.INACTIVE);
    });
    it('defaults createdAt to now', () => {
      const before = Date.now();
      const emp = new Employee(validParams());
      expect(emp.createdAt.getTime()).toBeGreaterThanOrEqual(before);
    });
    it('throws for missing id', () => {
      expect(() => new Employee({ ...validParams(), id: '' })).toThrow(TypeError);
    });
    it('throws for invalid email', () => {
      expect(() => new Employee({ ...validParams(), email: 'bad' })).toThrow(TypeError);
    });
    it('throws for invalid role', () => {
      expect(() => new Employee({ ...validParams(), role: 'GOD' })).toThrow(TypeError);
    });
    it('throws for missing firstName', () => {
      expect(() => new Employee({ ...validParams(), firstName: '' })).toThrow(TypeError);
    });
    it('throws for missing department', () => {
      expect(() => new Employee({ ...validParams(), department: '' })).toThrow(TypeError);
    });
  });

  describe('fullName getter', () => {
    it('concatenates first and last name', () => {
      const emp = new Employee(validParams());
      expect(emp.fullName).toBe('Іван Петренко');
    });
  });

  describe('status methods', () => {
    it('isActive returns true for ACTIVE', () => {
      const emp = new Employee(validParams());
      expect(emp.isActive()).toBe(true);
    });
    it('isBlocked returns false for ACTIVE', () => {
      const emp = new Employee(validParams());
      expect(emp.isBlocked()).toBe(false);
    });
    it('block changes status to BLOCKED', () => {
      const emp = new Employee(validParams());
      emp.block();
      expect(emp.isBlocked()).toBe(true);
      expect(emp.status).toBe(EMPLOYEE_STATUS.BLOCKED);
    });
    it('activate changes status to ACTIVE', () => {
      const emp = new Employee({ ...validParams(), status: EMPLOYEE_STATUS.BLOCKED });
      emp.activate();
      expect(emp.isActive()).toBe(true);
    });
    it('deactivate changes status to INACTIVE', () => {
      const emp = new Employee(validParams());
      emp.deactivate();
      expect(emp.status).toBe(EMPLOYEE_STATUS.INACTIVE);
    });
  });

  describe('toJSON', () => {
    it('returns plain object with all fields', () => {
      const emp = new Employee(validParams());
      const json = emp.toJSON();
      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('email');
      expect(json).toHaveProperty('status');
      expect(json).not.toHaveProperty('fullName'); // getter, not field
    });
  });
});

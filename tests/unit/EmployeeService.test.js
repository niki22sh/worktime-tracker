'use strict';

const { EmployeeService } = require('../../src/services/EmployeeService');
const { InMemoryEmployeeRepository } = require('../../src/storage/InMemoryEmployeeRepository');
const { EMPLOYEE_ROLE, EMPLOYEE_STATUS } = require('../../src/models/Employee');

const validReg = (overrides = {}) => ({
  firstName: 'Іван', lastName: 'Коваль', email: 'ivan@example.com',
  department: 'Engineering', role: EMPLOYEE_ROLE.EMPLOYEE, ...overrides,
});

describe('EmployeeService', () => {
  let repo, service;
  beforeEach(() => {
    repo = new InMemoryEmployeeRepository();
    service = new EmployeeService(repo);
  });

  describe('register', () => {
    it('creates and returns a new employee', () => {
      const emp = service.register(validReg());
      expect(emp.id).toBeDefined();
      expect(emp.email).toBe('ivan@example.com');
    });

    it('emits employee:registered event', () => {
      const handler = jest.fn();
      service.on('employee:registered', handler);
      service.register(validReg());
      expect(handler).toHaveBeenCalled();
    });

    it('throws if email already exists', () => {
      service.register(validReg());
      expect(() => service.register(validReg())).toThrow('already exists');
    });

    it('throws for missing firstName', () => {
      expect(() => service.register(validReg({ firstName: '' }))).toThrow(TypeError);
    });
    it('throws for invalid email', () => {
      expect(() => service.register(validReg({ email: 'bad' }))).toThrow(TypeError);
    });
    it('throws for invalid role', () => {
      expect(() => service.register(validReg({ role: 'SUPERUSER' }))).toThrow(TypeError);
    });
    it('trims whitespace from names', () => {
      const emp = service.register(validReg({ firstName: '  Anna  ', lastName: '  Smith  ' }));
      expect(emp.firstName).toBe('Anna');
      expect(emp.lastName).toBe('Smith');
    });
  });

  describe('getAll', () => {
    it('returns empty array initially', () => {
      expect(service.getAll()).toHaveLength(0);
    });
    it('returns all registered employees', () => {
      service.register(validReg({ email: 'a@x.com' }));
      service.register(validReg({ email: 'b@x.com' }));
      expect(service.getAll()).toHaveLength(2);
    });
  });

  describe('getById', () => {
    it('returns employee by id', () => {
      const emp = service.register(validReg());
      expect(service.getById(emp.id)).toBe(emp);
    });
    it('throws for unknown id', () => {
      expect(() => service.getById('nope')).toThrow('not found');
    });
  });

  describe('findByEmail', () => {
    it('returns employee or null', () => {
      service.register(validReg());
      expect(service.findByEmail('ivan@example.com')).not.toBeNull();
      expect(service.findByEmail('nobody@x.com')).toBeNull();
    });
  });

  describe('getByDepartment', () => {
    it('returns only employees from that department', () => {
      service.register(validReg({ email: 'a@x.com', department: 'Dev' }));
      service.register(validReg({ email: 'b@x.com', department: 'QA' }));
      expect(service.getByDepartment('Dev')).toHaveLength(1);
    });
    it('throws for empty department', () => {
      expect(() => service.getByDepartment('')).toThrow(TypeError);
    });
  });

  describe('update', () => {
    it('updates allowed fields', () => {
      const emp = service.register(validReg());
      service.update(emp.id, { firstName: 'Updated', department: 'NewDept' });
      expect(emp.firstName).toBe('Updated');
      expect(emp.department).toBe('NewDept');
    });
    it('emits employee:updated event', () => {
      const emp = service.register(validReg());
      const handler = jest.fn();
      service.on('employee:updated', handler);
      service.update(emp.id, { firstName: 'New' });
      expect(handler).toHaveBeenCalled();
    });
    it('throws for unknown id', () => {
      expect(() => service.update('nope', { firstName: 'X' })).toThrow();
    });
    it('throws for empty firstName update', () => {
      const emp = service.register(validReg());
      expect(() => service.update(emp.id, { firstName: '' })).toThrow(TypeError);
    });
    it('throws for invalid role update', () => {
      const emp = service.register(validReg());
      expect(() => service.update(emp.id, { role: 'KING' })).toThrow(TypeError);
    });
  });

  describe('block / activate / deactivate', () => {
    it('block sets status to BLOCKED', () => {
      const emp = service.register(validReg());
      service.block(emp.id);
      expect(emp.isBlocked()).toBe(true);
    });
    it('block throws if already blocked', () => {
      const emp = service.register(validReg());
      service.block(emp.id);
      expect(() => service.block(emp.id)).toThrow('already blocked');
    });
    it('activate unblocks an employee', () => {
      const emp = service.register(validReg());
      service.block(emp.id);
      service.activate(emp.id);
      expect(emp.isActive()).toBe(true);
    });
    it('activate throws if already active', () => {
      const emp = service.register(validReg());
      expect(() => service.activate(emp.id)).toThrow('already active');
    });
    it('deactivate sets status to INACTIVE', () => {
      const emp = service.register(validReg());
      service.deactivate(emp.id);
      expect(emp.status).toBe(EMPLOYEE_STATUS.INACTIVE);
    });
    it('emits block/activate/deactivate events', () => {
      const emp = service.register(validReg());
      const blockH = jest.fn(), activateH = jest.fn(), deactivateH = jest.fn();
      service.on('employee:blocked', blockH);
      service.on('employee:activated', activateH);
      service.on('employee:deactivated', deactivateH);
      service.block(emp.id);
      service.activate(emp.id);
      service.deactivate(emp.id);
      expect(blockH).toHaveBeenCalled();
      expect(activateH).toHaveBeenCalled();
      expect(deactivateH).toHaveBeenCalled();
    });
  });

  describe('getActiveCount', () => {
    it('counts only active employees', () => {
      const e1 = service.register(validReg({ email: 'a@x.com' }));
      service.register(validReg({ email: 'b@x.com' }));
      service.block(e1.id);
      expect(service.getActiveCount()).toBe(1);
    });
  });

  describe('getDepartmentStats', () => {
    it('returns correct head counts', () => {
      service.register(validReg({ email: 'a@x.com', department: 'Dev' }));
      service.register(validReg({ email: 'b@x.com', department: 'Dev' }));
      service.register(validReg({ email: 'c@x.com', department: 'QA' }));
      const stats = service.getDepartmentStats();
      const dev = stats.find(s => s.department === 'Dev');
      expect(dev.count).toBe(2);
    });
    it('returns empty array when no employees', () => {
      expect(service.getDepartmentStats()).toHaveLength(0);
    });
  });
});

/**
 * @module services/EmployeeService
 * Business logic for employee management.
 * Depends on IEmployeeRepository (DIP — Dependency Inversion Principle).
 */

'use strict';

const { Employee, EMPLOYEE_ROLE, EMPLOYEE_STATUS } = require('../models/Employee');
const { generateId } = require('../utils/idGenerator');
const { validateString, validateEmail, validateEnum } = require('../utils/validators');
const { EventEmitter } = require('../utils/EventEmitter');

class EmployeeService extends EventEmitter {
  /**
   * @param {import('../storage/IEmployeeRepository').IEmployeeRepository} employeeRepo
   */
  constructor(employeeRepo) {
    super();
    this._repo = employeeRepo;
  }

  /**
   * Register a new employee.
   */
  register({ firstName, lastName, email, department, role }) {
    validateString(firstName, 'firstName');
    validateString(lastName, 'lastName');
    validateEmail(email);
    validateString(department, 'department');
    validateEnum(role, Object.values(EMPLOYEE_ROLE), 'role');

    const existing = this._repo.findByEmail(email);
    if (existing) {
      throw new Error(`Employee with email ${email} already exists`);
    }

    const employee = new Employee({
      id: generateId('emp'),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email,
      department: department.trim(),
      role,
    });

    this._repo.save(employee);
    this.emit('employee:registered', employee);
    return employee;
  }

  /**
   * Get all employees.
   * @returns {Employee[]}
   */
  getAll() {
    return this._repo.findAll();
  }

  /**
   * Find by id or throw.
   * @param {string} id
   * @returns {Employee}
   */
  getById(id) {
    const emp = this._repo.findById(id);
    if (!emp) throw new Error(`Employee not found: ${id}`);
    return emp;
  }

  /**
   * Find by email.
   * @param {string} email
   * @returns {Employee|null}
   */
  findByEmail(email) {
    return this._repo.findByEmail(email);
  }

  /**
   * Get employees by department.
   * @param {string} department
   * @returns {Employee[]}
   */
  getByDepartment(department) {
    validateString(department, 'department');
    return this._repo.findByDepartment(department);
  }

  /**
   * Update employee fields.
   */
  update(id, updates) {
    const emp = this.getById(id);

    if (updates.firstName !== undefined) {
      validateString(updates.firstName, 'firstName');
      emp.firstName = updates.firstName.trim();
    }
    if (updates.lastName !== undefined) {
      validateString(updates.lastName, 'lastName');
      emp.lastName = updates.lastName.trim();
    }
    if (updates.department !== undefined) {
      validateString(updates.department, 'department');
      emp.department = updates.department.trim();
    }
    if (updates.role !== undefined) {
      validateEnum(updates.role, Object.values(EMPLOYEE_ROLE), 'role');
      emp.role = updates.role;
    }

    this._repo.save(emp);
    this.emit('employee:updated', emp);
    return emp;
  }

  /**
   * Block employee (prevents clock-in).
   */
  block(id) {
    const emp = this.getById(id);
    if (emp.isBlocked()) throw new Error('Employee is already blocked');
    emp.block();
    this._repo.save(emp);
    this.emit('employee:blocked', emp);
    return emp;
  }

  /**
   * Activate a blocked/inactive employee.
   */
  activate(id) {
    const emp = this.getById(id);
    if (emp.isActive()) throw new Error('Employee is already active');
    emp.activate();
    this._repo.save(emp);
    this.emit('employee:activated', emp);
    return emp;
  }

  /**
   * Deactivate (soft-delete).
   */
  deactivate(id) {
    const emp = this.getById(id);
    emp.deactivate();
    this._repo.save(emp);
    this.emit('employee:deactivated', emp);
    return emp;
  }

  /**
   * Get active employees count.
   */
  getActiveCount() {
    return this._repo.findAll().filter(e => e.status === EMPLOYEE_STATUS.ACTIVE).length;
  }

  /**
   * List departments with head-count.
   * @returns {{ department: string, count: number }[]}
   */
  getDepartmentStats() {
    const employees = this._repo.findAll();
    const stats = {};
    for (const emp of employees) {
      stats[emp.department] = (stats[emp.department] || 0) + 1;
    }
    return Object.entries(stats).map(([department, count]) => ({ department, count }));
  }
}

module.exports = { EmployeeService };

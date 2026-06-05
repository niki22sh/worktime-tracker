/**
 * @module models/Employee
 * Employee entity — represents a worker in the time-tracking system.
 */

'use strict';

const { validateString, validateEmail, validateEnum } = require('../utils/validators');

/**
 * @typedef {'ACTIVE'|'INACTIVE'|'BLOCKED'} EmployeeStatus
 */
const EMPLOYEE_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  BLOCKED: 'BLOCKED',
});

/**
 * @typedef {'EMPLOYEE'|'MANAGER'|'ADMIN'} EmployeeRole
 */
const EMPLOYEE_ROLE = Object.freeze({
  EMPLOYEE: 'EMPLOYEE',
  MANAGER: 'MANAGER',
  ADMIN: 'ADMIN',
});

class Employee {
  /**
   * @param {object} params
   * @param {string} params.id
   * @param {string} params.firstName
   * @param {string} params.lastName
   * @param {string} params.email
   * @param {string} params.department
   * @param {EmployeeRole} params.role
   * @param {EmployeeStatus} [params.status]
   * @param {Date} [params.createdAt]
   */
  constructor({ id, firstName, lastName, email, department, role, status, createdAt }) {
    validateString(id, 'id');
    validateString(firstName, 'firstName');
    validateString(lastName, 'lastName');
    validateEmail(email);
    validateString(department, 'department');
    validateEnum(role, Object.values(EMPLOYEE_ROLE), 'role');

    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email.toLowerCase().trim();
    this.department = department;
    this.role = role;
    this.status = status || EMPLOYEE_STATUS.ACTIVE;
    this.createdAt = createdAt || new Date();
  }

  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  isActive() {
    return this.status === EMPLOYEE_STATUS.ACTIVE;
  }

  isBlocked() {
    return this.status === EMPLOYEE_STATUS.BLOCKED;
  }

  block() {
    this.status = EMPLOYEE_STATUS.BLOCKED;
  }

  activate() {
    this.status = EMPLOYEE_STATUS.ACTIVE;
  }

  deactivate() {
    this.status = EMPLOYEE_STATUS.INACTIVE;
  }

  toJSON() {
    return {
      id: this.id,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      department: this.department,
      role: this.role,
      status: this.status,
      createdAt: this.createdAt,
    };
  }
}

module.exports = { Employee, EMPLOYEE_STATUS, EMPLOYEE_ROLE };

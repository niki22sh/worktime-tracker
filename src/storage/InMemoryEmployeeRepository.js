/**
 * @module storage/InMemoryEmployeeRepository
 * In-memory implementation of IEmployeeRepository.
 */

'use strict';

const { IEmployeeRepository } = require('./IEmployeeRepository');

class InMemoryEmployeeRepository extends IEmployeeRepository {
  constructor() {
    super();
    /** @type {Map<string, import('../models/Employee').Employee>} */
    this._store = new Map();
  }

  save(employee) {
    this._store.set(employee.id, employee);
    return employee;
  }

  findAll() {
    return Array.from(this._store.values());
  }

  findById(id) {
    return this._store.get(id) || null;
  }

  findByEmail(email) {
    const normalized = email.toLowerCase().trim();
    for (const emp of this._store.values()) {
      if (emp.email === normalized) return emp;
    }
    return null;
  }

  findByDepartment(department) {
    return this.findAll().filter(e => e.department === department);
  }

  delete(id) {
    return this._store.delete(id);
  }

  clear() {
    this._store.clear();
  }
}

module.exports = { InMemoryEmployeeRepository };

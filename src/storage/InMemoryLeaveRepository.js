/**
 * @module storage/InMemoryLeaveRepository
 * In-memory implementation of ILeaveRepository.
 */

'use strict';

const { ILeaveRepository } = require('./ILeaveRepository');
const { rangesOverlap } = require('../utils/dateUtils');

class InMemoryLeaveRepository extends ILeaveRepository {
  constructor() {
    super();
    /** @type {Map<string, import('../models/Leave').Leave>} */
    this._store = new Map();
  }

  save(leave) {
    this._store.set(leave.id, leave);
    return leave;
  }

  findAll() {
    return Array.from(this._store.values());
  }

  findById(id) {
    return this._store.get(id) || null;
  }

  findByEmployeeId(employeeId) {
    return this.findAll().filter(l => l.employeeId === employeeId);
  }

  findByEmployeeIdAndDateRange(employeeId, from, to) {
    return this.findAll().filter(l =>
      l.employeeId === employeeId &&
      rangesOverlap(l.startDate, l.endDate, from, to)
    );
  }

  findByStatus(status) {
    return this.findAll().filter(l => l.status === status);
  }

  delete(id) {
    return this._store.delete(id);
  }

  clear() {
    this._store.clear();
  }
}

module.exports = { InMemoryLeaveRepository };

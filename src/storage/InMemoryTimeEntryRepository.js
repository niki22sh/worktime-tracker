/**
 * @module storage/InMemoryTimeEntryRepository
 * In-memory implementation of ITimeEntryRepository.
 */

'use strict';

const { ITimeEntryRepository } = require('./ITimeEntryRepository');
const { ENTRY_STATUS } = require('../models/TimeEntry');

class InMemoryTimeEntryRepository extends ITimeEntryRepository {
  constructor() {
    super();
    /** @type {Map<string, import('../models/TimeEntry').TimeEntry>} */
    this._store = new Map();
  }

  save(entry) {
    this._store.set(entry.id, entry);
    return entry;
  }

  findAll() {
    return Array.from(this._store.values());
  }

  findById(id) {
    return this._store.get(id) || null;
  }

  findByEmployeeId(employeeId) {
    return this.findAll().filter(e => e.employeeId === employeeId);
  }

  findByEmployeeIdAndDateRange(employeeId, from, to) {
    return this.findAll().filter(e =>
      e.employeeId === employeeId &&
      e.clockIn >= from &&
      e.clockIn <= to
    );
  }

  findByDateRange(from, to) {
    return this.findAll().filter(e => e.clockIn >= from && e.clockIn <= to);
  }

  findOpenEntry(employeeId) {
    return this.findAll().find(
      e => e.employeeId === employeeId && e.status === ENTRY_STATUS.OPEN
    ) || null;
  }

  delete(id) {
    return this._store.delete(id);
  }

  clear() {
    this._store.clear();
  }
}

module.exports = { InMemoryTimeEntryRepository };

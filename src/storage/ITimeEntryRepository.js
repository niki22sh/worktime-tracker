/**
 * @module storage/ITimeEntryRepository
 * Interface contract for time-entry persistence.
 */

'use strict';

class ITimeEntryRepository {
  /** @param {import('../models/TimeEntry').TimeEntry} entry */
  save(entry) { throw new Error('Not implemented'); }

  /** @returns {import('../models/TimeEntry').TimeEntry[]} */
  findAll() { throw new Error('Not implemented'); }

  /**
   * @param {string} id
   * @returns {import('../models/TimeEntry').TimeEntry|null}
   */
  findById(id) { throw new Error('Not implemented'); }

  /**
   * @param {string} employeeId
   * @returns {import('../models/TimeEntry').TimeEntry[]}
   */
  findByEmployeeId(employeeId) { throw new Error('Not implemented'); }

  /**
   * @param {string} employeeId
   * @param {Date} from
   * @param {Date} to
   * @returns {import('../models/TimeEntry').TimeEntry[]}
   */
  findByEmployeeIdAndDateRange(employeeId, from, to) { throw new Error('Not implemented'); }

  /**
   * @param {Date} from
   * @param {Date} to
   * @returns {import('../models/TimeEntry').TimeEntry[]}
   */
  findByDateRange(from, to) { throw new Error('Not implemented'); }

  /**
   * Open entry for employee (clockOut is null).
   * @param {string} employeeId
   * @returns {import('../models/TimeEntry').TimeEntry|null}
   */
  findOpenEntry(employeeId) { throw new Error('Not implemented'); }

  /**
   * @param {string} id
   * @returns {boolean}
   */
  delete(id) { throw new Error('Not implemented'); }

  clear() { throw new Error('Not implemented'); }
}

module.exports = { ITimeEntryRepository };

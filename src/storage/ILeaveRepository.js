/**
 * @module storage/ILeaveRepository
 * Interface contract for leave persistence.
 */

'use strict';

class ILeaveRepository {
  /** @param {import('../models/Leave').Leave} leave */
  save(leave) { throw new Error('Not implemented'); }

  /** @returns {import('../models/Leave').Leave[]} */
  findAll() { throw new Error('Not implemented'); }

  /**
   * @param {string} id
   * @returns {import('../models/Leave').Leave|null}
   */
  findById(id) { throw new Error('Not implemented'); }

  /**
   * @param {string} employeeId
   * @returns {import('../models/Leave').Leave[]}
   */
  findByEmployeeId(employeeId) { throw new Error('Not implemented'); }

  /**
   * @param {string} employeeId
   * @param {Date} from
   * @param {Date} to
   * @returns {import('../models/Leave').Leave[]}
   */
  findByEmployeeIdAndDateRange(employeeId, from, to) { throw new Error('Not implemented'); }

  /**
   * @param {import('../models/Leave').LeaveStatus} status
   * @returns {import('../models/Leave').Leave[]}
   */
  findByStatus(status) { throw new Error('Not implemented'); }

  /**
   * @param {string} id
   * @returns {boolean}
   */
  delete(id) { throw new Error('Not implemented'); }

  clear() { throw new Error('Not implemented'); }
}

module.exports = { ILeaveRepository };

/**
 * @module storage/IEmployeeRepository
 * Interface contract for employee persistence.
 * All In-Memory (and future real) implementations must extend this.
 */

'use strict';

class IEmployeeRepository {
  /** @param {import('../models/Employee').Employee} employee */
  save(employee) { throw new Error('Not implemented'); }

  /** @returns {import('../models/Employee').Employee[]} */
  findAll() { throw new Error('Not implemented'); }

  /**
   * @param {string} id
   * @returns {import('../models/Employee').Employee|null}
   */
  findById(id) { throw new Error('Not implemented'); }

  /**
   * @param {string} email
   * @returns {import('../models/Employee').Employee|null}
   */
  findByEmail(email) { throw new Error('Not implemented'); }

  /**
   * @param {string} department
   * @returns {import('../models/Employee').Employee[]}
   */
  findByDepartment(department) { throw new Error('Not implemented'); }

  /**
   * @param {string} id
   * @returns {boolean}
   */
  delete(id) { throw new Error('Not implemented'); }

  /** Clears all records (used in tests). */
  clear() { throw new Error('Not implemented'); }
}

module.exports = { IEmployeeRepository };

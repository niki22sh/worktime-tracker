/**
 * @module services/TimeTrackingService
 * Core clock-in / clock-out logic with Observer event emission.
 */

'use strict';

const { TimeEntry, ENTRY_TYPE, ENTRY_STATUS } = require('../models/TimeEntry');
const { generateId } = require('../utils/idGenerator');
const { validateString, validateDate } = require('../utils/validators');
const { EventEmitter } = require('../utils/EventEmitter');
const { startOfDay, endOfDay } = require('../utils/dateUtils');

class TimeTrackingService extends EventEmitter {
  /**
   * @param {import('../storage/ITimeEntryRepository').ITimeEntryRepository} timeEntryRepo
   * @param {import('../storage/IEmployeeRepository').IEmployeeRepository} employeeRepo
   */
  constructor(timeEntryRepo, employeeRepo) {
    super();
    this._timeRepo = timeEntryRepo;
    this._empRepo = employeeRepo;
  }

  /**
   * Clock an employee in.
   * @param {string} employeeId
   * @param {Date} [clockIn=new Date()]
   * @param {string} [note='']
   * @returns {TimeEntry}
   */
  clockIn(employeeId, clockIn = new Date(), note = '') {
    validateString(employeeId, 'employeeId');
    validateDate(clockIn, 'clockIn');

    const emp = this._empRepo.findById(employeeId);
    if (!emp) throw new Error(`Employee not found: ${employeeId}`);
    if (emp.isBlocked()) throw new Error(`Employee ${employeeId} is blocked`);
    if (!emp.isActive()) throw new Error(`Employee ${employeeId} is not active`);

    const openEntry = this._timeRepo.findOpenEntry(employeeId);
    if (openEntry) throw new Error(`Employee ${employeeId} already clocked in (entry: ${openEntry.id})`);

    const entry = new TimeEntry({
      id: generateId('entry'),
      employeeId,
      clockIn,
      type: ENTRY_TYPE.WORK,
      note,
    });

    this._timeRepo.save(entry);
    this.emit('timeEntry:clockedIn', { employee: emp, entry });
    return entry;
  }

  /**
   * Clock an employee out.
   * @param {string} employeeId
   * @param {Date} [clockOut=new Date()]
   * @param {string} [note='']
   * @returns {TimeEntry}
   */
  clockOut(employeeId, clockOut = new Date(), note = '') {
    validateString(employeeId, 'employeeId');
    validateDate(clockOut, 'clockOut');

    const emp = this._empRepo.findById(employeeId);
    if (!emp) throw new Error(`Employee not found: ${employeeId}`);

    const openEntry = this._timeRepo.findOpenEntry(employeeId);
    if (!openEntry) throw new Error(`Employee ${employeeId} is not clocked in`);

    if (clockOut < openEntry.clockIn) {
      throw new Error('clockOut cannot be before clockIn');
    }

    if (note) openEntry.note = note;
    openEntry.close(clockOut);

    this._timeRepo.save(openEntry);
    this.emit('timeEntry:clockedOut', { employee: emp, entry: openEntry });
    return openEntry;
  }

  /**
   * Get the current open entry (if any) for an employee.
   * @param {string} employeeId
   * @returns {TimeEntry|null}
   */
  getOpenEntry(employeeId) {
    validateString(employeeId, 'employeeId');
    return this._timeRepo.findOpenEntry(employeeId);
  }

  /**
   * Adjust (correct) an existing closed entry.
   */
  adjustEntry(entryId, clockIn, clockOut, note) {
    validateString(entryId, 'entryId');
    validateDate(clockIn, 'clockIn');
    validateDate(clockOut, 'clockOut');

    const entry = this._timeRepo.findById(entryId);
    if (!entry) throw new Error(`TimeEntry not found: ${entryId}`);

    entry.adjust(clockIn, clockOut);
    if (note !== undefined) entry.note = note;

    this._timeRepo.save(entry);
    this.emit('timeEntry:adjusted', entry);
    return entry;
  }

  /**
   * Get all entries for an employee.
   * @param {string} employeeId
   * @returns {TimeEntry[]}
   */
  getEntriesByEmployee(employeeId) {
    validateString(employeeId, 'employeeId');
    return this._timeRepo.findByEmployeeId(employeeId);
  }

  /**
   * Get entries for an employee in a date range.
   * @param {string} employeeId
   * @param {Date} from
   * @param {Date} to
   * @returns {TimeEntry[]}
   */
  getEntriesByEmployeeAndDateRange(employeeId, from, to) {
    validateString(employeeId, 'employeeId');
    validateDate(from, 'from');
    validateDate(to, 'to');
    return this._timeRepo.findByEmployeeIdAndDateRange(employeeId, from, to);
  }

  /**
   * Get all entries for a given day.
   * @param {Date} date
   * @returns {TimeEntry[]}
   */
  getEntriesForDay(date) {
    validateDate(date, 'date');
    return this._timeRepo.findByDateRange(startOfDay(date), endOfDay(date));
  }

  /**
   * Delete an entry by id.
   * @param {string} entryId
   * @returns {boolean}
   */
  deleteEntry(entryId) {
    validateString(entryId, 'entryId');
    return this._timeRepo.delete(entryId);
  }

  /**
   * Is an employee currently clocked in?
   * @param {string} employeeId
   * @returns {boolean}
   */
  isClockedIn(employeeId) {
    return this._timeRepo.findOpenEntry(employeeId) !== null;
  }
}

module.exports = { TimeTrackingService };

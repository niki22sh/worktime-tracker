/**
 * @module models/TimeEntry
 * TimeEntry entity — a single clock-in / clock-out record.
 */

'use strict';

const { validateString, validateDate, validateEnum } = require('../utils/validators');

/**
 * @typedef {'WORK'|'BREAK'|'OVERTIME'} EntryType
 */
const ENTRY_TYPE = Object.freeze({
  WORK: 'WORK',
  BREAK: 'BREAK',
  OVERTIME: 'OVERTIME',
});

/**
 * @typedef {'OPEN'|'CLOSED'|'ADJUSTED'} EntryStatus
 */
const ENTRY_STATUS = Object.freeze({
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  ADJUSTED: 'ADJUSTED',
});

class TimeEntry {
  /**
   * @param {object} params
   * @param {string} params.id
   * @param {string} params.employeeId
   * @param {Date}   params.clockIn
   * @param {Date}   [params.clockOut]
   * @param {EntryType}   [params.type]
   * @param {EntryStatus} [params.status]
   * @param {string}  [params.note]
   */
  constructor({ id, employeeId, clockIn, clockOut, type, status, note }) {
    validateString(id, 'id');
    validateString(employeeId, 'employeeId');
    validateDate(clockIn, 'clockIn');
    if (clockOut !== undefined && clockOut !== null) validateDate(clockOut, 'clockOut');

    this.id = id;
    this.employeeId = employeeId;
    this.clockIn = clockIn;
    this.clockOut = clockOut || null;
    this.type = type || ENTRY_TYPE.WORK;
    this.status = status || ENTRY_STATUS.OPEN;
    this.note = note || '';
  }

  /**
   * Duration in milliseconds; null if still open.
   * @returns {number|null}
   */
  getDurationMs() {
    if (!this.clockOut) return null;
    return this.clockOut.getTime() - this.clockIn.getTime();
  }

  /**
   * Duration in hours (decimal); null if still open.
   * @returns {number|null}
   */
  getDurationHours() {
    const ms = this.getDurationMs();
    if (ms === null) return null;
    return ms / (1000 * 60 * 60);
  }

  isOpen() {
    return this.status === ENTRY_STATUS.OPEN;
  }

  isClosed() {
    return this.status === ENTRY_STATUS.CLOSED;
  }

  close(clockOut) {
    validateDate(clockOut, 'clockOut');
    if (clockOut < this.clockIn) {
      throw new Error('clockOut cannot be before clockIn');
    }
    this.clockOut = clockOut;
    this.status = ENTRY_STATUS.CLOSED;
  }

  adjust(clockIn, clockOut) {
    validateDate(clockIn, 'clockIn');
    validateDate(clockOut, 'clockOut');
    if (clockOut < clockIn) {
      throw new Error('clockOut cannot be before clockIn');
    }
    this.clockIn = clockIn;
    this.clockOut = clockOut;
    this.status = ENTRY_STATUS.ADJUSTED;
  }

  toJSON() {
    return {
      id: this.id,
      employeeId: this.employeeId,
      clockIn: this.clockIn,
      clockOut: this.clockOut,
      type: this.type,
      status: this.status,
      note: this.note,
      durationHours: this.getDurationHours(),
    };
  }
}

module.exports = { TimeEntry, ENTRY_TYPE, ENTRY_STATUS };

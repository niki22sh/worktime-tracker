/**
 * @module models/Leave
 * Leave (відпустка/лікарняний) entity.
 */

'use strict';

const { validateString, validateDate, validateEnum } = require('../utils/validators');

/**
 * @typedef {'VACATION'|'SICK'|'UNPAID'|'MATERNITY'|'OTHER'} LeaveType
 */
const LEAVE_TYPE = Object.freeze({
  VACATION: 'VACATION',
  SICK: 'SICK',
  UNPAID: 'UNPAID',
  MATERNITY: 'MATERNITY',
  OTHER: 'OTHER',
});

/**
 * @typedef {'PENDING'|'APPROVED'|'REJECTED'|'CANCELLED'} LeaveStatus
 */
const LEAVE_STATUS = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
});

class Leave {
  /**
   * @param {object} params
   * @param {string} params.id
   * @param {string} params.employeeId
   * @param {LeaveType} params.type
   * @param {Date} params.startDate
   * @param {Date} params.endDate
   * @param {string} [params.reason]
   * @param {LeaveStatus} [params.status]
   * @param {string} [params.approvedBy]
   * @param {Date} [params.createdAt]
   */
  constructor({ id, employeeId, type, startDate, endDate, reason, status, approvedBy, createdAt }) {
    validateString(id, 'id');
    validateString(employeeId, 'employeeId');
    validateEnum(type, Object.values(LEAVE_TYPE), 'type');
    validateDate(startDate, 'startDate');
    validateDate(endDate, 'endDate');

    if (endDate < startDate) {
      throw new Error('endDate cannot be before startDate');
    }

    this.id = id;
    this.employeeId = employeeId;
    this.type = type;
    this.startDate = startDate;
    this.endDate = endDate;
    this.reason = reason || '';
    this.status = status || LEAVE_STATUS.PENDING;
    this.approvedBy = approvedBy || null;
    this.createdAt = createdAt || new Date();
  }

  /**
   * Calendar days (inclusive)
   * @returns {number}
   */
  getDurationDays() {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.round((this.endDate.getTime() - this.startDate.getTime()) / msPerDay) + 1;
  }

  approve(approverId) {
    validateString(approverId, 'approverId');
    if (this.status !== LEAVE_STATUS.PENDING) {
      throw new Error(`Cannot approve leave with status ${this.status}`);
    }
    this.status = LEAVE_STATUS.APPROVED;
    this.approvedBy = approverId;
  }

  reject(approverId) {
    validateString(approverId, 'approverId');
    if (this.status !== LEAVE_STATUS.PENDING) {
      throw new Error(`Cannot reject leave with status ${this.status}`);
    }
    this.status = LEAVE_STATUS.REJECTED;
    this.approvedBy = approverId;
  }

  cancel() {
    if (this.status === LEAVE_STATUS.CANCELLED) {
      throw new Error('Leave is already cancelled');
    }
    this.status = LEAVE_STATUS.CANCELLED;
  }

  isPending() { return this.status === LEAVE_STATUS.PENDING; }
  isApproved() { return this.status === LEAVE_STATUS.APPROVED; }

  toJSON() {
    return {
      id: this.id,
      employeeId: this.employeeId,
      type: this.type,
      startDate: this.startDate,
      endDate: this.endDate,
      reason: this.reason,
      status: this.status,
      approvedBy: this.approvedBy,
      createdAt: this.createdAt,
      durationDays: this.getDurationDays(),
    };
  }
}

module.exports = { Leave, LEAVE_TYPE, LEAVE_STATUS };

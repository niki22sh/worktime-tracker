/**
 * @module services/LeaveService
 * Business logic for leave management (vacation, sick days, etc.)
 */

'use strict';

const { Leave, LEAVE_TYPE, LEAVE_STATUS } = require('../models/Leave');
const { generateId } = require('../utils/idGenerator');
const { validateString, validateDate, validateEnum } = require('../utils/validators');
const { EventEmitter } = require('../utils/EventEmitter');
const { rangesOverlap } = require('../utils/dateUtils');

class LeaveService extends EventEmitter {
  /**
   * @param {import('../storage/ILeaveRepository').ILeaveRepository} leaveRepo
   * @param {import('../storage/IEmployeeRepository').IEmployeeRepository} employeeRepo
   */
  constructor(leaveRepo, employeeRepo) {
    super();
    this._leaveRepo = leaveRepo;
    this._empRepo = employeeRepo;
  }

  /**
   * Submit a leave request.
   */
  requestLeave({ employeeId, type, startDate, endDate, reason }) {
    validateString(employeeId, 'employeeId');
    validateEnum(type, Object.values(LEAVE_TYPE), 'type');
    validateDate(startDate, 'startDate');
    validateDate(endDate, 'endDate');

    const emp = this._empRepo.findById(employeeId);
    if (!emp) throw new Error(`Employee not found: ${employeeId}`);
    if (emp.isBlocked()) throw new Error(`Employee ${employeeId} is blocked`);

    // Check for overlapping approved/pending leaves
    const existing = this._leaveRepo.findByEmployeeId(employeeId);
    const conflict = existing.find(l =>
      (l.status === LEAVE_STATUS.APPROVED || l.status === LEAVE_STATUS.PENDING) &&
      rangesOverlap(l.startDate, l.endDate, startDate, endDate)
    );
    if (conflict) {
      throw new Error(`Overlapping leave request exists: ${conflict.id}`);
    }

    const leave = new Leave({
      id: generateId('leave'),
      employeeId,
      type,
      startDate,
      endDate,
      reason: reason || '',
    });

    this._leaveRepo.save(leave);
    this.emit('leave:requested', leave);
    return leave;
  }

  /**
   * Approve a leave request.
   * @param {string} leaveId
   * @param {string} approverId
   */
  approve(leaveId, approverId) {
    validateString(leaveId, 'leaveId');
    validateString(approverId, 'approverId');

    const leave = this._getLeaveOrThrow(leaveId);
    leave.approve(approverId);
    this._leaveRepo.save(leave);
    this.emit('leave:approved', leave);
    return leave;
  }

  /**
   * Reject a leave request.
   * @param {string} leaveId
   * @param {string} approverId
   */
  reject(leaveId, approverId) {
    validateString(leaveId, 'leaveId');
    validateString(approverId, 'approverId');

    const leave = this._getLeaveOrThrow(leaveId);
    leave.reject(approverId);
    this._leaveRepo.save(leave);
    this.emit('leave:rejected', leave);
    return leave;
  }

  /**
   * Cancel a leave.
   * @param {string} leaveId
   */
  cancel(leaveId) {
    validateString(leaveId, 'leaveId');
    const leave = this._getLeaveOrThrow(leaveId);
    leave.cancel();
    this._leaveRepo.save(leave);
    this.emit('leave:cancelled', leave);
    return leave;
  }

  getById(leaveId) {
    return this._getLeaveOrThrow(leaveId);
  }

  getByEmployee(employeeId) {
    validateString(employeeId, 'employeeId');
    return this._leaveRepo.findByEmployeeId(employeeId);
  }

  getPending() {
    return this._leaveRepo.findByStatus(LEAVE_STATUS.PENDING);
  }

  getApproved() {
    return this._leaveRepo.findByStatus(LEAVE_STATUS.APPROVED);
  }

  /**
   * Total approved leave days for an employee in a period.
   */
  getTotalApprovedDays(employeeId, from, to) {
    validateString(employeeId, 'employeeId');
    validateDate(from, 'from');
    validateDate(to, 'to');

    const leaves = this._leaveRepo.findByEmployeeIdAndDateRange(employeeId, from, to);
    return leaves
      .filter(l => l.status === LEAVE_STATUS.APPROVED)
      .reduce((sum, l) => sum + l.getDurationDays(), 0);
  }

  /**
   * Is employee on leave on a specific date?
   * @param {string} employeeId
   * @param {Date} date
   * @returns {boolean}
   */
  isOnLeave(employeeId, date) {
    validateString(employeeId, 'employeeId');
    validateDate(date, 'date');

    const leaves = this._leaveRepo.findByEmployeeId(employeeId);
    return leaves.some(
      l => l.status === LEAVE_STATUS.APPROVED && date >= l.startDate && date <= l.endDate
    );
  }

  _getLeaveOrThrow(leaveId) {
    const leave = this._leaveRepo.findById(leaveId);
    if (!leave) throw new Error(`Leave not found: ${leaveId}`);
    return leave;
  }
}

module.exports = { LeaveService };

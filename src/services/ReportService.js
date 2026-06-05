/**
 * @module services/ReportService
 * Analytics and report generation.
 * Uses Strategy pattern for overtime calculation.
 */

'use strict';

const { validateString, validateDate } = require('../utils/validators');
const { msToHours, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, toISODateString, eachDayBetween } = require('../utils/dateUtils');
const { StandardOvertimeStrategy } = require('./OvertimeStrategy');
const { ENTRY_STATUS } = require('../models/TimeEntry');

const DEFAULT_DAILY_HOURS = 8;
const DEFAULT_WEEKLY_HOURS = 40;

class ReportService {
  /**
   * @param {import('../storage/ITimeEntryRepository').ITimeEntryRepository} timeEntryRepo
   * @param {import('../storage/IEmployeeRepository').IEmployeeRepository} employeeRepo
   * @param {import('./OvertimeStrategy').IOvertimeStrategy} [overtimeStrategy]
   */
  constructor(timeEntryRepo, employeeRepo, overtimeStrategy) {
    this._timeRepo = timeEntryRepo;
    this._empRepo = employeeRepo;
    this._overtimeStrategy = overtimeStrategy || new StandardOvertimeStrategy();
  }

  /**
   * Switch overtime strategy at runtime (Strategy pattern).
   * @param {import('./OvertimeStrategy').IOvertimeStrategy} strategy
   */
  setOvertimeStrategy(strategy) {
    this._overtimeStrategy = strategy;
  }

  // ─── Daily Report ─────────────────────────────────────────────────────────

  /**
   * Summary for all employees on a given day.
   * @param {Date} date
   */
  getDailyReport(date) {
    validateDate(date, 'date');
    const from = startOfDay(date);
    const to = endOfDay(date);
    const entries = this._timeRepo.findByDateRange(from, to);

    const byEmployee = this._groupByEmployee(entries);
    const employees = this._empRepo.findAll();

    return {
      date: toISODateString(date),
      totalEntries: entries.length,
      employees: employees.map(emp => {
        const empEntries = byEmployee[emp.id] || [];
        const totalMs = this._sumClosedMs(empEntries);
        return {
          employeeId: emp.id,
          fullName: emp.fullName,
          department: emp.department,
          hoursWorked: msToHours(totalMs),
          entriesCount: empEntries.length,
          isClockedIn: empEntries.some(e => e.status === ENTRY_STATUS.OPEN),
        };
      }),
    };
  }

  // ─── Weekly Report ────────────────────────────────────────────────────────

  /**
   * @param {string} employeeId
   * @param {Date} weekDate  Any date within the target week
   * @param {number} [hourlyRate=0]
   */
  getWeeklyReport(employeeId, weekDate, hourlyRate = 0) {
    validateString(employeeId, 'employeeId');
    validateDate(weekDate, 'weekDate');

    const from = startOfWeek(weekDate);
    const to = endOfWeek(weekDate);
    const entries = this._timeRepo.findByEmployeeIdAndDateRange(employeeId, from, to);
    const emp = this._empRepo.findById(employeeId);

    const totalMs = this._sumClosedMs(entries);
    const totalHours = msToHours(totalMs);
    const overtime = this._overtimeStrategy.calculateOvertime(DEFAULT_WEEKLY_HOURS, totalHours, hourlyRate);

    return {
      employeeId,
      fullName: emp ? emp.fullName : null,
      weekStart: toISODateString(from),
      weekEnd: toISODateString(to),
      regularHours: DEFAULT_WEEKLY_HOURS,
      workedHours: totalHours,
      overtime,
      entriesCount: entries.length,
      entries: entries.map(e => e.toJSON()),
    };
  }

  // ─── Monthly Report ───────────────────────────────────────────────────────

  /**
   * @param {string} employeeId
   * @param {number} year
   * @param {number} month  1-based
   * @param {number} [hourlyRate=0]
   */
  getMonthlyReport(employeeId, year, month, hourlyRate = 0) {
    validateString(employeeId, 'employeeId');

    const from = startOfMonth(new Date(year, month - 1, 1));
    const to = endOfMonth(from);
    const entries = this._timeRepo.findByEmployeeIdAndDateRange(employeeId, from, to);
    const emp = this._empRepo.findById(employeeId);

    const totalMs = this._sumClosedMs(entries);
    const totalHours = msToHours(totalMs);
    const workingDays = eachDayBetween(from, to).filter(d => ![0, 6].includes(d.getDay())).length;
    const regularHours = workingDays * DEFAULT_DAILY_HOURS;
    const overtime = this._overtimeStrategy.calculateOvertime(regularHours, totalHours, hourlyRate);

    return {
      employeeId,
      fullName: emp ? emp.fullName : null,
      year,
      month,
      workingDays,
      regularHours,
      workedHours: totalHours,
      overtime,
      entriesCount: entries.length,
    };
  }

  // ─── Department Summary ───────────────────────────────────────────────────

  /**
   * Aggregate worked hours by department for a date range.
   * @param {Date} from
   * @param {Date} to
   */
  getDepartmentSummary(from, to) {
    validateDate(from, 'from');
    validateDate(to, 'to');

    const entries = this._timeRepo.findByDateRange(from, to);
    const employees = this._empRepo.findAll();
    const empMap = new Map(employees.map(e => [e.id, e]));

    const deptMap = {};
    for (const entry of entries) {
      if (entry.status !== ENTRY_STATUS.CLOSED && entry.status !== 'ADJUSTED') continue;
      const emp = empMap.get(entry.employeeId);
      if (!emp) continue;
      const dept = emp.department;
      if (!deptMap[dept]) deptMap[dept] = { department: dept, totalHours: 0, employeeCount: new Set(), entriesCount: 0 };
      deptMap[dept].totalHours += entry.getDurationHours() || 0;
      deptMap[dept].employeeCount.add(emp.id);
      deptMap[dept].entriesCount += 1;
    }

    return Object.values(deptMap).map(d => ({
      department: d.department,
      totalHours: Math.round(d.totalHours * 100) / 100,
      uniqueEmployees: d.employeeCount.size,
      entriesCount: d.entriesCount,
    }));
  }

  // ─── Attendance Analytics ─────────────────────────────────────────────────

  /**
   * Late arrivals — entries where clockIn is after the expected start time.
   * @param {Date} from
   * @param {Date} to
   * @param {number} [expectedHour=9]  Expected start hour (24h)
   */
  getLateArrivals(from, to, expectedHour = 9) {
    validateDate(from, 'from');
    validateDate(to, 'to');

    const entries = this._timeRepo.findByDateRange(from, to);
    return entries.filter(e => e.clockIn.getHours() >= expectedHour + 1);
  }

  /**
   * Employees who worked more than `threshold` hours in a day.
   * @param {Date} date
   * @param {number} [threshold=10]
   */
  getLongWorkdays(date, threshold = 10) {
    validateDate(date, 'date');

    const entries = this._timeRepo.findByDateRange(startOfDay(date), endOfDay(date));
    const byEmp = this._groupByEmployee(entries);

    return Object.entries(byEmp)
      .map(([empId, empEntries]) => ({
        employeeId: empId,
        hoursWorked: msToHours(this._sumClosedMs(empEntries)),
      }))
      .filter(r => r.hoursWorked > threshold);
  }

  /**
   * Top N employees by hours in a date range.
   * @param {Date} from
   * @param {Date} to
   * @param {number} [topN=5]
   */
  getTopWorkers(from, to, topN = 5) {
    validateDate(from, 'from');
    validateDate(to, 'to');

    const entries = this._timeRepo.findByDateRange(from, to);
    const byEmp = this._groupByEmployee(entries);
    const employees = this._empRepo.findAll();
    const empMap = new Map(employees.map(e => [e.id, e]));

    return Object.entries(byEmp)
      .map(([empId, empEntries]) => ({
        employeeId: empId,
        fullName: empMap.get(empId)?.fullName || empId,
        hoursWorked: msToHours(this._sumClosedMs(empEntries)),
      }))
      .sort((a, b) => b.hoursWorked - a.hoursWorked)
      .slice(0, topN);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  _groupByEmployee(entries) {
    return entries.reduce((acc, e) => {
      if (!acc[e.employeeId]) acc[e.employeeId] = [];
      acc[e.employeeId].push(e);
      return acc;
    }, {});
  }

  _sumClosedMs(entries) {
    return entries.reduce((sum, e) => {
      const ms = e.getDurationMs();
      return ms !== null ? sum + ms : sum;
    }, 0);
  }
}

module.exports = { ReportService };

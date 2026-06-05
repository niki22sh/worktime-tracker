/**
 * @module services/OvertimeStrategy
 * Strategy pattern (GoF) — interchangeable overtime-calculation algorithms.
 *
 * Each strategy exposes:
 *   calculateOvertime(regularHours, workedHours) → { overtimeHours, overtimePay }
 */

'use strict';

const { validateNonNegativeNumber } = require('../utils/validators');

// ─── Base Interface ────────────────────────────────────────────────────────────

class IOvertimeStrategy {
  /**
   * @param {number} regularHours  Contracted daily/weekly hours
   * @param {number} workedHours   Actual hours worked
   * @param {number} hourlyRate    Employee hourly rate (for pay calc)
   * @returns {{ overtimeHours: number, overtimePay: number }}
   */
  // eslint-disable-next-line no-unused-vars
  calculateOvertime(regularHours, workedHours, hourlyRate) {
    throw new Error('Not implemented');
  }
}

// ─── Strategy 1: Standard (1.5×) ──────────────────────────────────────────────

class StandardOvertimeStrategy extends IOvertimeStrategy {
  calculateOvertime(regularHours, workedHours, hourlyRate) {
    validateNonNegativeNumber(regularHours, 'regularHours');
    validateNonNegativeNumber(workedHours, 'workedHours');
    validateNonNegativeNumber(hourlyRate, 'hourlyRate');

    const overtimeHours = Math.max(0, workedHours - regularHours);
    const overtimePay = overtimeHours * hourlyRate * 1.5;
    return { overtimeHours: Math.round(overtimeHours * 100) / 100, overtimePay: Math.round(overtimePay * 100) / 100 };
  }
}

// ─── Strategy 2: Double-time (2×) ─────────────────────────────────────────────

class DoubleTimeOvertimeStrategy extends IOvertimeStrategy {
  calculateOvertime(regularHours, workedHours, hourlyRate) {
    validateNonNegativeNumber(regularHours, 'regularHours');
    validateNonNegativeNumber(workedHours, 'workedHours');
    validateNonNegativeNumber(hourlyRate, 'hourlyRate');

    const overtimeHours = Math.max(0, workedHours - regularHours);
    const overtimePay = overtimeHours * hourlyRate * 2;
    return { overtimeHours: Math.round(overtimeHours * 100) / 100, overtimePay: Math.round(overtimePay * 100) / 100 };
  }
}

// ─── Strategy 3: Tiered (first 2h → 1.5×, then 2×) ───────────────────────────

class TieredOvertimeStrategy extends IOvertimeStrategy {
  /**
   * @param {number} [tier1Limit=2]      Hours at tier-1 rate
   * @param {number} [tier1Multiplier=1.5]
   * @param {number} [tier2Multiplier=2]
   */
  constructor(tier1Limit = 2, tier1Multiplier = 1.5, tier2Multiplier = 2) {
    super();
    this.tier1Limit = tier1Limit;
    this.tier1Multiplier = tier1Multiplier;
    this.tier2Multiplier = tier2Multiplier;
  }

  calculateOvertime(regularHours, workedHours, hourlyRate) {
    validateNonNegativeNumber(regularHours, 'regularHours');
    validateNonNegativeNumber(workedHours, 'workedHours');
    validateNonNegativeNumber(hourlyRate, 'hourlyRate');

    const totalOvertime = Math.max(0, workedHours - regularHours);
    const tier1Hours = Math.min(totalOvertime, this.tier1Limit);
    const tier2Hours = Math.max(0, totalOvertime - this.tier1Limit);

    const overtimePay =
      tier1Hours * hourlyRate * this.tier1Multiplier +
      tier2Hours * hourlyRate * this.tier2Multiplier;

    return {
      overtimeHours: Math.round(totalOvertime * 100) / 100,
      overtimePay: Math.round(overtimePay * 100) / 100,
      tier1Hours: Math.round(tier1Hours * 100) / 100,
      tier2Hours: Math.round(tier2Hours * 100) / 100,
    };
  }
}

// ─── Strategy 4: No-overtime (compensatory time off) ─────────────────────────

class CompTimeOvertimeStrategy extends IOvertimeStrategy {
  calculateOvertime(regularHours, workedHours) {
    validateNonNegativeNumber(regularHours, 'regularHours');
    validateNonNegativeNumber(workedHours, 'workedHours');

    const overtimeHours = Math.max(0, workedHours - regularHours);
    return { overtimeHours: Math.round(overtimeHours * 100) / 100, overtimePay: 0, compTimeHours: Math.round(overtimeHours * 100) / 100 };
  }
}

module.exports = {
  IOvertimeStrategy,
  StandardOvertimeStrategy,
  DoubleTimeOvertimeStrategy,
  TieredOvertimeStrategy,
  CompTimeOvertimeStrategy,
};

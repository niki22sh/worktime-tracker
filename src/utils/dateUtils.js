/**
 * @module utils/dateUtils
 * Pure date helpers — no moment.js or other deps required.
 */

'use strict';

/**
 * Returns midnight (00:00:00.000) of the given date.
 * @param {Date} date
 * @returns {Date}
 */
function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns 23:59:59.999 of the given date.
 * @param {Date} date
 * @returns {Date}
 */
function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Returns the first millisecond of the ISO week containing `date` (Monday).
 * @param {Date} date
 * @returns {Date}
 */
function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns the last millisecond of the ISO week (Sunday).
 * @param {Date} date
 * @returns {Date}
 */
function endOfWeek(date) {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Returns the first millisecond of the month.
 * @param {Date} date
 * @returns {Date}
 */
function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

/**
 * Returns the last millisecond of the month.
 * @param {Date} date
 * @returns {Date}
 */
function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

/**
 * Checks whether two date ranges overlap.
 * @param {Date} startA
 * @param {Date} endA
 * @param {Date} startB
 * @param {Date} endB
 * @returns {boolean}
 */
function rangesOverlap(startA, endA, startB, endB) {
  return startA <= endB && endA >= startB;
}

/**
 * Returns `true` if `date` is between `start` and `end` (inclusive).
 * @param {Date} date
 * @param {Date} start
 * @param {Date} end
 * @returns {boolean}
 */
function isBetween(date, start, end) {
  return date >= start && date <= end;
}

/**
 * Formats a Date to 'YYYY-MM-DD'.
 * @param {Date} date
 * @returns {string}
 */
function toISODateString(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Converts milliseconds to hours (decimal, 2 dp).
 * @param {number} ms
 * @returns {number}
 */
function msToHours(ms) {
  return Math.round((ms / (1000 * 60 * 60)) * 100) / 100;
}

/**
 * Returns the list of dates (midnight) between start and end (inclusive).
 * @param {Date} start
 * @param {Date} end
 * @returns {Date[]}
 */
function eachDayBetween(start, end) {
  const days = [];
  const cursor = startOfDay(start);
  const finish = startOfDay(end);
  while (cursor <= finish) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

module.exports = {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  rangesOverlap,
  isBetween,
  toISODateString,
  msToHours,
  eachDayBetween,
};

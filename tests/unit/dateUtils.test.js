'use strict';

const {
  startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  rangesOverlap, isBetween,
  toISODateString, msToHours,
  eachDayBetween,
} = require('../../src/utils/dateUtils');

describe('dateUtils', () => {
  const D = (str) => new Date(str);

  describe('startOfDay', () => {
    it('sets time to midnight', () => {
      const d = startOfDay(D('2024-03-15T14:30:00'));
      expect(d.getHours()).toBe(0);
      expect(d.getMinutes()).toBe(0);
      expect(d.getSeconds()).toBe(0);
      expect(d.getMilliseconds()).toBe(0);
    });
    it('does not mutate the input', () => {
      const input = D('2024-03-15T14:30:00');
      startOfDay(input);
      expect(input.getHours()).toBe(14);
    });
  });

  describe('endOfDay', () => {
    it('sets time to 23:59:59.999', () => {
      const d = endOfDay(D('2024-03-15'));
      expect(d.getHours()).toBe(23);
      expect(d.getMinutes()).toBe(59);
      expect(d.getSeconds()).toBe(59);
      expect(d.getMilliseconds()).toBe(999);
    });
  });

  describe('startOfWeek', () => {
    it('returns Monday for a Wednesday', () => {
      // 2024-03-13 is Wednesday
      const monday = startOfWeek(D('2024-03-13'));
      expect(monday.getDay()).toBe(1); // Monday
    });
    it('returns same day if already Monday', () => {
      const monday = startOfWeek(D('2024-03-11'));
      expect(monday.getDay()).toBe(1);
    });
    it('handles Sunday correctly (goes to previous Monday)', () => {
      const monday = startOfWeek(D('2024-03-17')); // Sunday
      expect(monday.getDay()).toBe(1);
    });
  });

  describe('endOfWeek', () => {
    it('returns Sunday', () => {
      const sunday = endOfWeek(D('2024-03-13'));
      expect(sunday.getDay()).toBe(0);
    });
  });

  describe('startOfMonth', () => {
    it('returns first day of month at midnight', () => {
      const d = startOfMonth(D('2024-03-15'));
      expect(d.getDate()).toBe(1);
      expect(d.getHours()).toBe(0);
    });
  });

  describe('endOfMonth', () => {
    it('returns last day of month', () => {
      const d = endOfMonth(D('2024-02-15'));
      expect(d.getDate()).toBe(29); // 2024 is leap year
      expect(d.getHours()).toBe(23);
    });
    it('handles 31-day months', () => {
      const d = endOfMonth(D('2024-01-01'));
      expect(d.getDate()).toBe(31);
    });
    it('handles 30-day months', () => {
      const d = endOfMonth(D('2024-04-01'));
      expect(d.getDate()).toBe(30);
    });
  });

  describe('rangesOverlap', () => {
    it('returns true for fully overlapping ranges', () => {
      expect(rangesOverlap(D('2024-01-01'), D('2024-01-10'), D('2024-01-05'), D('2024-01-15'))).toBe(true);
    });
    it('returns true for contained ranges', () => {
      expect(rangesOverlap(D('2024-01-01'), D('2024-01-31'), D('2024-01-10'), D('2024-01-20'))).toBe(true);
    });
    it('returns true when ranges touch at one point', () => {
      expect(rangesOverlap(D('2024-01-01'), D('2024-01-10'), D('2024-01-10'), D('2024-01-20'))).toBe(true);
    });
    it('returns false for non-overlapping ranges', () => {
      expect(rangesOverlap(D('2024-01-01'), D('2024-01-10'), D('2024-01-11'), D('2024-01-20'))).toBe(false);
    });
    it('returns false when B is before A', () => {
      expect(rangesOverlap(D('2024-01-10'), D('2024-01-20'), D('2024-01-01'), D('2024-01-09'))).toBe(false);
    });
  });

  describe('isBetween', () => {
    it('returns true for date within range', () => {
      expect(isBetween(D('2024-01-15'), D('2024-01-01'), D('2024-01-31'))).toBe(true);
    });
    it('returns true for date on boundary', () => {
      expect(isBetween(D('2024-01-01'), D('2024-01-01'), D('2024-01-31'))).toBe(true);
    });
    it('returns false for date outside range', () => {
      expect(isBetween(D('2024-02-01'), D('2024-01-01'), D('2024-01-31'))).toBe(false);
    });
  });

  describe('toISODateString', () => {
    it('formats to YYYY-MM-DD', () => {
      const result = toISODateString(new Date('2024-03-15T00:00:00.000Z'));
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('msToHours', () => {
    it('converts 3600000ms to 1 hour', () => {
      expect(msToHours(3600000)).toBe(1);
    });
    it('converts 5400000ms to 1.5 hours', () => {
      expect(msToHours(5400000)).toBe(1.5);
    });
    it('converts 0ms to 0 hours', () => {
      expect(msToHours(0)).toBe(0);
    });
  });

  describe('eachDayBetween', () => {
    it('returns 1 day for same start/end', () => {
      const days = eachDayBetween(D('2024-01-15'), D('2024-01-15'));
      expect(days).toHaveLength(1);
    });
    it('returns 7 days for a week', () => {
      const days = eachDayBetween(D('2024-01-01'), D('2024-01-07'));
      expect(days).toHaveLength(7);
    });
    it('each element is at midnight', () => {
      const days = eachDayBetween(D('2024-01-01'), D('2024-01-03'));
      days.forEach(d => expect(d.getHours()).toBe(0));
    });
  });
});

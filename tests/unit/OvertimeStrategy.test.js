'use strict';

const {
  StandardOvertimeStrategy,
  DoubleTimeOvertimeStrategy,
  TieredOvertimeStrategy,
  CompTimeOvertimeStrategy,
  IOvertimeStrategy,
} = require('../../src/services/OvertimeStrategy');

describe('OvertimeStrategy', () => {
  const rate = 100; // $100/hr for easy math

  describe('IOvertimeStrategy (base)', () => {
    it('throws Not Implemented', () => {
      const base = new IOvertimeStrategy();
      expect(() => base.calculateOvertime(8, 10, rate)).toThrow('Not implemented');
    });
  });

  describe('StandardOvertimeStrategy (1.5×)', () => {
    const strategy = new StandardOvertimeStrategy();

    it('returns 0 overtime when within regular hours', () => {
      const result = strategy.calculateOvertime(8, 8, rate);
      expect(result.overtimeHours).toBe(0);
      expect(result.overtimePay).toBe(0);
    });

    it('calculates 2h overtime at 1.5×', () => {
      const result = strategy.calculateOvertime(8, 10, rate);
      expect(result.overtimeHours).toBe(2);
      expect(result.overtimePay).toBe(300); // 2 * 100 * 1.5
    });

    it('works with partial hours', () => {
      const result = strategy.calculateOvertime(8, 8.5, rate);
      expect(result.overtimeHours).toBe(0.5);
      expect(result.overtimePay).toBe(75); // 0.5 * 100 * 1.5
    });

    it('returns 0 overtime when worked less than regular', () => {
      const result = strategy.calculateOvertime(8, 6, rate);
      expect(result.overtimeHours).toBe(0);
    });

    it('throws for negative hours', () => {
      expect(() => strategy.calculateOvertime(-1, 8, rate)).toThrow(TypeError);
    });

    it('throws for invalid hourlyRate', () => {
      expect(() => strategy.calculateOvertime(8, 10, -1)).toThrow(TypeError);
    });

    it('works with zero hourly rate', () => {
      const result = strategy.calculateOvertime(8, 10, 0);
      expect(result.overtimeHours).toBe(2);
      expect(result.overtimePay).toBe(0);
    });
  });

  describe('DoubleTimeOvertimeStrategy (2×)', () => {
    const strategy = new DoubleTimeOvertimeStrategy();

    it('calculates 2h overtime at 2×', () => {
      const result = strategy.calculateOvertime(8, 10, rate);
      expect(result.overtimeHours).toBe(2);
      expect(result.overtimePay).toBe(400); // 2 * 100 * 2
    });

    it('returns 0 overtime within hours', () => {
      const result = strategy.calculateOvertime(8, 8, rate);
      expect(result.overtimeHours).toBe(0);
    });
  });

  describe('TieredOvertimeStrategy', () => {
    const strategy = new TieredOvertimeStrategy(2, 1.5, 2);

    it('calculates tier-1 only when overtime <= 2h', () => {
      const result = strategy.calculateOvertime(8, 9, rate); // 1h OT
      expect(result.overtimeHours).toBe(1);
      expect(result.tier1Hours).toBe(1);
      expect(result.tier2Hours).toBe(0);
      expect(result.overtimePay).toBe(150); // 1 * 100 * 1.5
    });

    it('calculates both tiers when overtime > 2h', () => {
      const result = strategy.calculateOvertime(8, 12, rate); // 4h OT
      expect(result.tier1Hours).toBe(2);
      expect(result.tier2Hours).toBe(2);
      expect(result.overtimePay).toBe(700); // 2*100*1.5 + 2*100*2
    });

    it('exactly at tier boundary', () => {
      const result = strategy.calculateOvertime(8, 10, rate); // 2h OT
      expect(result.tier1Hours).toBe(2);
      expect(result.tier2Hours).toBe(0);
      expect(result.overtimePay).toBe(300); // 2*100*1.5
    });

    it('uses custom tier limit', () => {
      const custom = new TieredOvertimeStrategy(3, 1.5, 2);
      const result = custom.calculateOvertime(8, 12, rate); // 4h OT
      expect(result.tier1Hours).toBe(3);
      expect(result.tier2Hours).toBe(1);
    });
  });

  describe('CompTimeOvertimeStrategy', () => {
    const strategy = new CompTimeOvertimeStrategy();

    it('returns 0 pay with comp time hours', () => {
      const result = strategy.calculateOvertime(8, 10, rate);
      expect(result.overtimePay).toBe(0);
      expect(result.compTimeHours).toBe(2);
    });

    it('returns 0 everything within hours', () => {
      const result = strategy.calculateOvertime(8, 8, rate);
      expect(result.overtimeHours).toBe(0);
      expect(result.overtimePay).toBe(0);
    });
  });
});

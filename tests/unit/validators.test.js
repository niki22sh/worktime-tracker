'use strict';

const {
  validateString,
  validateEmail,
  validateDate,
  validateEnum,
  validatePositiveNumber,
  validateNonNegativeNumber,
} = require('../../src/utils/validators');

describe('validators', () => {
  // ─── validateString ────────────────────────────────────────────────────────
  describe('validateString', () => {
    it('accepts a non-empty string', () => {
      expect(() => validateString('hello', 'field')).not.toThrow();
    });
    it('throws for empty string', () => {
      expect(() => validateString('', 'field')).toThrow(TypeError);
    });
    it('throws for whitespace-only string', () => {
      expect(() => validateString('   ', 'field')).toThrow(TypeError);
    });
    it('throws for number', () => {
      expect(() => validateString(42, 'field')).toThrow(TypeError);
    });
    it('throws for null', () => {
      expect(() => validateString(null, 'field')).toThrow(TypeError);
    });
    it('throws for undefined', () => {
      expect(() => validateString(undefined, 'field')).toThrow(TypeError);
    });
    it('includes field name in error message', () => {
      expect(() => validateString('', 'myField')).toThrow('myField');
    });
  });

  // ─── validateEmail ─────────────────────────────────────────────────────────
  describe('validateEmail', () => {
    it('accepts valid email', () => {
      expect(() => validateEmail('user@example.com')).not.toThrow();
    });
    it('accepts email with subdomain', () => {
      expect(() => validateEmail('a@b.co.uk')).not.toThrow();
    });
    it('throws for missing @', () => {
      expect(() => validateEmail('notanemail')).toThrow(TypeError);
    });
    it('throws for missing domain', () => {
      expect(() => validateEmail('user@')).toThrow(TypeError);
    });
    it('throws for number', () => {
      expect(() => validateEmail(123)).toThrow(TypeError);
    });
    it('throws for empty string', () => {
      expect(() => validateEmail('')).toThrow(TypeError);
    });
  });

  // ─── validateDate ──────────────────────────────────────────────────────────
  describe('validateDate', () => {
    it('accepts a valid Date', () => {
      expect(() => validateDate(new Date(), 'date')).not.toThrow();
    });
    it('throws for invalid Date', () => {
      expect(() => validateDate(new Date('invalid'), 'date')).toThrow(TypeError);
    });
    it('throws for string', () => {
      expect(() => validateDate('2024-01-01', 'date')).toThrow(TypeError);
    });
    it('throws for null', () => {
      expect(() => validateDate(null, 'date')).toThrow(TypeError);
    });
    it('throws for number', () => {
      expect(() => validateDate(Date.now(), 'date')).toThrow(TypeError);
    });
  });

  // ─── validateEnum ──────────────────────────────────────────────────────────
  describe('validateEnum', () => {
    const allowed = ['A', 'B', 'C'];
    it('accepts allowed value', () => {
      expect(() => validateEnum('A', allowed, 'field')).not.toThrow();
    });
    it('throws for not-allowed value', () => {
      expect(() => validateEnum('D', allowed, 'field')).toThrow(TypeError);
    });
    it('throws for null', () => {
      expect(() => validateEnum(null, allowed, 'field')).toThrow(TypeError);
    });
    it('includes field name in message', () => {
      expect(() => validateEnum('X', allowed, 'myEnum')).toThrow('myEnum');
    });
  });

  // ─── validatePositiveNumber ────────────────────────────────────────────────
  describe('validatePositiveNumber', () => {
    it('accepts positive integer', () => {
      expect(() => validatePositiveNumber(5, 'n')).not.toThrow();
    });
    it('accepts positive float', () => {
      expect(() => validatePositiveNumber(0.1, 'n')).not.toThrow();
    });
    it('throws for zero', () => {
      expect(() => validatePositiveNumber(0, 'n')).toThrow(TypeError);
    });
    it('throws for negative', () => {
      expect(() => validatePositiveNumber(-1, 'n')).toThrow(TypeError);
    });
    it('throws for NaN', () => {
      expect(() => validatePositiveNumber(NaN, 'n')).toThrow(TypeError);
    });
    it('throws for string', () => {
      expect(() => validatePositiveNumber('5', 'n')).toThrow(TypeError);
    });
  });

  // ─── validateNonNegativeNumber ─────────────────────────────────────────────
  describe('validateNonNegativeNumber', () => {
    it('accepts zero', () => {
      expect(() => validateNonNegativeNumber(0, 'n')).not.toThrow();
    });
    it('accepts positive', () => {
      expect(() => validateNonNegativeNumber(10, 'n')).not.toThrow();
    });
    it('throws for negative', () => {
      expect(() => validateNonNegativeNumber(-0.1, 'n')).toThrow(TypeError);
    });
    it('throws for NaN', () => {
      expect(() => validateNonNegativeNumber(NaN, 'n')).toThrow(TypeError);
    });
  });
});

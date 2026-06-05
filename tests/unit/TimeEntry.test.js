'use strict';

const { TimeEntry, ENTRY_TYPE, ENTRY_STATUS } = require('../../src/models/TimeEntry');

const clockIn = new Date('2024-03-15T09:00:00');
const clockOut = new Date('2024-03-15T17:00:00');

const validParams = () => ({
  id: 'entry_001',
  employeeId: 'emp_001',
  clockIn: new Date(clockIn),
});

describe('TimeEntry model', () => {
  describe('constructor', () => {
    it('creates entry with valid params', () => {
      const e = new TimeEntry(validParams());
      expect(e.id).toBe('entry_001');
      expect(e.status).toBe(ENTRY_STATUS.OPEN);
      expect(e.type).toBe(ENTRY_TYPE.WORK);
      expect(e.clockOut).toBeNull();
    });
    it('accepts clockOut in constructor', () => {
      const e = new TimeEntry({ ...validParams(), clockOut: new Date(clockOut) });
      expect(e.clockOut).not.toBeNull();
    });
    it('throws for missing id', () => {
      expect(() => new TimeEntry({ ...validParams(), id: '' })).toThrow(TypeError);
    });
    it('throws for missing employeeId', () => {
      expect(() => new TimeEntry({ ...validParams(), employeeId: '' })).toThrow(TypeError);
    });
    it('throws for invalid clockIn', () => {
      expect(() => new TimeEntry({ ...validParams(), clockIn: 'not-a-date' })).toThrow(TypeError);
    });
    it('throws for invalid clockOut', () => {
      expect(() => new TimeEntry({ ...validParams(), clockOut: 'bad' })).toThrow(TypeError);
    });
  });

  describe('getDurationMs', () => {
    it('returns null for open entry', () => {
      const e = new TimeEntry(validParams());
      expect(e.getDurationMs()).toBeNull();
    });
    it('returns correct ms for 8-hour shift', () => {
      const e = new TimeEntry({ ...validParams(), clockOut: new Date(clockOut) });
      expect(e.getDurationMs()).toBe(8 * 3600 * 1000);
    });
  });

  describe('getDurationHours', () => {
    it('returns null for open entry', () => {
      const e = new TimeEntry(validParams());
      expect(e.getDurationHours()).toBeNull();
    });
    it('returns 8 for 8-hour shift', () => {
      const e = new TimeEntry({ ...validParams(), clockOut: new Date(clockOut) });
      expect(e.getDurationHours()).toBe(8);
    });
  });

  describe('close', () => {
    it('closes the entry', () => {
      const e = new TimeEntry(validParams());
      e.close(new Date(clockOut));
      expect(e.isClosed()).toBe(true);
      expect(e.status).toBe(ENTRY_STATUS.CLOSED);
    });
    it('throws if clockOut before clockIn', () => {
      const e = new TimeEntry(validParams());
      expect(() => e.close(new Date('2024-03-14T08:00:00'))).toThrow();
    });
    it('throws for invalid date', () => {
      const e = new TimeEntry(validParams());
      expect(() => e.close('not-a-date')).toThrow(TypeError);
    });
  });

  describe('adjust', () => {
    it('adjusts the entry', () => {
      const e = new TimeEntry({ ...validParams(), clockOut: new Date(clockOut) });
      const newIn = new Date('2024-03-15T08:00:00');
      const newOut = new Date('2024-03-15T16:00:00');
      e.adjust(newIn, newOut);
      expect(e.status).toBe(ENTRY_STATUS.ADJUSTED);
      expect(e.clockIn).toEqual(newIn);
    });
    it('throws if adjusted clockOut before clockIn', () => {
      const e = new TimeEntry(validParams());
      expect(() => e.adjust(new Date(clockOut), new Date(clockIn))).toThrow();
    });
  });

  describe('isOpen / isClosed', () => {
    it('new entry is open', () => {
      const e = new TimeEntry(validParams());
      expect(e.isOpen()).toBe(true);
      expect(e.isClosed()).toBe(false);
    });
    it('closed entry is not open', () => {
      const e = new TimeEntry(validParams());
      e.close(new Date(clockOut));
      expect(e.isOpen()).toBe(false);
      expect(e.isClosed()).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('includes durationHours field', () => {
      const e = new TimeEntry({ ...validParams(), clockOut: new Date(clockOut) });
      const json = e.toJSON();
      expect(json).toHaveProperty('durationHours', 8);
    });
  });
});

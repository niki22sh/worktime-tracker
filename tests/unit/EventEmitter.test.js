'use strict';

const { EventEmitter } = require('../../src/utils/EventEmitter');

describe('EventEmitter', () => {
  let emitter;
  beforeEach(() => { emitter = new EventEmitter(); });

  it('emits event to registered listener', () => {
    const handler = jest.fn();
    emitter.on('test', handler);
    emitter.emit('test', { data: 1 });
    expect(handler).toHaveBeenCalledWith({ data: 1 });
  });

  it('emits to multiple listeners', () => {
    const h1 = jest.fn();
    const h2 = jest.fn();
    emitter.on('evt', h1).on('evt', h2);
    emitter.emit('evt', 42);
    expect(h1).toHaveBeenCalledWith(42);
    expect(h2).toHaveBeenCalledWith(42);
  });

  it('does not fire after off', () => {
    const h = jest.fn();
    emitter.on('x', h);
    emitter.off('x', h);
    emitter.emit('x');
    expect(h).not.toHaveBeenCalled();
  });

  it('off is a no-op for unknown event', () => {
    expect(() => emitter.off('unknown', jest.fn())).not.toThrow();
  });

  it('emit is a no-op for unknown event', () => {
    expect(() => emitter.emit('no-listeners')).not.toThrow();
  });

  it('removeAllListeners removes specific event', () => {
    const h = jest.fn();
    emitter.on('a', h);
    emitter.removeAllListeners('a');
    emitter.emit('a');
    expect(h).not.toHaveBeenCalled();
  });

  it('removeAllListeners without arg clears all', () => {
    const h1 = jest.fn();
    const h2 = jest.fn();
    emitter.on('a', h1).on('b', h2);
    emitter.removeAllListeners();
    emitter.emit('a');
    emitter.emit('b');
    expect(h1).not.toHaveBeenCalled();
    expect(h2).not.toHaveBeenCalled();
  });

  it('listenerCount returns correct count', () => {
    emitter.on('a', jest.fn()).on('a', jest.fn());
    expect(emitter.listenerCount('a')).toBe(2);
    expect(emitter.listenerCount('b')).toBe(0);
  });

  it('on returns emitter for chaining', () => {
    expect(emitter.on('x', jest.fn())).toBe(emitter);
  });
});

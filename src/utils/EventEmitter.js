/**
 * @module utils/EventEmitter
 * Lightweight Observer / EventEmitter — no Node.js core required.
 * Pattern: Observer (GoF)
 */

'use strict';

class EventEmitter {
  constructor() {
    /** @type {Map<string, Function[]>} */
    this._listeners = new Map();
  }

  /**
   * Subscribe to an event.
   * @param {string} event
   * @param {Function} listener
   */
  on(event, listener) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(listener);
    return this;
  }

  /**
   * Unsubscribe.
   * @param {string} event
   * @param {Function} listener
   */
  off(event, listener) {
    if (!this._listeners.has(event)) return this;
    const updated = this._listeners.get(event).filter(l => l !== listener);
    this._listeners.set(event, updated);
    return this;
  }

  /**
   * Emit an event with payload.
   * @param {string} event
   * @param {*} payload
   */
  emit(event, payload) {
    const listeners = this._listeners.get(event) || [];
    listeners.forEach(l => l(payload));
    return this;
  }

  /**
   * Remove all listeners for an event.
   * @param {string} [event]
   */
  removeAllListeners(event) {
    if (event) {
      this._listeners.delete(event);
    } else {
      this._listeners.clear();
    }
    return this;
  }

  listenerCount(event) {
    return (this._listeners.get(event) || []).length;
  }
}

module.exports = { EventEmitter };

/**
 * @module utils/idGenerator
 * Simple deterministic ID generation without external deps.
 */

'use strict';

let counter = 0;

function generateId(prefix = 'id') {
  counter += 1;
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1e6).toString(36);
  return `${prefix}_${timestamp}_${counter}_${random}`;
}

function resetCounter() {
  counter = 0;
}

module.exports = { generateId, resetCounter };

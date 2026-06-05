/**
 * @module utils/idGenerator
 * Simple deterministic ID generation without external deps.
 */

'use strict';

const { randomBytes } = require('crypto');

let counter = 0;

function generateId(prefix = 'id') {
  counter += 1;
  const timestamp = Date.now();
  const random = randomBytes(3).toString('hex');
  return `${prefix}_${timestamp}_${counter}_${random}`;
}

function resetCounter() {
  counter = 0;
}

module.exports = { generateId, resetCounter };

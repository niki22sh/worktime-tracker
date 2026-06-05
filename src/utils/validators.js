/**
 * @module utils/validators
 * Pure validation helpers — no side-effects, easy to unit-test.
 */

'use strict';

function validateString(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${fieldName} must be a non-empty string`);
  }
}

function validateEmail(email) {
  if (typeof email !== 'string') {
    throw new TypeError('email must be a string');
  }
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email.trim())) {
    throw new TypeError(`Invalid email format: ${email}`);
  }
}

function validateDate(value, fieldName) {
  if (!(value instanceof Date) || isNaN(value.getTime())) {
    throw new TypeError(`${fieldName} must be a valid Date`);
  }
}

function validateEnum(value, allowed, fieldName) {
  if (!allowed.includes(value)) {
    throw new TypeError(`${fieldName} must be one of: ${allowed.join(', ')}`);
  }
}

function validatePositiveNumber(value, fieldName) {
  if (typeof value !== 'number' || isNaN(value) || value <= 0) {
    throw new TypeError(`${fieldName} must be a positive number`);
  }
}

function validateNonNegativeNumber(value, fieldName) {
  if (typeof value !== 'number' || isNaN(value) || value < 0) {
    throw new TypeError(`${fieldName} must be a non-negative number`);
  }
}

module.exports = {
  validateString,
  validateEmail,
  validateDate,
  validateEnum,
  validatePositiveNumber,
  validateNonNegativeNumber,
};

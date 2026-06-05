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
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf('@');
  if (atIndex < 1) {
    throw new TypeError(`Invalid email format: ${email}`);
  }
  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);
  if (local.length === 0 || domain.length < 3 || !domain.includes('.')) {
    throw new TypeError(`Invalid email format: ${email}`);
  }
}

function validateDate(value, fieldName) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new TypeError(`${fieldName} must be a valid Date`);
  }
}

function validateEnum(value, allowed, fieldName) {
  if (!allowed.includes(value)) {
    throw new TypeError(`${fieldName} must be one of: ${allowed.join(', ')}`);
  }
}

function validatePositiveNumber(value, fieldName) {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
    throw new TypeError(`${fieldName} must be a positive number`);
  }
}

function validateNonNegativeNumber(value, fieldName) {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
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

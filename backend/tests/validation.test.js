// Backend Unit Tests: Validation & Sanitization
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateItemInput,
  validateStatusTransition,
  validateReportInput,
  sanitizeText,
} from '../src/validation.js';

test('sanitizeText strips dangerous HTML characters and trims whitespace', () => {
  assert.equal(sanitizeText('  <script>alert(1)</script>Hello  '), 'alert(1)Hello');
  assert.equal(sanitizeText('Normal Text'), 'Normal Text');
  assert.equal(sanitizeText(null), '');
});

test('validateItemInput rejects invalid or missing fields on creation', () => {
  const emptyResult = validateItemInput({});
  assert.equal(emptyResult.isValid, false);
  assert.ok(emptyResult.errors.length >= 5);

  const invalidTypeResult = validateItemInput({
    type: 'borrowed', // Invalid! Must be lost or found
    name: 'Keys',
    category: 'keys',
    description: 'Found keys in library',
    location: 'Main Library 2nd floor',
    eventDate: '2026-10-20',
    contactName: 'Alice',
    contactMethod: 'alice@campus.edu',
  });
  assert.equal(invalidTypeResult.isValid, false);
  assert.ok(invalidTypeResult.errors.some((e) => e.includes("Field 'type' must be either 'lost' or 'found'")));
});

test('validateItemInput accepts valid payload and sanitizes fields', () => {
  const validPayload = {
    type: 'lost',
    name: '  Blue Dell Laptop Bag  ',
    category: 'bags',
    description: 'Lost near the cafeteria around noon. Contains notebook and charger.',
    location: 'Cafeteria Building B',
    eventDate: '2026-10-21',
    contactName: 'Bob Student',
    contactMethod: '555-0192 / bob@campus.edu',
    imageKey: 'uploads/test-image.jpg',
  };

  const result = validateItemInput(validPayload);
  assert.equal(result.isValid, true);
  assert.equal(result.sanitized.name, 'Blue Dell Laptop Bag');
  assert.equal(result.sanitized.type, 'lost');
  assert.equal(result.sanitized.category, 'bags');
  assert.equal(result.sanitized.imageKey, 'uploads/test-image.jpg');
});

test('validateStatusTransition enforces allowed state changes for owner and admin', () => {
  // Active -> Returned (Allowed for owner)
  assert.equal(validateStatusTransition('active', 'returned', false).isAllowed, true);

  // Active -> Archived (Allowed for owner)
  assert.equal(validateStatusTransition('active', 'archived', false).isAllowed, true);

  // Under review -> Returned (Blocked for regular owner)
  assert.equal(validateStatusTransition('under_review', 'returned', false).isAllowed, false);

  // Under review -> Active (Allowed for Admin)
  assert.equal(validateStatusTransition('under_review', 'active', true).isAllowed, true);

  // Archived -> Active (Blocked for regular owner)
  assert.equal(validateStatusTransition('archived', 'active', false).isAllowed, false);
});

test('validateReportInput validates abuse reports correctly', () => {
  const invalidResult = validateReportInput({ reason: 'not_a_valid_reason' });
  assert.equal(invalidResult.isValid, false);

  const validResult = validateReportInput({
    reason: 'spam',
    details: 'This is an advertisement not a lost item',
  });
  assert.equal(validResult.isValid, true);
  assert.equal(validResult.sanitized.reason, 'spam');
});

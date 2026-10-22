// Backend Unit Tests: Management & Status Transitions
import test from 'node:test';
import assert from 'node:assert/strict';
import { MockDynamoDbClient } from './mock-db.js';
import { setDocClientForTesting } from '../src/db.js';
import { createItemHandler } from '../src/handlers/items.js';
import {
  verifyTokenHandler,
  updateStatusHandler,
  deleteItemHandler,
} from '../src/handlers/management.js';

test('verifyTokenHandler verifies valid token and rejects invalid token', async () => {
  const mockDb = new MockDynamoDbClient();
  setDocClientForTesting(mockDb);

  const createRes = await createItemHandler(
    {
      type: 'found',
      name: 'Wireless Mouse Logitech',
      category: 'electronics',
      description: 'Found in library basement',
      location: 'Main Library',
      eventDate: '2026-10-21',
      contactName: 'Staff',
      contactMethod: 'library@campus.edu',
    },
    '127.0.0.1',
    mockDb
  );

  const itemId = createRes.body.item.itemId;
  const token = createRes.body.management.token;

  // 1. Valid token
  const validCheck = await verifyTokenHandler(itemId, token, mockDb);
  assert.equal(validCheck.statusCode, 200);
  assert.equal(validCheck.body.valid, true);

  // 2. Invalid token
  const fakeToken = '0000000000000000000000000000000000000000000000000000000000000000';
  const invalidCheck = await verifyTokenHandler(itemId, fakeToken, mockDb);
  assert.equal(invalidCheck.statusCode, 403);
  assert.equal(invalidCheck.body.valid, false);
});

test('updateStatusHandler marks item returned with valid token and rejects unauthorized updates', async () => {
  const mockDb = new MockDynamoDbClient();
  setDocClientForTesting(mockDb);

  const createRes = await createItemHandler(
    {
      type: 'lost',
      name: 'Keys with Blue Lanyard',
      category: 'keys',
      description: 'Dorm room and bike keys',
      location: 'Dorm Quad',
      eventDate: '2026-10-22',
      contactName: 'Alex',
      contactMethod: 'alex@campus.edu',
    },
    '127.0.0.1',
    mockDb
  );

  const itemId = createRes.body.item.itemId;
  const token = createRes.body.management.token;

  // 1. Unauthorized attempt (no token)
  const noTokenRes = await updateStatusHandler(itemId, { status: 'returned' }, {}, mockDb);
  assert.equal(noTokenRes.statusCode, 401);

  // 2. Authorized status update to 'returned'
  const updateRes = await updateStatusHandler(
    itemId,
    { status: 'returned' },
    { 'x-management-token': token },
    mockDb
  );

  assert.equal(updateRes.statusCode, 200);
  assert.equal(updateRes.body.success, true);
  assert.equal(updateRes.body.status, 'returned');
});

test('deleteItemHandler deletes item and ownership record with valid token', async () => {
  const mockDb = new MockDynamoDbClient();
  setDocClientForTesting(mockDb);

  const createRes = await createItemHandler(
    {
      type: 'found',
      name: 'Water Bottle',
      category: 'other',
      description: 'Stainless steel bottle',
      location: 'Gym',
      eventDate: '2026-10-21',
      contactName: 'Sam',
      contactMethod: 'sam@campus.edu',
    },
    '127.0.0.1',
    mockDb
  );

  const itemId = createRes.body.item.itemId;
  const token = createRes.body.management.token;

  const deleteRes = await deleteItemHandler(
    itemId,
    { 'x-management-token': token },
    mockDb
  );

  assert.equal(deleteRes.statusCode, 200);
  assert.equal(deleteRes.body.success, true);

  // Confirm item is removed from database
  const itemInDb = mockDb.tables['CampusFind-Items'].get(itemId);
  assert.equal(itemInDb, undefined);
});

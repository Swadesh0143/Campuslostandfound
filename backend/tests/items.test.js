// Backend Unit Tests: Items Handlers (Create, Get, List)
import test from 'node:test';
import assert from 'node:assert/strict';
import { MockPostgresClient } from './mock-db.js';
import { createItemHandler, getItemHandler, listItemsHandler } from '../src/handlers/items.js';

test('createItemHandler creates item, securely generates ownership token, and hides contact method', async () => {
  const mockDb = new MockPostgresClient();

  const payload = {
    type: 'found',
    name: 'Scientific Calculator Casio fx-991EX',
    category: 'electronics',
    description: 'Found under desk in Engineering Hall room 302.',
    location: 'Engineering Hall Room 302',
    eventDate: '2026-10-22',
    contactName: 'Charlie Tutor',
    contactMethod: 'charlie@campus.edu / 555-4321',
  };

  const response = await createItemHandler(payload, '192.168.1.50', mockDb);

  assert.equal(response.statusCode, 201);
  assert.equal(response.body.success, true);
  assert.ok(response.body.item.itemId);
  assert.equal(response.body.item.name, 'Scientific Calculator Casio fx-991EX');
  assert.equal(response.body.item.status, 'active');

  // Verify contactMethod is stripped from the public response
  assert.equal(response.body.item.contactMethod, undefined);
  assert.equal(response.body.item.hasContactMethod, true);

  // Verify management token is returned
  assert.ok(response.body.management);
  assert.ok(response.body.management.token);
  assert.equal(response.body.management.token.length, 64);
  assert.ok(response.body.management.manageUrl.includes(response.body.item.itemId));

  // Verify ownership record stores the token hash rather than the raw token.
  const storedOwnership = mockDb.ownership.get(response.body.item.itemId);
  assert.ok(storedOwnership);
  assert.ok(storedOwnership.token_hash);
  assert.notEqual(storedOwnership.token_hash, response.body.management.token);
  assert.ok(storedOwnership.salt);
});

test('getItemHandler retrieves item, increments view count, and masks contact details', async () => {
  const mockDb = new MockPostgresClient();

  const createRes = await createItemHandler(
    {
      type: 'lost',
      name: 'Black Leather Wallet',
      category: 'bags',
      description: 'Lost somewhere near the gym lockers.',
      location: 'Campus Sports Complex',
      eventDate: '2026-10-21',
      contactName: 'David Student',
      contactMethod: 'david@campus.edu',
    },
    '127.0.0.1',
    mockDb
  );

  const itemId = createRes.body.item.itemId;

  // Fetch item
  const getRes = await getItemHandler(itemId, mockDb);
  assert.equal(getRes.statusCode, 200);
  assert.equal(getRes.body.item.name, 'Black Leather Wallet');
  assert.equal(getRes.body.item.viewCount, 1);
  assert.equal(getRes.body.item.contactMethod, undefined);

  // Missing item test
  const missingRes = await getItemHandler('non-existent-id-999', mockDb);
  assert.equal(missingRes.statusCode, 404);
  assert.equal(missingRes.body.success, false);
});

test('listItemsHandler returns sorted items and applies type filtering', async () => {
  const mockDb = new MockPostgresClient();

  await createItemHandler(
    {
      type: 'lost',
      name: 'Hydro Flask Water Bottle',
      category: 'accessories',
      description: 'Green bottle with stickers',
      location: 'Student Union',
      eventDate: '2026-10-20',
      contactName: 'Emma',
      contactMethod: 'emma@campus.edu',
    },
    '127.0.0.1',
    mockDb
  );

  const listRes = await listItemsHandler({ type: 'lost' }, mockDb);
  assert.equal(listRes.statusCode, 200);
  assert.equal(listRes.body.success, true);
  assert.ok(listRes.body.items.length >= 1);
  assert.equal(listRes.body.items[0].type, 'lost');
  assert.equal(listRes.body.items[0].contactMethod, undefined);
});

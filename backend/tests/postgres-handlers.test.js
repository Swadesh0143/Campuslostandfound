import test from 'node:test';
import assert from 'node:assert/strict';
import { MockPostgresClient } from './mock-db.js';
import { createItemHandler } from '../src/handlers/items.js';
import { getContactHandler } from '../src/handlers/contact.js';
import { submitAbuseReportHandler, listAbuseReportsHandler, resolveAbuseReportHandler } from '../src/handlers/reports.js';
import { getStatsHandler } from '../src/handlers/stats.js';
import { listAdminItemsHandler, updateModerationStatusHandler } from '../src/handlers/admin.js';

process.env.NODE_ENV = 'test';

const itemPayload = {
  type: 'found',
  name: 'Blue Water Bottle',
  category: 'accessories',
  description: 'Found in the campus library.',
  location: 'Main Library',
  eventDate: '2026-10-22',
  contactName: 'Casey',
  contactMethod: 'casey@example.edu',
};

test('PostgreSQL-backed contact, abuse report, moderation, and stats handlers preserve API behavior', async () => {
  const database = new MockPostgresClient();
  const created = await createItemHandler(itemPayload, '127.0.0.1', database);
  const itemId = created.body.item.itemId;
  const adminHeaders = { authorization: 'Bearer valid-admin-test-token' };

  const contact = await getContactHandler(itemId, database);
  assert.equal(contact.statusCode, 200);
  assert.equal(contact.body.data.contactMethod, itemPayload.contactMethod);

  const abuse = await submitAbuseReportHandler(
    itemId,
    { reason: 'inaccurate', details: 'The location should be more precise.' },
    '127.0.0.1',
    database
  );
  assert.equal(abuse.statusCode, 201);

  const adminItems = await listAdminItemsHandler({}, adminHeaders, database);
  assert.equal(adminItems.statusCode, 200);
  assert.equal(adminItems.body.items.length, 1);
  assert.equal(adminItems.body.items[0].moderationStatus, 'flagged');

  const reports = await listAbuseReportsHandler(adminHeaders, database);
  assert.equal(reports.statusCode, 200);
  assert.equal(reports.body.count, 1);
  assert.equal(reports.body.reports[0].itemId, itemId);

  const resolution = await resolveAbuseReportHandler(
    abuse.body.reportId,
    { status: 'actioned' },
    adminHeaders,
    database
  );
  assert.equal(resolution.statusCode, 200);

  const stats = await getStatsHandler(database);
  assert.deepEqual(stats.body.stats, {
    totalReports: 1,
    totalLost: 0,
    totalFound: 1,
    totalRecovered: 0,
    activeReports: 1,
  });

  const moderation = await updateModerationStatusHandler(
    itemId,
    { moderationStatus: 'approved' },
    adminHeaders,
    database
  );
  assert.equal(moderation.statusCode, 200);
});

// Backend Unit Tests: Uploads & S3 Presigning
import test from 'node:test';
import assert from 'node:assert/strict';
import { presignUploadHandler } from '../src/handlers/uploads.js';

// Mock S3 client that returns dummy signed URL
const mockS3Client = {
  send: async () => ({}),
};

test('presignUploadHandler rejects missing or invalid mime types', async () => {
  const missingMime = await presignUploadHandler({});
  assert.equal(missingMime.statusCode, 400);

  const invalidMime = await presignUploadHandler({ mimeType: 'application/pdf' });
  assert.equal(invalidMime.statusCode, 400);
  assert.ok(invalidMime.body.error.includes('Unsupported image type'));
});

test('presignUploadHandler rejects files exceeding 5MB', async () => {
  const oversized = await presignUploadHandler({
    mimeType: 'image/jpeg',
    fileSize: 6 * 1024 * 1024, // 6MB
  });

  assert.equal(oversized.statusCode, 400);
  assert.ok(oversized.body.error.includes('exceeds the 5MB maximum limit'));
});

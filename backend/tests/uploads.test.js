// Backend Unit Tests: Uploads & S3 Presigning
import test from 'node:test';
import assert from 'node:assert/strict';
import { presignUploadHandler } from '../src/handlers/uploads.js';
import { createPresignedUploadUrl } from '../src/s3.js';

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

test('local image upload URLs are relative so the frontend reverse proxy can serve them', async () => {
  const originalLocalDev = process.env.LOCAL_DEV;
  const originalAccessKey = process.env.AWS_ACCESS_KEY_ID;
  process.env.LOCAL_DEV = 'true';
  delete process.env.AWS_ACCESS_KEY_ID;

  try {
    const result = await createPresignedUploadUrl({
      fileExtension: 'png',
      mimeType: 'image/png',
      client: mockS3Client,
    });
    assert.match(result.uploadUrl, /^\/local-uploads\/uploads\//);
  } finally {
    if (originalLocalDev === undefined) delete process.env.LOCAL_DEV;
    else process.env.LOCAL_DEV = originalLocalDev;
    if (originalAccessKey === undefined) delete process.env.AWS_ACCESS_KEY_ID;
    else process.env.AWS_ACCESS_KEY_ID = originalAccessKey;
  }
});

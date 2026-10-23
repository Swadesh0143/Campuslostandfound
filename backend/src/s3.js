// Amazon S3 Integration & Presigned URL Generator
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from './config.js';

let s3ClientInstance = null;

export function getS3Client(clientOverride = null) {
  if (clientOverride) return clientOverride;
  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      region: config.region,
      ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true } : {}),
    });
  }
  return s3ClientInstance;
}

export function setS3ClientForTesting(mockClient) {
  s3ClientInstance = mockClient;
}

/**
 * Generates a short-lived presigned PUT URL for uploading an image to S3.
 * Enforces MIME type, unique server-generated key, and expiry.
 */
export async function createPresignedUploadUrl({
  fileExtension,
  mimeType,
  bucket = config.s3.bucketName,
  expiresIn = config.s3.presignedUrlExpirySeconds,
  client = getS3Client(),
}) {
  if (!config.s3.allowedMimeTypes.includes(mimeType)) {
    throw new Error(`Invalid file type: ${mimeType}. Allowed: ${config.s3.allowedMimeTypes.join(', ')}`);
  }

  // Generate a random, server-controlled unique object key
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  const timestamp = Date.now();
  const safeExt = fileExtension.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'jpg';
  const objectKey = `uploads/${timestamp}-${randomSuffix}.${safeExt}`;

  // If running in local dev mode without live AWS S3 credentials
  if (process.env.LOCAL_DEV === 'true' && !process.env.AWS_ACCESS_KEY_ID) {
    return {
      uploadUrl: `/local-uploads/${objectKey}`,
      objectKey,
      expiresIn,
      maxSizeBytes: config.s3.maxSizeBytes,
    };
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    ContentType: mimeType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn });

  return {
    uploadUrl,
    objectKey,
    expiresIn,
    maxSizeBytes: config.s3.maxSizeBytes,
  };
}

/**
 * Generates a presigned GET URL for viewing private images stored in S3.
 */
export async function createPresignedDownloadUrl({
  objectKey,
  bucket = config.s3.bucketName,
  expiresIn = 3600, // 1 hour
  client = getS3Client(),
}) {
  if (!objectKey || typeof objectKey !== 'string') {
    return null;
  }

  // If running in local dev mode without live AWS S3 credentials
  if (process.env.LOCAL_DEV === 'true' && !process.env.AWS_ACCESS_KEY_ID) {
    return `/local-uploads/${objectKey}`;
  }

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: objectKey,
  });

  return await getSignedUrl(client, command, { expiresIn });
}

/**
 * Cleans up an S3 object (e.g. if item creation failed after upload)
 */
export async function deleteS3Object({
  objectKey,
  bucket = config.s3.bucketName,
  client = getS3Client(),
}) {
  if (!objectKey) return;
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: objectKey,
  });
  await client.send(command);
}

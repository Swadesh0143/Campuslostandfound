// Uploads Handler: Presigned S3 Upload Authorization
import { createPresignedUploadUrl } from '../s3.js';
import { config } from '../config.js';

/**
 * POST /uploads/presign - Authorize a client upload to private S3 bucket
 */
export async function presignUploadHandler(body, s3ClientOverride = null) {
  if (!body || typeof body !== 'object') {
    return {
      statusCode: 400,
      body: { success: false, error: 'Invalid JSON request payload' },
    };
  }

  const { mimeType, fileExtension, fileSize } = body;

  if (!mimeType || typeof mimeType !== 'string') {
    return {
      statusCode: 400,
      body: { success: false, error: "Field 'mimeType' is required (e.g. image/jpeg, image/png, image/webp)" },
    };
  }

  if (!config.s3.allowedMimeTypes.includes(mimeType.toLowerCase())) {
    return {
      statusCode: 400,
      body: {
        success: false,
        error: `Unsupported image type '${mimeType}'. Allowed formats: ${config.s3.allowedMimeTypes.join(', ')}`,
      },
    };
  }

  if (fileSize && (typeof fileSize !== 'number' || fileSize > config.s3.maxSizeBytes)) {
    return {
      statusCode: 400,
      body: {
        success: false,
        error: `File size exceeds the 5MB maximum limit (${(fileSize / (1024 * 1024)).toFixed(1)}MB provided).`,
      },
    };
  }

  try {
    const uploadData = await createPresignedUploadUrl({
      fileExtension: typeof fileExtension === 'string' ? fileExtension : 'jpg',
      mimeType: mimeType.toLowerCase(),
      client: s3ClientOverride,
    });

    return {
      statusCode: 200,
      body: {
        success: true,
        data: uploadData,
      },
    };
  } catch (err) {
    console.error('Failed to generate presigned upload URL:', err);
    return {
      statusCode: 500,
      body: {
        success: false,
        error: `Upload authorization failed: ${err.message}`,
      },
    };
  }
}

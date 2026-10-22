// CampusFind Backend Configuration
export const config = {
  region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
  tables: {
    items: process.env.TABLE_ITEMS || 'CampusFind-Items',
    ownership: process.env.TABLE_OWNERSHIP || 'CampusFind-Ownership',
    reports: process.env.TABLE_REPORTS || 'CampusFind-AbuseReports',
  },
  s3: {
    bucketName: process.env.S3_BUCKET || 'campusfind-item-images',
    presignedUrlExpirySeconds: 300, // 5 minutes
    maxSizeBytes: 5 * 1024 * 1024, // 5 MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  cognito: {
    userPoolId: process.env.COGNITO_USER_POOL_ID || '',
    clientId: process.env.COGNITO_CLIENT_ID || '',
  },
  cors: {
    allowedOrigin: process.env.CORS_ORIGIN || '*',
    allowedMethods: 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization,X-Management-Token,X-Requested-With',
  },
  adminSecret: process.env.ADMIN_OVERRIDE_SECRET || '', // For local development or emergency admin token
};

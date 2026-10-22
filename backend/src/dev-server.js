// Local HTTP Development Server for CampusFind
import http from 'http';
import { handler } from './lambda.js';
import { setDocClientForTesting } from './db.js';
import { MockDynamoDbClient } from '../tests/mock-db.js';

process.env.LOCAL_DEV = 'true';
const PORT = process.env.PORT || 3001;

// In-memory binary storage for local photo uploads
const localUploadsStore = new Map();

// Initialize local mock database if AWS credentials are not set
const localDb = new MockDynamoDbClient();
setDocClientForTesting(localDb);

// Pre-seed realistic campus test data so local host is immediately populated
const seedTimestamp = new Date().toISOString();
localDb.tables['CampusFind-Items'].set('seed-item-1', {
  itemId: 'seed-item-1',
  name: 'Scientific Calculator Casio fx-991EX',
  nameLower: 'scientific calculator casio fx-991ex',
  type: 'found',
  category: 'electronics',
  description: 'Found on desk in Engineering Hall room 302 after Advanced Calculus lecture. Has a small sticker on the back cover.',
  descriptionLower: 'found on desk in engineering hall room 302 after advanced calculus lecture. has a small sticker on the back cover.',
  location: 'Engineering Hall Room 302',
  locationLower: 'engineering hall room 302',
  eventDate: '2026-10-21',
  contactName: 'Charlie (Teaching Assistant)',
  contactMethod: 'charlie.ta@campus.edu',
  status: 'active',
  moderationStatus: 'approved',
  viewCount: 18,
  createdAt: seedTimestamp,
  updatedAt: seedTimestamp,
});

localDb.tables['CampusFind-Items'].set('seed-item-2', {
  itemId: 'seed-item-2',
  name: 'Navy Blue Dell XPS Laptop Backpack',
  nameLower: 'navy blue dell xps laptop backpack',
  type: 'lost',
  category: 'bags',
  description: 'Left behind near the Student Union dining area. Contains course textbooks, blue spiral notebook, and USB-C charger.',
  descriptionLower: 'left behind near the student union dining area. contains course textbooks, blue spiral notebook, and usb-c charger.',
  location: 'Student Union Dining Area',
  locationLower: 'student union dining area',
  eventDate: '2026-10-22',
  contactName: 'Sarah Jenkins',
  contactMethod: 's.jenkins@campus.edu',
  status: 'active',
  moderationStatus: 'approved',
  viewCount: 29,
  createdAt: seedTimestamp,
  updatedAt: seedTimestamp,
});

localDb.tables['CampusFind-Items'].set('seed-item-3', {
  itemId: 'seed-item-3',
  name: 'Official Student Campus ID Card',
  nameLower: 'official student campus id card',
  type: 'found',
  category: 'id_cards',
  description: 'Found on 2nd-floor printer table in Main Library. Handed to library front desk.',
  descriptionLower: 'found on 2nd-floor printer table in main library. handed to library front desk.',
  location: 'Main Library 2nd Floor Printing Station',
  locationLower: 'main library 2nd floor printing station',
  eventDate: '2026-10-22',
  contactName: 'Library Staff Helpdesk',
  contactMethod: 'library-helpdesk@campus.edu',
  status: 'active',
  moderationStatus: 'approved',
  viewCount: 12,
  createdAt: seedTimestamp,
  updatedAt: seedTimestamp,
});

localDb.tables['CampusFind-Items'].set('seed-item-4', {
  itemId: 'seed-item-4',
  name: 'Dorm Room Key with Blue Spiral Lanyard',
  nameLower: 'dorm room key with blue spiral lanyard',
  type: 'lost',
  category: 'keys',
  description: 'Lost on path between North Dorms and Science Quad.',
  descriptionLower: 'lost on path between north dorms and science quad.',
  location: 'North Dorm Quad Walkway',
  locationLower: 'north dorm quad walkway',
  eventDate: '2026-10-19',
  contactName: 'David Student',
  contactMethod: 'david@campus.edu',
  status: 'returned',
  moderationStatus: 'approved',
  viewCount: 42,
  createdAt: seedTimestamp,
  updatedAt: seedTimestamp,
});

// Seed ownership record for item 1
localDb.tables['CampusFind-Ownership'].set('seed-item-1', {
  itemId: 'seed-item-1',
  tokenHash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
  salt: '0123456789abcdef0123456789abcdef',
  allowedActions: ['update_status', 'edit_details', 'delete_report'],
  failedAttempts: 0,
  createdAt: seedTimestamp,
  lastUsedAt: null,
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // Handle local mock S3 image upload: PUT /local-uploads/*
  if (req.method === 'PUT' && url.pathname.startsWith('/local-uploads/')) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);
    const key = url.pathname.replace(/^\/local-uploads\//, '');
    localUploadsStore.set(key, {
      contentType: req.headers['content-type'] || 'image/jpeg',
      data: buffer,
    });
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    });
    return res.end(JSON.stringify({ success: true, message: 'Local image uploaded' }));
  }

  // Handle local mock S3 image serve: GET /local-uploads/*
  if (req.method === 'GET' && url.pathname.startsWith('/local-uploads/')) {
    const key = url.pathname.replace(/^\/local-uploads\//, '');
    const found = localUploadsStore.get(key);
    if (found) {
      res.writeHead(200, {
        'Content-Type': found.contentType,
        'Access-Control-Allow-Origin': '*',
      });
      return res.end(found.data);
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Image not found in local store');
  }

  // Read body if POST/PUT/PATCH
  let bodyBuffer = '';
  for await (const chunk of req) {
    bodyBuffer += chunk;
  }

  // Parse query parameters
  const queryStringParameters = {};
  url.searchParams.forEach((value, key) => {
    queryStringParameters[key] = value;
  });

  // Construct API Gateway HTTP API v2 mock event
  const mockEvent = {
    version: '2.0',
    routeKey: `${req.method} ${url.pathname}`,
    rawPath: url.pathname,
    rawQueryString: url.search.replace(/^\?/, ''),
    headers: req.headers,
    queryStringParameters,
    requestContext: {
      http: {
        method: req.method,
        path: url.pathname,
        protocol: 'HTTP/1.1',
        sourceIp: req.socket.remoteAddress || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'LocalDev/1.0',
      },
    },
    body: bodyBuffer || undefined,
    isBase64Encoded: false,
  };

  try {
    const lambdaResponse = await handler(mockEvent, {});
    res.writeHead(lambdaResponse.statusCode, lambdaResponse.headers || {});
    res.end(lambdaResponse.body);
  } catch (err) {
    console.error('Server error in dev-server:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Internal server error in dev-server' }));
  }
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`[CampusFind] Backend dev-server running at http://localhost:${PORT}`);
  console.log(`  Mode: Local In-Memory Serverless Simulation`);
  console.log(`  Pre-seeded with 4 realistic campus lost/found reports`);
  console.log(`  Local photo upload handler: ACTIVE`);
  console.log(`======================================================\n`);
});

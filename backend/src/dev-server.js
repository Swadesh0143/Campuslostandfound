// Local HTTP Development Server for CampusFind
import http from 'node:http';
import { handler } from './lambda.js';
import { initializeDatabase } from './db.js';

if (process.env.NODE_ENV !== 'production' && process.env.LOCAL_DEV !== 'false') {
  process.env.LOCAL_DEV = 'true';
}
const PORT = process.env.PORT || 3001;
const localUploadsStore = new Map();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'PUT' && url.pathname.startsWith('/local-uploads/')) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const key = url.pathname.replace(/^\/local-uploads\//, '');
    localUploadsStore.set(key, {
      contentType: req.headers['content-type'] || 'image/jpeg',
      data: Buffer.concat(chunks),
    });
    res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, message: 'Local image uploaded' }));
  }

  if (req.method === 'GET' && url.pathname.startsWith('/local-uploads/')) {
    const key = url.pathname.replace(/^\/local-uploads\//, '');
    const found = localUploadsStore.get(key);
    if (found) {
      res.writeHead(200, { 'Content-Type': found.contentType, 'Access-Control-Allow-Origin': '*' });
      return res.end(found.data);
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Image not found in local store');
  }

  let bodyBuffer = '';
  for await (const chunk of req) bodyBuffer += chunk;

  const queryStringParameters = Object.fromEntries(url.searchParams.entries());
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
    const response = await handler(mockEvent, {});
    res.writeHead(response.statusCode, response.headers || {});
    res.end(response.body);
  } catch (error) {
    console.error('Server error in dev-server:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Internal server error in dev-server' }));
  }
});

initializeDatabase()
  .then(() => {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`[CampusFind] Backend running at http://localhost:${PORT}`);
      console.log('[CampusFind] PostgreSQL database connected; local photo upload handler active.');
    });
  })
  .catch((error) => {
    console.error('Could not initialize PostgreSQL database:', error);
    process.exitCode = 1;
  });

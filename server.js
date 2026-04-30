import { createServer } from 'http';
import { parse } from 'url';

// =============================================
// XHTTP Relay Server - Railway Edition
// =============================================

const TARGET_BASE = (process.env.TARGET_URL || process.env.BACKEND_HOST || "").replace(/\/$/, "");
const PORT = process.env.PORT || 8080;
const UUID = process.env.UUID || "";

// Headers that MUST NOT be forwarded (hop-by-hop)
const STRIP_HEADERS = new Set([
  "host",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "forwarded",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-forwarded-port",
]);

// =============================================
// Health check endpoint
// =============================================
function handleHealthCheck(res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'ok',
    timestamp: Date.now(),
    service: 'xhttp-relay',
    port: PORT
  }));
}

// =============================================
// Main relay handler - identical logic to Vercel script
// =============================================
async function handleRelay(req, res) {
  if (!TARGET_BASE) {
    res.writeHead(503, { 'Content-Type': 'text/plain' });
    res.end('Service Unavailable: TARGET_URL not configured');
    return;
  }

  try {
    // Extract path and query from request URL
    const parsedUrl = parse(req.url || '', true);
    const targetUrl = TARGET_BASE + (parsedUrl.path || '/');

    // Build headers for upstream request
    const headers = {};
    let clientIp = null;

    for (const [key, value] of Object.entries(req.headers)) {
      const lowerKey = key.toLowerCase();
      
      if (STRIP_HEADERS.has(lowerKey)) continue;
      if (lowerKey.startsWith('x-vercel-')) continue;
      if (lowerKey === 'x-real-ip') {
        clientIp = value;
        continue;
      }
      if (lowerKey === 'x-forwarded-for') {
        if (!clientIp) clientIp = value;
        continue;
      }
      headers[key] = value;
    }

    if (clientIp) {
      headers['x-forwarded-for'] = clientIp;
    }

    // Determine if request has body
    const method = req.method || 'GET';
    const hasBody = method !== 'GET' && method !== 'HEAD';

    // Prepare fetch options
    const fetchOptions = {
      method,
      headers,
      redirect: 'manual'
    };

    if (hasBody) {
      fetchOptions.body = req;
      fetchOptions.duplex = 'half';
    }

    // Execute upstream request
    const upstreamRes = await fetch(targetUrl, fetchOptions);

    // Forward response headers
    const responseHeaders = {};
    for (const [key, value] of upstreamRes.headers.entries()) {
      const lowerKey = key.toLowerCase();
      if (!lowerKey.startsWith('x-vercel-') && lowerKey !== 'server' && lowerKey !== 'via') {
        responseHeaders[key] = value;
      }
    }

    // Stream response body back to client
    res.writeHead(upstreamRes.status, responseHeaders);
    
    if (upstreamRes.body) {
      const reader = upstreamRes.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      } finally {
        reader.releaseLock();
      }
    }
    res.end();

  } catch (err) {
    console.error('[Relay Error]', err.message);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Bad Gateway: Relay failed');
  }
}

// =============================================
// Create and start HTTP server
// =============================================
const server = createServer(async (req, res) => {
  const url = req.url || '';
  
  // Health check endpoint
  if (url === '/health' || url === '/_health') {
    handleHealthCheck(res);
    return;
  }
  
  // Main relay
  await handleRelay(req, res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`XHTTP Relay running on port ${PORT}`);
  console.log(`Target URL: ${TARGET_BASE || 'NOT CONFIGURED'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, closing server...');
  server.close(() => process.exit(0));
});
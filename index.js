const http = require('http');
const fetch = require('node-fetch');

// تنظیمات پروکسی
const TARGET_BASE = process.env.TARGET_DOMAIN || "";
const PORT = process.env.PORT || 3000;

if (!TARGET_BASE) {
  console.error("Misconfigured: TARGET_DOMAIN is not set");
  process.exit(1);
}

// ایجاد سرور HTTP
const server = http.createServer(async (req, res) => {
  try {
    const targetUrl = new URL(TARGET_BASE + req.url);

    // هدرهای درخواست
    const outHeaders = new Headers(req.headers);
    outHeaders.set('x-forwarded-for', req.connection.remoteAddress);

    // ارسال درخواست به سرور مقصد با استفاده از fetch
    const fetchRes = await fetch(targetUrl, {
      method: req.method,
      headers: outHeaders,
      body: req.method === 'GET' || req.method === 'HEAD' ? null : req,
    });

    res.writeHead(fetchRes.status, fetchRes.headers);
    fetchRes.body.pipe(res);
  } catch (err) {
    console.error("Relay error:", err);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end("Bad Gateway: Tunnel Failed");
  }
});

// سرور را راه‌اندازی می‌کنیم
server.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});

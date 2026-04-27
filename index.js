const http = require('http');
const httpProxy = require('http-proxy');

// ایجاد پروکسی سرور
const proxy = httpProxy.createProxyServer({});

const PORT = process.env.PORT || 3000;
const TARGET_BASE = process.env.TARGET_DOMAIN || "";

if (!TARGET_BASE) {
  console.error("Misconfigured: TARGET_DOMAIN is not set");
  process.exit(1);
}

// ایجاد سرور HTTP
const server = http.createServer((req, res) => {
  try {
    const targetUrl = TARGET_BASE + req.url;

    // هدرهایی که باید ارسال شوند
    const outHeaders = { ...req.headers };
    outHeaders['x-forwarded-for'] = req.connection.remoteAddress;

    // ارسال درخواست به سرور مقصد
    proxy.web(req, res, {
      target: targetUrl,
      headers: outHeaders,
      changeOrigin: true,
      secure: false,
    });
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

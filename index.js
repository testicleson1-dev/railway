const http = require('http');
const httpProxy = require('http-proxy');

// تنظیمات پروکسی
const proxy = httpProxy.createProxyServer({});

// پورت از محیط $PORT دریافت می‌شود (Railway این را به طور خودکار تنظیم می‌کند)
const PORT = process.env.PORT || 3000;

// تنظیمات مقصد (TARGET_DOMAIN) از متغیر محیطی
const TARGET_BASE = (process.env.TARGET_DOMAIN || "").replace(/\/$/, "");

if (!TARGET_BASE) {
  console.error('Misconfigured: TARGET_DOMAIN is not set');
  process.exit(1);
}

// ایجاد سرور HTTP
const server = http.createServer((req, res) => {
  try {
    const pathStart = req.url.indexOf("/", 8);
    const targetUrl =
      pathStart === -1 ? TARGET_BASE + "/" : TARGET_BASE + req.url.slice(pathStart);

    const outHeaders = { ...req.headers };
    outHeaders['x-forwarded-for'] = req.connection.remoteAddress;

    proxy.web(req, res, {
      target: targetUrl,
      headers: outHeaders,
      changeOrigin: true,
      secure: false, // از امنیت TLS در پروکسی استفاده می‌کنیم
    });
  } catch (err) {
    console.error('Relay error:', err);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end("Bad Gateway: Tunnel Failed");
  }
});

// سرور را راه‌اندازی می‌کنیم
server.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});

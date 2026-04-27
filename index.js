const http = require('http');
const httpProxy = require('http-proxy');

// پروکسی سرور را ایجاد می‌کنیم
const proxy = httpProxy.createProxyServer({});

// پورت را از محیط می‌خوانیم (Railway به طور خودکار این را تنظیم می‌کند)
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
    // مسیر مقصد پروکسی
    const pathStart = req.url.indexOf("/", 8);
    const targetUrl =
      pathStart === -1 ? TARGET_BASE + "/" : TARGET_BASE + req.url.slice(pathStart);

    const out = new Map();
    let clientIp = null;

    for (const [k, v] of Object.entries(req.headers)) {
      if (k === 'host' || k.startsWith('x-vercel-')) continue;
      if (k === 'x-real-ip') {
        clientIp = v;
        continue;
      }
      if (k === 'x-forwarded-for') {
        if (!clientIp) clientIp = v;
        continue;
      }
      out.set(k, v);
    }

    if (clientIp) out.set('x-forwarded-for', clientIp);

    // ارسال درخواست به سرور مقصد
    proxy.web(req, res, {
      target: targetUrl,
      headers: Object.fromEntries(out),
      changeOrigin: true, // برای تغییر اوریجین درخواست
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

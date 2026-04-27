const http = require('http');
const fetch = require('node-fetch');

// پورت از محیط $PORT دریافت می‌شود (Railway این را به طور خودکار تنظیم می‌کند)
const PORT = process.env.PORT || 3000;

// تنظیمات مقصد (TARGET_DOMAIN) از متغیر محیطی
const TARGET_BASE = (process.env.TARGET_DOMAIN || "").replace(/\/$/, "");

if (!TARGET_BASE) {
  console.error('Misconfigured: TARGET_DOMAIN is not set');
  process.exit(1);
}

// ایجاد سرور HTTP
const server = http.createServer(async (req, res) => {
  try {
    const pathStart = req.url.indexOf("/", 8);
    const targetUrl =
      pathStart === -1 ? TARGET_BASE + "/" : TARGET_BASE + req.url.slice(pathStart);

    // هدرهای درخواست
    const out = new Headers();
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

    // ارسال درخواست به سرور مقصد با استفاده از fetch
    const fetchRes = await fetch(targetUrl, {
      method: req.method,
      headers: out,
      body: req.method === 'GET' || req.method === 'HEAD' ? null : req,
    });

    res.writeHead(fetchRes.status, fetchRes.headers);
    fetchRes.body.pipe(res);
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

const http = require('http');

// تنظیمات پروکسی
const STRIP_HEADERS = new Set([
  "host", "connection", "keep-alive", "proxy-authenticate", 
  "proxy-authorization", "te", "trailer", "transfer-encoding", 
  "upgrade", "forwarded", "x-forwarded-host", "x-forwarded-proto", 
  "x-forwarded-port"
]);

// دریافت TARGET_DOMAIN از متغیر محیطی
const TARGET_BASE = (process.env.TARGET_DOMAIN || "").replace(/\/$/, "");

if (!TARGET_BASE) {
  console.error('Misconfigured: TARGET_DOMAIN is not set');
  process.exit(1);
}

// ایجاد سرور HTTP
const server = http.createServer(async (req, res) => {
  try {
    // مسیر مقصد پروکسی
    const pathStart = req.url.indexOf("/", 8);
    const targetUrl =
      pathStart === -1 ? TARGET_BASE + "/" : TARGET_BASE + req.url.slice(pathStart);

    // هدرهای درخواست
    const out = new Map();
    let clientIp = null;
    for (const [k, v] of Object.entries(req.headers)) {
      if (STRIP_HEADERS.has(k)) continue;
      if (k.startsWith("x-vercel-")) continue;
      if (k === "x-real-ip") {
        clientIp = v;
        continue;
      }
      if (k === "x-forwarded-for") {
        if (!clientIp) clientIp = v;
        continue;
      }
      out.set(k, v);
    }
    if (clientIp) out.set("x-forwarded-for", clientIp);

    // متد درخواست و بررسی بدنه آن
    const method = req.method;
    const hasBody = method !== "GET" && method !== "HEAD";

    // ارسال درخواست به سرور مقصد
    const fetchOptions = {
      method,
      headers: Object.fromEntries(out),
      body: hasBody ? req : undefined, // ارسال بدنه درخواست
    };

    const fetchRes = await fetch(targetUrl, fetchOptions);

    res.writeHead(fetchRes.status, fetchRes.headers);
    fetchRes.body.pipe(res);
  } catch (err) {
    console.error("Relay error:", err);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end("Bad Gateway: Tunnel Failed");
  }
});

// پورت را از محیط می‌خوانیم
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});

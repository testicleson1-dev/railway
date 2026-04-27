const http = require('http');
const httpProxy = require('http-proxy');

// تنظیم پروکسی
const proxy = httpProxy.createProxyServer({});

// پورت از محیط $PORT دریافت می‌شود (Railway این را به طور خودکار تنظیم می‌کند)
const PORT = process.env.PORT || 3000;

// هدرهایی که باید فیلتر شوند
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

// تنظیمات مقصد (Target Domain) از متغیر محیطی TARGET_DOMAIN
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

    const out = new Headers();
    let clientIp = null;
    for (const [k, v] of req.headers) {
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

    const method = req.method;
    const hasBody = method !== "GET" && method !== "HEAD";

    // درخواست به سرور هدف
    proxy.web(req, res, {
      target: targetUrl,
      method,
      headers: out,
      body: hasBody ? req.body : undefined,
      duplex: "half",
      redirect: "manual",
    });
  } catch (err) {
    console.error("relay error:", err);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end("Bad Gateway: Tunnel Failed");
  }
});

server.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});

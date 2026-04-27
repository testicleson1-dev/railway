const http = require('http');
const https = require('https');
const { URL } = require('url');

// پورت از محیط $PORT دریافت می‌شود (Railway این را به طور خودکار تنظیم می‌کند)
const PORT = process.env.PORT || 3000;
const TARGET_BASE = process.env.TARGET_DOMAIN || "";

// اطمینان از تنظیم صحیح TARGET_DOMAIN
if (!TARGET_BASE) {
  console.error("Misconfigured: TARGET_DOMAIN is not set");
  process.exit(1);
}

// ایجاد سرور پروکسی
const server = http.createServer((req, res) => {
  try {
    const targetUrl = new URL(TARGET_BASE + req.url); // ساخت URL مقصد

    // هدرهایی که باید ارسال شوند
    const outHeaders = { ...req.headers };
    outHeaders['x-forwarded-for'] = req.connection.remoteAddress; // اضافه کردن IP کاربر به هدر
    outHeaders['x-real-ip'] = req.connection.remoteAddress;

    console.log(`Proxying request to: ${targetUrl.href}`); // لاگ درخواست پروکسی شده

    // ارسال درخواست به سرور مقصد
    const proxyRequest = https.request(targetUrl, {
      method: req.method,
      headers: outHeaders,
    }, (proxyResponse) => {
      // ارسال وضعیت و هدرها به کلاینت
      res.writeHead(proxyResponse.statusCode, proxyResponse.headers);
      // ارسال بدنه پاسخ به کاربر
      proxyResponse.pipe(res, { end: true });
    });

    // ارسال بدنه درخواست در صورت نیاز
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      req.pipe(proxyRequest, { end: true });
    } else {
      proxyRequest.end();
    }
  } catch (err) {
    console.error("Error in proxy:", err);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end("Bad Gateway: Tunnel Failed");
  }
});

// راه‌اندازی سرور
server.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});

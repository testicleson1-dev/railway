const https = require('https');
const http = require('http');
const { URL } = require('url');

// تنظیمات پروکسی و متغیرهای محیطی
const TARGET_BASE = process.env.TARGET_DOMAIN || "";
const PORT = process.env.PORT || 3000;

if (!TARGET_BASE) {
  console.error("Misconfigured: TARGET_DOMAIN is not set");
  process.exit(1);
}

// ایجاد سرور پروکسی
const server = http.createServer((req, res) => {
  try {
    // ساخت URL مقصد با استفاده از مسیرهای درخواست
    const targetUrl = new URL(TARGET_BASE + req.url);

    // هدرهایی که باید ارسال شوند
    const outHeaders = {
      ...req.headers,
      'x-forwarded-for': req.connection.remoteAddress,
    };

    // حذف هدرهایی که نباید ارسال شوند
    delete outHeaders['host'];  // حذف هدر host
    delete outHeaders['connection'];  // حذف connection
    delete outHeaders['accept-encoding'];  // حذف accept-encoding

    // انجام درخواست پروکسی
    const proxyRequest = https.request(targetUrl, {
      method: req.method,
      headers: outHeaders,
    }, (proxyResponse) => {
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

// شروع سرور
server.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});

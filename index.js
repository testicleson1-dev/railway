const http = require('http');
const https = require('https');
const { URL } = require('url');

// پورت سرور Railway (برای استفاده در تولید) 
const PORT = process.env.PORT || 3000;

// دامنه مقصد از متغیر محیطی
const TARGET_DOMAIN = process.env.TARGET_DOMAIN || "https://sinaw.com"; // سرور خارجی شما
const TARGET_PATH = "/admin"; // مسیر اضافی که می‌خواهید اضافه کنید (در صورت نیاز)

// اطمینان از تنظیم صحیح TARGET_DOMAIN
if (!TARGET_DOMAIN) {
  console.error("Misconfigured: TARGET_DOMAIN is not set");
  process.exit(1);
}

// ایجاد سرور پروکسی
const server = http.createServer((req, res) => {
  try {
    // ساخت URL کامل مقصد
    const targetUrl = new URL(TARGET_DOMAIN + TARGET_PATH + req.url);

    // هدرهای درخواست
    const outHeaders = {
      ...req.headers,
      'x-forwarded-for': req.connection.remoteAddress, // اضافه کردن IP کاربر به هدر
      'x-real-ip': req.connection.remoteAddress, // هدر `x-real-ip`
    };

    // ارسال درخواست به سرور مقصد (سرور خارجی)
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

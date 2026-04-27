const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// تنظیمات مقصد (TARGET_DOMAIN) از متغیر محیطی
const TARGET_BASE = (process.env.TARGET_DOMAIN || "").replace(/\/$/, "");

if (!TARGET_BASE) {
  console.error('Misconfigured: TARGET_DOMAIN is not set');
  process.exit(1);
}

// استفاده از http-proxy-middleware برای پروکسی کردن درخواست‌ها
app.use('/', createProxyMiddleware({
  target: TARGET_BASE,
  changeOrigin: true,
  secure: false,
  pathRewrite: {
    '^/': '/', // تغییر مسیر URL در صورت نیاز
  },
}));

// پورت از محیط $PORT دریافت می‌شود
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});

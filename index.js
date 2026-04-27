const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

const TARGET_BASE = process.env.TARGET_DOMAIN || "";
const PORT = process.env.PORT || 3000;

if (!TARGET_BASE) {
  console.error("Misconfigured: TARGET_DOMAIN is not set");
  process.exit(1);
}

// استفاده از http-proxy-middleware برای پروکسی درخواست‌ها
app.use('/', createProxyMiddleware({
  target: TARGET_BASE,
  changeOrigin: true,
  secure: false,
  pathRewrite: {
    '^/': '/', // تغییر مسیر URL در صورت نیاز
  },
  headers: {
    'x-forwarded-for': '127.0.0.1',
    'x-real-ip': '127.0.0.1',
  }
}));

// پورت از محیط $PORT دریافت می‌شود
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});

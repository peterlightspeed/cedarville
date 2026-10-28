const express = require('express');
const path = require('path');
const http = require('http');
const app = express();
const PORT = process.env.PORT || 5000;

// Where the Python API lives. The frontend always calls /api on its own origin,
// and this proxy forwards to FastAPI. Same-origin means no CORS in the browser.
const API_ORIGIN = process.env.API_ORIGIN || 'http://127.0.0.1:8000';

app.use('/api', (req, res) => {
  const target = new URL(API_ORIGIN);
  const proxyReq = http.request(
    {
      hostname: target.hostname,
      port: target.port || 80,
      path: '/api' + req.url,
      method: req.method,
      headers: { ...req.headers, host: target.host }
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  // If the backend is down, say so clearly instead of hanging the page.
  proxyReq.on('error', (err) => {
    console.warn(`API proxy error for ${req.method} ${req.url}: ${err.code}`);
    if (!res.headersSent) {
      res.status(502).json({
        error: 'API unavailable',
        detail: err.code,
        hint: 'Start the Python API: cd backend && uvicorn app.main:app --port 8000'
      });
    }
  });

  req.pipe(proxyReq);
});

app.use(express.static(path.join(__dirname)));

// Clean URLs for every page. Add new pages here (and to sitemap.xml).
const pages = {
  '/': 'index.html',
  '/about': 'about.html',
  '/admissions': 'admissions.html',
  '/academics': 'academics.html',
  '/gallery': 'gallery.html',
  '/blog': 'blog.html',
  '/faq': 'faq.html',
  '/learning': 'learning.html',
  '/contact': 'contact.html'
};

Object.entries(pages).forEach(([route, file]) => {
  app.get(route, (req, res) => res.sendFile(path.join(__dirname, file)));
});

// Friendly 404 instead of Express's default stack trace page.
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '404.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Cedarville Schools website running on http://0.0.0.0:${PORT}`);
});

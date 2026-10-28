const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;

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

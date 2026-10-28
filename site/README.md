# Cedarville Private Schools — Website

A fast, static, multi-page school website for **Cedarville Private Schools**, Aguda, Surulere, Lagos. Content is editable through plain JSON files, with no build step and no database.

## Stack

- **HTML5 + CSS3 + vanilla JavaScript** — no framework, no bundler
- **Bootstrap 5.3.3** and **Font Awesome 6.5.1** via CDN
- **Node.js + Express** static server (`server.js`)

## Run locally

```bash
npm install
npm start
# http://localhost:5000
```

You can also open `index.html` directly, but JSON content loads more reliably through the server (browsers block `fetch()` on `file://`).

## Pages

| Page | File | Clean URL |
|---|---|---|
| Home | `index.html` | `/` |
| About | `about.html` | `/about` |
| Academics | `academics.html` | `/academics` |
| Admissions | `admissions.html` | `/admissions` |
| Gallery | `gallery.html` | `/gallery` |
| Blog | `blog.html` | `/blog` |
| Contact | `contact.html` | `/contact` |
| FAQ | `faq.html` | `/faq` |
| Learning Hub | `learning.html` | `/learning` |
| Not found | `404.html` | any unknown route |

## Project structure

```
├── css/style.css          # all site styles
├── js/
│   ├── config.js          # API base URL — the only file to edit when connecting a backend
│   ├── main.js            # splash, scroll reveal, counters, nav, forms
│   ├── cms.js             # renders JSON content into the pages
│   └── chatbot.js         # rule-based assistant
├── data/                  # editable content (JSON)
│   ├── site.json          # school info, contact details, homepage copy
│   ├── testimonials.json
│   ├── events.json
│   ├── blog-posts.json
│   ├── gallery.json
│   ├── faq.json
│   └── chatbot-responses.json
├── images/                # optimised photos
└── server.js              # Express static server, clean URLs, /api proxy
```

## Editing content

All day-to-day content lives in `data/*.json`. Change the JSON, refresh the page — no rebuild required. Key rules:

- Keep the JSON valid (no trailing commas, double quotes).
- Image paths are relative to the site root, e.g. `images/blog/my-photo.jpg`.
- `faq.json` is the single source of truth for both the FAQ page and the Admissions preview.
- `site.json` drives the footer, contact details and homepage copy across every page.

## Connecting the Python backend

The site runs standalone by default, but it is already wired for the API in `../backend`.

`js/config.js` holds the switch:

```js
window.CEDARVILLE_DATA_BASE = '/api';        // use the Python API
window.CEDARVILLE_DATA_BASE = '';            // ignore it, read data/ directly
```

`server.js` proxies `/api/*` to `http://127.0.0.1:8000` (override with `API_ORIGIN`), so the browser only ever sees one origin and CORS never applies.

`cms.js` and `chatbot.js` try the API first and **fall back to `data/`** if it is unreachable — so the site keeps working when the backend is down or not yet deployed. The contact form posts to `/api/contact` and falls back to Formspree if that fails.

## Notes

- The contact form posts to the backend at `/api/contact`, falling back to Formspree (`https://formspree.io/f/xnjraqzj`).
- The chatbot answers from `data/chatbot-responses.json` using keyword matching (served by the API when available).
- To point the site at an API instead of local JSON, edit `js/config.js`, or add `data-api-base="/api"` to the `<html>` tag.

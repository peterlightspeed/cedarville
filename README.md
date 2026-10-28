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
└── server.js              # Express static server + clean URLs
```

## Editing content

All day-to-day content lives in `data/*.json`. Change the JSON, refresh the page — no rebuild required. Key rules:

- Keep the JSON valid (no trailing commas, double quotes).
- Image paths are relative to the site root, e.g. `images/blog/my-photo.jpg`.
- `faq.json` is the single source of truth for both the FAQ page and the Admissions preview.
- `site.json` drives the footer, contact details and homepage copy across every page.

## Notes

- The contact form posts to Formspree (`https://formspree.io/f/xnjraqzj`).
- The chatbot answers from `data/chatbot-responses.json` using keyword matching.
- To point the site at an API instead of local JSON, set `window.CEDARVILLE_DATA_BASE = '/api'` before `cms.js` loads, or add `data-api-base="/api"` to the `<html>` tag.

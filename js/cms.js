/* ============================================================
   Cedarville Schools - CMS Rendering Engine
   Loads structured JSON from /data and renders it into the page.
   Edit content in /data/*.json — never edit this file to change content.
   See CMS-GUIDE.md for full documentation.
   ============================================================ */

(function () {
  'use strict';

  /**
   * Data source for all CMS content.
   * Today this points at the static /data folder. When a Python backend exists,
   * set window.CEDARVILLE_DATA_BASE = '/api' before cms.js loads (or add
   * data-api-base="/api" to <html>) and every endpoint keeps the same shape:
   *   GET /api/site.json, /api/testimonials.json, /api/blog-posts.json, ...
   */
  const DATA_BASE = (window.CEDARVILLE_DATA_BASE
    || document.documentElement.getAttribute('data-api-base')
    || 'data').replace(/\/$/, '');

  /** Small fetch helper with graceful failure (keeps static fallback markup if a fetch fails, e.g. opened via file://) */
  async function loadJSON(path) {
    try {
      const res = await fetch(path, { cache: 'no-cache' });
      if (!res.ok) throw new Error('Bad response for ' + path);
      return await res.json();
    } catch (err) {
      console.warn('CMS: could not load', path, err);
      return null;
    }
  }

  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /* -------------------------------------------------------
     SITE-WIDE INFO (nav, footer, contact details)
     Populates every element with a data-cms attribute.
     ------------------------------------------------------- */
  function applySiteData(site) {
    if (!site) return;
    const c = site.contact, s = site.social, school = site.school, dev = site.developer;

    // Generic text/href binding via data-cms="field" and data-cms-attr="href|src"
    const map = {
      'phone-display': c.phoneDisplay,
      'email': c.email,
      'address': c.address,
      'address-short': c.addressShort,
      'hours': c.hours,
      'school-name': school.name,
      'founded-year': school.foundedYear,
      'developer-name': dev.name
    };
    document.querySelectorAll('[data-cms]').forEach((el) => {
      const key = el.getAttribute('data-cms');
      if (key in map && map[key] !== undefined) el.textContent = map[key];
    });

    // href bindings
    document.querySelectorAll('[data-cms-href]').forEach((el) => {
      const key = el.getAttribute('data-cms-href');
      if (key === 'whatsapp') {
        const msg = el.getAttribute('data-cms-msg') || 'Hello! I am interested in enrolling my child.';
        el.href = `https://wa.me/${c.whatsappNumber}?text=${encodeURIComponent(msg)}`;
      } else if (key === 'tel') {
        el.href = `tel:${c.phoneHref}`;
      } else if (key === 'email') {
        el.href = `mailto:${c.email}`;
      } else if (key === 'facebook') {
        el.href = s.facebook;
      } else if (key === 'instagram') {
        el.href = s.instagram;
      } else if (key === 'tiktok') {
        el.href = s.tiktok;
      } else if (key === 'maps') {
        el.href = c.mapsSearchUrl;
      } else if (key === 'developer') {
        el.href = dev.url;
      }
    });

    // map embed src
    const mapFrame = document.querySelector('[data-cms-map]');
    if (mapFrame) mapFrame.src = c.mapEmbedUrl;

    // stats (hero + stats bar) — only overwrite data-count so the existing counter animation in main.js keeps working
    document.querySelectorAll('[data-cms-stat]').forEach((el) => {
      const key = el.getAttribute('data-cms-stat');
      const stat = site.stats[key];
      if (!stat) return;
      el.setAttribute('data-count', stat.value);
      el.setAttribute('data-suffix', stat.suffix || '');
      const label = el.parentElement && el.parentElement.querySelector('[data-cms-stat-label]');
      if (label) label.textContent = stat.label;
    });
  }

  /* -------------------------------------------------------
     Animated counters (hero + stats bar). Runs after applySiteData()
     has set the correct data-count/data-suffix values, avoiding any
     race between the CMS fetch and an independently-timed observer.
     ------------------------------------------------------- */
  function initCounters() {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animate = (el) => {
      const target = parseInt(el.dataset.count, 10) || 0;
      const suffix = el.dataset.suffix || '';
      if (prefersReduced) { el.textContent = target + suffix; return; }
      let current = 0;
      const step = Math.max(1, Math.ceil(target / 60));
      const timer = setInterval(() => {
        current += step;
        if (current >= target) { el.textContent = target + suffix; clearInterval(timer); }
        else { el.textContent = current + suffix; }
      }, 25);
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { animate(entry.target); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.5 });
    counters.forEach((c) => observer.observe(c));
  }

  /* -------------------------------------------------------
     TESTIMONIALS (homepage)
     ------------------------------------------------------- */
  function renderTestimonials(data) {
    const grid = document.getElementById('testimonialsGrid');
    if (!grid || !data) return;
    grid.innerHTML = data.testimonials.map((t) => `
      <div class="col-md-4">
        <div class="testimonial-card h-100 reveal">
          <div class="text-warning mb-3" aria-hidden="true">${'<i class="fas fa-star"></i>'.repeat(t.rating || 5)}</div>
          <p class="quote">&quot;${escapeHTML(t.quote)}&quot;</p>
          <div class="author-name">${escapeHTML(t.author)}</div>
          <div class="author-role">${escapeHTML(t.role)}</div>
        </div>
      </div>
    `).join('');
    initReveal();
  }

  /* -------------------------------------------------------
     UPCOMING EVENTS (homepage)
     ------------------------------------------------------- */
  function renderEvents(data) {
    const grid = document.getElementById('eventsGrid');
    if (!grid || !data) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const upcoming = data.events
      .filter((e) => new Date(e.date + 'T00:00:00') >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 3);

    if (!upcoming.length) {
      grid.closest('section')?.remove();
      return;
    }

    grid.innerHTML = upcoming.map((e) => {
      const d = new Date(e.date + 'T00:00:00');
      const day = d.toLocaleDateString('en-US', { day: '2-digit' });
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      return `
      <div class="col-md-4">
        <div class="event-card h-100 reveal">
          <div class="event-date-badge"><span class="event-day">${day}</span><span class="event-month">${month.toUpperCase()}</span></div>
          <div class="category-tag">${escapeHTML(e.category)}</div>
          <h5>${escapeHTML(e.title)}</h5>
          <p class="text-muted small mb-2"><i class="far fa-clock me-1" aria-hidden="true"></i>${escapeHTML(e.time)}</p>
          <p class="text-muted small mb-0">${escapeHTML(e.description)}</p>
        </div>
      </div>`;
    }).join('');
    initReveal();
  }

  /* -------------------------------------------------------
     BLOG (homepage preview + full blog page + modal)
     ------------------------------------------------------- */
  function blogCardHTML(post, forModalPage) {
    return `
      <div class="${forModalPage ? 'col col-md-4' : 'col-md-4'}">
        <div class="blog-card h-100 reveal" data-cat="${post.category}" data-id="${post.id}">
          <img src="${post.image}" alt="${escapeHTML(post.title)}" loading="lazy" decoding="async">
          <div class="blog-card-body">
            <div class="category-tag">${escapeHTML(categoryLabel(post.category))}</div>
            <h5>${escapeHTML(post.title)}</h5>
            <p>${escapeHTML(post.excerpt)}</p>
            <div class="d-flex justify-content-between align-items-center">
              <div class="meta"><i class="far fa-calendar me-1" aria-hidden="true"></i> ${formatDate(post.date)}</div>
              ${forModalPage
                ? `<button class="btn read-more" data-bs-toggle="modal" data-bs-target="#blogModal" data-post-id="${post.id}">Read More <i class="fas fa-arrow-right ms-1" aria-hidden="true"></i></button>`
                : `<a href="blog.html" class="read-more">Read More <i class="fas fa-arrow-right ms-1" aria-hidden="true"></i></a>`}
            </div>
          </div>
        </div>
      </div>`;
  }

  let blogCategoryLabels = {};
  function categoryLabel(key) {
    return blogCategoryLabels[key] || key;
  }

  function renderBlogPreview(data) {
    const grid = document.getElementById('blogPreviewGrid');
    if (!grid || !data) return;
    const latest = [...data.posts].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
    grid.innerHTML = latest.map((p) => blogCardHTML(p, false)).join('');
    initReveal();
  }

  function renderBlogFull(data) {
    const grid = document.getElementById('blogGrid');
    if (!grid || !data) return;
    (data.categories || []).forEach((c) => { blogCategoryLabels[c.key] = c.label; });
    // Filter buttons come from the same JSON as the posts, so they can never drift.
    const filterWrap = document.getElementById('blogFilters');
    if (filterWrap && data.categories) {
      filterWrap.innerHTML = data.categories.map((c) => `
        <button type="button" class="blog-filter-btn${c.key === 'all' ? ' active' : ''}" data-filter="${escapeHTML(c.key)}">${escapeHTML(c.label)}</button>
      `).join('');
    }

    const posts = [...data.posts].sort((a, b) => new Date(b.date) - new Date(a.date));
    grid.innerHTML = posts.map((p) => blogCardHTML(p, true)).join('');

    // Wire up modal content per post
    const modalTitle = document.getElementById('blogModalLabel');
    const modalMeta = document.getElementById('blogModalMeta');
    const modalContent = document.getElementById('blogModalContent');
    const modalImg = document.getElementById('blogModalImg');
    grid.querySelectorAll('.read-more').forEach((btn) => {
      btn.addEventListener('click', function () {
        const post = posts.find((p) => p.id === this.dataset.postId);
        if (!post || !modalTitle) return;
        modalTitle.textContent = post.title;
        if (modalMeta) modalMeta.textContent = `${post.author} · ${formatDate(post.date)} · ${post.readTime}`;
        if (modalImg) { modalImg.src = post.image; modalImg.alt = post.title; }
        if (modalContent) {
          modalContent.innerHTML = post.content.split('\n\n').map((para) => `<p>${escapeHTML(para)}</p>`).join('');
        }
      });
    });

    initReveal();
    initBlogFilter();
  }

  function initBlogFilter() {
    const filterBtns = document.querySelectorAll('.blog-filter-btn');
    const blogCards = document.querySelectorAll('.blog-card[data-cat]');
    filterBtns.forEach((btn) => {
      btn.addEventListener('click', function () {
        filterBtns.forEach((b) => b.classList.remove('active'));
        this.classList.add('active');
        const filter = this.dataset.filter;
        blogCards.forEach((card) => {
          const wrapper = card.closest('.col, .col-md-4');
          if (wrapper) wrapper.style.display = (filter === 'all' || card.dataset.cat === filter) ? '' : 'none';
        });
      });
    });
  }

  /* -------------------------------------------------------
     GALLERY (gallery page)
     ------------------------------------------------------- */
  function renderGallery(data) {
    const grid = document.getElementById('galleryGrid');
    if (!grid || !data) return;
    grid.innerHTML = data.photos.map((p) => `
      <div class="col-md-4 col-6">
        <div class="gallery-item reveal" data-cat="${p.category}">
          <img src="${p.src}" alt="${escapeHTML(p.alt)}" loading="lazy" decoding="async">
          <div class="gallery-overlay"><i class="fas fa-search-plus" aria-hidden="true"></i></div>
        </div>
      </div>
    `).join('');

    // Build filter buttons dynamically from categories list
    const filterWrap = document.getElementById('galleryFilters');
    if (filterWrap && data.categories) {
      filterWrap.innerHTML = data.categories.map((c, i) => `
        <button type="button" class="gallery-filter-btn${i === 0 ? ' active' : ''}" data-filter="${escapeHTML(c.key)}">${escapeHTML(c.label)}</button>
      `).join('');
    }

    initReveal();
    initGalleryInteractions();
  }

  function initGalleryInteractions() {
    const filterBtns = document.querySelectorAll('.gallery-filter-btn');
    const galleryItems = document.querySelectorAll('.gallery-item[data-cat]');
    filterBtns.forEach((btn) => {
      btn.addEventListener('click', function () {
        filterBtns.forEach((b) => b.classList.remove('active'));
        this.classList.add('active');
        const filter = this.dataset.filter;
        galleryItems.forEach((item) => {
          const wrapper = item.closest('.col-md-4, .col-6');
          if (wrapper) wrapper.style.display = (filter === 'all' || item.dataset.cat === filter) ? '' : 'none';
        });
      });
    });

    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const lightboxClose = document.getElementById('lightbox-close');

    document.querySelectorAll('.gallery-item').forEach((item) => {
      item.addEventListener('click', function () {
        if (!lightbox) return;
        const img = this.querySelector('img');
        lightboxImg.src = img.src;
        lightboxCaption.textContent = img.alt || '';
        lightbox.classList.add('active');
      });
    });
    if (lightboxClose) lightboxClose.addEventListener('click', () => lightbox.classList.remove('active'));
    if (lightbox) {
      lightbox.addEventListener('click', function (e) { if (e.target === this) this.classList.remove('active'); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') lightbox.classList.remove('active'); });
    }
  }

  /* -------------------------------------------------------
     FAQ (data/faq.json)
     Renders any [data-cms-faq] accordion. Used on admissions.html
     and faq.html so there is a single source of truth.
     ------------------------------------------------------- */
  function renderFaq(faq) {
    if (!faq || !Array.isArray(faq.faqs)) return;
    document.querySelectorAll('[data-cms-faq]').forEach((container) => {
      const limit = parseInt(container.getAttribute('data-cms-faq-limit'), 10);
      const items = isNaN(limit) ? faq.faqs : faq.faqs.slice(0, limit);
      const parentId = container.id || 'faqAccordion';
      const grouped = container.getAttribute('data-cms-faq') === 'grouped';

      const itemHTML = (item, i) => {
        const id = `${parentId}-item-${i}`;
        const open = i === 0 ? ' show' : '';
        const collapsed = i === 0 ? '' : ' collapsed';
        return `
          <div class="accordion-item" data-faq-text="${escapeHTML((item.question + ' ' + item.answer).toLowerCase())}">
            <h2 class="accordion-header">
              <button class="accordion-button${collapsed}" type="button" data-bs-toggle="collapse" data-bs-target="#${id}" aria-expanded="${i === 0}" aria-controls="${id}">
                ${escapeHTML(item.question)}
              </button>
            </h2>
            <div id="${id}" class="accordion-collapse collapse${open}" data-bs-parent="#${parentId}">
              <div class="accordion-body">${escapeHTML(item.answer)}</div>
            </div>
          </div>`;
      };

      if (grouped) {
        const groups = [];
        items.forEach((item) => {
          const cat = item.category || 'General';
          let group = groups.find((g) => g.name === cat);
          if (!group) { group = { name: cat, items: [] }; groups.push(group); }
          group.items.push(item);
        });
        let counter = 0;
        container.innerHTML = groups.map((group) => `
          <h3 class="faq-category-title">${escapeHTML(group.name)}</h3>
          ${group.items.map((item) => itemHTML(item, counter++)).join('')}
        `).join('');
      } else {
        container.innerHTML = items.map(itemHTML).join('');
      }
    });
  }

  /* -------------------------------------------------------
     FAQ live search (faq.html)
     ------------------------------------------------------- */
  function initFaqSearch() {
    const input = document.getElementById('faq-search');
    if (!input) return;
    const empty = document.getElementById('faq-empty');
    const container = document.querySelector('[data-cms-faq]');
    if (!container) return;

    input.addEventListener('input', function () {
      const q = this.value.toLowerCase().trim();
      let visible = 0;
      container.querySelectorAll('.accordion-item').forEach((item) => {
        const match = !q || (item.getAttribute('data-faq-text') || '').includes(q);
        item.style.display = match ? '' : 'none';
        if (match) visible++;
      });
      container.querySelectorAll('.faq-category-title').forEach((heading) => {
        let el = heading.nextElementSibling;
        let any = false;
        while (el && !el.classList.contains('faq-category-title')) {
          if (el.classList.contains('accordion-item') && el.style.display !== 'none') any = true;
          el = el.nextElementSibling;
        }
        heading.style.display = any ? '' : 'none';
      });
      if (empty) empty.style.display = visible ? 'none' : 'block';
    });
  }

  /* -------------------------------------------------------
     Scroll-reveal animation (progressive enhancement)
     ------------------------------------------------------- */
  let revealObserver;
  function initReveal() {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const targets = document.querySelectorAll('.reveal:not(.reveal-visible)');
    if (prefersReduced) {
      targets.forEach((el) => el.classList.add('reveal-visible'));
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    }
    targets.forEach((el) => revealObserver.observe(el));
  }

  /* -------------------------------------------------------
     Boot
     ------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', async function () {
    const [site, testimonials, events, blog, gallery, faq] = await Promise.all([
      loadJSON(`${DATA_BASE}/site.json`),
      document.getElementById('testimonialsGrid') ? loadJSON(`${DATA_BASE}/testimonials.json`) : null,
      document.getElementById('eventsGrid') ? loadJSON(`${DATA_BASE}/events.json`) : null,
      (document.getElementById('blogPreviewGrid') || document.getElementById('blogGrid')) ? loadJSON(`${DATA_BASE}/blog-posts.json`) : null,
      document.getElementById('galleryGrid') ? loadJSON(`${DATA_BASE}/gallery.json`) : null,
      document.querySelector('[data-cms-faq]') ? loadJSON(`${DATA_BASE}/faq.json`) : null
    ]);

    if (blog && blog.categories) blog.categories.forEach((c) => { blogCategoryLabels[c.key] = c.label; });

    applySiteData(site);
    initCounters();
    renderTestimonials(testimonials);
    renderEvents(events);
    renderBlogPreview(blog);
    renderBlogFull(blog);
    renderGallery(gallery);
    renderFaq(faq);
    initFaqSearch();

    // Reveal any static (non-CMS-rendered) sections marked with .reveal already in the DOM
    initReveal();

    window.CedarvilleCMS = { site, testimonials, events, blog, gallery, faq };
  });
})();

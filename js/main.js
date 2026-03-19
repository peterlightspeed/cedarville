/* ============================================================
   Cedarville Schools - Global JavaScript
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  // ----- Back to Top Button -----
  const backTop = document.getElementById('back-to-top');
  if (backTop) {
    window.addEventListener('scroll', function () {
      backTop.style.display = window.scrollY > 300 ? 'flex' : 'none';
    });
    backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // ----- Animated Counters (homepage stats) -----
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.dataset.count);
          let current = 0;
          const step = Math.ceil(target / 60);
          const timer = setInterval(() => {
            current += step;
            if (current >= target) { el.textContent = target + (el.dataset.suffix || ''); clearInterval(timer); }
            else { el.textContent = current + (el.dataset.suffix || ''); }
          }, 25);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(c => observer.observe(c));
  }

  // ----- Gallery Filter -----
  const filterBtns = document.querySelectorAll('.gallery-filter-btn');
  const galleryItems = document.querySelectorAll('.gallery-item[data-cat]');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      filterBtns.forEach(b => b.classList.remove('active', 'btn-blue'));
      filterBtns.forEach(b => b.classList.add('btn-outline-blue'));
      this.classList.add('active', 'btn-blue');
      this.classList.remove('btn-outline-blue');
      const filter = this.dataset.filter;
      galleryItems.forEach(item => {
        item.style.display = (filter === 'all' || item.dataset.cat === filter) ? 'block' : 'none';
      });
    });
  });

  // ----- Lightbox -----
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const lightboxClose = document.getElementById('lightbox-close');

  document.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', function () {
      if (!lightbox) return;
      const img = this.querySelector('img');
      lightboxImg.src = img.src;
      lightboxCaption.textContent = img.alt || '';
      lightbox.classList.add('active');
    });
  });

  if (lightboxClose) lightboxClose.addEventListener('click', () => lightbox.classList.remove('active'));
  if (lightbox) lightbox.addEventListener('click', function (e) { if (e.target === this) this.classList.remove('active'); });

  // ----- Blog Category Filter -----
  const blogFilterBtns = document.querySelectorAll('.blog-filter-btn');
  const blogCards = document.querySelectorAll('.blog-card[data-cat]');
  blogFilterBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      blogFilterBtns.forEach(b => { b.classList.remove('active', 'btn-blue'); b.classList.add('btn-outline-blue'); });
      this.classList.add('active', 'btn-blue');
      this.classList.remove('btn-outline-blue');
      const filter = this.dataset.filter;
      blogCards.forEach(card => {
        const wrapper = card.closest('.col');
        if (wrapper) wrapper.style.display = (filter === 'all' || card.dataset.cat === filter) ? 'block' : 'none';
      });
    });
  });

  // ----- Contact Form Validation -----
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const name = this.querySelector('#name').value.trim();
      const email = this.querySelector('#email').value.trim();
      const msg = this.querySelector('#message').value.trim();
      const feedback = document.getElementById('form-feedback');

      if (!name || !email || !msg) {
        if (feedback) { feedback.textContent = 'Please fill in all required fields.'; feedback.className = 'text-danger mt-2'; }
        return;
      }

      // TODO: Connect to a backend or form service (e.g. Formspree, EmailJS) to actually send messages
      if (feedback) {
        feedback.textContent = 'Thank you! Your message has been received. We will be in touch shortly.';
        feedback.className = 'text-success mt-2';
      }
      this.reset();
    });
  }

});

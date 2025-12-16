 // ========================================
// CEDARVILLE PRIVATE SCHOOLS - HOME PAGE JS
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    
    // ===== STAT COUNTER ANIMATION =====
    const statNumbers = document.querySelectorAll('.stat-number');
    const statsSection = document.querySelector('.hero-stats');
    
    const animateCounter = (element, target) => {
        let current = 0;
        const increment = target / 50;
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                element.textContent = target;
                clearInterval(timer);
            } else {
                element.textContent = Math.floor(current);
            }
        }, 40);
    };
    
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                statNumbers.forEach(stat => {
                    const target = parseInt(stat.dataset.target);
                    animateCounter(stat, target);
                });
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    if (statsSection) {
        statsObserver.observe(statsSection);
    }
    
    // ===== TESTIMONIALS SLIDER =====
    const testimonialCards = document.querySelectorAll('.testimonial-card');
    const prevBtn = document.querySelector('.testimonial-prev');
    const nextBtn = document.querySelector('.testimonial-next');
    let currentIndex = 0;
    
    function showTestimonial(index) {
        testimonialCards.forEach((card, i) => {
            card.style.display = i === index ? 'block' : 'none';
        });
    }
    
    function nextTestimonial() {
        currentIndex = (currentIndex + 1) % testimonialCards.length;
        showTestimonial(currentIndex);
    }
    
    function prevTestimonial() {
        currentIndex = (currentIndex - 1 + testimonialCards.length) % testimonialCards.length;
        showTestimonial(currentIndex);
    }
    
    // Initialize testimonials
    if (testimonialCards.length > 0) {
        showTestimonial(0);
        
        // Auto-rotate testimonials
        setInterval(nextTestimonial, 5000);
        
        // Manual navigation
        if (prevBtn) prevBtn.addEventListener('click', prevTestimonial);
        if (nextBtn) nextBtn.addEventListener('click', nextTestimonial);
    }
    
    // ===== HERO PARALLAX EFFECT =====
    const heroBgImage = document.querySelector('.hero-bg-image');
    
    window.addEventListener('scroll', () => {
        if (heroBgImage) {
            const scrolled = window.pageYOffset;
            heroBgImage.style.transform = `translateY(${scrolled * 0.5}px)`;
        }
    });
    
    // ===== SCROLL INDICATOR =====
    const scrollIndicator = document.querySelector('.scroll-indicator');
    
    if (scrollIndicator) {
        scrollIndicator.addEventListener('click', () => {
            const nextSection = document.querySelector('.welcome-section');
            if (nextSection) {
                nextSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
        
        // Hide scroll indicator after user scrolls
        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                scrollIndicator.style.opacity = '0';
            } else {
                scrollIndicator.style.opacity = '1';
            }
        });
    }
    
    // ===== ENHANCED HERO ANIMATIONS =====
    const heroElements = document.querySelectorAll('.hero-title, .hero-subtitle, .hero-features, .hero-cta');
    
    heroElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = `opacity 0.8s ease ${index * 0.2}s, transform 0.8s ease ${index * 0.2}s`;
        
        setTimeout(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, 500);
    });
    
    // ===== PROGRAMS HOVER EFFECTS =====
    const programCards = document.querySelectorAll('.program-card');
    
    programCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
    
    // ===== BLOG CARDS ENHANCEMENT =====
    const blogCards = document.querySelectorAll('.blog-card');
    
    blogCards.forEach(card => {
        card.addEventListener('click', function() {
            const link = this.querySelector('.blog-read-more');
            if (link) {
                link.click();
            }
        });
    });
    
    // ===== CTA SECTION ANIMATION =====
    const ctaSection = document.querySelector('.cta-section');
    
    if (ctaSection) {
        const ctaObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.querySelector('.cta-content').style.animation = 'fadeIn 1s ease-out';
                    ctaObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });
        
        ctaObserver.observe(ctaSection);
    }
    
    // ===== DYNAMIC YEAR IN FOOTER =====
    const footerYear = document.querySelector('.footer-bottom p');
    if (footerYear) {
        const currentYear = new Date().getFullYear();
        footerYear.innerHTML = footerYear.innerHTML.replace('2025', currentYear);
    }
    
    console.log('Cedarville Schools - Home page JS loaded successfully');
});

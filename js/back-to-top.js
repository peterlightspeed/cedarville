 // ========================================
// CEDARVILLE PRIVATE SCHOOLS - BACK TO TOP JS
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    
    // ===== BACK TO TOP ELEMENT =====
    const backToTopBtn = document.getElementById('backToTop');
    
    if (!backToTopBtn) return; // Exit if button doesn't exist
    
    // ===== VARIABLES =====
    let isScrolling = false;
    const scrollThreshold = 300; // Show button after scrolling 300px
    const smoothScrollDuration = 800; // Duration of smooth scroll in ms
    
    // ===== FUNCTIONS =====
    function toggleBackToTopButton() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > scrollThreshold) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    }
    
    function scrollToTop() {
        const startPosition = window.pageYOffset;
        const startTime = performance.now();
        
        function animateScroll(currentTime) {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / smoothScrollDuration, 1);
            
            // Easing function for smooth deceleration
            const easeInOutQuad = progress < 0.5 
                ? 2 * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            const currentPosition = startPosition * (1 - easeInOutQuad);
            window.scrollTo(0, currentPosition);
            
            if (progress < 1) {
                requestAnimationFrame(animateScroll);
            } else {
                // Scroll complete
                window.scrollTo(0, 0);
            }
        }
        
        requestAnimationFrame(animateScroll);
    }
    
    // ===== ENHANCED SCROLL BEHAVIOR =====
    function handleScroll() {
        if (!isScrolling) {
            window.requestAnimationFrame(() => {
                toggleBackToTopButton();
                isScrolling = false;
            });
            isScrolling = true;
        }
    }
    
    // ===== EVENT LISTENERS =====
    // Scroll event with throttling
    window.addEventListener('scroll', handleScroll);
    
    // Click event for back to top
    backToTopBtn.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Add rotation animation to button
        this.style.transform = 'rotate(360deg)';
        
        setTimeout(() => {
            this.style.transform = '';
        }, 300);
        
        // Scroll to top
        scrollToTop();
        
        // Focus on main content for accessibility
        setTimeout(() => {
            const mainContent = document.querySelector('main, .hero, h1');
            if (mainContent) {
                mainContent.focus();
            }
        }, smoothScrollDuration);
    });
    
    // ===== KEYBOARD SUPPORT =====
    document.addEventListener('keydown', function(e) {
        // Alt + Arrow Up to scroll to top
        if (e.altKey && e.key === 'ArrowUp') {
            e.preventDefault();
            scrollToTop();
        }
        
        // Home key to scroll to top
        if (e.key === 'Home' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            scrollToTop();
        }
    });
    
    // ===== TOUCH DEVICE SUPPORT =====
    let touchStartY = 0;
    let touchEndY = 0;
    
    document.addEventListener('touchstart', function(e) {
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });
    
    document.addEventListener('touchend', function(e) {
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe();
    }, { passive: true });
    
    function handleSwipe() {
        // Swipe up from bottom of screen to go to top
        if (touchStartY - touchEndY > 100 && touchStartY > window.innerHeight - 100) {
            scrollToTop();
        }
    }
    
    // ===== VISUAL FEEDBACK =====
    backToTopBtn.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-5px)';
    });
    
    backToTopBtn.addEventListener('mouseleave', function() {
        this.style.transform = '';
    });
    
    // ===== ACCESSIBILITY ENHANCEMENTS =====
    backToTopBtn.addEventListener('focus', function() {
        this.style.boxShadow = '0 0 0 3px rgba(74, 144, 226, 0.3)';
    });
    
    backToTopBtn.addEventListener('blur', function() {
        this.style.boxShadow = '';
    });
    
    // ===== DYNAMIC POSITION ADJUSTMENT =====
    function adjustPosition() {
        const chatbot = document.querySelector('.chatbot-trigger');
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        
        // Adjust position if near bottom of page or if chatbot is present
        if (chatbot && window.innerWidth > 768) {
            const chatbotRect = chatbot.getBoundingClientRect();
            if (chatbotRect.bottom > windowHeight - 100) {
                backToTopBtn.style.bottom = '120px';
            } else {
                backToTopBtn.style.bottom = '30px';
            }
        }
    }
    
    window.addEventListener('resize', adjustPosition);
    adjustPosition();
    
    // ===== PROGRESS INDICATOR (OPTIONAL) =====
    function createProgressIndicator() {
        const progressIndicator = document.createElement('div');
        progressIndicator.className = 'scroll-progress';
        progressIndicator.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            height: 3px;
            background: var(--primary-color);
            z-index: 10000;
            transition: width 0.2s ease;
        `;
        
        document.body.appendChild(progressIndicator);
        return progressIndicator;
    }
    
    const progressIndicator = createProgressIndicator();
    
    function updateProgress() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = (scrollTop / scrollHeight) * 100;
        
        progressIndicator.style.width = `${progress}%`;
    }
    
    window.addEventListener('scroll', updateProgress);
    
    // ===== INITIAL STATE =====
    toggleBackToTopButton();
    updateProgress();
    
    console.log('Cedarville Schools - Back to Top JS loaded successfully');
});

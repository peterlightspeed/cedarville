 // ========================================
// CEDARVILLE PRIVATE SCHOOLS - DARK MODE JS
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    
    // ===== THEME TOGGLE ELEMENTS =====
    const themeToggle = document.getElementById('themeToggle');
    const html = document.documentElement;
    
    if (!themeToggle) return; // Exit if theme toggle doesn't exist
    
    // ===== THEME STATE =====
    const THEMES = {
        LIGHT: 'light',
        DARK: 'dark'
    };
    
    // ===== THEME FUNCTIONS =====
    function getPreferredTheme() {
        // Check if user has previously set theme
        const savedTheme = localStorage.getItem('cedarville-theme');
        if (savedTheme) {
            return savedTheme;
        }
        
        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return THEMES.DARK;
        }
        
        return THEMES.LIGHT;
    }
    
    function setTheme(theme) {
        html.setAttribute('data-theme', theme);
        localStorage.setItem('cedarville-theme', theme);
        updateThemeIcon(theme);
        
        // Dispatch custom event for theme change
        window.dispatchEvent(new CustomEvent('themeChanged', { 
            detail: { theme } 
        }));
    }
    
    function updateThemeIcon(theme) {
        const icon = themeToggle.querySelector('i');
        if (theme === THEMES.DARK) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    }
    
    function toggleTheme() {
        const currentTheme = html.getAttribute('data-theme') || THEMES.LIGHT;
        const newTheme = currentTheme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
        setTheme(newTheme);
    }
    
    // ===== INITIALIZATION =====
    function initializeTheme() {
        const preferredTheme = getPreferredTheme();
        setTheme(preferredTheme);
        
        // Add transition class for smooth theme switching
        setTimeout(() => {
            html.classList.add('theme-transition');
        }, 100);
    }
    
    // ===== SYSTEM THEME CHANGE LISTENER =====
    if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addListener((e) => {
            const newTheme = e.matches ? THEMES.DARK : THEMES.LIGHT;
            if (!localStorage.getItem('cedarville-theme')) {
                setTheme(newTheme);
            }
        });
    }
    
    // ===== KEYBOARD SHORTCUT =====
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + Shift + D to toggle theme
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
            e.preventDefault();
            toggleTheme();
        }
    });
    
    // ===== EVENT LISTENERS =====
    themeToggle.addEventListener('click', toggleTheme);
    
    // ===== THEME TRANSITION STYLES =====
    const style = document.createElement('style');
    style.textContent = `
        .theme-transition,
        .theme-transition * {
            transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease !important;
        }
        
        /* Dark mode specific adjustments */
        [data-theme="dark"] .hero-overlay {
            background: linear-gradient(135deg, rgba(26, 26, 26, 0.9) 0%, rgba(46, 46, 46, 0.85) 100%);
        }
        
        [data-theme="dark"] .cta-overlay {
            background: linear-gradient(135deg, rgba(26, 26, 26, 0.95) 0%, rgba(46, 46, 46, 0.9) 100%);
        }
        
        /* Smooth scrollbar transition */
        ::-webkit-scrollbar {
            transition: background 0.3s ease;
        }
        
        /* Image opacity adjustments for dark mode */
        [data-theme="dark"] img.hero-bg-image,
        [data-theme="dark"] .cta-background img {
            opacity: 0.7;
            transition: opacity 0.3s ease;
        }
    `;
    document.head.appendChild(style);
    
    // ===== ANIMATION ON THEME TOGGLE =====
    themeToggle.addEventListener('click', function() {
        this.style.transform = 'rotate(360deg) scale(1.1)';
        setTimeout(() => {
            this.style.transform = '';
        }, 300);
    });
    
    // ===== TOOLTIP FOR THEME TOGGLE =====
    function createTooltip() {
        const tooltip = document.createElement('div');
        tooltip.className = 'theme-tooltip';
        tooltip.textContent = 'Toggle theme (Ctrl+Shift+D)';
        tooltip.style.cssText = `
            position: absolute;
            bottom: 120%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            white-space: nowrap;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s ease;
            z-index: 1000;
        `;
        
        // Add arrow
        const arrow = document.createElement('div');
        arrow.style.cssText = `
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border: 5px solid transparent;
            border-top-color: rgba(0, 0, 0, 0.8);
        `;
        tooltip.appendChild(arrow);
        
        return tooltip;
    }
    
    const tooltip = createTooltip();
    themeToggle.style.position = 'relative';
    themeToggle.appendChild(tooltip);
    
    themeToggle.addEventListener('mouseenter', () => {
        tooltip.style.opacity = '1';
    });
    
    themeToggle.addEventListener('mouseleave', () => {
        tooltip.style.opacity = '0';
    });
    
    // ===== INITIALIZE THEME =====
    initializeTheme();
    
    console.log('Cedarville Schools - Dark Mode JS loaded successfully');
});

 // ========================================
// CEDARVILLE PRIVATE SCHOOLS - PROGRAMS PAGE JS
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    
    // ===== AGE TAB FUNCTIONALITY =====
    const ageTabs = document.querySelectorAll('.age-tab');
    const programSections = document.querySelectorAll('.program-detail');
    
    // Function to filter programs by age
    function filterPrograms(ageFilter) {
        programSections.forEach(section => {
            if (ageFilter === 'all') {
                section.style.display = 'block';
            } else {
                const sectionId = section.id;
                if (sectionId === ageFilter) {
                    section.style.display = 'block';
                } else {
                    section.style.display = 'none';
                }
            }
        });
        
        // Scroll to first visible program
        const firstVisible = document.querySelector('.program-detail:not([style*="display: none"])');
        if (firstVisible) {
            setTimeout(() => {
                firstVisible.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
        }
    }
    
    // Add click handlers to age tabs
    ageTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            ageTabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Filter programs
            const ageFilter = this.dataset.age;
            filterPrograms(ageFilter);
        });
    });
    
    // ===== SCHEDULE ITEM ANIMATIONS =====
    const scheduleItems = document.querySelectorAll('.schedule-item');
    
    const scheduleObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateX(0)';
                }, index * 100);
            }
        });
    }, { threshold: 0.1 });
    
    scheduleItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateX(-30px)';
        item.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        scheduleObserver.observe(item);
    });
    
    // ===== PROGRAM PRICING CARDS =====
    const priceCards = document.querySelectorAll('.price-card');
    
    priceCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-15px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(-10px) scale(1)';
        });
    });
    
    // ===== PROGRAM IMAGE OVERLAYS =====
    const programImages = document.querySelectorAll('.program-detail-image');
    
    programImages.forEach(image => {
        const overlay = image.querySelector('.image-overlay');
        
        image.addEventListener('mouseenter', function() {
            if (overlay) {
                overlay.style.bottom = '0';
                overlay.style.opacity = '1';
            }
        });
        
        image.addEventListener('mouseleave', function() {
            if (overlay) {
                overlay.style.bottom = '0';
                overlay.style.opacity = '1';
            }
        });
    });
    
    // ===== CURRICULUM ITEM ANIMATIONS =====
    const curriculumItems = document.querySelectorAll('.program-curriculum li');
    
    const curriculumObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateX(0)';
                }, index * 50);
            }
        });
    }, { threshold: 0.1 });
    
    curriculumItems.forEach(item => {
        item.style.opacity = '0';
        item.style.transform = 'translateX(-20px)';
        item.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        curriculumObserver.observe(item);
    });
    
    // ===== FEATURE ITEM HOVER EFFECTS =====
    const featureItems = document.querySelectorAll('.feature-item');
    
    featureItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            const icon = this.querySelector('i');
            if (icon) {
                icon.style.transform = 'scale(1.2) rotate(10deg)';
                icon.style.color = 'var(--secondary-color)';
            }
        });
        
        item.addEventListener('mouseleave', function() {
            const icon = this.querySelector('i');
            if (icon) {
                icon.style.transform = 'scale(1) rotate(0deg)';
                icon.style.color = 'var(--primary-color)';
            }
        });
    });
    
    // ===== SMOOTH SCROLL TO PROGRAM SECTIONS =====
    const programLinks = document.querySelectorAll('a[href^="#"]');
    
    programLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href !== '#' && document.querySelector(href)) {
                e.preventDefault();
                const target = document.querySelector(href);
                const offsetTop = target.offsetTop - 100;
                
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
                
                // Update active tab if needed
                const targetId = href.replace('#', '');
                const correspondingTab = document.querySelector(`[data-age="${targetId}"]`);
                if (correspondingTab) {
                    ageTabs.forEach(t => t.classList.remove('active'));
                    correspondingTab.classList.add('active');
                    filterPrograms(targetId);
                }
            }
        });
    });
    
    // ===== SUMMER PROGRAM ANIMATIONS =====
    const summerContent = document.querySelector('.summer-content');
    
    if (summerContent) {
        const summerObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, { threshold: 0.2 });
        
        summerContent.style.opacity = '0';
        summerContent.style.transform = 'translateY(50px)';
        summerContent.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        summerObserver.observe(summerContent);
    }
    
    // ===== HIGHLIGHT ITEM ANIMATIONS =====
    const highlightItems = document.querySelectorAll('.highlight-item');
    
    highlightItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(30px)';
        item.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
        
        const highlightObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, { threshold: 0.1 });
        
        highlightObserver.observe(item);
    });
    
    // ===== DYNAMIC YEAR IN FOOTER =====
    const footerYear = document.querySelector('.footer-bottom p');
    if (footerYear) {
        const currentYear = new Date().getFullYear();
        footerYear.innerHTML = footerYear.innerHTML.replace('2025', currentYear);
    }
    
    // ===== PROGRAM COMPARISON FEATURE =====
    let comparisonMode = false;
    
    // Add comparison buttons to program sections
    programSections.forEach(section => {
        const header = section.querySelector('.program-detail-content .section-tag');
        if (header && !section.querySelector('.compare-btn')) {
            const compareBtn = document.createElement('button');
            compareBtn.className = 'compare-btn btn btn-outline btn-sm';
            compareBtn.innerHTML = '<i class="fas fa-balance-scale"></i> Compare';
            compareBtn.style.marginLeft = 'auto';
            compareBtn.style.marginRight = '1rem';
            
            compareBtn.addEventListener('click', function() {
                toggleComparison(section.id);
            });
            
            header.parentNode.appendChild(compareBtn);
        }
    });
    
    function toggleComparison(programId) {
        const btn = document.querySelector(`#${programId} .compare-btn`);
        if (btn.classList.contains('active')) {
            btn.classList.remove('active');
            btn.innerHTML = '<i class="fas fa-balance-scale"></i> Compare';
        } else {
            btn.classList.add('active');
            btn.innerHTML = '<i class="fas fa-check"></i> Selected';
        }
        
        // Check if 2 or more programs are selected
        const selectedCount = document.querySelectorAll('.compare-btn.active').length;
        if (selectedCount >= 2) {
            showComparisonButton();
        } else {
            hideComparisonButton();
        }
    }
    
    function showComparisonButton() {
        if (!document.getElementById('compareProgramsBtn')) {
            const compareBtn = document.createElement('button');
            compareBtn.id = 'compareProgramsBtn';
            compareBtn.className = 'btn btn-primary';
            compareBtn.innerHTML = '<i class="fas fa-balance-scale"></i> Compare Selected Programs';
            compareBtn.style.cssText = `
                position: fixed;
                bottom: 100px;
                right: 30px;
                z-index: 1000;
                animation: slideInRight 0.5s ease;
            `;
            
            compareBtn.addEventListener('click', showComparisonModal);
            document.body.appendChild(compareBtn);
        }
    }
    
    function hideComparisonButton() {
        const btn = document.getElementById('compareProgramsBtn');
        if (btn) {
            btn.remove();
        }
    }
    
    function showComparisonModal() {
        // Create comparison modal (simplified version)
        const modal = document.createElement('div');
        modal.className = 'comparison-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Program Comparison</h3>
                <p>Comparison feature coming soon! For now, please review the program details above.</p>
                <button class="btn btn-primary" onclick="this.closest('.comparison-modal').remove()">Close</button>
            </div>
        `;
        
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        const modalContent = modal.querySelector('.modal-content');
        modalContent.style.cssText = `
            background: white;
            padding: 2rem;
            border-radius: 1rem;
            max-width: 500px;
            text-align: center;
        `;
        
        document.body.appendChild(modal);
    }
    
    console.log('Cedarville Schools - Programs page JS loaded successfully');
});

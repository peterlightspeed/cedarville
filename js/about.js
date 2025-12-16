 // ========================================
// CEDARVILLE PRIVATE SCHOOLS - ABOUT PAGE JS
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    
    // ===== STORY STATS ANIMATION =====
    const storyStatBoxes = document.querySelectorAll('.story-stat-box');
    const storySection = document.querySelector('.story-section');
    
    const animateStats = () => {
        storyStatBoxes.forEach((statBox, index) => {
            const numberElement = statBox.querySelector('.number');
            const text = numberElement.textContent;
            
            // Handle different formats
            let targetNumber = 0;
            if (text.includes('+')) {
                targetNumber = parseInt(text.replace(/[^\d]/g, ''));
            } else if (text.includes('%')) {
                targetNumber = parseInt(text.replace('%', ''));
            } else {
                targetNumber = parseInt(text.replace(/[^\d]/g, ''));
            }
            
            let currentNumber = 0;
            const increment = targetNumber / 50;
            const timer = setInterval(() => {
                currentNumber += increment;
                if (currentNumber >= targetNumber) {
                    currentNumber = targetNumber;
                    clearInterval(timer);
                    
                    // Restore original text formatting
                    numberElement.textContent = text;
                } else {
                    if (text.includes('+')) {
                        numberElement.textContent = Math.floor(currentNumber) + '+';
                    } else if (text.includes('%')) {
                        numberElement.textContent = Math.floor(currentNumber) + '%';
                    } else {
                        numberElement.textContent = Math.floor(currentNumber) + '+';
                    }
                }
            }, 40);
        });
    };
    
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateStats();
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    if (storySection) {
        statsObserver.observe(storySection);
    }
    
    // ===== ACHIEVEMENTS COUNTER ANIMATION =====
    const achievementNumbers = document.querySelectorAll('.achievement-number');
    const achievementsSection = document.querySelector('.achievements-section');
    
    const animateAchievements = () => {
        achievementNumbers.forEach(achievement => {
            const text = achievement.textContent;
            let targetNumber = parseInt(text.replace(/[^\d]/g, ''));
            
            if (text.includes('+')) {
                targetNumber = parseInt(text.replace('+', ''));
            }
            
            let current = 0;
            const increment = targetNumber / 50;
            const timer = setInterval(() => {
                current += increment;
                if (current >= targetNumber) {
                    achievement.textContent = text;
                    clearInterval(timer);
                } else {
                    if (text.includes('+')) {
                        achievement.textContent = Math.floor(current) + '+';
                    } else {
                        achievement.textContent = Math.floor(current);
                    }
                }
            }, 40);
        });
    };
    
    const achievementsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateAchievements();
                achievementsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    if (achievementsSection) {
        achievementsObserver.observe(achievementsSection);
    }
    
    // ===== TEAM CARD ANIMATIONS =====
    const teamCards = document.querySelectorAll('.team-card');
    
    const teamObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 100);
            }
        });
    }, { threshold: 0.1 });
    
    teamCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        teamObserver.observe(card);
    });
    
    // ===== VALUE CARD HOVER EFFECTS =====
    const valueCards = document.querySelectorAll('.value-card');
    
    valueCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            const icon = this.querySelector('.value-icon');
            if (icon) {
                icon.style.transform = 'scale(1.1) rotate(5deg)';
            }
        });
        
        card.addEventListener('mouseleave', function() {
            const icon = this.querySelector('.value-icon');
            if (icon) {
                icon.style.transform = 'scale(1) rotate(0deg)';
            }
        });
    });
    
    // ===== FACILITY CARD INTERACTIONS =====
    const facilityCards = document.querySelectorAll('.facility-card');
    
    facilityCards.forEach(card => {
        card.addEventListener('click', function() {
            // Create a pulse effect
            this.style.animation = 'pulse 0.6s ease';
            setTimeout(() => {
                this.style.animation = '';
            }, 600);
        });
    });
    
    // ===== MISSION/VISION CARD PARALLAX =====
    const missionVisionCards = document.querySelectorAll('.mission-card, .vision-card');
    
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        
        missionVisionCards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const speed = 0.5;
            
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                const yPos = -(scrolled * speed);
                card.querySelector('h3').style.transform = `translateY(${yPos * 0.1}px)`;
            }
        });
    });
    
    // ===== ENHANCED TEAM SOCIAL LINKS =====
    const teamSocialLinks = document.querySelectorAll('.team-social a');
    
    teamSocialLinks.forEach(link => {
        link.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px) rotate(5deg)';
        });
        
        link.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) rotate(0deg)';
        });
    });
    
    // ===== SCROLL REVEAL ANIMATIONS =====
    const revealElements = document.querySelectorAll('.section-header, .program-detail-content, .facility-card');
    
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    revealElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        revealObserver.observe(element);
    });
    
    // ===== STORY IMAGE HOVER EFFECT =====
    const storyImage = document.querySelector('.story-image img');
    
    if (storyImage) {
        storyImage.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.05)';
        });
        
        storyImage.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    }
});
    console.log('Cedarville Schools - About page JS loaded successfully');


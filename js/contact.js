/* ========================================
   CONTACT PAGE JAVASCRIPT
   Handles form submission, FAQ accordion, and animations
   ======================================== */

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Contact page JS loaded successfully');
    
    // Initialize all components
    initContactForm();
    initFAQs();
    initScrollAnimations();
});

// ===== CONTACT FORM HANDLING =====
function initContactForm() {
    const form = document.getElementById('contactForm');
    
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                firstName: document.getElementById('firstName').value,
                lastName: document.getElementById('lastName').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                subject: document.getElementById('subject').value,
                childName: document.getElementById('childName').value,
                childAge: document.getElementById('childAge').value,
                message: document.getElementById('message').value,
                newsletter: document.getElementById('newsletter').checked
            };
            
            // Show loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            submitBtn.disabled = true;
            
            // Submit to backend
            try {
                // In production, this would be your actual contact form endpoint
                // For now, just show success (contact forms typically don't need backend in static sites)
                // If you want to add backend, create an API endpoint like /api/contact
                
                await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
                
                // Success message
                showNotification('Thank you! We\'ve received your message and will get back to you soon.', 'success');
                form.reset();
                
                // Reset button
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            } catch (error) {
                console.error('Form submission error:', error);
                showNotification('Sorry, there was an error sending your message. Please try again.', 'error');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }
}

// ===== FAQ ACCORDION =====
function initFAQs() {
    const faqContainer = document.getElementById('faqContainer');
    
    if (faqContainer) {
        // Load FAQs from database/API or use static data
        loadFAQs();
    }
}

async function loadFAQs() {
    // Use fallback FAQs directly (no API call needed for static FAQ display)
    // In the future, you could fetch from your chatbot API if needed
    console.log('Loading FAQs from fallback data');
    
    const fallbackFAQs = [
        {
            question: 'What age groups do you accept?',
            answer: 'We accept children from 6 months to 6 years old, divided into three programs: Creche (6mo-2yrs), Nursery (2-4yrs), and Kindergarten (4-6yrs).'
        },
        {
            question: 'What are your school hours?',
            answer: 'Our regular school hours are Monday to Friday, 7:00 AM to 5:00 PM. We also offer extended hours for the creche program until 6:00 PM.'
        },
        {
            question: 'How can I schedule a school tour?',
            answer: 'You can schedule a tour by calling us at +234 803 939 4759, sending a WhatsApp message, or filling out the contact form above. Tours are available Monday to Friday between 10:00 AM and 4:00 PM.'
        },
        {
            question: 'Do you provide meals?',
            answer: 'Yes! We provide nutritious, age-appropriate meals and snacks throughout the day. Our menu is designed by a nutritionist and includes breakfast, lunch, and afternoon snacks.'
        },
        {
            question: 'What is your teacher-to-student ratio?',
            answer: 'We maintain small class sizes: 1:4 for Creche, 1:8 for Nursery, and 1:12 for Kindergarten. This ensures each child receives personalized attention and care.'
        }
    ];
    
    renderFAQs(fallbackFAQs);
}

function renderFAQs(faqs) {
    const container = document.getElementById('faqContainer');
    if (!container) return;
    
    container.innerHTML = faqs.map((faq, index) => `
        <div class="faq-item" data-index="${index}">
            <button class="faq-question" aria-expanded="false">
                <span>${faq.question}</span>
                <i class="fas fa-chevron-down"></i>
            </button>
            <div class="faq-answer">
                <p>${faq.answer}</p>
            </div>
        </div>
    `).join('');
    
    // Add click handlers
    const faqItems = container.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', function() {
            toggleFAQ(item);
        });
    });
}

function toggleFAQ(item) {
    const isActive = item.classList.contains('active');
    
    // Close all FAQs
    document.querySelectorAll('.faq-item').forEach(faq => {
        faq.classList.remove('active');
        faq.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
    });
    
    // Open clicked FAQ if it wasn't already open
    if (!isActive) {
        item.classList.add('active');
        item.querySelector('.faq-question').setAttribute('aria-expanded', 'true');
    }
}

// ===== SCROLL ANIMATIONS =====
function initScrollAnimations() {
    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Add fade-in class to elements
    const animatedElements = document.querySelectorAll('.quick-contact-item, .info-card, .social-link');
    animatedElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = `all 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.1}s`;
        observer.observe(el);
    });
}

// ===== NOTIFICATION SYSTEM =====
function showNotification(message, type = 'info') {
    // Remove existing notification
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            <p>${message}</p>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Show with animation
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Add notification styles
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        top: 100px;
        right: 20px;
        background: white;
        padding: 20px 24px;
        border-radius: 12px;
        box-shadow: 0 12px 48px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 16px;
        max-width: 400px;
        transform: translateX(calc(100% + 40px));
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 10000;
    }
    
    .notification.show {
        transform: translateX(0);
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
    }
    
    .notification-content i {
        font-size: 1.5rem;
    }
    
    .notification-success {
        border-left: 4px solid #10B981;
    }
    
    .notification-success i {
        color: #10B981;
    }
    
    .notification-error {
        border-left: 4px solid #EF4444;
    }
    
    .notification-error i {
        color: #EF4444;
    }
    
    .notification-content p {
        margin: 0;
        font-size: 0.938rem;
        color: var(--text-primary);
    }
    
    .notification-close {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: var(--bg-secondary);
        color: var(--text-secondary);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
    }
    
    .notification-close:hover {
        background: var(--bg-tertiary);
        color: var(--text-primary);
    }
    
    @media (max-width: 480px) {
        .notification {
            left: 20px;
            right: 20px;
            max-width: none;
        }
    }
`;
document.head.appendChild(style);

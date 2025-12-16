/* ===================================
   FORM HANDLING
   Contact & Newsletter Forms
   =================================== */

document.addEventListener('DOMContentLoaded', function() {
    
    // ===== CONTACT FORM SUBMISSION =====
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(contactForm);
            const data = Object.fromEntries(formData);
            
            // Validate form
            if (!validateContactForm(data)) {
                return;
            }
            
            // Show loading state
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;
            
            // Simulate form submission (replace with actual backend endpoint)
            try {
                // await fetch('/api/contact', {
                //     method: 'POST',
                //     headers: { 'Content-Type': 'application/json' },
                //     body: JSON.stringify(data)
                // });
                
                // Simulate delay
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                // Success
                showNotification('Message sent successfully! We\'ll get back to you soon. 💚', 'success');
                contactForm.reset();
                
            } catch (error) {
                showNotification('Oops! Something went wrong. Please try again.', 'error');
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
    
    // ===== NEWSLETTER FORM =====
    const newsletterForm = document.getElementById('newsletterForm');
    
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = newsletterForm.querySelector('input[type="email"]').value;
            
            if (!validateEmail(email)) {
                showNotification('Please enter a valid email address.', 'error');
                return;
            }
            
            const submitBtn = newsletterForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Subscribing...';
            submitBtn.disabled = true;
            
            try {
                await new Promise(resolve => setTimeout(resolve, 1000));
                showNotification('Thanks for subscribing! 🎉', 'success');
                newsletterForm.reset();
            } catch (error) {
                showNotification('Subscription failed. Please try again.', 'error');
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
    
    // ===== VALIDATION FUNCTIONS =====
    function validateContactForm(data) {
        if (!data.name || data.name.length < 2) {
            showNotification('Please enter your full name.', 'error');
            return false;
        }
        
        if (!validateEmail(data.email)) {
            showNotification('Please enter a valid email address.', 'error');
            return false;
        }
        
        if (!data.phone || data.phone.length < 10) {
            showNotification('Please enter a valid phone number.', 'error');
            return false;
        }
        
        if (!data.message || data.message.length < 10) {
            showNotification('Please enter a message (at least 10 characters).', 'error');
            return false;
        }
        
        return true;
    }
    
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    // ===== INPUT FORMATTING =====
    const phoneInputs = document.querySelectorAll('input[type="tel"]');
    phoneInputs.forEach(input => {
        input.addEventListener('input', function(e) {
            // Remove non-numeric characters
            let value = e.target.value.replace(/\D/g, '');
            e.target.value = value;
        });
    });
    
    // ===== REAL-TIME VALIDATION =====
    const emailInputs = document.querySelectorAll('input[type="email"]');
    emailInputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.value && !validateEmail(this.value)) {
                this.style.borderColor = '#FF5252';
            } else {
                this.style.borderColor = '#ddd';
            }
        });
    });
});

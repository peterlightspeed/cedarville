 // ========================================
// CEDARVILLE PRIVATE SCHOOLS - GALLERY PAGE JS
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    
    // ===== GALLERY FILTER FUNCTIONALITY =====
    const filterButtons = document.querySelectorAll('.filter-btn');
    const galleryItems = document.querySelectorAll('.gallery-item');
    let currentFilter = 'all';
    
    // Function to filter gallery items
    function filterGallery(category) {
        galleryItems.forEach(item => {
            const itemCategory = item.dataset.category;
            
            if (category === 'all' || itemCategory === category) {
                item.classList.remove('hidden');
                setTimeout(() => {
                    item.classList.add('show');
                }, 100);
            } else {
                item.classList.add('hidden');
                item.classList.remove('show');
            }
        });
        
        currentFilter = category;
    }
    
    // Add click handlers to filter buttons
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Filter gallery
            const filter = this.dataset.filter;
            filterGallery(filter);
        });
    });
    
    // ===== LIGHTBOX FUNCTIONALITY =====
    const lightboxModal = document.getElementById('lightboxModal');
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxTitle = document.getElementById('lightboxTitle');
    const lightboxDescription = document.getElementById('lightboxDescription');
    const lightboxClose = document.getElementById('lightboxClose');
    
    // Function to open lightbox
    function openLightbox(imageSrc, title, description) {
        lightboxImage.src = imageSrc;
        lightboxTitle.textContent = title;
        lightboxDescription.textContent = description;
        lightboxModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    // Function to close lightbox
    function closeLightbox() {
        lightboxModal.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    // Add click handlers to gallery items
    galleryItems.forEach(item => {
        const img = item.querySelector('img');
        const overlay = item.querySelector('.overlay-content');
        
        item.addEventListener('click', function() {
            const imageSrc = img.src;
            const title = overlay ? overlay.querySelector('h4').textContent : 'Gallery Image';
            const description = overlay ? overlay.querySelector('p').textContent : '';
            
            openLightbox(imageSrc, title, description);
        });
    });
    
    // Close lightbox on close button click
    lightboxClose.addEventListener('click', closeLightbox);
    
    // Close lightbox on background click
    lightboxModal.addEventListener('click', function(e) {
        if (e.target === lightboxModal) {
            closeLightbox();
        }
    });
    
    // Close lightbox on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && lightboxModal.classList.contains('active')) {
            closeLightbox();
        }
    });
    
    // ===== GALLERY ITEM ANIMATIONS =====
    const galleryObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('show');
                }, index * 100);
            }
        });
    }, { threshold: 0.1 });
    
    galleryItems.forEach(item => {
        item.style.opacity = '0';
        galleryObserver.observe(item);
    });
    
    // ===== LOAD MORE FUNCTIONALITY =====
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    let itemsShowing = galleryItems.length;
    
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', function() {
            // Simulate loading more images
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            this.disabled = true;
            
            setTimeout(() => {
                // Add more gallery items (in real app, this would load from server)
                addMoreGalleryItems();
                
                this.innerHTML = '<i class="fas fa-plus-circle"></i> Load More Photos';
                this.disabled = false;
                
                // Hide button if all items are loaded
                if (itemsShowing >= 30) { // Max 30 items for demo
                    this.style.display = 'none';
                }
            }, 1500);
        });
    }
    
    // Function to add more gallery items
    function addMoreGalleryItems() {
        const galleryGrid = document.querySelector('.gallery-grid');
        const newImages = [
            { category: 'activities', src: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96', title: 'Learning Together', description: 'Collaborative learning activities' },
            { category: 'students', src: 'https://images.unsplash.com/photo-1581833971358-2c8b55038729', title: 'Happy Moments', description: 'Joyful learning experiences' },
            { category: 'classroom', src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c', title: 'Study Time', description: 'Focused learning environment' },
            { category: 'events', src: 'https://images.unsplash.com/photo-1516280076260-69e958452b3e', title: 'Celebration Time', description: 'Festive school events' },
            { category: 'facilities', src: 'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952', title: 'Computer Lab', description: 'Technology-enabled learning' },
            { category: 'activities', src: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19', title: 'Sports Activities', description: 'Physical education and sports' }
        ];
        
        newImages.forEach((imageData, index) => {
            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-item hidden';
            galleryItem.dataset.category = imageData.category;
            
            galleryItem.innerHTML = `
                <div class="gallery-image">
                    <img src="${imageData.src}" alt="${imageData.title}">
                    <div class="image-overlay">
                        <div class="overlay-content">
                            <i class="fas fa-search-plus"></i>
                            <h4>${imageData.title}</h4>
                            <p>${imageData.description}</p>
                        </div>
                    </div>
                </div>
            `;
            
            galleryGrid.appendChild(galleryItem);
            
            // Add click handler
            galleryItem.addEventListener('click', function() {
                const img = this.querySelector('img');
                const overlay = this.querySelector('.overlay-content');
                openLightbox(
                    img.src,
                    overlay.querySelector('h4').textContent,
                    overlay.querySelector('p').textContent
                );
            });
            
            // Show with animation
            setTimeout(() => {
                galleryItem.classList.remove('hidden');
                galleryItem.classList.add('show');
            }, index * 200);
            
            itemsShowing++;
        });
        
        // Re-observe new items for animations
        galleryItems.forEach(item => {
            if (!item.classList.contains('show')) {
                galleryObserver.observe(item);
            }
        });
    }
    
    // ===== VIDEO PLAY BUTTON FUNCTIONALITY =====
    const videoThumbnails = document.querySelectorAll('.video-thumbnail');
    
    videoThumbnails.forEach(thumbnail => {
        const playButton = thumbnail.querySelector('.play-button');
        
        playButton.addEventListener('click', function() {
            // Create video modal (simplified for demo)
            const videoModal = document.createElement('div');
            videoModal.className = 'video-modal';
            videoModal.innerHTML = `
                <div class="video-modal-content">
                    <button class="video-modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="video-container">
                        <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0" allowfullscreen></iframe>
                    </div>
                </div>
            `;
            
            videoModal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.9);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            const modalContent = videoModal.querySelector('.video-modal-content');
            modalContent.style.cssText = `
                position: relative;
                width: 90%;
                max-width: 800px;
            `;
            
            const closeButton = videoModal.querySelector('.video-modal-close');
            closeButton.style.cssText = `
                position: absolute;
                top: -40px;
                right: 0;
                width: 40px;
                height: 40px;
                background: rgba(255,255,255,0.2);
                border: none;
                border-radius: 50%;
                color: white;
                font-size: 1.5rem;
                cursor: pointer;
            `;
            
            const videoContainer = videoModal.querySelector('.video-container');
            videoContainer.style.cssText = `
                position: relative;
                padding-bottom: 56.25%;
                height: 0;
                overflow: hidden;
            `;
            
            const iframe = videoModal.querySelector('iframe');
            iframe.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
            `;
            
            closeButton.addEventListener('click', () => {
                videoModal.remove();
            });
            
            videoModal.addEventListener('click', (e) => {
                if (e.target === videoModal) {
                    videoModal.remove();
                }
            });
            
            document.body.appendChild(videoModal);
            document.body.style.overflow = 'hidden';
        });
    });
    
    // ===== SOCIAL CARD HOVER EFFECTS =====
    const socialCards = document.querySelectorAll('.social-card');
    
    socialCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            const icon = this.querySelector('.social-icon');
            icon.style.background = 'var(--gradient-secondary)';
        });
        
        card.addEventListener('mouseleave', function() {
            const icon = this.querySelector('.social-icon');
            icon.style.background = 'var(--gradient-primary)';
        });
    });
    
    // ===== KEYBOARD NAVIGATION =====
    document.addEventListener('keydown', function(e) {
        if (lightboxModal.classList.contains('active')) {
            if (e.key === 'ArrowLeft') {
                // Navigate to previous image
                navigateLightbox('prev');
            } else if (e.key === 'ArrowRight') {
                // Navigate to next image
                navigateLightbox('next');
            }
        }
    });
    
    // Function to navigate through lightbox images
    function navigateLightbox(direction) {
        const visibleItems = Array.from(galleryItems).filter(item => {
            return !item.classList.contains('hidden');
        });
        
        const currentSrc = lightboxImage.src;
        const currentIndex = visibleItems.findIndex(item => {
            const img = item.querySelector('img');
            return img.src === currentSrc;
        });
        
        let nextIndex;
        if (direction === 'prev') {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : visibleItems.length - 1;
        } else {
            nextIndex = currentIndex < visibleItems.length - 1 ? currentIndex + 1 : 0;
        }
        
        const nextItem = visibleItems[nextIndex];
        const nextImg = nextItem.querySelector('img');
        const nextOverlay = nextItem.querySelector('.overlay-content');
        
        // Fade out current image
        lightboxImage.style.opacity = '0';
        
        setTimeout(() => {
            lightboxImage.src = nextImg.src;
            lightboxTitle.textContent = nextOverlay.querySelector('h4').textContent;
            lightboxDescription.textContent = nextOverlay.querySelector('p').textContent;
            
            // Fade in new image
            lightboxImage.style.opacity = '1';
        }, 300);
    }
    
    // Add smooth transitions to lightbox image
    lightboxImage.style.transition = 'opacity 0.3s ease';
    
    console.log('Cedarville Schools - Gallery page JS loaded successfully');
});

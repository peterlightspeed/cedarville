// Cedarville Content Management Module
// Manages blog posts, chatbot responses, and gallery images locally

const CedarvilleContent = {
    BLOG_KEY: 'cedarville_blog_posts',
    CHATBOT_KEY: 'cedarville_chatbot_responses',
    GALLERY_KEY: 'cedarville_gallery_images',
    
    // ==================== BLOG POSTS ====================
    
    initializeBlogPosts: function() {
        const existing = localStorage.getItem(this.BLOG_KEY);
        if (!existing) {
            const defaultPosts = [
                {
                    id: 1,
                    title: 'Welcome to Cedarville Private Schools',
                    excerpt: 'We are excited to welcome you to our school community. Learn about our programs and mission.',
                    content: '<p>Welcome to Cedarville Private Schools! Since our founding in 2014, we have been dedicated to providing quality early childhood education in a safe, nurturing environment.</p><p>Our programs include Creche, Toddler, Playgroup, Nursery, and Kindergarten classes, each designed to develop the whole child - intellectually, socially, emotionally, and physically.</p><p>We invite you to explore our website and learn more about what makes Cedarville special.</p>',
                    author: 'Admin',
                    category: 'Announcements',
                    imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800',
                    readTime: '3 min read',
                    tags: ['welcome', 'school', 'education'],
                    featured: true,
                    published: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: 2,
                    title: 'Enrollment Now Open for 2025 Academic Year',
                    excerpt: 'Secure your child\'s spot for the upcoming academic year. Limited spaces available.',
                    content: '<p>We are pleased to announce that enrollment for the 2025 academic year is now open!</p><p>Spaces are limited in all our programs, so we encourage interested parents to apply early.</p><h3>Required Documents:</h3><ul><li>Completed application form</li><li>Birth certificate</li><li>Passport photographs</li><li>Immunization records</li></ul><p>Contact our admissions office for more information.</p>',
                    author: 'Admissions Team',
                    category: 'Admissions',
                    imageUrl: 'https://images.unsplash.com/photo-1588072432836-e10032774350?w=800',
                    readTime: '2 min read',
                    tags: ['enrollment', 'admissions', '2025'],
                    featured: false,
                    published: true,
                    createdAt: new Date(Date.now() - 86400000).toISOString(),
                    updatedAt: new Date(Date.now() - 86400000).toISOString()
                },
                {
                    id: 3,
                    title: 'Tips for Preparing Your Child for School',
                    excerpt: 'Help your little one make a smooth transition to school life with these helpful tips.',
                    content: '<p>Starting school is a big milestone for children and parents alike. Here are some tips to help make the transition smoother:</p><h3>1. Establish Routines</h3><p>Start practicing the school schedule a few weeks before. Wake up times, meal times, and bedtimes should mirror the school day.</p><h3>2. Practice Independence</h3><p>Encourage your child to do simple tasks independently - putting on shoes, using the bathroom, eating without help.</p><h3>3. Read Together</h3><p>Reading together builds vocabulary, listening skills, and a love for learning.</p><h3>4. Visit the School</h3><p>Familiarity reduces anxiety. Visit the school grounds and meet the teachers before the first day.</p>',
                    author: 'Mrs. Adeyemi',
                    category: 'Parenting Tips',
                    imageUrl: 'https://images.unsplash.com/photo-1544776193-352d25ca82cd?w=800',
                    readTime: '5 min read',
                    tags: ['parenting', 'tips', 'preparation'],
                    featured: false,
                    published: true,
                    createdAt: new Date(Date.now() - 172800000).toISOString(),
                    updatedAt: new Date(Date.now() - 172800000).toISOString()
                }
            ];
            localStorage.setItem(this.BLOG_KEY, JSON.stringify(defaultPosts));
        }
    },
    
    getBlogPosts: function() {
        this.initializeBlogPosts();
        return JSON.parse(localStorage.getItem(this.BLOG_KEY) || '[]')
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    
    getBlogPostById: function(id) {
        const posts = this.getBlogPosts();
        return posts.find(p => p.id === parseInt(id));
    },
    
    createBlogPost: function(data) {
        const posts = this.getBlogPosts();
        const maxId = posts.length > 0 ? Math.max(...posts.map(p => p.id)) : 0;
        
        const newPost = {
            id: maxId + 1,
            title: data.title,
            excerpt: data.excerpt || data.content.substring(0, 150) + '...',
            content: data.content,
            author: data.author || 'Admin',
            category: data.category || 'General',
            imageUrl: data.imageUrl || 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800',
            readTime: data.readTime || '3 min read',
            tags: data.tags || [],
            featured: data.featured || false,
            published: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        posts.unshift(newPost);
        localStorage.setItem(this.BLOG_KEY, JSON.stringify(posts));
        
        return { success: true, post: newPost };
    },
    
    updateBlogPost: function(id, data) {
        const posts = this.getBlogPosts();
        const index = posts.findIndex(p => p.id === parseInt(id));
        
        if (index === -1) return { success: false, error: 'Post not found' };
        
        posts[index] = {
            ...posts[index],
            ...data,
            updatedAt: new Date().toISOString()
        };
        
        localStorage.setItem(this.BLOG_KEY, JSON.stringify(posts));
        return { success: true };
    },
    
    deleteBlogPost: function(id) {
        const posts = this.getBlogPosts();
        const filtered = posts.filter(p => p.id !== parseInt(id));
        localStorage.setItem(this.BLOG_KEY, JSON.stringify(filtered));
        return { success: true };
    },
    
    // ==================== CHATBOT RESPONSES ====================
    
    initializeChatbotResponses: function() {
        const existing = localStorage.getItem(this.CHATBOT_KEY);
        if (!existing) {
            const defaultResponses = [
                { id: 1, keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon'], response: "Hello! Welcome to Cedarville Private Schools! I'm here to help you learn about our programs, admissions, and more. What would you like to know?", category: 'greeting', priority: 1 },
                { id: 2, keywords: ['hours', 'time', 'schedule', 'open', 'close'], response: "Our school hours are:\n\nMonday - Friday: 7:30 AM - 3:30 PM\nAfter-school care available until 5:30 PM\nOffice hours: 7:00 AM - 4:00 PM\n\nWe are closed on weekends and public holidays.", category: 'schedule', priority: 5 },
                { id: 3, keywords: ['admission', 'enroll', 'register', 'join', 'apply'], response: "To enroll your child at Cedarville:\n\n1. Complete the application form\n2. Submit birth certificate & passport photos\n3. Provide immunization records\n4. Pay registration fee\n5. Schedule assessment (for Nursery/KG)\n\nContact us on WhatsApp: +234 801 234 5678", category: 'admissions', priority: 5 },
                { id: 4, keywords: ['age', 'years old', 'how old', 'requirement'], response: "Age requirements:\n\nCreche: 3 months - 1 year\nToddler: 1 - 2 years\nPlaygroup: 2 - 3 years\nNursery 1: 3 - 4 years\nNursery 2: 4 - 5 years\nKindergarten: 5 - 6 years", category: 'admissions', priority: 5 },
                { id: 5, keywords: ['fee', 'cost', 'price', 'tuition', 'payment'], response: "For current tuition fees and payment plans, please contact our admissions office:\n\nPhone: +234 801 234 5678\nEmail: info@cedarvilleschools.com\n\nWe offer flexible payment options including termly and annual plans.", category: 'fees', priority: 5 },
                { id: 6, keywords: ['program', 'class', 'curriculum', 'learn'], response: "Our programs include:\n\nCRECHE (3 months - 1 year) - Safe, nurturing care\nTODDLER/PLAYGROUP (1 - 3 years) - Play-based learning\nNURSERY (3 - 5 years) - Phonics, numeracy, creativity\nKINDERGARTEN (5 - 6 years) - Primary school preparation", category: 'programs', priority: 5 },
                { id: 7, keywords: ['creche', 'baby', 'infant', 'daycare'], response: "Our Creche program (3 months - 1 year) provides:\n\nSafe and hygienic environment\nQualified caregivers\nSensory stimulation activities\nRegular feeding schedules\nLow child-to-caregiver ratio (3:1)", category: 'programs', priority: 5 },
                { id: 8, keywords: ['nursery', 'preschool'], response: "Our Nursery program (3 - 5 years) focuses on:\n\nJolly Phonics for reading readiness\nBasic numeracy and counting\nCreative arts and music\nPhysical education\nSmall classes (max 15 children)", category: 'programs', priority: 5 },
                { id: 9, keywords: ['kindergarten', 'kg', 'prep'], response: "Our Kindergarten program (5 - 6 years) prepares children for primary school with:\n\nAdvanced phonics and reading\nWriting and handwriting\nMathematics fundamentals\nScience exploration\nComputer literacy", category: 'programs', priority: 5 },
                { id: 10, keywords: ['lunch', 'food', 'meal', 'feeding'], response: "Our meal program includes:\n\nMorning snack: Healthy fruits and drinks\nLunch: Balanced Nigerian meals\nAfternoon snack: Light refreshments\n\nWe accommodate allergies and dietary restrictions.", category: 'facilities', priority: 5 },
                { id: 11, keywords: ['uniform', 'dress', 'wear'], response: "School uniform requirements:\n\nSchool polo shirt (green)\nNavy blue shorts/skirt\nWhite socks and black shoes\nSchool cardigan for cold days\nPE kit for sports days\n\nUniforms available at the school office.", category: 'policies', priority: 5 },
                { id: 12, keywords: ['transport', 'bus', 'pick up'], response: "We offer school bus services covering major areas in Lagos:\n\nMorning pickup: 6:30 AM - 7:30 AM\nAfternoon drop-off: 3:30 PM - 5:00 PM\n\nRoutes include Surulere, Yaba, Ikeja, and surrounding areas.", category: 'transport', priority: 5 },
                { id: 13, keywords: ['location', 'address', 'where', 'direction'], response: "Cedarville Private Schools is located at:\n\n15 Ogunlana Drive, Surulere, Lagos\n\nLandmarks: Near National Stadium, off Adeniran Ogunsanya Street", category: 'contact', priority: 5 },
                { id: 14, keywords: ['contact', 'phone', 'call', 'email', 'whatsapp'], response: "Contact Cedarville Private Schools:\n\nPhone: +234 801 234 5678\nWhatsApp: +234 801 234 5678\nEmail: info@cedarvilleschools.com\n\nOffice Hours: Monday - Friday, 7:00 AM - 4:00 PM", category: 'contact', priority: 5 },
                { id: 15, keywords: ['facility', 'facilities', 'playground'], response: "Our facilities include:\n\nAir-conditioned classrooms\nIndoor and outdoor play areas\nLibrary corner\nComputer lab\nArt and music room\nSick bay with trained nurse\nCCTV security", category: 'facilities', priority: 5 },
                { id: 16, keywords: ['safety', 'security', 'safe', 'cctv'], response: "Child safety is our top priority:\n\n24/7 CCTV monitoring\nTrained security personnel\nControlled access gates\nStaff background checks\nEmergency evacuation plans\nFirst aid trained staff", category: 'safety', priority: 5 },
                { id: 17, keywords: ['teacher', 'staff', 'qualified'], response: "Our teaching staff:\n\nQualified early childhood educators\nTRCN certified teachers\nRegular training and development\nFirst aid certified\nLow teacher-to-child ratios", category: 'staff', priority: 5 },
                { id: 18, keywords: ['sick', 'ill', 'health', 'medical'], response: "Health and medical policies:\n\nOn-site registered nurse\nSick bay for unwell children\nNo medication without parent consent\nParents notified immediately if child is ill\nUp-to-date immunization required", category: 'health', priority: 5 },
                { id: 19, keywords: ['holiday', 'vacation', 'break', 'term'], response: "Our academic calendar:\n\nFirst Term: September - December\nSecond Term: January - April\nThird Term: May - July\n\nHolidays include Christmas break, Easter break, and summer break.", category: 'schedule', priority: 5 },
                { id: 20, keywords: ['founded', 'history', 'about', 'mission'], response: "About Cedarville Private Schools:\n\nFounded in 2014 in Lagos, Nigeria\n\nMISSION: To provide quality early childhood education in a safe, nurturing environment.\n\nVISION: To be the leading early childhood education provider, raising confident, creative children.", category: 'about', priority: 5 },
                { id: 21, keywords: ['thank', 'thanks', 'bye', 'goodbye'], response: "You're welcome! Thank you for your interest in Cedarville Private Schools.\n\nIf you have more questions, feel free to ask anytime!\n\nWhatsApp: +234 801 234 5678\n\nWe look forward to welcoming your child!", category: 'closing', priority: 10 }
            ];
            localStorage.setItem(this.CHATBOT_KEY, JSON.stringify(defaultResponses));
        }
    },
    
    getChatbotResponses: function() {
        this.initializeChatbotResponses();
        return JSON.parse(localStorage.getItem(this.CHATBOT_KEY) || '[]')
            .sort((a, b) => a.priority - b.priority);
    },
    
    getChatbotResponseById: function(id) {
        const responses = this.getChatbotResponses();
        return responses.find(r => r.id === parseInt(id));
    },
    
    createChatbotResponse: function(data) {
        const responses = this.getChatbotResponses();
        const maxId = responses.length > 0 ? Math.max(...responses.map(r => r.id)) : 0;
        
        const newResponse = {
            id: maxId + 1,
            keywords: data.keywords || [],
            response: data.response,
            category: data.category || 'general',
            priority: data.priority || 5
        };
        
        responses.push(newResponse);
        localStorage.setItem(this.CHATBOT_KEY, JSON.stringify(responses));
        
        return { success: true, response: newResponse };
    },
    
    updateChatbotResponse: function(id, data) {
        const responses = this.getChatbotResponses();
        const index = responses.findIndex(r => r.id === parseInt(id));
        
        if (index === -1) return { success: false, error: 'Response not found' };
        
        responses[index] = { ...responses[index], ...data };
        localStorage.setItem(this.CHATBOT_KEY, JSON.stringify(responses));
        
        return { success: true };
    },
    
    deleteChatbotResponse: function(id) {
        const responses = this.getChatbotResponses();
        const filtered = responses.filter(r => r.id !== parseInt(id));
        localStorage.setItem(this.CHATBOT_KEY, JSON.stringify(filtered));
        return { success: true };
    },
    
    // ==================== GALLERY IMAGES ====================
    
    initializeGalleryImages: function() {
        const existing = localStorage.getItem(this.GALLERY_KEY);
        if (!existing) {
            const defaultImages = [
                { id: 1, title: 'Classroom Learning', description: 'Students engaged in interactive learning activities', imageUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800', category: 'Classroom', createdAt: new Date().toISOString() },
                { id: 2, title: 'Outdoor Play', description: 'Children enjoying our safe playground facilities', imageUrl: 'https://images.unsplash.com/photo-1544776193-352d25ca82cd?w=800', category: 'Activities', createdAt: new Date().toISOString() },
                { id: 3, title: 'Art Class', description: 'Creativity flows in our art sessions', imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800', category: 'Activities', createdAt: new Date().toISOString() },
                { id: 4, title: 'Graduation Day', description: 'Celebrating our kindergarten graduates', imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800', category: 'Events', createdAt: new Date().toISOString() },
                { id: 5, title: 'Reading Corner', description: 'Our cozy library space for young readers', imageUrl: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800', category: 'Facilities', createdAt: new Date().toISOString() },
                { id: 6, title: 'Sports Day', description: 'Annual sports day celebrations', imageUrl: 'https://images.unsplash.com/photo-1571210862729-78a52d3779a2?w=800', category: 'Events', createdAt: new Date().toISOString() }
            ];
            localStorage.setItem(this.GALLERY_KEY, JSON.stringify(defaultImages));
        }
    },
    
    getGalleryImages: function() {
        this.initializeGalleryImages();
        return JSON.parse(localStorage.getItem(this.GALLERY_KEY) || '[]')
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    
    getGalleryImageById: function(id) {
        const images = this.getGalleryImages();
        return images.find(i => i.id === parseInt(id));
    },
    
    createGalleryImage: function(data) {
        const images = this.getGalleryImages();
        const maxId = images.length > 0 ? Math.max(...images.map(i => i.id)) : 0;
        
        const newImage = {
            id: maxId + 1,
            title: data.title || 'Untitled',
            description: data.description || '',
            imageUrl: data.imageUrl,
            category: data.category || 'General',
            createdAt: new Date().toISOString()
        };
        
        images.unshift(newImage);
        localStorage.setItem(this.GALLERY_KEY, JSON.stringify(images));
        
        return { success: true, image: newImage };
    },
    
    updateGalleryImage: function(id, data) {
        const images = this.getGalleryImages();
        const index = images.findIndex(i => i.id === parseInt(id));
        
        if (index === -1) return { success: false, error: 'Image not found' };
        
        images[index] = { ...images[index], ...data };
        localStorage.setItem(this.GALLERY_KEY, JSON.stringify(images));
        
        return { success: true };
    },
    
    deleteGalleryImage: function(id) {
        const images = this.getGalleryImages();
        const filtered = images.filter(i => i.id !== parseInt(id));
        localStorage.setItem(this.GALLERY_KEY, JSON.stringify(filtered));
        return { success: true };
    },
    
    // ==================== STATISTICS ====================
    
    getStats: function() {
        return {
            blogPosts: this.getBlogPosts().length,
            chatbotResponses: this.getChatbotResponses().length,
            galleryImages: this.getGalleryImages().length,
            users: CedarvilleAuth ? CedarvilleAuth.getUsers().length : 0
        };
    }
};

// Initialize all content on load
CedarvilleContent.initializeBlogPosts();
CedarvilleContent.initializeChatbotResponses();
CedarvilleContent.initializeGalleryImages();

// Export for use in other files
window.CedarvilleContent = CedarvilleContent;

async function checkAuth() {
    const authResult = await CedarvilleAuth.checkAuth('/api/staff/check');
    
    if (!authResult.authenticated) {
        window.location.href = 'index.html';
        return false;
    }
    
    const user = authResult.user || CedarvilleAuth.getCurrentUser();
    document.getElementById('adminUsername').textContent = user?.username || 'Staff';
    return true;
}

document.getElementById('logoutBtn').addEventListener('click', async () => {
    await CedarvilleAuth.logout('/api/staff/logout');
    window.location.href = 'index.html';
});

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        this.classList.add('active');
        
        const section = this.getAttribute('data-section');
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        document.getElementById(section).classList.add('active');
        
        if (section === 'blog') loadBlogPosts();
        if (section === 'chatbot') loadChatbotResponses();
        if (section === 'gallery') loadGalleryImages();
    });
});

async function loadDashboard() {
    try {
        const [blog, chatbot, gallery] = await Promise.all([
            fetch('/api/blog/posts?limit=100').then(r => r.json()),
            fetch('/api/staff/chatbot/responses').then(r => r.json()),
            fetch('/api/gallery/images').then(r => r.json())
        ]);
        
        document.getElementById('blogCount').textContent = blog.length;
        document.getElementById('chatbotCount').textContent = chatbot.length;
        document.getElementById('galleryCount').textContent = gallery.length;
    } catch (error) {
        console.error('Dashboard load error:', error);
    }
}

async function loadBlogPosts() {
    try {
        const response = await fetch('/api/blog/posts?limit=100');
        const posts = await response.json();
        
        const tbody = document.querySelector('#blogTable tbody');
        tbody.innerHTML = posts.map(post => `
            <tr>
                <td>${post.title}</td>
                <td>${post.category ||''}</td>
                <td>${post.author}</td>
                <td>${new Date(post.created_at).toLocaleDateString()}</td>
                <td>
                    <span class="text-muted">Edit only</span>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Blog posts load error:', error);
    }
}

async function loadChatbotResponses() {
    try {
        const response = await fetch('/api/staff/chatbot/responses');
        const responses = await response.json();
        
        const tbody = document.querySelector('#chatbotTable tbody');
        tbody.innerHTML = responses.map(r => `
            <tr>
                <td>${r.keywords.join(', ')}</td>
                <td>${r.response.substring(0, 100)}...</td>
                <td>${r.category || ''}</td>
                <td>
                    <span class="text-muted">Edit only</span>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Chatbot responses load error:', error);
    }
}

async function loadGalleryImages() {
    try {
        const response = await fetch('/api/gallery/images');
        const images = await response.json();
        
        const grid = document.getElementById('galleryGrid');
        grid.innerHTML = images.map(img => `
            <div style="position: relative;">
                <img src="${img.image_url}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px;">
                <p style="margin-top: 10px; font-size: 0.9rem;">${img.title || 'Untitled'}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Gallery load error:', error);
    }
}

document.getElementById('blogForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const tags = formData.get('tags') ? formData.get('tags').split(',').map(t => t.trim()) : [];
    
    const data = {
        title: formData.get('title'),
        excerpt: formData.get('excerpt'),
        content: formData.get('content'),
        author: formData.get('author'),
        category: formData.get('category'),
        readTime: formData.get('readTime'),
        imageUrl: formData.get('imageUrl'),
        featured: formData.get('featured') === 'on',
        tags
    };
    
    try {
        await fetch('/api/staff/blog/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        closeModal('addBlogModal');
        loadBlogPosts();
        loadDashboard();
        e.target.reset();
    } catch (error) {
        alert('Failed to add blog post');
    }
});

document.getElementById('chatbotForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const keywords = formData.get('keywords').split(',').map(k => k.trim());
    
    const data = {
        keywords,
        response: formData.get('response'),
        category: formData.get('category'),
        priority: parseInt(formData.get('priority')) || 10,
        active: true
    };
    
    try {
        await fetch('/api/staff/chatbot/responses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        closeModal('addChatbotModal');
        loadChatbotResponses();
        loadDashboard();
        e.target.reset();
    } catch (error) {
        alert('Failed to add chatbot response');
    }
});

document.getElementById('galleryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const data = {
        title: formData.get('title'),
        description: formData.get('description'),
        imageUrl: formData.get('imageUrl'),
        category: formData.get('category'),
        tags: []
    };
    
    try {
        await fetch('/api/staff/gallery/images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        closeModal('addGalleryModal');
        loadGalleryImages();
        loadDashboard();
        e.target.reset();
    } catch (error) {
        alert('Failed to add gallery image');
    }
});

// Delete functions removed - staff members can only create and edit, not delete

function showAddBlogModal() {
    document.getElementById('addBlogModal').classList.add('show');
}

function showAddChatbotModal() {
    document.getElementById('addChatbotModal').classList.add('show');
}

function showAddGalleryModal() {
    document.getElementById('addGalleryModal').classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

checkAuth().then(authenticated => {
    if (authenticated) {
        loadDashboard();
    }
});

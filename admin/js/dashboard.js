async function checkAuth() {
    const authResult = await CedarvilleAuth.checkAuth('/api/admin/check', 'admin');
    
    if (!authResult.authenticated) {
        window.location.href = 'index.html';
        return false;
    }
    
    const user = authResult.user || CedarvilleAuth.getCurrentUser();
    document.getElementById('adminUsername').textContent = user?.username || 'Admin';
    return true;
}

document.getElementById('logoutBtn').addEventListener('click', async () => {
    await CedarvilleAuth.logout('/api/admin/logout');
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
        if (section === 'settings') loadSettings();
        if (section === 'users') loadUsers();
    });
});

function loadDashboard() {
    const stats = CedarvilleContent.getStats();
    document.getElementById('blogCount').textContent = stats.blogPosts;
    document.getElementById('chatbotCount').textContent = stats.chatbotResponses;
    document.getElementById('galleryCount').textContent = stats.galleryImages;
}

function loadBlogPosts() {
    const posts = CedarvilleContent.getBlogPosts();
    
    const tbody = document.querySelector('#blogTable tbody');
    if (posts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><i class="fas fa-newspaper"></i><br>No blog posts yet. Click "Add New Post" to create one.</td></tr>';
        return;
    }
    
    tbody.innerHTML = posts.map(post => `
        <tr>
            <td>
                <div class="post-title-cell">
                    ${post.imageUrl ? `<img src="${post.imageUrl}" class="post-thumbnail" alt="">` : ''}
                    <div>
                        <strong>${post.title}</strong>
                        ${post.featured ? '<span class="badge featured"><i class="fas fa-star"></i> Featured</span>' : ''}
                    </div>
                </div>
            </td>
            <td><span class="category-badge">${post.category || 'General'}</span></td>
            <td>${post.author}</td>
            <td>${formatDate(post.createdAt)}</td>
            <td class="actions-cell">
                <button class="btn btn-sm btn-primary" onclick="editBlogPost(${post.id})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteBlogPost(${post.id})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function loadChatbotResponses() {
    const responses = CedarvilleContent.getChatbotResponses();
    
    const tbody = document.querySelector('#chatbotTable tbody');
    if (responses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state"><i class="fas fa-robot"></i><br>No chatbot responses yet. Click "Add Response" to create one.</td></tr>';
        return;
    }
    
    tbody.innerHTML = responses.map(r => `
        <tr>
            <td>
                <div class="keywords-cell">
                    ${r.keywords.slice(0, 3).map(k => `<span class="keyword-tag">${k}</span>`).join('')}
                    ${r.keywords.length > 3 ? `<span class="keyword-more">+${r.keywords.length - 3} more</span>` : ''}
                </div>
            </td>
            <td class="response-preview">${r.response.substring(0, 80)}${r.response.length > 80 ? '...' : ''}</td>
            <td><span class="category-badge ${r.category}">${r.category || 'general'}</span></td>
            <td class="actions-cell">
                <button class="btn btn-sm btn-primary" onclick="editChatbotResponse(${r.id})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteChatbotResponse(${r.id})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function loadGalleryImages() {
    const images = CedarvilleContent.getGalleryImages();
    
    const grid = document.getElementById('galleryGrid');
    if (images.length === 0) {
        grid.innerHTML = '<div class="empty-state gallery-empty"><i class="fas fa-images"></i><br>No images yet. Click "Add Image" to upload one.</div>';
        return;
    }
    
    grid.innerHTML = images.map(img => `
        <div class="gallery-card">
            <div class="gallery-image-wrapper">
                <img src="${img.imageUrl}" alt="${img.title}" onerror="this.src='https://via.placeholder.com/300x200?text=Image+Not+Found'">
                <div class="gallery-overlay">
                    <button class="btn btn-sm btn-primary" onclick="editGalleryImage(${img.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteGalleryImage(${img.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="gallery-info">
                <h4>${img.title || 'Untitled'}</h4>
                <span class="category-badge small">${img.category || 'General'}</span>
            </div>
        </div>
    `).join('');
}

// Blog Form Handler
let editingBlogId = null;

document.getElementById('blogForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const tags = formData.get('tags') ? formData.get('tags').split(',').map(t => t.trim()).filter(t => t) : [];
    
    const data = {
        title: formData.get('title'),
        excerpt: formData.get('excerpt'),
        content: formData.get('content'),
        author: formData.get('author') || 'Admin',
        category: formData.get('category'),
        readTime: formData.get('readTime') || '3 min read',
        imageUrl: formData.get('imageUrl'),
        featured: formData.get('featured') === 'on',
        tags
    };
    
    if (!data.title || !data.content) {
        showMessage('Title and content are required', 'error');
        return;
    }
    
    let result;
    if (editingBlogId) {
        result = CedarvilleContent.updateBlogPost(editingBlogId, data);
    } else {
        result = CedarvilleContent.createBlogPost(data);
    }
    
    if (result.success) {
        closeModal('addBlogModal');
        loadBlogPosts();
        loadDashboard();
        e.target.reset();
        editingBlogId = null;
        showMessage(editingBlogId ? 'Blog post updated!' : 'Blog post created!', 'success');
    } else {
        showMessage(result.error || 'Failed to save blog post', 'error');
    }
});

function showAddBlogModal() {
    editingBlogId = null;
    document.getElementById('blogModalTitle').innerHTML = '<i class="fas fa-plus-circle"></i> Add New Blog Post';
    document.getElementById('blogForm').reset();
    document.getElementById('addBlogModal').classList.add('show');
}

function editBlogPost(id) {
    const post = CedarvilleContent.getBlogPostById(id);
    if (!post) {
        showMessage('Post not found', 'error');
        return;
    }
    
    editingBlogId = id;
    document.getElementById('blogModalTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Blog Post';
    document.querySelector('#blogForm [name="title"]').value = post.title;
    document.querySelector('#blogForm [name="excerpt"]').value = post.excerpt || '';
    document.querySelector('#blogForm [name="content"]').value = post.content;
    document.querySelector('#blogForm [name="author"]').value = post.author;
    document.querySelector('#blogForm [name="category"]').value = post.category || '';
    document.querySelector('#blogForm [name="readTime"]').value = post.readTime || '';
    document.querySelector('#blogForm [name="imageUrl"]').value = post.imageUrl || '';
    document.querySelector('#blogForm [name="featured"]').checked = post.featured || false;
    document.querySelector('#blogForm [name="tags"]').value = (post.tags || []).join(', ');
    
    document.getElementById('addBlogModal').classList.add('show');
}

function deleteBlogPost(id) {
    if (!confirm('Delete this blog post? This action cannot be undone.')) return;
    
    const result = CedarvilleContent.deleteBlogPost(id);
    if (result.success) {
        loadBlogPosts();
        loadDashboard();
        showMessage('Blog post deleted!', 'success');
    } else {
        showMessage('Failed to delete blog post', 'error');
    }
}

// Chatbot Form Handler
let editingChatbotId = null;

document.getElementById('chatbotForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const keywords = formData.get('keywords').split(',').map(k => k.trim().toLowerCase()).filter(k => k);
    
    const data = {
        keywords,
        response: formData.get('response'),
        category: formData.get('category') || 'general',
        priority: parseInt(formData.get('priority')) || 5
    };
    
    if (keywords.length === 0 || !data.response) {
        showMessage('Keywords and response are required', 'error');
        return;
    }
    
    let result;
    if (editingChatbotId) {
        result = CedarvilleContent.updateChatbotResponse(editingChatbotId, data);
    } else {
        result = CedarvilleContent.createChatbotResponse(data);
    }
    
    if (result.success) {
        closeModal('addChatbotModal');
        loadChatbotResponses();
        loadDashboard();
        e.target.reset();
        editingChatbotId = null;
        showMessage(editingChatbotId ? 'Response updated!' : 'Response created!', 'success');
        
        // Also update the chatbot.js responses
        updateChatbotJS();
    } else {
        showMessage(result.error || 'Failed to save response', 'error');
    }
});

function showAddChatbotModal() {
    editingChatbotId = null;
    document.getElementById('chatbotModalTitle').innerHTML = '<i class="fas fa-plus-circle"></i> Add Chatbot Response';
    document.getElementById('chatbotForm').reset();
    document.getElementById('addChatbotModal').classList.add('show');
}

function editChatbotResponse(id) {
    const response = CedarvilleContent.getChatbotResponseById(id);
    if (!response) {
        showMessage('Response not found', 'error');
        return;
    }
    
    editingChatbotId = id;
    document.getElementById('chatbotModalTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Chatbot Response';
    document.querySelector('#chatbotForm [name="keywords"]').value = response.keywords.join(', ');
    document.querySelector('#chatbotForm [name="response"]').value = response.response;
    document.querySelector('#chatbotForm [name="category"]').value = response.category || '';
    document.querySelector('#chatbotForm [name="priority"]').value = response.priority || 5;
    
    document.getElementById('addChatbotModal').classList.add('show');
}

function deleteChatbotResponse(id) {
    if (!confirm('Delete this chatbot response? This action cannot be undone.')) return;
    
    const result = CedarvilleContent.deleteChatbotResponse(id);
    if (result.success) {
        loadChatbotResponses();
        loadDashboard();
        showMessage('Response deleted!', 'success');
        updateChatbotJS();
    } else {
        showMessage('Failed to delete response', 'error');
    }
}

function updateChatbotJS() {
    // Notify that chatbot responses have been updated
    localStorage.setItem('cedarville_chatbot_updated', Date.now().toString());
}

// Gallery Form Handler
let editingGalleryId = null;

document.getElementById('galleryForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const data = {
        title: formData.get('title'),
        description: formData.get('description'),
        imageUrl: formData.get('imageUrl'),
        category: formData.get('category') || 'General'
    };
    
    if (!data.imageUrl) {
        showMessage('Image URL is required', 'error');
        return;
    }
    
    let result;
    if (editingGalleryId) {
        result = CedarvilleContent.updateGalleryImage(editingGalleryId, data);
    } else {
        result = CedarvilleContent.createGalleryImage(data);
    }
    
    if (result.success) {
        closeModal('addGalleryModal');
        loadGalleryImages();
        loadDashboard();
        e.target.reset();
        editingGalleryId = null;
        showMessage(editingGalleryId ? 'Image updated!' : 'Image added!', 'success');
    } else {
        showMessage(result.error || 'Failed to save image', 'error');
    }
});

function showAddGalleryModal() {
    editingGalleryId = null;
    document.getElementById('galleryModalTitle').innerHTML = '<i class="fas fa-plus-circle"></i> Add Gallery Image';
    document.getElementById('galleryForm').reset();
    document.getElementById('addGalleryModal').classList.add('show');
}

function editGalleryImage(id) {
    const image = CedarvilleContent.getGalleryImageById(id);
    if (!image) {
        showMessage('Image not found', 'error');
        return;
    }
    
    editingGalleryId = id;
    document.getElementById('galleryModalTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Gallery Image';
    document.querySelector('#galleryForm [name="title"]').value = image.title || '';
    document.querySelector('#galleryForm [name="description"]').value = image.description || '';
    document.querySelector('#galleryForm [name="imageUrl"]').value = image.imageUrl;
    document.querySelector('#galleryForm [name="category"]').value = image.category || '';
    
    document.getElementById('addGalleryModal').classList.add('show');
}

function deleteGalleryImage(id) {
    if (!confirm('Delete this image? This action cannot be undone.')) return;
    
    const result = CedarvilleContent.deleteGalleryImage(id);
    if (result.success) {
        loadGalleryImages();
        loadDashboard();
        showMessage('Image deleted!', 'success');
    } else {
        showMessage('Failed to delete image', 'error');
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

// === SETTINGS MANAGEMENT ===
async function loadSettings() {
    try {
        const response = await fetch('/api/admin/settings');
        const settings = await response.json();
        
        settings.forEach(setting => {
            const input = document.getElementById(setting.setting_key);
            const textInput = document.getElementById(setting.setting_key + '_text');
            
            if (input) {
                input.value = setting.setting_value;
            }
            if (textInput) {
                textInput.value = setting.setting_value;
            }
        });
        
        setupColorInputSync();
    } catch (error) {
        console.error('Settings load error:', error);
    }
}

function setupColorInputSync() {
    const colorInputs = ['primary_color', 'secondary_color', 'accent_color'];
    
    colorInputs.forEach(id => {
        const colorInput = document.getElementById(id);
        const textInput = document.getElementById(id + '_text');
        
        if (colorInput && textInput) {
            colorInput.addEventListener('input', () => {
                textInput.value = colorInput.value;
            });
            
            textInput.addEventListener('input', () => {
                if (/^#[0-9A-Fa-f]{6}$/.test(textInput.value)) {
                    colorInput.value = textInput.value;
                }
            });
        }
    });
}

document.getElementById('themeSettingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const settings = [
        { key: 'primary_color', value: document.getElementById('primary_color').value },
        { key: 'secondary_color', value: document.getElementById('secondary_color').value },
        { key: 'accent_color', value: document.getElementById('accent_color').value }
    ];
    
    try {
        const response = await fetch('/api/admin/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settings })
        });
        
        if (response.ok) {
            showMessage('Theme colors saved successfully!', 'success');
        } else {
            showMessage('Failed to save theme colors', 'error');
        }
    } catch (error) {
        showMessage('Failed to save theme colors', 'error');
    }
});

document.getElementById('contactSettingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const settings = [
        { key: 'school_name', value: document.getElementById('school_name').value },
        { key: 'school_phone', value: document.getElementById('school_phone').value },
        { key: 'school_email', value: document.getElementById('school_email').value },
        { key: 'school_address', value: document.getElementById('school_address').value },
        { key: 'whatsapp_number', value: document.getElementById('whatsapp_number').value }
    ];
    
    try {
        const response = await fetch('/api/admin/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settings })
        });
        
        if (response.ok) {
            showMessage('School information saved successfully!', 'success');
        } else {
            showMessage('Failed to save school information', 'error');
        }
    } catch (error) {
        showMessage('Failed to save school information', 'error');
    }
});

document.getElementById('apiKeyForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const apiKey = document.getElementById('chatbot_api_key').value;
    
    // Store API key in localStorage (client-side only, not in database for security)
    if (apiKey) {
        localStorage.setItem('cedarville_chatbot_api_key', apiKey);
        showMessage('API key saved to browser storage. Note: This is stored locally and will need to be re-entered on other devices.', 'success');
    } else {
        localStorage.removeItem('cedarville_chatbot_api_key');
        showMessage('API key removed. Chatbot will use FAQ-based responses.', 'success');
    }
    
    document.getElementById('chatbot_api_key').value = '';
});

document.getElementById('passwordForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (newPassword !== confirmPassword) {
        showMessage('New passwords do not match', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showMessage('Password must be at least 6 characters', 'error');
        return;
    }
    
    // Use local password change
    const currentUser = CedarvilleAuth.getCurrentUser();
    if (!currentUser) {
        showMessage('Session expired. Please log in again.', 'error');
        return;
    }
    
    const result = CedarvilleAuth.changePassword(currentUser.username, currentPassword, newPassword);
    
    if (result.success) {
        showMessage('Password changed successfully!', 'success');
        e.target.reset();
    } else {
        showMessage(result.error || 'Failed to change password', 'error');
    }
});

function showMessage(text, type) {
    const existingMessage = document.querySelector('.message');
    if (existingMessage) existingMessage.remove();
    
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${text}`;
    
    const activeSection = document.querySelector('.content-section.active');
    activeSection.insertBefore(message, activeSection.firstChild.nextSibling);
    
    setTimeout(() => message.remove(), 5000);
}

// === USER MANAGEMENT (Local Storage) ===
function loadUsers() {
    const users = CedarvilleAuth.getUsers();
    
    const tbody = document.querySelector('#usersTable tbody');
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>
                <div class="user-info-cell">
                    <div class="user-avatar-small">
                        <i class="fas fa-${user.role === 'admin' ? 'user-shield' : 'user'}"></i>
                    </div>
                    <span>${user.username}</span>
                </div>
            </td>
            <td>${user.displayName || user.username}</td>
            <td>${user.email || '<span class="text-muted">Not set</span>'}</td>
            <td>
                <span class="role-badge ${user.role}">
                    <i class="fas fa-${user.role === 'admin' ? 'crown' : 'chalkboard-teacher'}"></i>
                    ${user.role === 'admin' ? 'Administrator' : 'Staff/Teacher'}
                </span>
            </td>
            <td>${user.lastLogin ? formatDate(user.lastLogin) : '<span class="text-muted">Never</span>'}</td>
            <td class="actions-cell">
                <button class="btn btn-sm btn-primary" onclick="editUser(${user.id})" title="Edit User">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id}, '${user.username}')" title="Delete User">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    // Update user count on dashboard
    const userCountEl = document.getElementById('userCount');
    if (userCountEl) userCountEl.textContent = users.length;
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return 'Today ' + date.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return diffDays + ' days ago';
    } else {
        return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
    }
}

function showAddUserModal() {
    document.getElementById('userModalTitle').innerHTML = '<i class="fas fa-user-plus"></i> Add New User';
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    document.getElementById('userPassword').required = true;
    document.getElementById('userPassword').placeholder = 'Minimum 6 characters';
    document.getElementById('passwordHint').style.display = 'none';
    document.getElementById('passwordLabel').textContent = 'Password *';
    document.getElementById('addUserModal').classList.add('show');
}

function editUser(id) {
    const user = CedarvilleAuth.getUserById(id);
    if (!user) {
        showMessage('User not found', 'error');
        return;
    }
    
    document.getElementById('userModalTitle').innerHTML = '<i class="fas fa-user-edit"></i> Edit User';
    document.getElementById('userId').value = id;
    document.getElementById('userUsername').value = user.username;
    document.getElementById('userDisplayName').value = user.displayName || '';
    document.getElementById('userEmail').value = user.email || '';
    document.getElementById('userRole').value = user.role;
    document.getElementById('userPassword').value = '';
    document.getElementById('userPassword').required = false;
    document.getElementById('userPassword').placeholder = 'Leave blank to keep current';
    document.getElementById('passwordHint').style.display = 'block';
    document.getElementById('passwordLabel').textContent = 'New Password';
    document.getElementById('addUserModal').classList.add('show');
}

document.getElementById('userForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const userId = document.getElementById('userId').value;
    const data = {
        username: document.getElementById('userUsername').value.trim(),
        displayName: document.getElementById('userDisplayName').value.trim() || document.getElementById('userUsername').value.trim(),
        email: document.getElementById('userEmail').value.trim(),
        role: document.getElementById('userRole').value,
        password: document.getElementById('userPassword').value
    };
    
    // Validate username
    if (data.username.length < 3) {
        showMessage('Username must be at least 3 characters', 'error');
        return;
    }
    
    // Validate password for new users
    if (!userId && (!data.password || data.password.length < 6)) {
        showMessage('Password must be at least 6 characters', 'error');
        return;
    }
    
    // Validate password length if provided for existing users
    if (userId && data.password && data.password.length > 0 && data.password.length < 6) {
        showMessage('Password must be at least 6 characters', 'error');
        return;
    }
    
    let result;
    if (userId) {
        result = CedarvilleAuth.updateUser(userId, data);
    } else {
        result = CedarvilleAuth.createUser(data);
    }
    
    if (result.success) {
        closeModal('addUserModal');
        loadUsers();
        showMessage(
            userId ? 'User updated successfully!' : `User "${data.username}" created successfully!`, 
            'success'
        );
    } else {
        showMessage(result.error || 'Failed to save user', 'error');
    }
});

function deleteUser(id, username) {
    const currentUser = CedarvilleAuth.getCurrentUser();
    
    if (currentUser && currentUser.username === username) {
        showMessage('You cannot delete your own account', 'error');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete "${username}"?\n\nThis action cannot be undone.`)) return;
    
    const result = CedarvilleAuth.deleteUser(id, currentUser?.username);
    
    if (result.success) {
        loadUsers();
        showMessage('User deleted successfully!', 'success');
    } else {
        showMessage(result.error || 'Failed to delete user', 'error');
    }
}

checkAuth().then(authenticated => {
    if (authenticated) {
        loadDashboard();
    }
});

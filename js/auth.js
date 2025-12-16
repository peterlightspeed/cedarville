// Cedarville Authentication & User Management Module
// Fully portable - works both with server and locally (for static hosting)

const CedarvilleAuth = {
    STORAGE_KEY: 'cedarville_session',
    USERS_KEY: 'cedarville_users',
    
    // Initialize default users if none exist
    initializeUsers: function() {
        const existingUsers = localStorage.getItem(this.USERS_KEY);
        if (!existingUsers) {
            const defaultUsers = [
                { 
                    id: 1,
                    username: 'admin', 
                    passwordHash: this.hashPassword('admin123'),
                    displayName: 'Administrator',
                    email: 'admin@cedarvilleschools.com',
                    role: 'admin',
                    createdAt: new Date().toISOString(),
                    lastLogin: null
                },
                { 
                    id: 2,
                    username: 'teacher', 
                    passwordHash: this.hashPassword('CedarTeacher2024!'),
                    displayName: 'Staff Teacher',
                    email: 'teacher@cedarvilleschools.com',
                    role: 'teacher',
                    createdAt: new Date().toISOString(),
                    lastLogin: null
                }
            ];
            localStorage.setItem(this.USERS_KEY, JSON.stringify(defaultUsers));
        }
    },
    
    // Get all users
    getUsers: function() {
        this.initializeUsers();
        const users = JSON.parse(localStorage.getItem(this.USERS_KEY) || '[]');
        return users.map(u => ({
            id: u.id,
            username: u.username,
            displayName: u.displayName,
            display_name: u.displayName,
            email: u.email,
            role: u.role,
            createdAt: u.createdAt,
            lastLogin: u.lastLogin,
            last_login: u.lastLogin
        }));
    },
    
    // Get user by ID
    getUserById: function(id) {
        const users = JSON.parse(localStorage.getItem(this.USERS_KEY) || '[]');
        return users.find(u => u.id === parseInt(id));
    },
    
    // Get user by username
    getUserByUsername: function(username) {
        const users = JSON.parse(localStorage.getItem(this.USERS_KEY) || '[]');
        return users.find(u => u.username.toLowerCase() === username.toLowerCase());
    },
    
    // Create new user
    createUser: function(userData) {
        this.initializeUsers();
        const users = JSON.parse(localStorage.getItem(this.USERS_KEY) || '[]');
        
        // Check if username already exists
        if (users.find(u => u.username.toLowerCase() === userData.username.toLowerCase())) {
            return { success: false, error: 'Username already exists' };
        }
        
        // Validate password
        if (!userData.password || userData.password.length < 6) {
            return { success: false, error: 'Password must be at least 6 characters' };
        }
        
        // Generate new ID
        const maxId = users.length > 0 ? Math.max(...users.map(u => u.id)) : 0;
        
        const newUser = {
            id: maxId + 1,
            username: userData.username,
            passwordHash: this.hashPassword(userData.password),
            displayName: userData.displayName || userData.username,
            email: userData.email || '',
            role: userData.role || 'teacher',
            createdAt: new Date().toISOString(),
            lastLogin: null
        };
        
        users.push(newUser);
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
        
        return { success: true, user: { id: newUser.id, username: newUser.username } };
    },
    
    // Update user
    updateUser: function(id, userData) {
        const users = JSON.parse(localStorage.getItem(this.USERS_KEY) || '[]');
        const userIndex = users.findIndex(u => u.id === parseInt(id));
        
        if (userIndex === -1) {
            return { success: false, error: 'User not found' };
        }
        
        // Check if new username conflicts with another user
        if (userData.username) {
            const existingUser = users.find(u => 
                u.username.toLowerCase() === userData.username.toLowerCase() && 
                u.id !== parseInt(id)
            );
            if (existingUser) {
                return { success: false, error: 'Username already exists' };
            }
        }
        
        // Update fields
        if (userData.username) users[userIndex].username = userData.username;
        if (userData.displayName) users[userIndex].displayName = userData.displayName;
        if (userData.email !== undefined) users[userIndex].email = userData.email;
        if (userData.role) users[userIndex].role = userData.role;
        
        // Update password if provided
        if (userData.password && userData.password.length >= 6) {
            users[userIndex].passwordHash = this.hashPassword(userData.password);
        }
        
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
        
        return { success: true, message: 'User updated successfully' };
    },
    
    // Delete user
    deleteUser: function(id, currentUsername) {
        const users = JSON.parse(localStorage.getItem(this.USERS_KEY) || '[]');
        const userToDelete = users.find(u => u.id === parseInt(id));
        
        if (!userToDelete) {
            return { success: false, error: 'User not found' };
        }
        
        // Prevent deleting yourself
        if (userToDelete.username === currentUsername) {
            return { success: false, error: 'You cannot delete your own account' };
        }
        
        // Ensure at least one admin remains
        const admins = users.filter(u => u.role === 'admin');
        if (userToDelete.role === 'admin' && admins.length <= 1) {
            return { success: false, error: 'Cannot delete the last admin account' };
        }
        
        const filteredUsers = users.filter(u => u.id !== parseInt(id));
        localStorage.setItem(this.USERS_KEY, JSON.stringify(filteredUsers));
        
        return { success: true, message: 'User deleted successfully' };
    },
    
    // Hash password (base64 for portability)
    hashPassword: function(password) {
        return btoa(unescape(encodeURIComponent(password)));
    },
    
    // Verify password
    verifyPassword: function(password, hash) {
        return this.hashPassword(password) === hash;
    },
    
    // Change password
    changePassword: function(username, currentPassword, newPassword) {
        const users = JSON.parse(localStorage.getItem(this.USERS_KEY) || '[]');
        const userIndex = users.findIndex(u => u.username === username);
        
        if (userIndex === -1) {
            return { success: false, error: 'User not found' };
        }
        
        if (!this.verifyPassword(currentPassword, users[userIndex].passwordHash)) {
            return { success: false, error: 'Current password is incorrect' };
        }
        
        if (newPassword.length < 6) {
            return { success: false, error: 'New password must be at least 6 characters' };
        }
        
        users[userIndex].passwordHash = this.hashPassword(newPassword);
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
        
        return { success: true, message: 'Password changed successfully' };
    },
    
    // Login (tries server first, falls back to local)
    login: async function(username, password, endpoint, requiredRole = null) {
        this.initializeUsers();
        
        try {
            // Try server-side authentication first
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            if (response.ok) {
                const data = await response.json();
                const user = data.user || { username, role: data.role || 'admin' };
                this.setLocalSession(user);
                this.updateLastLogin(username);
                return { success: true, user };
            } else {
                const errorData = await response.json();
                return { success: false, error: errorData.error || 'Login failed' };
            }
        } catch (error) {
            console.log('Server unavailable, using local authentication');
            return this.loginLocal(username, password, requiredRole);
        }
    },
    
    // Local login
    loginLocal: function(username, password, requiredRole = null) {
        const users = JSON.parse(localStorage.getItem(this.USERS_KEY) || '[]');
        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
        
        if (!user) {
            return { success: false, error: 'Invalid username or password' };
        }
        
        if (!this.verifyPassword(password, user.passwordHash)) {
            return { success: false, error: 'Invalid username or password' };
        }
        
        if (requiredRole === 'admin' && user.role !== 'admin') {
            return { success: false, error: 'Admin access required' };
        }
        
        const sessionUser = {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            role: user.role
        };
        
        this.setLocalSession(sessionUser);
        this.updateLastLogin(username);
        
        return { success: true, user: sessionUser };
    },
    
    // Update last login timestamp
    updateLastLogin: function(username) {
        const users = JSON.parse(localStorage.getItem(this.USERS_KEY) || '[]');
        const userIndex = users.findIndex(u => u.username === username);
        if (userIndex !== -1) {
            users[userIndex].lastLogin = new Date().toISOString();
            localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
        }
    },
    
    // Store session in localStorage
    setLocalSession: function(user) {
        const session = {
            user: user,
            token: btoa(JSON.stringify({ 
                username: user.username, 
                role: user.role, 
                timestamp: Date.now() 
            })),
            expires: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
    },
    
    // Get current session
    getSession: function() {
        const sessionStr = localStorage.getItem(this.STORAGE_KEY);
        if (!sessionStr) return null;
        
        try {
            const session = JSON.parse(sessionStr);
            if (session.expires < Date.now()) {
                this.logout();
                return null;
            }
            return session;
        } catch (e) {
            return null;
        }
    },
    
    // Check if authenticated
    checkAuth: async function(checkEndpoint, requiredRole = null) {
        this.initializeUsers();
        const localSession = this.getSession();
        
        try {
            const response = await fetch(checkEndpoint);
            const data = await response.json();
            
            if (data.authenticated) {
                return { authenticated: true, user: data.user };
            }
        } catch (error) {
            console.log('Server unavailable, checking local session');
        }
        
        if (localSession) {
            if (requiredRole === 'admin' && localSession.user.role !== 'admin') {
                return { authenticated: false };
            }
            return { authenticated: true, user: localSession.user };
        }
        
        return { authenticated: false };
    },
    
    // Logout
    logout: async function(logoutEndpoint = null) {
        localStorage.removeItem(this.STORAGE_KEY);
        
        if (logoutEndpoint) {
            try {
                await fetch(logoutEndpoint, { method: 'POST' });
            } catch (e) {
                // Server unavailable, local logout is enough
            }
        }
    },
    
    // Get current user
    getCurrentUser: function() {
        const session = this.getSession();
        return session ? session.user : null;
    },
    
    // Check if user has specific role
    hasRole: function(role) {
        const session = this.getSession();
        if (!session) return false;
        return session.user.role === role || session.user.role === 'admin';
    }
};

// Initialize users on load
CedarvilleAuth.initializeUsers();

// Export for use in other files
window.CedarvilleAuth = CedarvilleAuth;

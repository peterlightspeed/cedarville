document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in
    checkExistingAuth();
    
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('errorMessage');
        
        // Use hybrid auth (server first, then local fallback)
        const result = await CedarvilleAuth.login(
            username, 
            password, 
            '/api/admin/login',
            'admin' // Require admin role
        );
        
        if (result.success) {
            window.location.href = 'dashboard.html';
        } else {
            errorMessage.textContent = result.error || 'Invalid credentials';
            errorMessage.classList.add('show');
        }
    });
    
    async function checkExistingAuth() {
        const authResult = await CedarvilleAuth.checkAuth('/api/admin/check', 'admin');
        if (authResult.authenticated) {
            window.location.href = 'dashboard.html';
        }
    }
});

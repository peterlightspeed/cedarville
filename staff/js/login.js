// Staff Portal Login
document.addEventListener('DOMContentLoaded', () => {
    checkExistingAuth();
    
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // Use hybrid auth (server first, then local fallback)
        const result = await CedarvilleAuth.login(
            username, 
            password, 
            '/api/staff/login',
            null // Allow any role (admin or teacher)
        );
        
        if (result.success) {
            window.location.href = '/staff/dashboard.html';
        } else {
            showError(result.error || 'Login failed');
        }
    });
    
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.add('show');
        
        setTimeout(() => {
            errorMessage.classList.remove('show');
        }, 5000);
    }
    
    async function checkExistingAuth() {
        const authResult = await CedarvilleAuth.checkAuth('/api/staff/check');
        if (authResult.authenticated) {
            window.location.href = '/staff/dashboard.html';
        }
    }
});

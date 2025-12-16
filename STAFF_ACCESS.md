# Staff Portal Access Information

## Teacher/Staff Login Credentials

**Portal URL**: https://[your-replit-url]/staff

**Username**: `teacher`
**Password**: `CedarTeacher2024!`

---

## Security Notes

1. **This is NOT a "hidden link"** - This is a secure, role-based authentication system
2. Teachers cannot access the admin panel at `/admin`
3. Admins cannot access the staff portal at `/staff`
4. All sessions are encrypted and stored in PostgreSQL
5. Passwords are hashed with bcrypt

---

## What Teachers Can Do

### ✅ Allowed
- Create, edit, and publish blog posts
- Add and update gallery images
- Manage chatbot FAQ responses
- View dashboard statistics

### ❌ NOT Allowed
- Delete blog posts (admin only)
- Delete gallery images (admin only)
- Delete chatbot responses (admin only)
- Manage user accounts
- Access admin-only features

---

## Changing Teacher Password

To change the teacher password, an admin must:

1. Login to the admin panel at `/admin`
2. Use username: `admin`, password: `admin123`
3. Access the database or create a password change feature

Or use SQL:
```sql
-- Generate a new bcrypt hash for your password
UPDATE admins 
SET password_hash = '[new-bcrypt-hash]'
WHERE username = 'teacher';
```

---

## Adding More Teachers

To add additional teacher accounts, an admin can run:

```sql
INSERT INTO admins (username, password_hash, role, display_name) 
VALUES ('username', '[bcrypt-hash]', 'teacher', 'Display Name');
```

---

## Admin Access (Full Control)

**Portal URL**: https://[your-replit-url]/admin

**Username**: `admin`
**Password**: `admin123`

**IMPORTANT**: Change the admin password immediately after deployment!

---

## Security Best Practices

1. ✅ Change default passwords
2. ✅ Use strong, unique passwords
3. ✅ Don't share credentials
4. ✅ Logout after each session
5. ✅ Access only from secure networks

---

Last Updated: November 23, 2025

# 🚀 Cedarville Schools - Quick Reference Card

## 🔑 Admin Login Credentials

```
Admin Panel: https://your-domain.com/admin/
Username: admin
Password: admin123
```

⚠️ **CHANGE PASSWORD IMMEDIATELY AFTER FIRST LOGIN**

---

## 📍 Important URLs

| Page | URL |
|------|-----|
| Homepage | `/` or `/index.html` |
| About | `/about.html` |
| Programs | `/programs.html` |
| Gallery | `/gallery.html` |
| Blog | `/blog.html` |
| Contact | `/contact.html` |
| **Admin Panel** | `/admin/` |
| **Admin Dashboard** | `/admin/dashboard.html` |

---

## 🎯 Quick Tasks

### Add Blog Post
1. Go to `/admin/`
2. Login with credentials above
3. Click "Blog Posts" tab
4. Click "Create New Post"
5. Fill form and publish

### Add Chatbot FAQ
1. Login to admin panel
2. Click "Chatbot" tab
3. Click "Create New Response"
4. Add question, answer, and keywords
5. Save

### Add Gallery Image
1. Login to admin panel
2. Click "Gallery" tab
3. Click "Add New Image"
4. Enter title, description, URL, and category
5. Save

---

## 💡 Chatbot Keyword Examples

**Admission Questions**:
- Keywords: `admission, enroll, enrollment, register, registration, apply, application`

**Fee Questions**:
- Keywords: `fees, tuition, cost, price, payment, charges, how much`

**Program Questions**:
- Keywords: `programs, classes, creche, nursery, kindergarten, curriculum`

**Hours Questions**:
- Keywords: `hours, time, schedule, open, close, when`

---

## 🗄️ Database Tables

| Table | Purpose |
|-------|---------|
| `admins` | Admin user accounts |
| `blog_posts` | Blog articles |
| `chatbot_responses` | FAQ responses for chatbot |
| `faqs` | Additional FAQs |
| `gallery` | Image gallery |
| `conversations` | Chatbot chat history |
| `session` | User sessions |

---

## 🔧 Technical Details

### Server
- **Port**: 5000
- **Framework**: Express.js + Node.js
- **Database**: PostgreSQL (Replit-hosted)

### Authentication
- **Method**: Session-based with bcrypt
- **Session Duration**: 30 days
- **Password Hashing**: bcrypt (10 rounds)

### API Endpoints
- Public: `/api/blog/posts`, `/api/chatbot`, `/api/gallery`
- Admin: `/api/admin/*` (requires authentication)

---

## 📱 Responsive Design

### Breakpoints
- **Mobile**: < 480px
- **Tablet**: 481px - 768px
- **Desktop**: > 768px

### Mobile Features
- Full-screen chatbot
- Stacked navigation menu
- Touch-friendly buttons
- Optimized images

---

## 🛡️ Security Checklist

- [ ] Changed default admin password
- [ ] Verified all blog posts before publishing
- [ ] Got parent consent for photos
- [ ] Reviewed chatbot responses for accuracy
- [ ] Tested admin panel logout
- [ ] Backed up database

---

## 📞 Emergency Contacts

**Technical Issues**: [Your email]
**Content Questions**: [Your email]
**Database Backup**: Replit Database Tab

---

**Version**: 1.0
**Last Updated**: November 22, 2025

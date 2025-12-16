# Cedarville Private Schools Website

## Overview
Premium early childhood education website for Cedarville Private Schools in Lagos, Nigeria (founded 2014). Features authentic handbook content, Creche/Nursery/Kindergarten program information, hardcoded FAQ chatbot with keyword matching, role-based admin/staff panels, and developer portfolio CTA integration. Site is fully portable - works on GitHub Pages without server. TODO comments included for logo replacement and pricing updates.

## Project Structure
- **HTML Pages**: index.html, about.html, programs.html, gallery.html, contact.html, blog.html
- **Admin Panel**: /admin folder with login and dashboard (full control)
- **Staff Portal**: /staff folder with separate login and dashboard (limited permissions)
- **CSS**: Organized by page (global.css, home.css, about.css, blog.css, admin.css, etc.)
- **JavaScript**: Modular JS files for different functionality
- **Backend**: Express.js REST API server (server.js) with role-based authentication
- **Database**: PostgreSQL with pg_trgm extension for fuzzy matching

## Technology Stack
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL (Replit-hosted) - optional, works without it
- **Authentication**: Hybrid (server sessions + localStorage fallback for portability)
- **Password Hashing**: bcryptjs (server) / base64 (local fallback)
- **External Libraries**: Font Awesome, Google Fonts (Poppins, Nunito)

## Features
- Responsive design for mobile, tablet, and desktop
- Dark mode toggle across all pages
- Hardcoded FAQ chatbot with keyword matching (no database required)
- 21 authentic FAQs from official handbook (admissions, programs, policies)
- Dynamic blog with category filtering
- Image gallery with lightbox
- Contact forms with validation
- Smooth scrolling and animations
- WhatsApp integration for enrollment
- Role-based authentication (Admin vs Teacher/Staff)
- Secure admin panel for full content management
- Separate teacher/staff portal with limited permissions
- Developer portfolio CTA with animated heart icon
- TODO comments for logo replacement and pricing updates

## Database Schema
### Tables
1. **admins** - User credentials with bcrypt-hashed passwords and role field ('admin' or 'teacher')
2. **blog_posts** - Blog articles with title, content, category, author, and image
3. **chatbot_responses** - 20+ FAQ responses from handbook with keywords for fuzzy matching
4. **faqs** - Frequently asked questions (legacy)
5. **gallery** - Image gallery with titles, descriptions, and categories
6. **conversations** - Chatbot conversation history with timestamps
7. **session** - Express session store (auto-created by connect-pg-simple)
8. **site_settings** - Website customization settings (colors, school info, contact details)

### PostgreSQL Extensions
- **pg_trgm** - Trigram-based fuzzy text matching for improved chatbot intelligence

## API Endpoints

### Public Endpoints
- `GET /api/blog/posts` - List all published blog posts
- `GET /api/blog/posts/:id` - Get single blog post
- `POST /api/chatbot` - Send message to chatbot
- `GET /api/chatbot/responses` - Get all chatbot FAQ responses
- `GET /api/gallery` - Get all gallery images

### Admin Endpoints (Authentication Required - Full Access)
- `POST /api/admin/login` - Admin login
- `POST /api/admin/logout` - Admin logout
- `GET /api/admin/check` - Check authentication status
- `GET /api/admin/stats` - Dashboard statistics

### Staff Endpoints (Authentication Required - Limited Access)
- `POST /api/staff/login` - Teacher/staff login
- `POST /api/staff/logout` - Teacher/staff logout
- `GET /api/staff/check` - Check authentication status
- Staff have create/edit permissions but cannot delete content

#### Blog Management
- `POST /api/admin/blog/posts` - Create new blog post
- `PUT /api/admin/blog/posts/:id` - Update blog post
- `DELETE /api/admin/blog/posts/:id` - Delete blog post

#### Chatbot Management
- `POST /api/admin/chatbot/responses` - Create new chatbot response
- `PUT /api/admin/chatbot/responses/:id` - Update chatbot response
- `DELETE /api/admin/chatbot/responses/:id` - Delete chatbot response
- `GET /api/admin/chatbot/conversations` - View conversation history

#### Gallery Management
- `POST /api/admin/gallery` - Add gallery image
- `PUT /api/admin/gallery/:id` - Update gallery image
- `DELETE /api/admin/gallery/:id` - Delete gallery image

#### Settings Management
- `GET /api/admin/settings` - Get all site settings
- `PUT /api/admin/settings` - Update multiple settings
- `POST /api/admin/settings` - Create/update a single setting
- `GET /api/settings/theme` - Public endpoint for theme colors

#### Password Management
- `PUT /api/admin/password` - Change admin password (requires current password)

#### User Management
- `GET /api/admin/users` - List all users (admin and staff)
- `POST /api/admin/users` - Create new user
- `PUT /api/admin/users/:id` - Update user (username, email, role, password)
- `DELETE /api/admin/users/:id` - Delete user (cannot delete self)

## Admin Panel
**Location**: `/admin/`

**Default Credentials**:
- Username: `admin`
- Password: `admin123`

### Admin Features
- Dashboard with statistics (total posts, chatbot responses, gallery images, conversations)
- Blog post management (create, edit, delete, publish/unpublish)
- Chatbot response management (create, edit, delete FAQs with keywords)
- Gallery management (add, edit, delete images)
- Conversation history viewing
- Website settings (theme colors, school information)
- Password change functionality
- User management (add, edit, delete staff accounts)
- Responsive design for all devices

## Staff Portal
**Location**: `/staff/`

**Default Credentials**:
- Username: `teacher`
- Password: `CedarTeacher2024!`

### Staff Features
- Dashboard with statistics (total posts, chatbot responses, gallery images)
- Blog post management (create, edit - NO delete access)
- Chatbot response management (create, edit - NO delete access)
- Gallery management (add, edit - NO delete access)
- Same interface as admin but with restricted permissions
- Responsive design for all devices

**Note**: See `STAFF_ACCESS.md` for complete access documentation and security information

## Security Features
- Session-based authentication with PostgreSQL session store
- Password hashing with bcrypt
- Protected admin routes with authentication middleware
- Input validation on all forms
- SQL injection protection via parameterized queries
- Cache-control headers to prevent outdated content

## Recent Changes
- **December 15, 2025**: Complete localStorage-based portability implementation
  - Created content.js module for managing blog/chatbot/gallery in localStorage
  - Implemented hybrid authentication (server-first, localStorage fallback)
  - All content management works offline without server dependency
  - Site fully portable to GitHub Pages or any static hosting
  - Professional admin UI with gradient badges, avatars, and hover effects
  - User management with CRUD operations using localStorage
  - Chatbot now uses content module for FAQ responses

- **November 23, 2025**: Role-based authentication, fuzzy matching, and documentation
  - Implemented role-based access control (Admin vs Teacher/Staff)
  - Created separate staff portal at /staff with limited permissions
  - Enhanced chatbot with PostgreSQL pg_trgm fuzzy matching
  - Populated chatbot with 20 authentic FAQs from official handbook
  - Updated all pages with handbook content (founded 2014, Mission/Vision)
  - Added developer portfolio CTA button across all pages
  - Created TODO_UPDATES.md guide for logo/pricing updates
  - Created STAFF_ACCESS.md with staff credentials and security info
  - Updated contact page with accurate school hours from handbook
  - Added TODO comments throughout codebase

- **November 22, 2025**: Complete website enhancement implementation
  - Set up PostgreSQL database with full schema
  - Created comprehensive REST API with authentication
  - Built dynamic blog page with category filtering
  - Enhanced chatbot to use database-driven FAQ responses
  - Developed complete admin panel with CRUD operations
  - Implemented session-based authentication
  - Added conversation history tracking
  - Configured cache-control headers for iframe preview
  - Set up workflow for automatic deployment

## Development

### Running Locally
```bash
npm install
npm start
```
The site will be available at http://localhost:5000

### Database Initialization
The database is seeded automatically on first run with:
- Sample blog posts
- 20+ chatbot FAQ responses from handbook
- Gallery images
- Admin user (admin/admin123)
- Teacher/staff user (teacher/CedarTeacher2024!)
- PostgreSQL pg_trgm extension for fuzzy matching

### Server Configuration
- Port: 5000 (bound to 0.0.0.0 for Replit compatibility)
- Session expiry: 30 days
- Cache control: Disabled for development
- Static file serving: Enabled for root, /admin, and /staff directories

## Deployment
Configured for Replit deployment with:
- Express.js serving static files and API
- PostgreSQL database integration
- Session persistence across restarts
- Proper cache headers for iframe preview

## File Organization
```
/
├── server.js                 # Express server with API endpoints
├── db-init.sql              # Database schema
├── seed-database.js         # Database seeding script
├── package.json             # Dependencies
├── index.html               # Homepage
├── about.html               # About page
├── programs.html            # Programs page
├── gallery.html             # Gallery page
├── blog.html                # Blog page (dynamic)
├── contact.html             # Contact page
├── css/                     # Stylesheets
├── js/                      # JavaScript modules
│   ├── global.js
│   ├── chatbot.js          # Database-driven chatbot
│   ├── dark-mode.js
│   └── ...
├── images/                  # Static images
├── admin/                   # Admin panel
│   ├── index.html          # Login page
│   ├── dashboard.html      # Admin dashboard
│   ├── css/
│   │   └── admin.css
│   └── js/
│       ├── login.js
│       └── dashboard.js
├── staff/                   # Staff/Teacher portal
│   ├── index.html          # Login page
│   ├── dashboard.html      # Staff dashboard
│   ├── css/
│   │   ├── staff.css
│   │   └── dashboard.css
│   └── js/
│       ├── login.js
│       └── dashboard.js
├── TODO_UPDATES.md          # Guide for logo/pricing updates
├── STAFF_ACCESS.md          # Staff credentials and security info
└── data/                    # Legacy JSON files (deprecated)
```

## Notes
- Chatbot uses keyword-based matching with database responses (no external API)
- All admin operations require authentication
- Session store auto-creates table on first run
- Blog posts support HTML content
- Gallery images use URL references

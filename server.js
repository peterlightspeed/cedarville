const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = 5000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || 'cedarville-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }
}));

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// === API ROUTES ===

// Enhanced Chatbot API with fuzzy matching
app.post('/api/chatbot', async (req, res) => {
  try {
    const { message } = req.body;
    const userMessage = message.toLowerCase();
    
    // Try exact keyword match first
    let result = await pool.query(`
      SELECT response, category, priority FROM chatbot_responses 
      WHERE active = true 
      AND EXISTS (
        SELECT 1 FROM unnest(keywords) keyword 
        WHERE $1 LIKE '%' || keyword || '%'
      )
      ORDER BY priority DESC
      LIMIT 1
    `, [userMessage]);
    
    // If no exact match, try fuzzy matching with trigram similarity
    if (result.rows.length === 0) {
      result = await pool.query(`
        SELECT response, category, priority,
        MAX(similarity($1, keyword)) as match_score
        FROM chatbot_responses, unnest(keywords) as keyword
        WHERE active = true
        GROUP BY id, response, category, priority
        HAVING MAX(similarity($1, keyword)) > 0.3
        ORDER BY match_score DESC, priority DESC
        LIMIT 1
      `, [userMessage]);
    }
    
    if (result.rows.length > 0) {
      res.json({ response: result.rows[0].response, category: result.rows[0].category });
    } else {
      // Suggest categories if no match found
      res.json({ 
        response: "I'm not sure how to answer that. You can ask me about:\n\n• School hours and schedule\n• Admissions and enrollment\n• Programs (Creche, Nursery, Kindergarten)\n• Fees and payment\n• Facilities and activities\n• Lunch and meals\n• Transportation\n\nWhat would you like to know?",
        category: "default"
      });
    }
  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({ error: 'Failed to get response' });
  }
});

// Blog API
app.get('/api/blog/posts', async (req, res) => {
  try {
    const { category, featured, limit = 10 } = req.query;
    
    let query = 'SELECT * FROM blog_posts WHERE published = true';
    const params = [];
    let paramIndex = 1;
    
    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
    if (featured === 'true') {
      query += ` AND featured = true`;
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
    params.push(parseInt(limit));
    
    const result = await pool.query(query, params);
    
    for (let post of result.rows) {
      const tags = await pool.query('SELECT tag FROM blog_tags WHERE post_id = $1', [post.id]);
      post.tags = tags.rows.map(t => t.tag);
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Blog posts error:', error);
    res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
});

app.get('/api/blog/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM blog_posts WHERE id = $1 AND published = true', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const post = result.rows[0];
    const tags = await pool.query('SELECT tag FROM blog_tags WHERE post_id = $1', [id]);
    post.tags = tags.rows.map(t => t.tag);
    
    res.json(post);
  } catch (error) {
    console.error('Blog post error:', error);
    res.status(500).json({ error: 'Failed to fetch blog post' });
  }
});

app.get('/api/blog/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT category FROM blog_posts WHERE published = true ORDER BY category');
    res.json(result.rows.map(r => r.category));
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Gallery API
app.get('/api/gallery/images', async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = 'SELECT * FROM gallery_images ORDER BY uploaded_at DESC';
    const params = [];
    
    if (category) {
      query = 'SELECT * FROM gallery_images WHERE category = $1 ORDER BY uploaded_at DESC';
      params.push(category);
    }
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Gallery error:', error);
    res.status(500).json({ error: 'Failed to fetch gallery images' });
  }
});

// FAQ API
app.get('/api/faqs', async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = 'SELECT * FROM faqs WHERE active = true ORDER BY display_order';
    const params = [];
    
    if (category) {
      query = 'SELECT * FROM faqs WHERE active = true AND category = $1 ORDER BY display_order';
      params.push(category);
    }
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('FAQs error:', error);
    res.status(500).json({ error: 'Failed to fetch FAQs' });
  }
});

// Admin Login API (Full Admin Only)
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const result = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const admin = result.rows[0];
    
    // Only allow 'admin' role to login via admin panel
    if (admin.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Please use the staff portal.' });
    }
    
    const validPassword = await bcrypt.compare(password, admin.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    req.session.userId = admin.id;
    req.session.username = admin.username;
    req.session.role = admin.role;
    req.session.displayName = admin.display_name;
    
    // Update last login
    await pool.query('UPDATE admins SET last_login = NOW() WHERE id = $1', [admin.id]);
    
    res.json({ success: true, username: admin.username, role: admin.role });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Staff/Teacher Login API
app.post('/api/staff/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const result = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Only allow 'teacher' role to login via staff portal
    if (user.role !== 'teacher') {
      return res.status(403).json({ error: 'Access denied. Please use the admin portal.' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    req.session.displayName = user.display_name;
    
    // Update last login
    await pool.query('UPDATE admins SET last_login = NOW() WHERE id = $1', [user.id]);
    
    res.json({ success: true, username: user.username, role: user.role, displayName: user.display_name });
  } catch (error) {
    console.error('Staff login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.post('/api/staff/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/admin/check', (req, res) => {
  if (req.session.userId && req.session.role === 'admin') {
    res.json({ authenticated: true, username: req.session.username, role: req.session.role });
  } else {
    res.json({ authenticated: false });
  }
});

app.get('/api/staff/check', (req, res) => {
  if (req.session.userId && req.session.role === 'teacher') {
    res.json({ authenticated: true, username: req.session.username, role: req.session.role, displayName: req.session.displayName });
  } else {
    res.json({ authenticated: false });
  }
});

// Authentication Middleware
function requireAdmin(req, res, next) {
  if (!req.session.userId || req.session.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized - Admin access required' });
  }
  next();
}

function requireStaff(req, res, next) {
  if (!req.session.userId || req.session.role !== 'teacher') {
    return res.status(401).json({ error: 'Unauthorized - Staff access required' });
  }
  next();
}

function requireAnyAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Admin Blog Management
app.post('/api/admin/blog/posts', requireAdmin, async (req, res) => {
  try {
    const { title, excerpt, content, author, category, readTime, imageUrl, featured, tags } = req.body;
    
    const result = await pool.query(`
      INSERT INTO blog_posts (title, excerpt, content, author, category, read_time, image_url, featured)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [title, excerpt, content, author, category, readTime, imageUrl, featured]);
    
    const postId = result.rows[0].id;
    
    if (tags && Array.isArray(tags)) {
      for (const tag of tags) {
        await pool.query('INSERT INTO blog_tags (post_id, tag) VALUES ($1, $2)', [postId, tag]);
      }
    }
    
    res.json({ success: true, id: postId });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

app.put('/api/admin/blog/posts/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, excerpt, content, author, category, readTime, imageUrl, featured, tags } = req.body;
    
    await pool.query(`
      UPDATE blog_posts 
      SET title = $1, excerpt = $2, content = $3, author = $4, category = $5, 
          read_time = $6, image_url = $7, featured = $8, updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
    `, [title, excerpt, content, author, category, readTime, imageUrl, featured, id]);
    
    await pool.query('DELETE FROM blog_tags WHERE post_id = $1', [id]);
    
    if (tags && Array.isArray(tags)) {
      for (const tag of tags) {
        await pool.query('INSERT INTO blog_tags (post_id, tag) VALUES ($1, $2)', [id, tag]);
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

app.delete('/api/admin/blog/posts/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM blog_posts WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Admin Chatbot Management
app.get('/api/admin/chatbot/responses', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM chatbot_responses ORDER BY category, priority DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get responses error:', error);
    res.status(500).json({ error: 'Failed to fetch responses' });
  }
});

app.post('/api/admin/chatbot/responses', requireAdmin, async (req, res) => {
  try {
    const { keywords, response, category, priority, active } = req.body;
    
    const result = await pool.query(`
      INSERT INTO chatbot_responses (keywords, response, category, priority, active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [keywords, response, category, priority || 0, active !== false]);
    
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Create response error:', error);
    res.status(500).json({ error: 'Failed to create response' });
  }
});

app.put('/api/admin/chatbot/responses/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { keywords, response, category, priority, active } = req.body;
    
    await pool.query(`
      UPDATE chatbot_responses 
      SET keywords = $1, response = $2, category = $3, priority = $4, active = $5
      WHERE id = $6
    `, [keywords, response, category, priority, active, id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update response error:', error);
    res.status(500).json({ error: 'Failed to update response' });
  }
});

app.delete('/api/admin/chatbot/responses/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM chatbot_responses WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete response error:', error);
    res.status(500).json({ error: 'Failed to delete response' });
  }
});

// Admin Gallery Management
app.post('/api/admin/gallery/images', requireAdmin, async (req, res) => {
  try {
    const { title, description, imageUrl, category, tags } = req.body;
    
    const result = await pool.query(`
      INSERT INTO gallery_images (title, description, image_url, category, tags)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [title, description, imageUrl, category, tags || []]);
    
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Add gallery image error:', error);
    res.status(500).json({ error: 'Failed to add image' });
  }
});

app.delete('/api/admin/gallery/images/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM gallery_images WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// === ADMIN SETTINGS MANAGEMENT ===
app.get('/api/admin/settings', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM site_settings ORDER BY category, setting_key');
    res.json(result.rows);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.put('/api/admin/settings', requireAdmin, async (req, res) => {
  try {
    const { settings } = req.body;
    
    for (const setting of settings) {
      await pool.query(
        'UPDATE site_settings SET setting_value = $1, updated_at = CURRENT_TIMESTAMP WHERE setting_key = $2',
        [setting.value, setting.key]
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

app.post('/api/admin/settings', requireAdmin, async (req, res) => {
  try {
    const { key, value, type, category } = req.body;
    
    const result = await pool.query(`
      INSERT INTO site_settings (setting_key, setting_value, setting_type, category)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [key, value, type || 'text', category || 'general']);
    
    res.json({ success: true, setting: result.rows[0] });
  } catch (error) {
    console.error('Create setting error:', error);
    res.status(500).json({ error: 'Failed to create setting' });
  }
});

// === ADMIN PASSWORD MANAGEMENT ===
app.put('/api/admin/password', requireAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const userResult = await pool.query('SELECT * FROM admins WHERE id = $1', [req.session.userId]);
    const user = userResult.rows[0];
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE admins SET password_hash = $1 WHERE id = $2', [hashedPassword, req.session.userId]);
    
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// === ADMIN USER MANAGEMENT ===
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email, role, display_name, created_at, last_login FROM admins ORDER BY role, username');
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const { username, password, email, role, displayName } = req.body;
    
    const existingUser = await pool.query('SELECT id FROM admins WHERE username = $1', [username]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(`
      INSERT INTO admins (username, password_hash, email, role, display_name)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, email, role, display_name, created_at
    `, [username, hashedPassword, email || null, role || 'teacher', displayName || username]);
    
    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.put('/api/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, email, role, displayName } = req.body;
    
    const existingUser = await pool.query('SELECT id FROM admins WHERE username = $1 AND id != $2', [username, id]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query(`
        UPDATE admins SET username = $1, password_hash = $2, email = $3, role = $4, display_name = $5
        WHERE id = $6
      `, [username, hashedPassword, email || null, role, displayName || username, id]);
    } else {
      await pool.query(`
        UPDATE admins SET username = $1, email = $2, role = $3, display_name = $4
        WHERE id = $5
      `, [username, email || null, role, displayName || username, id]);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (parseInt(id) === req.session.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    await pool.query('DELETE FROM admins WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Public settings API (for frontend theme)
app.get('/api/settings/theme', async (req, res) => {
  try {
    const result = await pool.query("SELECT setting_key, setting_value FROM site_settings WHERE category = 'theme'");
    const settings = {};
    result.rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });
    res.json(settings);
  } catch (error) {
    console.error('Get theme settings error:', error);
    res.status(500).json({ error: 'Failed to fetch theme settings' });
  }
});

// === STAFF/TEACHER API ENDPOINTS ===
// Teachers can manage blog posts, gallery, and chatbot (same permissions as admin for these)

// Staff Blog Management
app.get('/api/staff/blog/posts', requireStaff, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM blog_posts ORDER BY created_at DESC');
    
    for (let post of result.rows) {
      const tags = await pool.query('SELECT tag FROM blog_tags WHERE post_id = $1', [post.id]);
      post.tags = tags.rows.map(t => t.tag);
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Staff get posts error:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

app.post('/api/staff/blog/posts', requireStaff, async (req, res) => {
  try {
    const { title, excerpt, content, author, category, readTime, imageUrl, featured, tags } = req.body;
    
    const result = await pool.query(`
      INSERT INTO blog_posts (title, excerpt, content, author, category, read_time, image_url, featured)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [title, excerpt, content, author || req.session.displayName, category, readTime, imageUrl, featured]);
    
    const postId = result.rows[0].id;
    
    if (tags && Array.isArray(tags)) {
      for (const tag of tags) {
        await pool.query('INSERT INTO blog_tags (post_id, tag) VALUES ($1, $2)', [postId, tag]);
      }
    }
    
    res.json({ success: true, id: postId });
  } catch (error) {
    console.error('Staff create post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

app.put('/api/staff/blog/posts/:id', requireStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, excerpt, content, author, category, readTime, imageUrl, featured, tags } = req.body;
    
    await pool.query(`
      UPDATE blog_posts 
      SET title = $1, excerpt = $2, content = $3, author = $4, category = $5, 
          read_time = $6, image_url = $7, featured = $8, updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
    `, [title, excerpt, content, author, category, readTime, imageUrl, featured, id]);
    
    await pool.query('DELETE FROM blog_tags WHERE post_id = $1', [id]);
    
    if (tags && Array.isArray(tags)) {
      for (const tag of tags) {
        await pool.query('INSERT INTO blog_tags (post_id, tag) VALUES ($1, $2)', [id, tag]);
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Staff update post error:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// Staff Chatbot Management
app.get('/api/staff/chatbot/responses', requireStaff, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM chatbot_responses ORDER BY category, priority DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Staff get responses error:', error);
    res.status(500).json({ error: 'Failed to fetch responses' });
  }
});

app.post('/api/staff/chatbot/responses', requireStaff, async (req, res) => {
  try {
    const { keywords, response, category, priority, active } = req.body;
    
    const result = await pool.query(`
      INSERT INTO chatbot_responses (keywords, response, category, priority, active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [keywords, response, category, priority || 0, active !== false]);
    
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Staff create response error:', error);
    res.status(500).json({ error: 'Failed to create response' });
  }
});

app.put('/api/staff/chatbot/responses/:id', requireStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const { keywords, response, category, priority, active } = req.body;
    
    await pool.query(`
      UPDATE chatbot_responses 
      SET keywords = $1, response = $2, category = $3, priority = $4, active = $5
      WHERE id = $6
    `, [keywords, response, category, priority, active, id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Staff update response error:', error);
    res.status(500).json({ error: 'Failed to update response' });
  }
});

// Staff Gallery Management
app.get('/api/staff/gallery/images', requireStaff, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM gallery_images ORDER BY uploaded_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Staff get gallery error:', error);
    res.status(500).json({ error: 'Failed to fetch gallery images' });
  }
});

app.post('/api/staff/gallery/images', requireStaff, async (req, res) => {
  try {
    const { title, description, imageUrl, category, tags } = req.body;
    
    const result = await pool.query(`
      INSERT INTO gallery_images (title, description, image_url, category, tags)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [title, description, imageUrl, category, tags || []]);
    
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Staff add gallery image error:', error);
    res.status(500).json({ error: 'Failed to add image' });
  }
});

app.put('/api/staff/gallery/images/:id', requireStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, imageUrl, category, tags } = req.body;
    
    await pool.query(`
      UPDATE gallery_images 
      SET title = $1, description = $2, image_url = $3, category = $4, tags = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
    `, [title, description, imageUrl, category, tags || [], id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Staff update gallery image error:', error);
    res.status(500).json({ error: 'Failed to update image' });
  }
});

// === STATIC FILES ===
app.use(express.static(path.join(__dirname), {
  extensions: ['html']
}));

app.use('/admin', express.static(path.join(__dirname, 'admin'), {
  extensions: ['html']
}));

app.use('/staff', express.static(path.join(__dirname, 'staff'), {
  extensions: ['html']
}));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin/index.html'));
});

app.get('/staff', (req, res) => {
  res.sendFile(path.join(__dirname, 'staff/index.html'));
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Cedarville Schools website running on http://0.0.0.0:${PORT}`);
});

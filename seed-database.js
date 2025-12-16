const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function seedDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Starting database seeding...');
    
    // Create default admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    await client.query(`
      INSERT INTO admins (username, password_hash, email)
      VALUES ($1, $2, $3)
      ON CONFLICT (username) DO NOTHING
    `, ['admin', adminPassword, 'admin@cedarvilleschools.com']);
    console.log('✓ Admin user created (username: admin, password: admin123)');
    
    // Seed sample blog posts
    const blogPosts = [
      {
        title: "5 Ways to Prepare Your Child for Preschool",
        excerpt: "Starting preschool is a big milestone. Here are practical tips to help your child transition smoothly.",
        content: "Starting preschool is one of the most exciting milestones in your child's life. Here are five essential ways to prepare:\n\n1. Establish a Routine\n2. Visit the School\n3. Practice Independence\n4. Read Books About School\n5. Stay Positive",
        author: "Mrs. Adebayo Olamide",
        category: "Parenting Tips",
        readTime: "5 min read",
        imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800",
        featured: true,
        tags: ["preschool", "preparation", "parenting"]
      },
      {
        title: "Cedarville Celebrates 15 Years of Excellence",
        excerpt: "We're proud to celebrate 15 years of nurturing young minds.",
        content: "This year marks a significant milestone for Cedarville Private Schools – 15 years of excellence in early childhood education!",
        author: "Cedarville Admin",
        category: "School News",
        readTime: "3 min read",
        imageUrl: "https://images.unsplash.com/photo-1455849318743-b2233052fcff?w=800",
        featured: true,
        tags: ["anniversary", "milestone"]
      }
    ];
    
    for (const post of blogPosts) {
      const result = await client.query(`
        INSERT INTO blog_posts (title, excerpt, content, author, category, read_time, image_url, featured)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [post.title, post.excerpt, post.content, post.author, post.category, post.readTime, post.imageUrl, post.featured]);
      
      const postId = result.rows[0].id;
      for (const tag of post.tags) {
        await client.query(`INSERT INTO blog_tags (post_id, tag) VALUES ($1, $2)`, [postId, tag]);
      }
    }
    console.log(`✓ Seeded ${blogPosts.length} blog posts`);
    
    // Seed chatbot responses
    const chatbotResponses = [
      { keywords: ['hello', 'hi', 'hey'], response: "Hello! Welcome to Cedarville Schools! How can I help you today?", category: "greetings" },
      { keywords: ['hours', 'time', 'open'], response: "Our school hours are Monday to Friday, 7:00 AM - 5:00 PM. The creche program has extended hours until 6:00 PM.", category: "hours" },
      { keywords: ['fees', 'fee', 'price', 'cost', 'tuition'], response: "Our monthly tuition fees are:\n• Creche (6mo-2yrs): ₦50,000\n• Nursery (2-4yrs): ₦45,000\n• Kindergarten (4-6yrs): ₦40,000\n\nWe offer flexible payment plans and sibling discounts!", category: "fees" },
      { keywords: ['admission', 'enroll', 'register', 'apply'], response: "Our admission process is simple:\n1. Schedule a school tour\n2. Submit application form\n3. Assessment and interview\n4. Enrollment confirmation", category: "admission" },
      { keywords: ['programs', 'program', 'curriculum'], response: "We offer three main programs:\n• 🍼 Creche: 6 months - 2 years\n• 🧸 Nursery: 2 - 4 years\n• 📚 Kindergarten: 4 - 6 years", category: "programs" },
      { keywords: ['facilities', 'facility', 'building'], response: "Our facilities include spacious classrooms, outdoor playground, indoor play area, library, sick bay with nurse, CCTV monitoring, and nutritious meal service.", category: "facilities" },
      { keywords: ['teacher', 'staff', 'educator'], response: "All our teachers are certified early childhood educators with minimum 5 years experience. They undergo regular training and background checks.", category: "teachers" },
      { keywords: ['location', 'address', 'where'], response: "We're located in Aguda, Surulere, Lagos. We're easily accessible with safe drop-off/pick-up zones.", category: "location" },
      { keywords: ['contact', 'call', 'phone', 'email'], response: "You can reach us at:\n📞 +234 803 939 4759\n📧 info@cedarvilleschools.com\n📍 Aguda, Surulere, Lagos", category: "contact" }
    ];
    
    for (const resp of chatbotResponses) {
      await client.query(`
        INSERT INTO chatbot_responses (keywords, response, category, priority, active)
        VALUES ($1, $2, $3, $4, $5)
      `, [resp.keywords, resp.response, resp.category, 10, true]);
    }
    console.log(`✓ Seeded ${chatbotResponses.length} chatbot responses`);
    
    // Seed FAQs
    const faqs = [
      { category: "Admission", question: "What is the admission process?", answer: "Our admission process includes: 1) Schedule a tour, 2) Submit application, 3) Assessment, 4) Enrollment confirmation", order: 0 },
      { category: "Admission", question: "At what age can my child start?", answer: "We accept children from 6 months old in our Creche program, 2-4 years for Nursery, and 4-6 years for Kindergarten.", order: 1 },
      { category: "Fees & Payment", question: "What are the tuition fees?", answer: "Creche: ₦50,000/month, Nursery: ₦45,000/month, Kindergarten: ₦40,000/month. We offer flexible payment plans and sibling discounts.", order: 2 },
      { category: "Daily Operations", question: "What are the school hours?", answer: "Monday to Friday, 7:00 AM - 5:00 PM. Creche has extended hours until 6:00 PM.", order: 3 },
      { category: "Safety & Security", question: "What safety measures do you have?", answer: "We have 24/7 security, CCTV monitoring, secure pick-up/drop-off with ID verification, first aid-trained staff, and a sick bay with registered nurse.", order: 4 }
    ];
    
    for (const faq of faqs) {
      await client.query(`
        INSERT INTO faqs (category, question, answer, display_order, active)
        VALUES ($1, $2, $3, $4, $5)
      `, [faq.category, faq.question, faq.answer, faq.order, true]);
    }
    console.log(`✓ Seeded ${faqs.length} FAQs`);
    
    console.log('✅ Database seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase();

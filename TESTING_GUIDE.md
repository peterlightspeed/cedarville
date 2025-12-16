# Testing Guide - Cedarville Website

## HOW TO TEST IN PREVIEW

Your website is already running in the preview pane on the right side of your screen.

---

## TEST 1: MAIN WEBSITE (Public Pages)

**What to test:**
1. Click the preview or open: https://[your-replit-url].replit.dev
2. Test these pages:
   - Home page - Check hero section, features
   - About page - Check mission, vision, values
   - Programs page - Check Creche, Nursery, Kindergarten sections
   - Gallery page - Check photos load properly
   - Blog page - Check blog posts display
   - Contact page - Check contact form, FAQ accordion

3. Test the chatbot:
   - Click the chat icon in bottom right
   - Type questions like:
     * "What are your fees?"
     * "What time do you open?"
     * "Do you have CCTV?"
     * "What is your address?"
   - Verify it gives smart answers

4. Test dark mode:
   - Click the moon/sun icon in top navigation
   - Verify dark mode works on all pages

---

## TEST 2: ADMIN PORTAL (Full Access)

**Step 1: Login**
1. In preview, go to: /admin
2. Or type in address bar: https://[your-replit-url].replit.dev/admin
3. Enter credentials:
   - Username: admin
   - Password: admin123
4. Click "Login to Admin Portal"
5. You should see the admin dashboard

**Step 2: Test Dashboard**
- Check statistics show correct numbers
- Verify you see: Blog Posts count, Chatbot Responses count, Gallery Images count

**Step 3: Test Blog Management**
1. Click "Blog Posts" in sidebar
2. Test ADD:
   - Click "Add New Post" button
   - Fill in all fields:
     * Title: "Test Blog Post"
     * Excerpt: "This is a test"
     * Content: "Testing blog functionality"
     * Author: "Admin"
     * Category: "News"
     * Read Time: "2 min read"
   - Click "Save"
   - Verify post appears in table

3. Test DELETE:
   - Find your test post
   - Click red trash icon
   - Confirm deletion
   - Verify post is removed

**Step 4: Test Chatbot Management**
1. Click "Chatbot" in sidebar
2. Test ADD:
   - Click "Add Response" button
   - Keywords: "test, testing"
   - Response: "This is a test response"
   - Category: "General"
   - Priority: 1
   - Click "Save"
   - Verify response appears in table

3. Test EDIT:
   - Find your test response
   - Click edit button
   - Change response text
   - Click "Update"
   - Verify changes saved

4. Test DELETE:
   - Find your test response
   - Click red trash icon
   - Confirm deletion

**Step 5: Test Gallery Management**
1. Click "Gallery" in sidebar
2. Test ADD:
   - Click "Add Image" button
   - Title: "Test Image"
   - Description: "Testing gallery"
   - Image URL: https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400
   - Category: "Events"
   - Click "Save"
   - Verify image appears

3. Test DELETE:
   - Find your test image
   - Click red trash icon
   - Confirm deletion

**Step 6: Logout**
- Click "Logout" button in top right
- Verify you return to login page

---

## TEST 3: STAFF PORTAL (Limited Access)

**Step 1: Login**
1. In preview, go to: /staff
2. Or type: https://[your-replit-url].replit.dev/staff
3. Enter credentials:
   - Username: teacher
   - Password: CedarTeacher2024!
4. Click "Login to Staff Portal"
5. You should see staff dashboard

**Step 2: Test Dashboard**
- Check statistics display
- Verify you see: Blog Posts, Chatbot Responses, Gallery Images counts

**Step 3: Test Blog Management (No Delete)**
1. Click "Blog Posts" in sidebar
2. Test ADD:
   - Click "Add New Post"
   - Fill in form
   - Click "Save"
   - Verify post appears

3. Check DELETE is DISABLED:
   - Look at the Actions column
   - You should see "Edit only" text
   - NO red trash/delete buttons should appear
   - This confirms staff cannot delete

**Step 4: Test Chatbot Management (No Delete)**
1. Click "Chatbot" in sidebar
2. Test ADD:
   - Click "Add Response"
   - Fill in form
   - Click "Save"

3. Check DELETE is DISABLED:
   - Actions column should show "Edit only"
   - NO delete buttons

**Step 5: Test Gallery Management (No Delete)**
1. Click "Gallery" in sidebar
2. Test ADD:
   - Click "Add Image"
   - Fill in form
   - Click "Save"

3. Check DELETE is DISABLED:
   - Images should have NO delete button
   - Only shows image and title

**Step 6: Test Access Restriction**
1. Try to access admin panel: /admin
2. Logout from staff first
3. Login to /admin with teacher credentials
4. It should FAIL - teachers cannot access admin panel

**Step 7: Logout**
- Click "Logout" button

---

## TEST 4: VERIFY CHATBOT UPDATES

1. Go back to main website homepage
2. Open chatbot
3. Type the test keywords you added
4. Verify chatbot responds with your test answer
5. This confirms chatbot uses live database

---

## TESTING CHECKLIST

Main Website:
- [ ] All pages load correctly
- [ ] Navigation works
- [ ] Dark mode toggle works
- [ ] Chatbot responds to questions
- [ ] Contact form displays
- [ ] WhatsApp button works

Admin Portal:
- [ ] Can login with admin credentials
- [ ] Dashboard shows statistics
- [ ] Can ADD blog posts
- [ ] Can EDIT blog posts
- [ ] Can DELETE blog posts
- [ ] Can ADD chatbot responses
- [ ] Can EDIT chatbot responses
- [ ] Can DELETE chatbot responses
- [ ] Can ADD gallery images
- [ ] Can DELETE gallery images
- [ ] Can logout successfully

Staff Portal:
- [ ] Can login with teacher credentials
- [ ] Dashboard shows statistics
- [ ] Can ADD blog posts
- [ ] Can EDIT blog posts
- [ ] CANNOT DELETE blog posts (no delete button)
- [ ] Can ADD chatbot responses
- [ ] Can EDIT chatbot responses
- [ ] CANNOT DELETE chatbot responses (no delete button)
- [ ] Can ADD gallery images
- [ ] CANNOT DELETE gallery images (no delete button)
- [ ] Cannot access /admin panel
- [ ] Can logout successfully

Security:
- [ ] Teacher credentials rejected at /admin
- [ ] Admin credentials work at /admin
- [ ] Teacher credentials work at /staff
- [ ] Logout works for both portals

---

## COMMON ISSUES

**Issue: "Cannot connect" or page not loading**
- Solution: Check that the workflow is running (green status)
- Click "Restart" in workflow panel if needed

**Issue: Login fails**
- Solution: Double-check username and password (case-sensitive)
- Admin: admin / admin123
- Staff: teacher / CedarTeacher2024!

**Issue: Changes not appearing**
- Solution: Refresh the preview page (hard refresh: Ctrl+Shift+R)

**Issue: Chatbot not responding**
- Solution: Database might need seeding - contact developer

---

## READY TO GO LIVE?

Once all tests pass:
1. Update logo (see TODO_UPDATES.md)
2. Update pricing (see TODO_UPDATES.md)
3. Update WhatsApp number
4. Change default passwords
5. Click "Deploy" or "Publish" button in Replit

---

Last Updated: November 23, 2025

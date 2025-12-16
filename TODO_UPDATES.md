# Required Content Updates

This document lists all the places where you need to update content with official school information.

## 🎨 Logo Replacement

**What to do**: Replace the temporary tree icon (`fa-tree`) with the official Cedarville Private Schools logo.

**Files to update**:
1. `index.html` - Line 33: Navigation logo
2. `about.html` - Navigation logo  
3. `programs.html` - Navigation logo
4. `gallery.html` - Navigation logo
5. `blog.html` - Navigation logo
6. `contact.html` - Navigation logo
7. `admin/dashboard.html` - Line 14: Admin sidebar logo
8. `staff/dashboard.html` - Line 19: Staff sidebar logo
9. `staff/index.html` - Login page logo
10. `admin/index.html` - Login page logo

**How to update**:
Replace this:
```html
<i class="fas fa-tree"></i>
```

With your logo image:
```html
<img src="images/logo.png" alt="Cedarville Schools" width="40" height="40">
```

---

## 💰 Pricing Updates

**What to do**: Update the placeholder pricing with actual school fees.

**Files to update**:
1. `programs.html` - All program pricing sections
   - Creche pricing
   - Nursery pricing  
   - Kindergarten pricing

**Current placeholders** (search for these in programs.html):
- `"From ₦XXX,XXX/term"` - Replace with actual fees
- All TODO comments starting with `"TODO: Update pricing"`

**Where to find pricing**:
- Check the official student handbook
- Or add your current fee structure

**Example update**:
```html
<!-- Before -->
<p class="program-price">From ₦XXX,XXX/term</p>

<!-- After -->
<p class="program-price">From ₦150,000/term</p>
```

---

## 📸 Image Updates (Optional)

**Recommended**: Replace Unsplash stock photos with actual school photos

**Files with image placeholders**:
- `index.html` - Hero background image
- All other pages may have stock photos

**Current Unsplash URLs** (search for these):
- `https://images.unsplash.com/photo-1580582932707-520aed937b7b` - School building
- Various classroom and activity photos

---

## 📱 WhatsApp Number

**What to do**: Update the WhatsApp contact number

**Files to check**:
- All HTML files with "Enroll Now" buttons
- Look for: `https://wa.me/2348012345678`

**How to update**:
1. Search for `wa.me` in all files
2. Replace `2348012345678` with your actual WhatsApp number
3. Keep the country code format (234 for Nigeria)

---

## ✅ Quick Checklist

- [ ] Replace all `fa-tree` icons with official logo (10 files)
- [ ] Update all pricing in programs.html (3 sections)
- [ ] Update WhatsApp number (all HTML files)
- [ ] (Optional) Replace stock photos with real school photos
- [ ] (Optional) Update favicon.png in assets/icons/

---

**Last Updated**: November 23, 2025
**Priority**: Logo and pricing are the most important updates!

# SEO Asset Creation Checklist
## DreamLab AI Consulting Ltd.

**Status:** 🔴 Assets Required
**Priority:** High - Required for full SEO functionality
**Deadline:** Before production deployment

---

## 📸 Image Assets Required

### 🎯 Priority 1: Social Media Share Images

#### OG Image (Facebook/LinkedIn)
- **Filename:** `og-image.png`
- **Location:** `/public/og-image.png`
- **Dimensions:** 1200 × 630 pixels
- **Format:** PNG (optimized)
- **File Size:** < 300 KB
- **Color Mode:** RGB
- **Content:**
  - DreamLab AI logo
  - Tagline: "Expert AI Training & Solutions"
  - Background: Dark theme (#1a1a2e or gradient)
  - Accent colors: Brand colors
  - Key services: Training • Consulting • Workshops
- **Status:** ⚠️ NOT CREATED

#### Twitter Card Image
- **Filename:** `twitter-image.png`
- **Location:** `/public/twitter-image.png`
- **Dimensions:** 1200 × 675 pixels (16:9 ratio)
- **Format:** PNG (optimized)
- **File Size:** < 300 KB
- **Content:** Same as OG image, adjusted for aspect ratio
- **Status:** ⚠️ NOT CREATED

#### Brand Logo (Schema)
- **Filename:** `logo.png`
- **Location:** `/public/logo.png`
- **Dimensions:** 512 × 512 pixels (square)
- **Format:** PNG with transparency
- **File Size:** < 100 KB
- **Content:** DreamLab AI logo, centered
- **Background:** Transparent
- **Status:** ⚠️ NOT CREATED

---

### 🎯 Priority 2: Favicons & Browser Icons

#### Standard Favicon
- **Filename:** `favicon.ico`
- **Location:** `/public/favicon.ico`
- **Dimensions:** 48 × 48 pixels
- **Format:** ICO (multi-resolution)
- **Status:** ✅ EXISTS (verify quality)

#### Small Favicon (16px)
- **Filename:** `favicon-16x16.png`
- **Location:** `/public/favicon-16x16.png`
- **Dimensions:** 16 × 16 pixels
- **Format:** PNG
- **Content:** Simplified logo (readable at tiny size)
- **Status:** ⚠️ NOT CREATED

#### Standard Favicon (32px)
- **Filename:** `favicon-32x32.png`
- **Location:** `/public/favicon-32x32.png`
- **Dimensions:** 32 × 32 pixels
- **Format:** PNG
- **Status:** ⚠️ NOT CREATED

---

### 🎯 Priority 3: Mobile & PWA Icons

#### Apple Touch Icon (iOS)
- **Filename:** `apple-touch-icon.png`
- **Location:** `/public/apple-touch-icon.png`
- **Dimensions:** 180 × 180 pixels
- **Format:** PNG
- **Content:** Logo on solid background (no transparency)
- **Background:** Brand color or white
- **Status:** ⚠️ NOT CREATED

#### Android Chrome Icon (Small)
- **Filename:** `android-chrome-192x192.png`
- **Location:** `/public/android-chrome-192x192.png`
- **Dimensions:** 192 × 192 pixels
- **Format:** PNG
- **Purpose:** Android home screen, app drawer
- **Status:** ⚠️ NOT CREATED

#### Android Chrome Icon (Large)
- **Filename:** `android-chrome-512x512.png`
- **Location:** `/public/android-chrome-512x512.png`
- **Dimensions:** 512 × 512 pixels
- **Format:** PNG
- **Purpose:** Android splash screen
- **Status:** ⚠️ NOT CREATED

---

### 🎯 Priority 4: PWA Screenshots (Optional)

#### Wide Screenshot (Desktop)
- **Filename:** `screenshot-wide.png`
- **Location:** `/public/screenshot-wide.png`
- **Dimensions:** 1280 × 720 pixels (16:9)
- **Format:** PNG
- **Content:** Homepage or key feature screenshot
- **Status:** ⚠️ NOT CREATED (Optional)

#### Narrow Screenshot (Mobile)
- **Filename:** `screenshot-narrow.png`
- **Location:** `/public/screenshot-narrow.png`
- **Dimensions:** 750 × 1334 pixels (9:16)
- **Format:** PNG
- **Content:** Mobile homepage screenshot
- **Status:** ⚠️ NOT CREATED (Optional)

---

### 🎯 Priority 5: Shortcut Icons (Optional)

#### Training Shortcut Icon
- **Filename:** `training-icon.png`
- **Location:** `/public/icons/training-icon.png`
- **Dimensions:** 96 × 96 pixels
- **Format:** PNG
- **Content:** Icon representing training/education
- **Status:** ⚠️ NOT CREATED (Optional)

#### Contact Shortcut Icon
- **Filename:** `contact-icon.png`
- **Location:** `/public/icons/contact-icon.png`
- **Dimensions:** 96 × 96 pixels
- **Format:** PNG
- **Content:** Icon representing contact/communication
- **Status:** ⚠️ NOT CREATED (Optional)

---

## 🎨 Design Guidelines

### Brand Colors (from website theme)
- **Primary Dark:** `#1a1a2e` (background)
- **Accent:** Use existing brand accent colors
- **Text:** White or light colors for contrast

### Typography
- Use brand fonts if available
- Keep text large and readable
- Limit to 2-3 font sizes maximum

### Layout Principles
- **Clear Hierarchy:** Logo → Tagline → Services
- **Visual Balance:** Centered or rule-of-thirds composition
- **Whitespace:** Don't overcrowd the design
- **Consistency:** Match website aesthetic

### File Optimization
- Use PNG for graphics with transparency
- Use JPEG for photographic images
- Compress all images before delivery
- Target file sizes noted above

---

## 🛠️ Quick Generation Tools

### Favicon Generator (Recommended)
**Tool:** https://realfavicongenerator.net/

**Steps:**
1. Upload your logo (512×512px PNG)
2. Configure iOS, Android, Windows settings
3. Set background colors (#1a1a2e)
4. Download complete package
5. Extract to `/public/` folder

**Output:** Generates all 6 required favicon sizes automatically

### Social Media Image Generators
- **Canva:** https://www.canva.com/
  - Template: "Facebook Post" (1200×630)
  - Template: "Twitter Post" (1200×675)
- **Figma:** Free design tool
- **Adobe Express:** Quick social media templates

### Image Optimization
- **TinyPNG:** https://tinypng.com/ (compress PNG files)
- **Squoosh:** https://squoosh.app/ (Google's image optimizer)
- **ImageOptim:** Mac app for batch optimization

---

## ✅ Quality Checklist

### Before Delivery
- [ ] All images use consistent branding
- [ ] Colors match website theme (#1a1a2e)
- [ ] Logo is clear and recognizable at all sizes
- [ ] File sizes are within limits
- [ ] PNG files have transparency where needed
- [ ] No copyright/stock watermarks
- [ ] High contrast for readability
- [ ] Text is legible at thumbnail size
- [ ] Images optimized and compressed

### File Validation
- [ ] Correct dimensions for each file
- [ ] Proper file naming (exact matches)
- [ ] Correct file formats (PNG vs ICO)
- [ ] Files saved in `/public/` directory
- [ ] No extraneous files or duplicates

---

## 📦 Delivery Format

### Folder Structure
```
/public/
├── og-image.png                    (1200×630)
├── twitter-image.png               (1200×675)
├── logo.png                        (512×512)
├── favicon.ico                     (48×48)
├── favicon-16x16.png               (16×16)
├── favicon-32x32.png               (32×32)
├── apple-touch-icon.png            (180×180)
├── android-chrome-192x192.png      (192×192)
├── android-chrome-512x512.png      (512×512)
├── screenshot-wide.png             (1280×720) [Optional]
├── screenshot-narrow.png           (750×1334) [Optional]
└── icons/
    ├── training-icon.png           (96×96) [Optional]
    └── contact-icon.png            (96×96) [Optional]
```

### Compressed Archive
- **Filename:** `dreamlab-seo-assets.zip`
- **Contents:** All required images
- **Include:** README with file descriptions
- **Verify:** All files open without errors

---

## 🧪 Testing After Creation

### Social Media Preview Tests
1. **Facebook Sharing Debugger:**
   - URL: https://developers.facebook.com/tools/debug/
   - Enter: https://dreamlab-ai.com/
   - Verify: OG image displays correctly

2. **Twitter Card Validator:**
   - URL: https://cards-dev.twitter.com/validator
   - Enter: https://dreamlab-ai.com/
   - Verify: Twitter image displays correctly

3. **LinkedIn Post Inspector:**
   - URL: https://www.linkedin.com/post-inspector/
   - Enter: https://dreamlab-ai.com/
   - Verify: OG image displays correctly

### Browser Tests
- [ ] Favicon appears in Chrome tab
- [ ] Favicon appears in Firefox tab
- [ ] Favicon appears in Safari tab
- [ ] Apple touch icon works on iOS
- [ ] Android icon works on home screen

---

## 📊 Asset Priority Summary

| Asset | Priority | Size | Status | Deadline |
|-------|----------|------|--------|----------|
| og-image.png | 🔴 High | 1200×630 | ⚠️ Missing | Pre-launch |
| twitter-image.png | 🔴 High | 1200×675 | ⚠️ Missing | Pre-launch |
| logo.png | 🔴 High | 512×512 | ⚠️ Missing | Pre-launch |
| favicon.ico | 🟡 Medium | 48×48 | ✅ Exists | - |
| favicon-16x16.png | 🟡 Medium | 16×16 | ⚠️ Missing | Week 1 |
| favicon-32x32.png | 🟡 Medium | 32×32 | ⚠️ Missing | Week 1 |
| apple-touch-icon.png | 🟡 Medium | 180×180 | ⚠️ Missing | Week 1 |
| android-chrome-192×192 | 🟡 Medium | 192×192 | ⚠️ Missing | Week 1 |
| android-chrome-512×512 | 🟡 Medium | 512×512 | ⚠️ Missing | Week 1 |
| screenshot-wide.png | 🟢 Low | 1280×720 | ⚠️ Optional | Week 2 |
| screenshot-narrow.png | 🟢 Low | 750×1334 | ⚠️ Optional | Week 2 |
| training-icon.png | 🟢 Low | 96×96 | ⚠️ Optional | Future |
| contact-icon.png | 🟢 Low | 96×96 | ⚠️ Optional | Future |

---

## 💬 Design Brief Summary

**Project:** DreamLab AI Consulting Website SEO Assets
**Client:** DreamLab AI Consulting Ltd.
**Purpose:** Search engine optimization and social media sharing

**Brand Identity:**
- Industry: AI Consulting & Training
- Target Audience: Tech professionals, businesses, educators
- Tone: Professional, innovative, cutting-edge
- Visual Style: Modern, dark theme, tech-focused

**Key Message:**
- Expert AI training and consulting
- Hands-on workshops and residential programs
- Custom AI solutions

**Deliverables:**
- 9 required image assets (Priority: High/Medium)
- 4 optional assets for enhanced PWA experience
- All files optimized for web use

---

## 📞 Questions or Issues?

**Technical Questions:** Refer to /docs/SEO-QUICK-REFERENCE.md
**Detailed Specifications:** Refer to /docs/SEO-AUDIT-REPORT.md
**Design Support:** info@dreamlab-ai.com

---

**Last Updated:** December 24, 2025
**Checklist Version:** 1.0
**Next Review:** After asset delivery

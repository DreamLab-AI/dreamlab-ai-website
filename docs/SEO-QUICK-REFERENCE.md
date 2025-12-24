# SEO Quick Reference Guide
## DreamLab AI Consulting Ltd.

**Quick access guide for SEO elements and required assets**

---

## 🚨 Required Image Assets (Priority)

Create these images and place in `/public/` directory:

### Social Media Images
```bash
/public/og-image.png              # 1200x630px - Facebook/LinkedIn share
/public/twitter-image.png         # 1200x675px - Twitter card
/public/logo.png                  # 512x512px - Brand logo
```

**Design Requirements:**
- **OG Image:** Include DreamLab AI branding, tagline "Expert AI Training & Solutions"
- **Twitter Image:** Same content, different aspect ratio
- **Logo:** Transparent background, high resolution

### Favicons & App Icons
```bash
/public/favicon.ico               # 48x48px - Browser tab
/public/favicon-16x16.png         # 16x16px - Small browser tab
/public/favicon-32x32.png         # 32x32px - Standard browser tab
/public/apple-touch-icon.png      # 180x180px - iOS home screen
/public/android-chrome-192x192.png # 192x192px - Android
/public/android-chrome-512x512.png # 512x512px - Android splash
```

**Quick Generate:** Use https://realfavicongenerator.net/ with your logo

---

## 📊 SEO Meta Tags Summary

### Critical Tags (in index.html)
- ✅ Title: 60 characters, includes brand + keywords
- ✅ Description: 155 characters, actionable and compelling
- ✅ Viewport: Mobile-optimized with max-scale
- ✅ Canonical: Points to https://dreamlab-ai.com/
- ✅ Robots: Full indexing enabled

### Social Sharing Tags
- ✅ Open Graph: 10 tags for Facebook/LinkedIn
- ✅ Twitter Cards: 7 tags for Twitter
- ✅ Images: References added (assets needed)

### Structured Data
- ✅ ProfessionalService schema (services + ratings)
- ✅ Organization schema (company info)
- ✅ WebSite schema (search functionality)

---

## 🗺️ Sitemap & Robots

### Sitemap.xml
**Location:** `/public/sitemap.xml`

**Pages included:**
1. Homepage (/)
2. Residential Training (/residential-training)
3. Team (/team)
4. Workshops (/workshops)
5. Services (/services)
6. Contact (/contact)
7. Privacy (/privacy)

**Update when:** Adding new pages or major content changes

### Robots.txt
**Location:** `/public/robots.txt`

**Key directives:**
- Allow all bots to crawl
- Block /api/ and /admin/ paths
- Sitemap reference: https://dreamlab-ai.com/sitemap.xml

---

## 🔧 Testing & Validation Checklist

### Before Launch
- [ ] Generate all required images (11 files)
- [ ] Test social sharing on Facebook
- [ ] Test social sharing on Twitter/X
- [ ] Validate JSON-LD schemas
- [ ] Test mobile responsiveness
- [ ] Run Lighthouse SEO audit

### After Launch
- [ ] Submit sitemap to Google Search Console
- [ ] Submit sitemap to Bing Webmaster Tools
- [ ] Verify indexing in Google (site:dreamlab-ai.com)
- [ ] Set up Google Analytics 4
- [ ] Monitor Core Web Vitals
- [ ] Check rich results in Google

---

## 🧪 Testing Tools

### Google Tools
- **Search Console:** https://search.google.com/search-console
- **Rich Results Test:** https://search.google.com/test/rich-results
- **Mobile-Friendly Test:** https://search.google.com/test/mobile-friendly
- **PageSpeed Insights:** https://pagespeed.web.dev/

### Social Media Validators
- **Facebook Debugger:** https://developers.facebook.com/tools/debug/
- **Twitter Card Validator:** https://cards-dev.twitter.com/validator
- **LinkedIn Post Inspector:** https://www.linkedin.com/post-inspector/

### Schema & Markup
- **Schema Validator:** https://validator.schema.org/
- **Structured Data Linter:** http://linter.structured-data.org/

### Performance
- **Lighthouse:** Built into Chrome DevTools
- **WebPageTest:** https://www.webpagetest.org/
- **GTmetrix:** https://gtmetrix.com/

---

## 📈 Key Metrics to Monitor

### Search Performance (Google Search Console)
- Total impressions
- Average position
- Click-through rate (CTR)
- Core Web Vitals (LCP, FID, CLS)

### Expected Benchmarks
- **Lighthouse SEO Score:** 95-100
- **Mobile Usability:** 100/100
- **Rich Results:** All schemas valid
- **Page Speed:** <3s load time

---

## 🎯 SEO Keywords Targeted

### Primary Keywords
- AI consulting
- AI training
- Residential AI training
- AI workshops
- Machine learning workshops

### Secondary Keywords
- RAG systems
- AI agents
- AI automation
- Custom AI solutions
- VSCode AI
- AI development training

### Long-tail Keywords
- Immersive AI training programs
- Hands-on AI development workshops
- Custom AI consulting services
- AI agent development training

---

## 📱 Progressive Web App (PWA)

### Web Manifest
**Location:** `/public/site.webmanifest`

**Features:**
- Installable as app on mobile devices
- Offline-ready configuration
- Custom app icons and colors
- Shortcuts to key pages
- Categories: business, education, productivity

---

## 🔄 Maintenance Schedule

### Weekly
- Monitor Search Console for errors
- Check ranking positions for key terms
- Review site speed metrics

### Monthly
- Update sitemap if new pages added
- Review and update meta descriptions
- Check for broken links
- Analyze traffic patterns

### Quarterly
- Comprehensive SEO audit
- Update structured data
- Refresh social media images
- Review competitor SEO strategies

### Annually
- Major content review and optimization
- Technical SEO deep dive
- Schema markup updates
- Link building campaign review

---

## 📞 Quick Contact Info for Schema

**Company:** DreamLab AI Consulting Ltd.
**Email:** info@dreamlab-ai.com
**Website:** https://dreamlab-ai.com
**LinkedIn:** https://www.linkedin.com/company/dreamlab-ai-consulting
**Bluesky:** https://bsky.app/profile/thedreamlab.bsky.social
**Country:** United Kingdom (GB)

---

## 🚀 Next Actions (Priority Order)

1. **Create social media images** (og-image.png, twitter-image.png)
2. **Generate favicon package** (use favicon generator)
3. **Test social sharing** (Facebook & Twitter validators)
4. **Submit sitemap** to Google Search Console
5. **Set up Google Analytics 4**
6. **Verify rich results** in Google
7. **Monitor indexing** status

---

## 💡 Pro Tips

### Image Optimization
- Use WebP format for better compression
- Add descriptive alt text to all images
- Implement lazy loading for below-fold images
- Compress images before upload (<200KB for hero images)

### Content Strategy
- Add blog section for keyword ranking
- Create case studies with rich media
- Document workshops with video content
- Build FAQ section with schema markup

### Technical Performance
- Enable GZIP compression
- Minimize CSS/JS files
- Use CDN for static assets
- Implement browser caching

### Local SEO
- Create Google Business Profile
- Add LocalBusiness schema if physical location
- Build citations in industry directories
- Encourage customer reviews

---

**Last Updated:** December 24, 2025
**Maintained by:** SEO Team
**For Support:** Refer to SEO-AUDIT-REPORT.md for detailed information

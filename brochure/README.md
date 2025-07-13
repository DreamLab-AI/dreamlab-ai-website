# DreamLab AI Brochure System

This directory contains the PDF brochure generation system for DreamLab AI.

## Overview

The brochure system provides a professional, downloadable PDF brochure for DreamLab AI's executive training services targeting the nuclear industry near Sellafield.

## Key Files

- `templates/dreamlab-brochure.html` - Complete HTML template with all DreamLab AI content
- `output/dreamlab-brochure-printable.html` - Static HTML version ready for printing
- `generate-pdf.js` - Core PDF generation logic using Puppeteer
- `generate-dreamlab-pdf.js` - Specific generator for DreamLab brochure
- `generate-static-html.js` - Creates printable HTML version

## Features

### Brochure Content (10 pages)
1. **Cover Page** - Professional design with gradient branding
2. **Table of Contents** - Easy navigation
3. **Executive Summary** - Key metrics and value proposition
4. **About DreamLab AI** - Mission, location, and team
5. **Technology Overview** - VR/AI training capabilities
6. **Training Programs** - Executive programs with pricing
7. **Premium Accommodation** - 5-bedroom luxury facility
8. **Market Opportunity** - Sellafield and UK nuclear market
9. **Investment Highlights** - Financial projections and growth
10. **Contact Information** - Full contact details

### Design Elements
- Dark theme matching website branding
- Blue (#3B82F6) to purple (#A855F7) gradients
- Professional typography and layout
- Print-optimized CSS
- A4 format with proper margins

## Usage

### Option 1: Static HTML (Recommended)
1. The brochure is available at: `/public/dreamlab-brochure-printable.html`
2. Users click "Download DreamLab AI Brochure" button on the website
3. HTML opens in new tab with "Print as PDF" button
4. Users save as PDF using browser's print function

### Option 2: Puppeteer Generation (Requires Dependencies)
```bash
# Install system dependencies first
sudo bash install-deps.sh

# Generate PDF
node generate-dreamlab-pdf.js
```

### Option 3: API Endpoints (If Running Server)
```bash
# Start API server
node api-updated.js

# Generate brochure
GET /generate-dreamlab

# Download brochure
GET /download-brochure
```

## Integration

The brochure is integrated into the React website via:
- `src/components/BrochureGenerator.tsx` - Download button component
- Public folder access for static HTML

## Customization

To update the brochure content:
1. Edit `templates/dreamlab-brochure.html`
2. Regenerate static version: `node generate-static-html.js`
3. Copy to public folder: `cp output/dreamlab-brochure-printable.html ../public/`

## Key Information

- **Target Market**: Sellafield Nuclear Site (11,000 employees)
- **Location**: Eskdale Green, Lake District
- **Programs**: £5,000-£12,500 executive training
- **Accommodation**: £350-£650 per night
- **Investment**: 68.5% IRR, £3M revenue target

## Quality Assurance

The brochure has been designed following best practices:
- Professional business design
- Clear information hierarchy
- Mobile-friendly viewing
- Print-optimized formatting
- Accessibility considerations
- Cross-browser compatibility
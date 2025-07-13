# DreamLab AI Brochure Design System

## Color Palette

### Primary Colors
```css
--primary-blue: #3B82F6;      /* Main blue accent */
--primary-purple: #A855F7;    /* Purple accent */
--gradient-primary: linear-gradient(135deg, #3B82F6 0%, #A855F7 100%);
```

### Dark Theme Base
```css
--background-dark: #0A0A0B;   /* Main background */
--background-elevated: #18181B; /* Card backgrounds */
--background-subtle: #27272A;  /* Subtle elevation */
```

### Text Colors
```css
--text-primary: #FAFAFA;      /* Main text */
--text-secondary: #E4E4E7;    /* Body text */
--text-muted: #A1A1AA;        /* Muted/caption text */
--text-disabled: #71717A;     /* Disabled state */
```

### Semantic Colors
```css
--success: #10B981;           /* Success/positive */
--warning: #F59E0B;           /* Warning/caution */
--error: #EF4444;             /* Error/negative */
--info: #3B82F6;              /* Information */
```

### Borders & Overlays
```css
--border-subtle: rgba(255, 255, 255, 0.08);
--border-default: rgba(255, 255, 255, 0.1);
--border-strong: rgba(255, 255, 255, 0.15);
--overlay-light: rgba(255, 255, 255, 0.05);
--overlay-medium: rgba(255, 255, 255, 0.1);
```

## Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
             'Helvetica Neue', 'Arial', sans-serif;
```

### Type Scale
```css
--text-xs: 12px;    /* Captions, labels */
--text-sm: 14px;    /* Secondary text */
--text-base: 16px;  /* Body text */
--text-lg: 18px;    /* Large body */
--text-xl: 20px;    /* Section headers */
--text-2xl: 24px;   /* Sub-headings */
--text-3xl: 32px;   /* Page headings */
--text-4xl: 40px;   /* Major headings */
--text-5xl: 48px;   /* Hero text */
```

### Font Weights
```css
--font-light: 300;
--font-regular: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Line Heights
```css
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.6;
--leading-loose: 1.75;
```

## Spacing System

### Base Unit: 4px
```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;
```

### Page Margins (A4)
```css
--margin-top: 30mm;
--margin-bottom: 30mm;
--margin-left: 25mm;
--margin-right: 25mm;
```

## Component Styles

### Cards
```css
.card {
    background: var(--background-elevated);
    border: 1px solid var(--border-default);
    border-radius: 12px;
    padding: var(--space-6);
    backdrop-filter: blur(10px);
}

.card-featured {
    border-color: var(--primary-blue);
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.2);
}
```

### Buttons
```css
.button-primary {
    background: var(--gradient-primary);
    color: white;
    padding: var(--space-3) var(--space-8);
    border-radius: 8px;
    font-weight: var(--font-semibold);
}

.button-secondary {
    background: transparent;
    color: var(--text-primary);
    border: 1px solid var(--border-strong);
    padding: var(--space-3) var(--space-8);
    border-radius: 8px;
}
```

### Icons
```css
.icon {
    width: 24px;
    height: 24px;
    stroke-width: 2px;
}

.icon-large {
    width: 48px;
    height: 48px;
}

.icon-colored {
    background: var(--gradient-primary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}
```

### Badges
```css
.badge {
    display: inline-flex;
    padding: var(--space-1) var(--space-3);
    background: var(--overlay-medium);
    border: 1px solid var(--border-default);
    border-radius: 16px;
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
}
```

## Layout Grid

### 12-Column Grid
```css
.grid {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: var(--space-5);
}

.col-span-1 { grid-column: span 1; }
.col-span-2 { grid-column: span 2; }
.col-span-3 { grid-column: span 3; }
.col-span-4 { grid-column: span 4; }
.col-span-6 { grid-column: span 6; }
.col-span-8 { grid-column: span 8; }
.col-span-12 { grid-column: span 12; }
```

## Visual Effects

### Gradients
```css
.gradient-text {
    background: var(--gradient-primary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.gradient-border {
    border: 2px solid transparent;
    background: linear-gradient(var(--background-dark), var(--background-dark)) padding-box,
                var(--gradient-primary) border-box;
}
```

### Shadows
```css
--shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.5);
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.5);
--shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
--shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.5);
```

### Blur Effects
```css
.blur-backdrop {
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
}

.blur-overlay {
    background: rgba(10, 10, 11, 0.8);
    backdrop-filter: blur(20px);
}
```

## Motion & Transitions

### Timing Functions
```css
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

### Durations
```css
--duration-fast: 150ms;
--duration-normal: 300ms;
--duration-slow: 500ms;
```

### Standard Transitions
```css
.transition-colors {
    transition: color var(--duration-normal) var(--ease-in-out),
                background-color var(--duration-normal) var(--ease-in-out),
                border-color var(--duration-normal) var(--ease-in-out);
}

.transition-transform {
    transition: transform var(--duration-normal) var(--ease-out);
}
```

## Page Templates

### Cover Page Layout
```
┌─────────────────────────┐
│    Neural Background    │
│                         │
│      Logo/Icon          │
│                         │
│     Main Title          │
│   (Gradient Text)       │
│                         │
│      Tagline           │
│                         │
│   Description Box       │
│                         │
│                         │
│    Footer Info          │
└─────────────────────────┘
```

### Content Page Layout
```
┌─────────────────────────┐
│  Header with Icon       │
│  Page Title             │
├─────────────────────────┤
│                         │
│   Main Content Area     │
│   - Sections            │
│   - Cards               │
│   - Lists               │
│                         │
├─────────────────────────┤
│   CTA Section           │
│   Page Number           │
└─────────────────────────┘
```

## Implementation Notes

### Print Considerations
- Use CMYK color space for print
- Ensure 300 DPI for all images
- Add 3mm bleed on all sides
- Test dark backgrounds for print quality

### Digital Optimization
- Compress images for web (under 200KB each)
- Use vector graphics where possible
- Ensure text remains selectable
- Add hyperlinks for digital version

### Accessibility
- Maintain contrast ratio of 4.5:1 minimum
- Use semantic HTML structure
- Include alt text for images
- Ensure logical reading order
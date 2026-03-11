/**
 * Open Graph Meta Tags Utility
 * Generates dynamic OG and Twitter Card meta tags for social sharing
 */

export interface OGMetaConfig {
  title: string;
  description: string;
  url?: string;
  image?: string;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
  type?: 'website' | 'article' | 'product';
  siteName?: string;
  locale?: string;
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterSite?: string;
  twitterCreator?: string;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
  tags?: string[];
}

const DEFAULT_CONFIG: Partial<OGMetaConfig> = {
  siteName: 'DreamLab AI Consulting Ltd.',
  locale: 'en_GB',
  twitterCard: 'summary_large_image',
  twitterSite: '@thedreamlab',
  twitterCreator: '@thedreamlab',
  imageWidth: 1200,
  imageHeight: 630,
  type: 'website',
};

const BASE_URL = 'https://dreamlab-ai.com';

/**
 * Page-specific OG configurations
 */
export const PAGE_OG_CONFIGS: Record<string, OGMetaConfig> = {
  home: {
    title: 'DreamLab Applied Innovation — Agentics, AI, Spatial Computing & Secure Distributed Systems',
    description: 'Agentics, AI, spatial computing, rapid prototyping & secure distributed systems in the stunning Eskdale Valley. Training, consulting, and bespoke product development with 44+ deep tech specialists.',
    url: BASE_URL,
    image: `${BASE_URL}/og/home.png`,
    imageAlt: 'DreamLab Applied Innovation Lab',
  },
  programmes: {
    title: 'Programmes | DreamLab Applied Innovation Lab',
    description: 'Outcome-based residential programmes: scale innovation, operationalise AI, unlock geospatial intelligence, create immersive experiences, secure infrastructure, and modernise creative production. TRL 2-8, Lake District.',
    url: `${BASE_URL}/programmes`,
    image: `${BASE_URL}/og/programmes.png`,
    imageAlt: 'DreamLab Programme Tracks',
    type: 'product',
  },
  coCreate: {
    title: 'Co-Create With Us | DreamLab Applied Innovation Lab',
    description: 'Embed your team in our Lake District innovation lab. Enterprise residencies, SME innovation sprints, and Innovate UK KTP partnerships for deep tech co-creation.',
    url: `${BASE_URL}/co-create`,
    image: `${BASE_URL}/og/co-create.png`,
    imageAlt: 'DreamLab Co-Creation Model',
  },
  research: {
    title: 'Research Lineage | DreamLab Applied Innovation Lab',
    description: '16 years of deep tech research (Octave 2007-2023) powering applied innovation. Multi-viewpoint immersive AI, nuclear decommissioning, collaborative intelligence.',
    url: `${BASE_URL}/research`,
    image: `${BASE_URL}/og/research.png`,
    imageAlt: 'DreamLab Research Heritage',
  },
  workshops: {
    title: 'Self-Guided Workshops | DreamLab Applied Innovation Lab',
    description: 'Self-paced AI-powered knowledge work workshops. 14 comprehensive modules covering AI integration, agentic workflows, RAG systems, and professional automation.',
    url: `${BASE_URL}/workshops`,
    image: `${BASE_URL}/og/workshops.png`,
    imageAlt: 'DreamLab Workshops - AI-Powered Knowledge Work',
  },
  team: {
    title: 'Our Team | DreamLab Applied Innovation Lab',
    description: 'Meet the DreamLab collective — 44+ specialists including Emmy nominees, PhD researchers, and BAFTA-recognised talent across AI, XR, cyber, audio, and creative technology.',
    url: `${BASE_URL}/team`,
    image: `${BASE_URL}/og/team.png`,
    imageAlt: 'DreamLab Team - Multi-Disciplinary Expertise',
  },
  contact: {
    title: 'Contact Us | DreamLab Applied Innovation Lab',
    description: 'Get in touch with DreamLab. Book a discovery call, schedule a lab visit, or enquire about programme tracks and co-creation engagements.',
    url: `${BASE_URL}/contact`,
    image: `${BASE_URL}/og/contact.png`,
    imageAlt: 'Contact DreamLab',
  },
  privacy: {
    title: 'Privacy Policy | DreamLab AI Consulting',
    description: 'DreamLab AI Consulting privacy policy. Learn how we protect your data and maintain your privacy.',
    url: `${BASE_URL}/privacy`,
    image: `${BASE_URL}/og/default.png`,
    imageAlt: 'DreamLab AI Privacy Policy',
  },
};

/**
 * Generates workshop-specific OG config
 */
export function getWorkshopOGConfig(workshopId: string, workshopTitle: string, workshopDescription: string): OGMetaConfig {
  return {
    title: `${workshopTitle} | DreamLab AI Workshops`,
    description: workshopDescription,
    url: `${BASE_URL}/workshops/${workshopId}`,
    image: `${BASE_URL}/og/workshop-${workshopId}.png`,
    imageAlt: `DreamLab AI Workshop - ${workshopTitle}`,
    type: 'article',
    section: 'Workshops',
  };
}

/**
 * Generates course-specific OG config
 */
export function getCourseOGConfig(courseId: string, courseTitle: string, courseDescription: string, category: string): OGMetaConfig {
  return {
    title: `${courseTitle} | DreamLab AI Training`,
    description: courseDescription,
    url: `${BASE_URL}/residential-training#${courseId}`,
    image: `${BASE_URL}/og/course-${category.toLowerCase().replace(/\s+/g, '-')}.png`,
    imageAlt: `DreamLab AI Course - ${courseTitle}`,
    type: 'product',
    section: category,
  };
}

/**
 * Merges custom config with defaults
 */
export function mergeOGConfig(config: Partial<OGMetaConfig>): OGMetaConfig {
  return {
    ...DEFAULT_CONFIG,
    ...config,
    image: config.image || `${BASE_URL}/og/default.png`,
  } as OGMetaConfig;
}

/**
 * Updates document meta tags for OG and Twitter Cards
 * Call this function in useEffect to update meta tags dynamically
 */
export function updateOGMetaTags(config: Partial<OGMetaConfig>): void {
  const mergedConfig = mergeOGConfig(config);

  // Helper to update or create meta tag
  const setMetaTag = (property: string, content: string, isName = false): void => {
    const selector = isName ? `meta[name="${property}"]` : `meta[property="${property}"]`;
    let element = document.querySelector(selector) as HTMLMetaElement | null;

    if (!element) {
      element = document.createElement('meta');
      if (isName) {
        element.setAttribute('name', property);
      } else {
        element.setAttribute('property', property);
      }
      document.head.appendChild(element);
    }

    element.setAttribute('content', content);
  };

  // Update document title
  document.title = mergedConfig.title;

  // Standard meta tags
  setMetaTag('description', mergedConfig.description, true);

  // Open Graph tags
  setMetaTag('og:type', mergedConfig.type || 'website');
  setMetaTag('og:url', mergedConfig.url || window.location.href);
  setMetaTag('og:title', mergedConfig.title);
  setMetaTag('og:description', mergedConfig.description);
  setMetaTag('og:image', mergedConfig.image || '');
  setMetaTag('og:image:width', String(mergedConfig.imageWidth || 1200));
  setMetaTag('og:image:height', String(mergedConfig.imageHeight || 630));
  setMetaTag('og:image:alt', mergedConfig.imageAlt || mergedConfig.title);
  setMetaTag('og:site_name', mergedConfig.siteName || DEFAULT_CONFIG.siteName!);
  setMetaTag('og:locale', mergedConfig.locale || DEFAULT_CONFIG.locale!);

  // Twitter Card tags
  setMetaTag('twitter:card', mergedConfig.twitterCard || 'summary_large_image', true);
  setMetaTag('twitter:url', mergedConfig.url || window.location.href, true);
  setMetaTag('twitter:title', mergedConfig.title, true);
  setMetaTag('twitter:description', mergedConfig.description, true);
  setMetaTag('twitter:image', mergedConfig.image || '', true);
  setMetaTag('twitter:image:alt', mergedConfig.imageAlt || mergedConfig.title, true);

  if (mergedConfig.twitterSite) {
    setMetaTag('twitter:site', mergedConfig.twitterSite, true);
  }
  if (mergedConfig.twitterCreator) {
    setMetaTag('twitter:creator', mergedConfig.twitterCreator, true);
  }

  // Article-specific tags
  if (mergedConfig.type === 'article') {
    if (mergedConfig.publishedTime) {
      setMetaTag('article:published_time', mergedConfig.publishedTime);
    }
    if (mergedConfig.modifiedTime) {
      setMetaTag('article:modified_time', mergedConfig.modifiedTime);
    }
    if (mergedConfig.author) {
      setMetaTag('article:author', mergedConfig.author);
    }
    if (mergedConfig.section) {
      setMetaTag('article:section', mergedConfig.section);
    }
    if (mergedConfig.tags && mergedConfig.tags.length > 0) {
      mergedConfig.tags.forEach(tag => {
        setMetaTag('article:tag', tag);
      });
    }
  }

  // Update canonical URL
  let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', mergedConfig.url || window.location.href);
}

/**
 * React hook for managing OG meta tags
 * Usage: useOGMeta(PAGE_OG_CONFIGS.home)
 */
export function useOGMeta(config: Partial<OGMetaConfig>): void {
  // This is a helper for the effect - actual implementation in components
  updateOGMetaTags(config);
}

/**
 * Generates structured data for a page (JSON-LD)
 */
export function generateStructuredData(config: OGMetaConfig, additionalData?: Record<string, unknown>): string {
  const baseData = {
    '@context': 'https://schema.org',
    '@type': config.type === 'article' ? 'Article' : config.type === 'product' ? 'Product' : 'WebPage',
    name: config.title,
    description: config.description,
    url: config.url,
    image: config.image,
    publisher: {
      '@type': 'Organization',
      name: 'DreamLab AI Consulting Ltd.',
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/logo.png`,
      },
    },
    ...additionalData,
  };

  return JSON.stringify(baseData, null, 2);
}

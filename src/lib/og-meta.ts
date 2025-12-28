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
    title: 'DreamLab AI Consulting Ltd. | AI Training, Workshops & Custom Solutions',
    description: 'Expert AI consulting, immersive residential training programs, and custom AI solutions. Transform your team with hands-on workshops in AI development, RAG systems, and intelligent automation.',
    url: BASE_URL,
    image: `${BASE_URL}/og/home.png`,
    imageAlt: 'DreamLab AI - Deep learning with no distractions',
  },
  residentialTraining: {
    title: 'Residential AI Training | DreamLab AI Consulting',
    description: 'Immersive 5-day residential AI training programs in the Lake District. Learn from 43+ specialists including Emmy nominees and PhD researchers. Multi-instructor delivery with hands-on projects.',
    url: `${BASE_URL}/residential-training`,
    image: `${BASE_URL}/og/residential-training.png`,
    imageAlt: 'DreamLab AI Residential Training - Lake District Facility',
    type: 'product',
  },
  workshops: {
    title: 'AI-Powered Knowledge Work Workshops | DreamLab AI',
    description: 'Transform from AI consumer to AI commander in 5 days. 14 comprehensive modules covering AI integration, agentic workflows, RAG systems, and professional automation.',
    url: `${BASE_URL}/workshops`,
    image: `${BASE_URL}/og/workshops.png`,
    imageAlt: 'DreamLab AI Workshops - Master AI-Powered Knowledge Work',
  },
  team: {
    title: 'Our Team | DreamLab AI Consulting',
    description: 'Meet the DreamLab collective - 43+ specialists including Emmy nominees, PhD researchers, and BAFTA-recognised talent. Expert instructors in AI, virtual production, XR, and spatial audio.',
    url: `${BASE_URL}/team`,
    image: `${BASE_URL}/og/team.png`,
    imageAlt: 'DreamLab AI Team - Industry Experts and Innovators',
  },
  contact: {
    title: 'Contact Us | DreamLab AI Consulting',
    description: 'Get in touch with DreamLab AI Consulting. Book training programs, schedule consultations, or enquire about custom AI solutions for your team.',
    url: `${BASE_URL}/contact`,
    image: `${BASE_URL}/og/contact.png`,
    imageAlt: 'Contact DreamLab AI Consulting',
  },
  work: {
    title: 'Our Work | DreamLab AI Consulting',
    description: 'Explore our portfolio of AI solutions, virtual production projects, and innovative technology implementations across entertainment, engineering, and enterprise sectors.',
    url: `${BASE_URL}/work`,
    image: `${BASE_URL}/og/work.png`,
    imageAlt: 'DreamLab AI Portfolio - Innovation in Action',
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

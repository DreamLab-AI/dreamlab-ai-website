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

// Social-card images must point at files that actually exist in public/.
// There is no OG-image generation pipeline; we reuse site imagery.
const OG_IMAGES = {
  default: `${BASE_URL}/images/venue/aerial.webp`,
  programmes: `${BASE_URL}/images/heroes/ai-commander-week.webp`,
  coCreate: `${BASE_URL}/images/venue/labview2.webp`,
  research: `${BASE_URL}/images/showcase/showcase-9.webp`,
  workshops: `${BASE_URL}/images/heroes/creative-technology-fundamentals.webp`,
  team: `${BASE_URL}/images/venue/fairfield-front.webp`,
} as const;

/**
 * Page-specific OG configurations
 */
export const PAGE_OG_CONFIGS: Record<string, OGMetaConfig> = {
  home: {
    title: 'DreamLab AI — AI & Agents Residential Training in the Lake District',
    description: 'Residential AI and agents training in the Lake District. Agentics, spatial computing, rapid prototyping & secure distributed systems — training, consulting, and bespoke product development with 40+ deep tech specialists.',
    url: BASE_URL,
    image: OG_IMAGES.default,
    imageAlt: 'DreamLab AI residential training facility in the Lake District',
  },
  programmes: {
    title: 'Programmes | DreamLab Applied Innovation Lab',
    description: 'Outcome-based residential programmes: scale innovation, operationalise AI, unlock geospatial intelligence, create immersive experiences, secure infrastructure, and modernise creative production. TRL 2-8, Lake District.',
    url: `${BASE_URL}/programmes`,
    image: OG_IMAGES.programmes,
    imageAlt: 'DreamLab Programme Tracks',
    type: 'product',
  },
  coCreate: {
    title: 'Co-Create With Us | DreamLab Applied Innovation Lab',
    description: 'Embed your team in our Lake District innovation lab. Enterprise residencies, SME innovation sprints, and Innovate UK KTP partnerships for deep tech co-creation.',
    url: `${BASE_URL}/co-create`,
    image: OG_IMAGES.coCreate,
    imageAlt: 'DreamLab Co-Creation Model',
  },
  research: {
    title: 'Research Lineage | DreamLab Applied Innovation Lab',
    description: '16 years of deep tech research (Octave 2007-2023) powering applied innovation. Multi-viewpoint immersive AI, nuclear decommissioning, collaborative intelligence.',
    url: `${BASE_URL}/research`,
    image: OG_IMAGES.research,
    imageAlt: 'DreamLab Research Heritage',
  },
  ecosystem: {
    title: 'VisionFlow Ecosystem | DreamLab AI',
    description: 'The open software stack behind DreamLab: VisionClaw knowledge reasoning, Agentbox sovereign agent runtime, solid-pod-rs data pods, the nostr-rust-forum community substrate, and the DreamLab edge deployment — one DID:Nostr identity spine.',
    url: `${BASE_URL}/ecosystem`,
    image: OG_IMAGES.research,
    imageAlt: 'VisionFlow five-substrate software ecosystem',
  },
  workshops: {
    title: 'Self-Guided Workshops | DreamLab Applied Innovation Lab',
    description: 'Self-paced AI-powered knowledge work workshops. 14 comprehensive modules covering AI integration, agentic workflows, RAG systems, and professional automation.',
    url: `${BASE_URL}/workshops`,
    image: OG_IMAGES.workshops,
    imageAlt: 'DreamLab Workshops - AI-Powered Knowledge Work',
  },
  team: {
    title: 'Our Team | DreamLab Applied Innovation Lab',
    description: 'Meet the DreamLab collective — 44+ specialists including Emmy nominees, PhD researchers, and BAFTA-recognised talent across AI, XR, cyber, audio, and creative technology.',
    url: `${BASE_URL}/team`,
    image: OG_IMAGES.team,
    imageAlt: 'DreamLab Team - Multi-Disciplinary Expertise',
  },
  contact: {
    title: 'Contact Us | DreamLab Applied Innovation Lab',
    description: 'Get in touch with DreamLab. Book a discovery call, schedule a lab visit, or enquire about programme tracks and co-creation engagements.',
    url: `${BASE_URL}/contact`,
    image: OG_IMAGES.team,
    imageAlt: 'Contact DreamLab',
  },
  privacy: {
    title: 'Privacy Policy | DreamLab AI Consulting',
    description: 'DreamLab AI Consulting privacy policy. Learn how we protect your data and maintain your privacy.',
    url: `${BASE_URL}/privacy`,
    image: OG_IMAGES.default,
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
    image: OG_IMAGES.workshops,
    imageAlt: `DreamLab AI Workshop - ${workshopTitle}`,
    type: 'article',
    section: 'Workshops',
  };
}

/**
 * Merges custom config with defaults
 */
export function mergeOGConfig(config: Partial<OGMetaConfig>): OGMetaConfig {
  return {
    ...DEFAULT_CONFIG,
    ...config,
    image: config.image || OG_IMAGES.default,
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
        url: `${BASE_URL}/favicon.ico`,
      },
    },
    ...additionalData,
  };

  return JSON.stringify(baseData, null, 2);
}

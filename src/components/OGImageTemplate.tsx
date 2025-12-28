/**
 * OGImageTemplate - React component for rendering Open Graph preview images
 *
 * This component is designed to render social preview images at 1200x630 pixels.
 * It can be used with tools like @vercel/og, puppeteer, or playwright to generate
 * static OG images from React components.
 *
 * Usage:
 * - For static generation: Render this component and capture as PNG
 * - For dynamic: Use with @vercel/og or similar edge function
 */

import React from 'react';

export interface OGImageTemplateProps {
  title: string;
  subtitle?: string;
  category?: string;
  variant?: 'default' | 'workshop' | 'course' | 'team' | 'contact';
  backgroundPattern?: 'gradient' | 'mesh' | 'dots' | 'minimal';
  accentColor?: 'purple' | 'blue' | 'pink' | 'green';
  showLogo?: boolean;
  imageUrl?: string;
}

const ACCENT_COLORS = {
  purple: {
    primary: '#8B5CF6',
    secondary: '#A855F7',
    gradient: 'from-purple-600 via-purple-500 to-pink-500',
  },
  blue: {
    primary: '#3B82F6',
    secondary: '#60A5FA',
    gradient: 'from-blue-600 via-blue-500 to-purple-500',
  },
  pink: {
    primary: '#EC4899',
    secondary: '#F472B6',
    gradient: 'from-pink-600 via-pink-500 to-purple-500',
  },
  green: {
    primary: '#10B981',
    secondary: '#34D399',
    gradient: 'from-green-600 via-green-500 to-blue-500',
  },
};

const CATEGORY_BADGES: Record<string, { bg: string; text: string }> = {
  'AI/ML': { bg: 'bg-purple-500/30', text: 'text-purple-200' },
  'Creative Tech': { bg: 'bg-blue-500/30', text: 'text-blue-200' },
  'XR/VR': { bg: 'bg-pink-500/30', text: 'text-pink-200' },
  'Audio': { bg: 'bg-green-500/30', text: 'text-green-200' },
  'Engineering': { bg: 'bg-orange-500/30', text: 'text-orange-200' },
  'Web3 Tech': { bg: 'bg-cyan-500/30', text: 'text-cyan-200' },
  'Enterprise': { bg: 'bg-yellow-500/30', text: 'text-yellow-200' },
  'Foundation': { bg: 'bg-slate-500/30', text: 'text-slate-200' },
  'Workshop': { bg: 'bg-indigo-500/30', text: 'text-indigo-200' },
};

/**
 * DreamLab Logo Component (Inline SVG)
 */
const DreamLabLogo: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 120 40"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Stylized "D" with neural network nodes */}
    <circle cx="12" cy="20" r="3" fill="url(#logoGradient)" />
    <circle cx="24" cy="10" r="2" fill="url(#logoGradient)" opacity="0.8" />
    <circle cx="24" cy="20" r="2" fill="url(#logoGradient)" opacity="0.8" />
    <circle cx="24" cy="30" r="2" fill="url(#logoGradient)" opacity="0.8" />
    <line x1="12" y1="20" x2="24" y2="10" stroke="url(#logoGradient)" strokeWidth="1" opacity="0.6" />
    <line x1="12" y1="20" x2="24" y2="20" stroke="url(#logoGradient)" strokeWidth="1" opacity="0.6" />
    <line x1="12" y1="20" x2="24" y2="30" stroke="url(#logoGradient)" strokeWidth="1" opacity="0.6" />

    {/* Text: DREAMLAB */}
    <text x="32" y="25" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="bold" fontSize="16" fill="white">
      DREAMLAB
    </text>
    <text x="32" y="36" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="300" fontSize="8" fill="rgba(255,255,255,0.7)">
      AI CONSULTING
    </text>

    <defs>
      <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="50%" stopColor="#A855F7" />
        <stop offset="100%" stopColor="#EC4899" />
      </linearGradient>
    </defs>
  </svg>
);

/**
 * Background Pattern Components
 */
const GradientBackground: React.FC<{ accentColor: keyof typeof ACCENT_COLORS }> = ({ accentColor }) => {
  const colors = ACCENT_COLORS[accentColor];
  return (
    <div className="absolute inset-0">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />

      {/* Animated orbs */}
      <div
        className="absolute -top-20 -left-20 w-96 h-96 rounded-full blur-3xl opacity-30"
        style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
      />
      <div
        className="absolute -bottom-20 -right-20 w-[32rem] h-[32rem] rounded-full blur-3xl opacity-30"
        style={{ background: `linear-gradient(135deg, ${colors.secondary}, ${colors.primary})` }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl opacity-20"
        style={{ background: `linear-gradient(135deg, ${colors.primary}50, ${colors.secondary}50)` }}
      />
    </div>
  );
};

const MeshBackground: React.FC<{ accentColor: keyof typeof ACCENT_COLORS }> = ({ accentColor }) => {
  const colors = ACCENT_COLORS[accentColor];
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-slate-950" />
      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="mesh" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke={colors.primary} strokeWidth="0.5" opacity="0.3" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#mesh)" />
      </svg>
      <div
        className="absolute top-0 right-0 w-1/2 h-full opacity-30"
        style={{ background: `linear-gradient(135deg, transparent 0%, ${colors.primary}20 100%)` }}
      />
    </div>
  );
};

const DotsBackground: React.FC<{ accentColor: keyof typeof ACCENT_COLORS }> = ({ accentColor }) => {
  const colors = ACCENT_COLORS[accentColor];
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-slate-950" />
      <svg className="absolute inset-0 w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="dots" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill={colors.primary} opacity="0.4" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />
      </svg>
      <div
        className="absolute bottom-0 left-0 w-full h-1/2 opacity-40"
        style={{ background: `linear-gradient(0deg, ${colors.primary}30 0%, transparent 100%)` }}
      />
    </div>
  );
};

const MinimalBackground: React.FC<{ accentColor: keyof typeof ACCENT_COLORS }> = ({ accentColor }) => {
  const colors = ACCENT_COLORS[accentColor];
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-slate-950" />
      <div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{ background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})` }}
      />
    </div>
  );
};

/**
 * Main OG Image Template Component
 * Renders at 1200x630 pixels for optimal social sharing
 */
export const OGImageTemplate: React.FC<OGImageTemplateProps> = ({
  title,
  subtitle,
  category,
  variant = 'default',
  backgroundPattern = 'gradient',
  accentColor = 'purple',
  showLogo = true,
  imageUrl,
}) => {
  const BackgroundComponent = {
    gradient: GradientBackground,
    mesh: MeshBackground,
    dots: DotsBackground,
    minimal: MinimalBackground,
  }[backgroundPattern];

  const categoryStyle = category && CATEGORY_BADGES[category]
    ? CATEGORY_BADGES[category]
    : { bg: 'bg-purple-500/30', text: 'text-purple-200' };

  return (
    <div
      style={{
        width: 1200,
        height: 630,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        overflow: 'hidden',
      }}
      className="bg-slate-950 text-white"
    >
      {/* Background */}
      <BackgroundComponent accentColor={accentColor} />

      {/* Content Container */}
      <div className="relative z-10 flex flex-col h-full p-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          {showLogo && <DreamLabLogo className="w-32 h-10" />}
          {category && (
            <div className={`px-4 py-2 rounded-full ${categoryStyle.bg} ${categoryStyle.text} text-sm font-medium`}>
              {category}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center">
          <div className="flex-1 pr-8">
            {/* Title */}
            <h1
              className="font-bold leading-tight mb-4"
              style={{
                fontSize: title.length > 50 ? '3rem' : title.length > 30 ? '3.5rem' : '4rem',
                background: `linear-gradient(135deg, #fff 0%, ${ACCENT_COLORS[accentColor].secondary} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {title}
            </h1>

            {/* Subtitle */}
            {subtitle && (
              <p className="text-xl text-slate-300 max-w-2xl leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          {/* Optional Image */}
          {imageUrl && (
            <div className="w-64 h-64 rounded-2xl overflow-hidden border border-white/10">
              <img
                src={imageUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-slate-400 text-sm">
          <span>dreamlab-ai.com</span>
          {variant === 'workshop' && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span>Interactive Workshop</span>
            </div>
          )}
          {variant === 'course' && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Residential Training Program</span>
            </div>
          )}
        </div>
      </div>

      {/* Decorative Elements */}
      <div
        className="absolute top-0 right-0 w-1 h-full"
        style={{ background: `linear-gradient(180deg, ${ACCENT_COLORS[accentColor].primary} 0%, transparent 50%, ${ACCENT_COLORS[accentColor].secondary} 100%)` }}
      />
    </div>
  );
};

/**
 * Pre-configured templates for common page types
 */
export const HomeOGImage: React.FC = () => (
  <OGImageTemplate
    title="Deep Learning With No Distractions"
    subtitle="Immersive residential training where mountains meet machines"
    backgroundPattern="gradient"
    accentColor="purple"
  />
);

export const ResidentialTrainingOGImage: React.FC = () => (
  <OGImageTemplate
    title="Residential AI Training"
    subtitle="Train with 43+ specialists in our Lake District facility"
    category="Training"
    variant="course"
    backgroundPattern="mesh"
    accentColor="blue"
  />
);

export const WorkshopsOGImage: React.FC = () => (
  <OGImageTemplate
    title="AI-Powered Knowledge Work"
    subtitle="Transform from AI consumer to AI commander in 5 days"
    category="Workshop"
    variant="workshop"
    backgroundPattern="dots"
    accentColor="purple"
  />
);

export const TeamOGImage: React.FC = () => (
  <OGImageTemplate
    title="Meet The DreamLab Collective"
    subtitle="43+ specialists including Emmy nominees and PhD researchers"
    backgroundPattern="minimal"
    accentColor="pink"
  />
);

/**
 * Dynamic workshop OG image generator
 */
export const WorkshopModuleOGImage: React.FC<{
  moduleNumber: string;
  moduleName: string;
  moduleDescription: string;
}> = ({ moduleNumber, moduleName, moduleDescription }) => (
  <OGImageTemplate
    title={moduleName}
    subtitle={moduleDescription}
    category={`Module ${moduleNumber}`}
    variant="workshop"
    backgroundPattern="gradient"
    accentColor="purple"
  />
);

/**
 * Dynamic course OG image generator
 */
export const CourseOGImage: React.FC<{
  courseName: string;
  courseDescription: string;
  category: string;
  duration: string;
}> = ({ courseName, courseDescription, category, duration }) => {
  const accentMap: Record<string, keyof typeof ACCENT_COLORS> = {
    'AI/ML': 'purple',
    'Creative Tech': 'blue',
    'XR/VR': 'pink',
    'Audio': 'green',
    'Engineering': 'blue',
    'Web3 Tech': 'blue',
    'Enterprise': 'purple',
  };

  return (
    <OGImageTemplate
      title={courseName}
      subtitle={`${duration} - ${courseDescription}`}
      category={category}
      variant="course"
      backgroundPattern="mesh"
      accentColor={accentMap[category] || 'purple'}
    />
  );
};

export default OGImageTemplate;

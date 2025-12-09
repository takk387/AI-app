/**
 * Design Templates
 *
 * Pre-built layout design configurations for quick starts.
 * Each template provides a complete LayoutDesign configuration
 * optimized for different use cases.
 */

import type { LayoutDesign } from '@/types/layoutDesign';

// ============================================================================
// TYPES
// ============================================================================

export interface DesignTemplate {
  id: string;
  name: string;
  description: string;
  category: 'business' | 'creative' | 'commerce' | 'utility';
  preview?: string; // Base64 preview image
  design: Partial<LayoutDesign>;
}

// ============================================================================
// TEMPLATE CONFIGURATIONS
// ============================================================================

const modernSaaSTemplate: DesignTemplate = {
  id: 'modern-saas',
  name: 'Modern SaaS',
  description: 'Clean, professional design perfect for software products and B2B services.',
  category: 'business',
  design: {
    basePreferences: {
      style: 'modern',
      colorScheme: 'dark',
      layout: 'single-page',
    },
    globalStyles: {
      typography: {
        fontFamily: 'Inter',
        headingWeight: 'semibold',
        bodyWeight: 'normal',
        headingSize: 'lg',
        bodySize: 'sm',
        lineHeight: 'relaxed',
        letterSpacing: 'normal',
      },
      colors: {
        primary: '#6366F1',
        secondary: '#8B5CF6',
        accent: '#22D3EE',
        background: '#0F172A',
        surface: '#1E293B',
        text: '#F1F5F9',
        textMuted: '#94A3B8',
        border: '#334155',
        success: '#22C55E',
        warning: '#EAB308',
        error: '#EF4444',
        info: '#3B82F6',
      },
      spacing: {
        density: 'normal',
        containerWidth: 'standard',
        sectionPadding: 'lg',
        componentGap: 'md',
      },
      effects: {
        borderRadius: 'lg',
        shadows: 'medium',
        animations: 'smooth',
        blur: 'subtle',
        gradients: true,
      },
    },
    components: {
      header: {
        visible: true,
        height: 'standard',
        style: 'blur',
        logoPosition: 'left',
        navPosition: 'center',
        hasSearch: false,
        hasCTA: true,
        ctaText: 'Get Started',
        ctaStyle: 'filled',
      },
      hero: {
        visible: true,
        height: 'tall',
        layout: 'centered',
        hasImage: false,
        hasSubtitle: true,
        hasCTA: true,
        ctaCount: 2,
      },
      cards: {
        style: 'bordered',
        imagePosition: 'top',
        showBadge: true,
        showFooter: false,
        hoverEffect: 'lift',
        aspectRatio: 'auto',
      },
      footer: {
        visible: true,
        style: 'minimal',
        columns: 3,
        showSocial: true,
        showNewsletter: false,
        showCopyright: true,
        position: 'static',
      },
    },
    structure: {
      type: 'single-page',
      hasHeader: true,
      hasSidebar: false,
      hasFooter: true,
      sidebarPosition: 'left',
      headerType: 'sticky',
      contentLayout: 'centered',
      mainContentWidth: 'standard',
    },
    responsive: {
      mobileBreakpoint: 640,
      tabletBreakpoint: 1024,
      mobileLayout: 'stack',
      mobileHeader: 'hamburger',
      hideSidebarOnMobile: true,
      stackCardsOnMobile: true,
    },
  },
};

const dashboardTemplate: DesignTemplate = {
  id: 'dashboard',
  name: 'Admin Dashboard',
  description: 'Feature-rich dashboard layout with sidebar navigation and data displays.',
  category: 'utility',
  design: {
    basePreferences: {
      style: 'professional',
      colorScheme: 'dark',
      layout: 'dashboard',
    },
    globalStyles: {
      typography: {
        fontFamily: 'Inter',
        headingWeight: 'medium',
        bodyWeight: 'normal',
        headingSize: 'base',
        bodySize: 'sm',
        lineHeight: 'normal',
        letterSpacing: 'normal',
      },
      colors: {
        primary: '#3B82F6',
        secondary: '#6366F1',
        accent: '#10B981',
        background: '#0F172A',
        surface: '#1E293B',
        text: '#F1F5F9',
        textMuted: '#94A3B8',
        border: '#334155',
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#0EA5E9',
      },
      spacing: {
        density: 'compact',
        containerWidth: 'full',
        sectionPadding: 'md',
        componentGap: 'sm',
      },
      effects: {
        borderRadius: 'md',
        shadows: 'subtle',
        animations: 'subtle',
        blur: 'none',
        gradients: false,
      },
    },
    components: {
      header: {
        visible: true,
        height: 'compact',
        style: 'solid',
        logoPosition: 'left',
        navPosition: 'right',
        hasSearch: true,
        hasCTA: false,
      },
      sidebar: {
        visible: true,
        position: 'left',
        width: 'standard',
        collapsible: true,
        defaultCollapsed: false,
        style: 'standard',
        iconOnly: false,
        hasLogo: true,
      },
      stats: {
        visible: true,
        layout: 'row',
        style: 'cards',
        showIcons: true,
        showTrend: true,
        columns: 4,
      },
      cards: {
        style: 'bordered',
        imagePosition: 'none',
        showBadge: true,
        showFooter: true,
        hoverEffect: 'none',
        aspectRatio: 'auto',
      },
      footer: {
        visible: false,
        style: 'minimal',
        columns: 1,
        showSocial: false,
        showNewsletter: false,
        showCopyright: true,
        position: 'static',
      },
    },
    structure: {
      type: 'dashboard',
      hasHeader: true,
      hasSidebar: true,
      hasFooter: false,
      sidebarPosition: 'left',
      headerType: 'fixed',
      contentLayout: 'full-width',
      mainContentWidth: 'full',
    },
    responsive: {
      mobileBreakpoint: 640,
      tabletBreakpoint: 1024,
      mobileLayout: 'drawer',
      mobileHeader: 'hamburger',
      hideSidebarOnMobile: true,
      stackCardsOnMobile: true,
    },
  },
};

const portfolioTemplate: DesignTemplate = {
  id: 'portfolio',
  name: 'Creative Portfolio',
  description: 'Showcase-focused design for artists, designers, and creative professionals.',
  category: 'creative',
  design: {
    basePreferences: {
      style: 'minimalist',
      colorScheme: 'dark',
      layout: 'single-page',
    },
    globalStyles: {
      typography: {
        fontFamily: 'Inter',
        headingWeight: 'bold',
        bodyWeight: 'light',
        headingSize: 'xl',
        bodySize: 'base',
        lineHeight: 'relaxed',
        letterSpacing: 'wide',
      },
      colors: {
        primary: '#FFFFFF',
        secondary: '#A3A3A3',
        accent: '#FBBF24',
        background: '#0A0A0A',
        surface: '#171717',
        text: '#FAFAFA',
        textMuted: '#737373',
        border: '#262626',
        success: '#4ADE80',
        warning: '#FBBF24',
        error: '#F87171',
        info: '#60A5FA',
      },
      spacing: {
        density: 'relaxed',
        containerWidth: 'wide',
        sectionPadding: 'xl',
        componentGap: 'lg',
      },
      effects: {
        borderRadius: 'none',
        shadows: 'none',
        animations: 'smooth',
        blur: 'none',
        gradients: false,
      },
    },
    components: {
      header: {
        visible: true,
        height: 'compact',
        style: 'transparent',
        logoPosition: 'left',
        navPosition: 'right',
        hasSearch: false,
        hasCTA: false,
      },
      hero: {
        visible: true,
        height: 'fullscreen',
        layout: 'centered',
        hasImage: false,
        hasSubtitle: true,
        hasCTA: true,
        ctaCount: 1,
      },
      cards: {
        style: 'minimal',
        imagePosition: 'top',
        showBadge: false,
        showFooter: false,
        hoverEffect: 'scale',
        aspectRatio: 'square',
      },
      footer: {
        visible: true,
        style: 'minimal',
        columns: 1,
        showSocial: true,
        showNewsletter: false,
        showCopyright: true,
        position: 'static',
      },
    },
    structure: {
      type: 'single-page',
      hasHeader: true,
      hasSidebar: false,
      hasFooter: true,
      sidebarPosition: 'left',
      headerType: 'fixed',
      contentLayout: 'full-width',
      mainContentWidth: 'wide',
    },
    responsive: {
      mobileBreakpoint: 640,
      tabletBreakpoint: 1024,
      mobileLayout: 'stack',
      mobileHeader: 'minimal',
      hideSidebarOnMobile: true,
      stackCardsOnMobile: true,
    },
  },
};

const ecommerceTemplate: DesignTemplate = {
  id: 'ecommerce',
  name: 'E-Commerce Store',
  description: 'Product-focused layout with catalog display and shopping-oriented navigation.',
  category: 'commerce',
  design: {
    basePreferences: {
      style: 'modern',
      colorScheme: 'light',
      layout: 'multi-page',
    },
    globalStyles: {
      typography: {
        fontFamily: 'Inter',
        headingWeight: 'semibold',
        bodyWeight: 'normal',
        headingSize: 'lg',
        bodySize: 'sm',
        lineHeight: 'normal',
        letterSpacing: 'normal',
      },
      colors: {
        primary: '#000000',
        secondary: '#6B7280',
        accent: '#DC2626',
        background: '#FFFFFF',
        surface: '#F9FAFB',
        text: '#111827',
        textMuted: '#6B7280',
        border: '#E5E7EB',
        success: '#059669',
        warning: '#D97706',
        error: '#DC2626',
        info: '#2563EB',
      },
      spacing: {
        density: 'normal',
        containerWidth: 'wide',
        sectionPadding: 'md',
        componentGap: 'md',
      },
      effects: {
        borderRadius: 'md',
        shadows: 'subtle',
        animations: 'subtle',
        blur: 'none',
        gradients: false,
      },
    },
    components: {
      header: {
        visible: true,
        height: 'standard',
        style: 'solid',
        logoPosition: 'left',
        navPosition: 'center',
        hasSearch: true,
        hasCTA: true,
        ctaText: 'Cart',
        ctaStyle: 'outline',
      },
      hero: {
        visible: true,
        height: 'standard',
        layout: 'split',
        hasImage: true,
        imagePosition: 'right',
        hasSubtitle: true,
        hasCTA: true,
        ctaCount: 2,
      },
      cards: {
        style: 'minimal',
        imagePosition: 'top',
        showBadge: true,
        showFooter: true,
        hoverEffect: 'lift',
        aspectRatio: 'portrait',
      },
      footer: {
        visible: true,
        style: 'rich',
        columns: 4,
        showSocial: true,
        showNewsletter: true,
        showCopyright: true,
        position: 'static',
      },
    },
    structure: {
      type: 'multi-page',
      hasHeader: true,
      hasSidebar: false,
      hasFooter: true,
      sidebarPosition: 'left',
      headerType: 'sticky',
      contentLayout: 'full-width',
      mainContentWidth: 'wide',
    },
    responsive: {
      mobileBreakpoint: 640,
      tabletBreakpoint: 1024,
      mobileLayout: 'bottom-nav',
      mobileHeader: 'hamburger',
      hideSidebarOnMobile: true,
      stackCardsOnMobile: false,
    },
  },
};

const landingPageTemplate: DesignTemplate = {
  id: 'landing-page',
  name: 'Landing Page',
  description: 'Conversion-focused single page design for marketing and product launches.',
  category: 'business',
  design: {
    basePreferences: {
      style: 'playful',
      colorScheme: 'dark',
      layout: 'single-page',
    },
    globalStyles: {
      typography: {
        fontFamily: 'Inter',
        headingWeight: 'bold',
        bodyWeight: 'normal',
        headingSize: 'xl',
        bodySize: 'base',
        lineHeight: 'relaxed',
        letterSpacing: 'tight',
      },
      colors: {
        primary: '#8B5CF6',
        secondary: '#EC4899',
        accent: '#06B6D4',
        background: '#0F0F23',
        surface: '#1A1A2E',
        text: '#FFFFFF',
        textMuted: '#A1A1AA',
        border: '#27273F',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
      },
      spacing: {
        density: 'relaxed',
        containerWidth: 'standard',
        sectionPadding: 'xl',
        componentGap: 'lg',
      },
      effects: {
        borderRadius: 'xl',
        shadows: 'strong',
        animations: 'playful',
        blur: 'medium',
        gradients: true,
      },
    },
    components: {
      header: {
        visible: true,
        height: 'compact',
        style: 'blur',
        logoPosition: 'left',
        navPosition: 'right',
        hasSearch: false,
        hasCTA: true,
        ctaText: 'Sign Up',
        ctaStyle: 'filled',
      },
      hero: {
        visible: true,
        height: 'fullscreen',
        layout: 'centered',
        hasImage: false,
        hasSubtitle: true,
        hasCTA: true,
        ctaCount: 2,
      },
      stats: {
        visible: true,
        layout: 'row',
        style: 'minimal',
        showIcons: false,
        showTrend: false,
        columns: 3,
      },
      cards: {
        style: 'elevated',
        imagePosition: 'top',
        showBadge: false,
        showFooter: false,
        hoverEffect: 'glow',
        aspectRatio: 'auto',
      },
      footer: {
        visible: true,
        style: 'standard',
        columns: 3,
        showSocial: true,
        showNewsletter: true,
        showCopyright: true,
        position: 'static',
      },
    },
    structure: {
      type: 'landing',
      hasHeader: true,
      hasSidebar: false,
      hasFooter: true,
      sidebarPosition: 'left',
      headerType: 'fixed',
      contentLayout: 'centered',
      mainContentWidth: 'standard',
    },
    responsive: {
      mobileBreakpoint: 640,
      tabletBreakpoint: 1024,
      mobileLayout: 'stack',
      mobileHeader: 'hamburger',
      hideSidebarOnMobile: true,
      stackCardsOnMobile: true,
    },
  },
};

// ============================================================================
// ARCHITECTURE TEMPLATE MAPPING
// ============================================================================

import type { FullTemplate } from '@/types/architectureTemplates';

/**
 * Deep partial type for nested layout configurations
 */
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Layout configurations based on architecture template layout types
 */
const layoutTypeConfigs: Record<string, DeepPartial<LayoutDesign>> = {
  sidebar: {
    structure: {
      type: 'dashboard',
      hasHeader: true,
      hasSidebar: true,
      hasFooter: false,
      sidebarPosition: 'left',
      headerType: 'fixed',
      contentLayout: 'full-width',
      mainContentWidth: 'full',
    },
    components: {
      sidebar: {
        visible: true,
        position: 'left',
        width: 'standard',
        collapsible: true,
        defaultCollapsed: false,
        style: 'standard',
        iconOnly: false,
        hasLogo: true,
      },
      stats: {
        visible: true,
        layout: 'row',
        style: 'cards',
        showIcons: true,
        showTrend: true,
        columns: 4,
      },
    },
    globalStyles: {
      spacing: {
        density: 'compact',
        containerWidth: 'full',
        sectionPadding: 'md',
        componentGap: 'sm',
      },
    },
  },
  topnav: {
    structure: {
      type: 'multi-page',
      hasHeader: true,
      hasSidebar: false,
      hasFooter: true,
      sidebarPosition: 'left',
      headerType: 'sticky',
      contentLayout: 'centered',
      mainContentWidth: 'wide',
    },
    components: {
      header: {
        visible: true,
        height: 'standard',
        style: 'solid',
        logoPosition: 'left',
        navPosition: 'center',
        hasSearch: true,
        hasCTA: true,
        ctaText: 'Get Started',
        ctaStyle: 'filled',
      },
    },
    globalStyles: {
      spacing: {
        density: 'normal',
        containerWidth: 'wide',
        sectionPadding: 'lg',
        componentGap: 'md',
      },
    },
  },
  minimal: {
    structure: {
      type: 'single-page',
      hasHeader: true,
      hasSidebar: false,
      hasFooter: true,
      sidebarPosition: 'left',
      headerType: 'fixed',
      contentLayout: 'centered',
      mainContentWidth: 'standard',
    },
    components: {
      header: {
        visible: true,
        height: 'compact',
        style: 'transparent',
        logoPosition: 'left',
        navPosition: 'right',
        hasSearch: false,
        hasCTA: true,
        ctaStyle: 'outline',
      },
      hero: {
        visible: true,
        height: 'tall',
        layout: 'centered',
        hasImage: false,
        hasSubtitle: true,
        hasCTA: true,
        ctaCount: 2,
      },
    },
    globalStyles: {
      spacing: {
        density: 'relaxed',
        containerWidth: 'standard',
        sectionPadding: 'xl',
        componentGap: 'lg',
      },
    },
  },
  split: {
    structure: {
      type: 'dashboard',
      hasHeader: true,
      hasSidebar: true,
      hasFooter: false,
      sidebarPosition: 'left',
      headerType: 'fixed',
      contentLayout: 'full-width',
      mainContentWidth: 'full',
    },
    components: {
      sidebar: {
        visible: true,
        position: 'left',
        width: 'narrow',
        collapsible: false,
        defaultCollapsed: false,
        style: 'minimal',
        iconOnly: true,
        hasLogo: true,
      },
    },
    globalStyles: {
      spacing: {
        density: 'normal',
        containerWidth: 'full',
        sectionPadding: 'md',
        componentGap: 'md',
      },
    },
  },
};

/**
 * Category-specific style configurations
 */
const categoryStyles: Record<string, DeepPartial<LayoutDesign['globalStyles']>> = {
  admin: {
    colors: {
      primary: '#3B82F6',
      secondary: '#6366F1',
      accent: '#10B981',
      background: '#0F172A',
      surface: '#1E293B',
      text: '#F1F5F9',
      textMuted: '#94A3B8',
      border: '#334155',
    },
    effects: {
      borderRadius: 'md',
      shadows: 'subtle',
      animations: 'subtle',
      blur: 'none',
      gradients: false,
    },
  },
  commerce: {
    colors: {
      primary: '#000000',
      secondary: '#6B7280',
      accent: '#DC2626',
      background: '#FFFFFF',
      surface: '#F9FAFB',
      text: '#111827',
      textMuted: '#6B7280',
      border: '#E5E7EB',
    },
    effects: {
      borderRadius: 'md',
      shadows: 'subtle',
      animations: 'subtle',
      blur: 'none',
      gradients: false,
    },
  },
  content: {
    colors: {
      primary: '#1D4ED8',
      secondary: '#4F46E5',
      accent: '#F59E0B',
      background: '#FFFFFF',
      surface: '#F8FAFC',
      text: '#0F172A',
      textMuted: '#64748B',
      border: '#E2E8F0',
    },
    typography: {
      fontFamily: 'Inter',
      headingWeight: 'bold',
      bodyWeight: 'normal',
      headingSize: 'lg',
      bodySize: 'base',
      lineHeight: 'relaxed',
      letterSpacing: 'normal',
    },
  },
  marketing: {
    colors: {
      primary: '#8B5CF6',
      secondary: '#EC4899',
      accent: '#06B6D4',
      background: '#0F0F23',
      surface: '#1A1A2E',
      text: '#FFFFFF',
      textMuted: '#A1A1AA',
      border: '#27273F',
    },
    effects: {
      borderRadius: 'xl',
      shadows: 'strong',
      animations: 'playful',
      blur: 'medium',
      gradients: true,
    },
  },
  saas: {
    colors: {
      primary: '#6366F1',
      secondary: '#8B5CF6',
      accent: '#22D3EE',
      background: '#0F172A',
      surface: '#1E293B',
      text: '#F1F5F9',
      textMuted: '#94A3B8',
      border: '#334155',
    },
    effects: {
      borderRadius: 'lg',
      shadows: 'medium',
      animations: 'smooth',
      blur: 'subtle',
      gradients: true,
    },
  },
};

/**
 * Map an architecture template to a LayoutDesign configuration
 * This allows users to start with a structural blueprint and get layout styling
 */
export function mapArchitectureToLayout(template: FullTemplate): DeepPartial<LayoutDesign> {
  const layoutType = template.layoutStructure.type;
  const category = template.category;

  // Get base layout configuration
  const baseLayout = layoutTypeConfigs[layoutType] || layoutTypeConfigs.topnav;

  // Get category-specific styles
  const categoryStyle = categoryStyles[category] || categoryStyles.saas;

  // Merge configurations
  const result: DeepPartial<LayoutDesign> = {
    ...baseLayout,
    basePreferences: {
      style:
        category === 'marketing' ? 'playful' : category === 'admin' ? 'professional' : 'modern',
      colorScheme: ['commerce', 'content'].includes(category) ? 'light' : 'dark',
      layout: baseLayout.structure?.type === 'dashboard' ? 'dashboard' : 'single-page',
    },
    globalStyles: {
      typography: {
        fontFamily: 'Inter',
        headingWeight: 'semibold',
        bodyWeight: 'normal',
        headingSize: 'lg',
        bodySize: 'sm',
        lineHeight: 'normal',
        letterSpacing: 'normal',
        ...categoryStyle.typography,
      },
      colors: {
        primary: '#3B82F6',
        background: '#0F172A',
        surface: '#1E293B',
        text: '#F1F5F9',
        textMuted: '#94A3B8',
        border: '#334155',
        ...categoryStyle.colors,
      },
      spacing: {
        density: 'normal',
        containerWidth: 'standard',
        sectionPadding: 'lg',
        componentGap: 'md',
        ...baseLayout.globalStyles?.spacing,
      },
      effects: {
        borderRadius: 'lg',
        shadows: 'medium',
        animations: 'smooth',
        blur: 'none',
        gradients: false,
        ...categoryStyle.effects,
      },
    },
    components: {
      ...baseLayout.components,
      header: {
        visible: true,
        height: 'standard',
        style: 'solid',
        logoPosition: 'left',
        navPosition: 'right',
        hasSearch: template.technicalRequirements.needsDatabase,
        hasCTA: true,
        ctaText: 'Get Started',
        ctaStyle: 'filled',
        ...baseLayout.components?.header,
      },
      footer: {
        visible: layoutType !== 'sidebar',
        style: 'minimal',
        columns: 3,
        showSocial: true,
        showNewsletter: category === 'marketing',
        showCopyright: true,
        position: 'static',
      },
    },
    structure: baseLayout.structure,
    responsive: {
      mobileBreakpoint: 640,
      tabletBreakpoint: 1024,
      mobileLayout: layoutType === 'sidebar' ? 'drawer' : 'stack',
      mobileHeader: 'hamburger',
      hideSidebarOnMobile: true,
      stackCardsOnMobile: true,
    },
    // Store context for the AI to use
    designContext: {
      purpose: template.description,
      requirements: template.requiredFeatures.slice(0, 5),
      lastUpdated: new Date().toISOString(),
    },
  };

  return result;
}

/**
 * Generate an initial chat message for the selected architecture template
 */
export function generateArchitecturePrompt(template: FullTemplate): string {
  const features = template.requiredFeatures.slice(0, 3).join(', ');
  return `I'm building a ${template.name.toLowerCase()}. The main features are: ${features}. Please help me design a ${template.layoutStructure.type} layout that works well for this type of application.`;
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * All available design templates
 */
export const DESIGN_TEMPLATES: DesignTemplate[] = [
  modernSaaSTemplate,
  dashboardTemplate,
  portfolioTemplate,
  ecommerceTemplate,
  landingPageTemplate,
];

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): DesignTemplate | undefined {
  return DESIGN_TEMPLATES.find((t) => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: DesignTemplate['category']): DesignTemplate[] {
  return DESIGN_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Template categories with display info
 */
export const TEMPLATE_CATEGORIES = [
  { id: 'business', name: 'Business', icon: 'briefcase' },
  { id: 'creative', name: 'Creative', icon: 'palette' },
  { id: 'commerce', name: 'Commerce', icon: 'shopping-cart' },
  { id: 'utility', name: 'Utility', icon: 'cog' },
] as const;

export default DESIGN_TEMPLATES;

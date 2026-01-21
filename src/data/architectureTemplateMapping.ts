/**
 * Architecture Template Mapping
 *
 * Maps architecture templates (blueprints) to LayoutDesign configurations.
 * Used by the Architecture Blueprints feature in the Layout Builder.
 */

import type { LayoutDesign } from '@/types/layoutDesign';
import type { FullTemplate } from '@/types/architectureTemplates';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Deep partial type for nested layout configurations
 */
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// ============================================================================
// LAYOUT TYPE CONFIGURATIONS
// ============================================================================

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

// ============================================================================
// CATEGORY STYLE CONFIGURATIONS
// ============================================================================

/**
 * Category-specific style configurations
 *
 * NOTE: Colors are intentionally NOT included - they should be AI-generated
 * based on user input or extracted from uploaded images.
 * Only effects and typography settings are defined here.
 */
const categoryStyles: Record<string, DeepPartial<LayoutDesign['globalStyles']>> = {
  admin: {
    // Colors removed - should be AI-generated
    effects: {
      borderRadius: 'md',
      shadows: 'subtle',
      animations: 'subtle',
      blur: 'none',
      gradients: false,
    },
  },
  content: {
    // Colors removed - should be AI-generated
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
    // Colors removed - should be AI-generated
    effects: {
      borderRadius: 'xl',
      shadows: 'strong',
      animations: 'playful',
      blur: 'medium',
      gradients: true,
    },
  },
  saas: {
    // Colors removed - should be AI-generated
    effects: {
      borderRadius: 'lg',
      shadows: 'medium',
      animations: 'smooth',
      blur: 'subtle',
      gradients: true,
    },
  },
  commerce: {
    // Colors removed - should be AI-generated
    effects: {
      borderRadius: 'md',
      shadows: 'subtle',
      animations: 'subtle',
      blur: 'none',
      gradients: false,
    },
  },
};

// ============================================================================
// MAPPING FUNCTIONS
// ============================================================================

/**
 * Map an architecture template to a LayoutDesign configuration.
 * This allows users to start with a structural blueprint and get layout styling.
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
        // Neutral gray defaults - actual colors should be AI-generated
        primary: '#6B7280',
        background: '#F9FAFB',
        surface: '#FFFFFF',
        text: '#374151',
        textMuted: '#6B7280',
        border: '#E5E7EB',
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
 * Generate an initial chat message for the selected architecture template.
 */
export function generateArchitecturePrompt(template: FullTemplate): string {
  const features = template.requiredFeatures.slice(0, 3).join(', ');
  return `I'm building a ${template.name.toLowerCase()}. The main features are: ${features}. Please help me design a ${template.layoutStructure.type} layout that works well for this type of application.`;
}

/**
 * Architecture Template Mapping
 *
 * Maps architecture templates (blueprints) to LayoutManifest configurations.
 * Used by the Architecture Blueprints feature in the Layout Builder.
 *
 * MIGRATED to Gemini 3: Uses LayoutManifest instead of LayoutDesign
 */

import type { LayoutManifest, UISpecNode } from '@/types/schema';
import type { FullTemplate } from '@/types/architectureTemplates';

// ============================================================================
// LAYOUT TYPE CONFIGURATIONS
// ============================================================================

interface LayoutTypeConfig {
  layoutType: 'sidebar' | 'topnav' | 'minimal' | 'split';
  hasHeader: boolean;
  hasSidebar: boolean;
  hasFooter: boolean;
  defaultSpacing: 'compact' | 'normal' | 'relaxed';
}

const layoutTypeConfigs: Record<string, LayoutTypeConfig> = {
  sidebar: {
    layoutType: 'sidebar',
    hasHeader: true,
    hasSidebar: true,
    hasFooter: false,
    defaultSpacing: 'compact',
  },
  topnav: {
    layoutType: 'topnav',
    hasHeader: true,
    hasSidebar: false,
    hasFooter: true,
    defaultSpacing: 'normal',
  },
  minimal: {
    layoutType: 'minimal',
    hasHeader: true,
    hasSidebar: false,
    hasFooter: true,
    defaultSpacing: 'relaxed',
  },
  split: {
    layoutType: 'split',
    hasHeader: true,
    hasSidebar: true,
    hasFooter: false,
    defaultSpacing: 'normal',
  },
};

// ============================================================================
// CATEGORY STYLE CONFIGURATIONS
// ============================================================================

interface CategoryStyle {
  borderRadius: 'sm' | 'md' | 'lg' | 'xl';
  fontStyle: 'professional' | 'modern' | 'playful';
}

const categoryStyles: Record<string, CategoryStyle> = {
  admin: {
    borderRadius: 'md',
    fontStyle: 'professional',
  },
  content: {
    borderRadius: 'lg',
    fontStyle: 'modern',
  },
  marketing: {
    borderRadius: 'xl',
    fontStyle: 'playful',
  },
  saas: {
    borderRadius: 'lg',
    fontStyle: 'modern',
  },
  commerce: {
    borderRadius: 'md',
    fontStyle: 'professional',
  },
};

// ============================================================================
// HELPER: Create UISpecNode with required fields
// ============================================================================

function createNode(
  id: string,
  semanticTag: string,
  tailwindClasses: string,
  children?: UISpecNode[]
): UISpecNode {
  return {
    id,
    type: 'container',
    semanticTag,
    styles: { tailwindClasses },
    attributes: {},
    ...(children && { children }),
  };
}

// ============================================================================
// MAPPING FUNCTIONS
// ============================================================================

/**
 * Create a UISpecNode structure based on layout configuration
 * Uses 'container' type with semanticTag for structural elements
 */
function createRootNode(config: LayoutTypeConfig): UISpecNode {
  const children: UISpecNode[] = [];

  // Add header
  if (config.hasHeader) {
    children.push(createNode('header', 'header', 'w-full bg-surface border-b border-border'));
  }

  // Create main content sections
  const heroSection = createNode('hero', 'hero-section', 'py-16 px-8');
  const featuresSection = createNode('features', 'features-section', 'py-12 px-8');

  // Add main content area
  const mainContent = createNode('main-content', 'main', 'flex-1', [heroSection, featuresSection]);

  // Add sidebar if needed
  if (config.hasSidebar) {
    const sidebar = createNode('sidebar', 'sidebar', 'w-64 bg-surface border-r border-border');
    const layoutWrapper = createNode('layout-wrapper', 'layout-wrapper', 'flex flex-1', [
      sidebar,
      mainContent,
    ]);
    children.push(layoutWrapper);
  } else {
    children.push(mainContent);
  }

  // Add footer
  if (config.hasFooter) {
    children.push(createNode('footer', 'footer', 'w-full bg-surface border-t border-border py-12'));
  }

  return createNode('root', 'root', 'min-h-screen flex flex-col bg-background text-text', children);
}

/**
 * Create a LayoutManifest from an architecture template.
 * This allows users to start with a structural blueprint and get layout styling.
 */
export function createManifestForTemplate(template: FullTemplate): LayoutManifest {
  const layoutType = template.layoutStructure.type;
  const category = template.category;

  // Get configurations
  const layoutConfig = layoutTypeConfigs[layoutType] || layoutTypeConfigs.topnav;
  const style = categoryStyles[category] || categoryStyles.saas;

  // Determine color scheme based on category
  const isLightScheme = ['commerce', 'content'].includes(category);

  return {
    id: `template-${template.id}`,
    version: '1.0.0',
    root: createRootNode(layoutConfig),
    definitions: {},
    detectedFeatures: template.requiredFeatures.slice(0, 5),
    designSystem: {
      colors: {
        // Neutral gray defaults - actual colors should be AI-generated
        primary: '#6B7280',
        secondary: '#9CA3AF',
        accent: '#6B7280',
        background: isLightScheme ? '#F9FAFB' : '#0f172a',
        surface: isLightScheme ? '#FFFFFF' : '#1e293b',
        text: isLightScheme ? '#374151' : '#f8fafc',
        textMuted: isLightScheme ? '#6B7280' : '#94a3b8',
        border: isLightScheme ? '#E5E7EB' : '#334155',
        error: '#EF4444',
        warning: '#F59E0B',
        success: '#10B981',
      },
      fonts: {
        heading:
          style.fontStyle === 'playful' ? 'Poppins, sans-serif' : 'Inter, system-ui, sans-serif',
        body: 'Inter, system-ui, sans-serif',
      },
    },
  };
}

/**
 * Map an architecture template to a LayoutManifest configuration.
 */
export function mapArchitectureToManifest(template: FullTemplate): LayoutManifest {
  return createManifestForTemplate(template);
}

/**
 * Generate an initial chat message for the selected architecture template.
 */
export function generateArchitecturePrompt(template: FullTemplate): string {
  const features = template.requiredFeatures.slice(0, 3).join(', ');
  return `I'm building a ${template.name.toLowerCase()}. The main features are: ${features}. Please help me design a ${template.layoutStructure.type} layout that works well for this type of application.`;
}

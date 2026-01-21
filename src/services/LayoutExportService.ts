import type {
  LayoutDesign,
  HeaderDesign,
  FooterDesign,
  SidebarDesign,
  HeroDesign,
} from '@/types/layoutDesign';

/**
 * Design tokens extracted from a LayoutDesign for use in app generation
 */
export interface DesignTokens {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: {
      primary: string;
      secondary: string;
      muted: string;
    };
    border: string;
    error: string;
    warning: string;
    success: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
  typography: {
    fontFamily: {
      heading: string;
      body: string;
      mono: string;
    };
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
      '4xl': string;
    };
    fontWeight: {
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
    lineHeight: {
      tight: string;
      normal: string;
      relaxed: string;
    };
  };
  effects: {
    borderRadius: {
      none: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
      full: string;
    };
    shadows: {
      none: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
    };
  };
  transitions: {
    fast: string;
    normal: string;
    slow: string;
  };
}

/**
 * Generated React component
 */
export interface GeneratedComponent {
  name: string;
  fileName: string;
  code: string;
  imports: string[];
  dependencies: string[];
}

/**
 * Animation definition for export
 */
export interface AnimationDefinition {
  name: string;
  keyframes: Record<string, Record<string, string>>;
  duration: string;
  timing: string;
  iterationCount: string | number;
}

/**
 * Complete layout export structure
 */
export interface LayoutExport {
  components: GeneratedComponent[];
  tokens: DesignTokens;
  layout: {
    header?: string;
    footer?: string;
    sidebar?: string;
    hero?: string;
  };
  animations: AnimationDefinition[];
  tailwindConfig: string;
  cssVariables: string;
}

/**
 * LayoutExportService
 *
 * Generates React components, design tokens, and configuration
 * from a LayoutDesign for use in the main app builder.
 */
class LayoutExportServiceClass {
  /**
   * Export a complete layout design to usable components and tokens
   */
  export(design: Partial<LayoutDesign>): LayoutExport {
    const tokens = this.extractDesignTokens(design);
    const animations = this.extractAnimations(design);
    const components = this.generateComponents(design, tokens);
    const tailwindConfig = this.generateTailwindConfig(tokens);
    const cssVariables = this.generateCSSVariables(tokens);

    return {
      components,
      tokens,
      layout: {
        header: components.find((c) => c.name === 'Header')?.code,
        footer: components.find((c) => c.name === 'Footer')?.code,
        sidebar: components.find((c) => c.name === 'Sidebar')?.code,
        hero: components.find((c) => c.name === 'Hero')?.code,
      },
      animations,
      tailwindConfig,
      cssVariables,
    };
  }

  /**
   * Extract design tokens from LayoutDesign
   * Maps from LayoutDesign structure to DesignTokens format
   */
  extractDesignTokens(design: Partial<LayoutDesign>): DesignTokens {
    const globalStyles = design.globalStyles;
    const colors = globalStyles?.colors;
    const typography = globalStyles?.typography;
    const spacing = globalStyles?.spacing;
    const effects = globalStyles?.effects;

    // Map spacing density to actual values
    const spacingValues = {
      compact: {
        xs: '0.125rem',
        sm: '0.25rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.5rem',
      },
      normal: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem', '2xl': '3rem' },
      relaxed: { xs: '0.5rem', sm: '0.75rem', md: '1.5rem', lg: '2rem', xl: '3rem', '2xl': '4rem' },
    };
    const spacingScale = spacingValues[spacing?.density || 'normal'];

    // Map border radius setting to actual values
    const radiusValues = {
      none: { sm: '0', md: '0', lg: '0', xl: '0' },
      sm: { sm: '0.125rem', md: '0.25rem', lg: '0.375rem', xl: '0.5rem' },
      md: { sm: '0.25rem', md: '0.5rem', lg: '0.75rem', xl: '1rem' },
      lg: { sm: '0.375rem', md: '0.75rem', lg: '1rem', xl: '1.5rem' },
      xl: { sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem' },
      full: { sm: '9999px', md: '9999px', lg: '9999px', xl: '9999px' },
    };
    const radiusScale = radiusValues[effects?.borderRadius || 'md'];

    // Map shadow setting to actual values
    const shadowValues = {
      none: { sm: 'none', md: 'none', lg: 'none', xl: 'none' },
      subtle: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.03)',
        md: '0 2px 4px 0 rgb(0 0 0 / 0.05)',
        lg: '0 4px 8px 0 rgb(0 0 0 / 0.05)',
        xl: '0 8px 16px 0 rgb(0 0 0 / 0.05)',
      },
      medium: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
      },
      strong: {
        sm: '0 2px 4px 0 rgb(0 0 0 / 0.1)',
        md: '0 6px 12px -2px rgb(0 0 0 / 0.15)',
        lg: '0 15px 25px -5px rgb(0 0 0 / 0.2)',
        xl: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      },
    };
    const shadowScale = shadowValues[effects?.shadows || 'medium'];

    // Map font weight settings to numeric values
    const weightMap = { light: 300, normal: 400, medium: 500, semibold: 600, bold: 700 };

    // Neutral gray fallbacks - actual colors should be AI-generated
    return {
      colors: {
        primary: colors?.primary || '#6B7280',
        secondary: colors?.secondary || '#9CA3AF',
        accent: colors?.accent || '#6B7280',
        background: colors?.background || '#F9FAFB',
        surface: colors?.surface || '#FFFFFF',
        text: {
          primary: colors?.text || '#374151',
          secondary: colors?.textMuted || '#6B7280',
          muted: colors?.textMuted || '#9CA3AF',
        },
        border: colors?.border || '#E5E7EB',
        error: colors?.error || '#6B7280',
        warning: colors?.warning || '#6B7280',
        success: colors?.success || '#6B7280',
      },
      spacing: spacingScale,
      typography: {
        fontFamily: {
          heading:
            typography?.headingFont || typography?.fontFamily || 'Inter, system-ui, sans-serif',
          body: typography?.fontFamily || 'Inter, system-ui, sans-serif',
          mono: 'JetBrains Mono, monospace',
        },
        fontSize: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          '2xl': '1.5rem',
          '3xl': '1.875rem',
          '4xl': '2.25rem',
        },
        fontWeight: {
          normal: weightMap[typography?.bodyWeight || 'normal'],
          medium: 500,
          semibold: 600,
          bold: weightMap[typography?.headingWeight || 'bold'],
        },
        lineHeight: {
          tight: '1.25',
          normal: '1.5',
          relaxed: '1.75',
        },
      },
      effects: {
        borderRadius: {
          none: '0',
          sm: radiusScale.sm,
          md: radiusScale.md,
          lg: radiusScale.lg,
          xl: radiusScale.xl,
          full: '9999px',
        },
        shadows: {
          none: 'none',
          sm: shadowScale.sm,
          md: shadowScale.md,
          lg: shadowScale.lg,
          xl: shadowScale.xl,
        },
      },
      transitions: {
        fast: '150ms ease',
        normal: '200ms ease',
        slow: '300ms ease',
      },
    };
  }

  /**
   * Extract animation definitions from LayoutDesign
   */
  extractAnimations(design: Partial<LayoutDesign>): AnimationDefinition[] {
    const animations: AnimationDefinition[] = [];
    // Access animations from the design - use type assertion for partial
    const designAny = design as Record<string, unknown>;
    const detectedAnimations =
      (designAny.animations as Array<{
        id: string;
        name?: string;
        keyframes?: Record<string, Record<string, string>>;
        duration?: number;
        timing?: string;
        iterationCount?: number | 'infinite';
      }>) || [];

    for (const anim of detectedAnimations) {
      if (anim.keyframes) {
        animations.push({
          name: anim.name || anim.id,
          keyframes: anim.keyframes as Record<string, Record<string, string>>,
          duration: `${anim.duration || 300}ms`,
          timing: anim.timing || 'ease-out',
          iterationCount: anim.iterationCount || 1,
        });
      }
    }

    return animations;
  }

  /**
   * Generate React components from LayoutDesign sections
   */
  generateComponents(design: Partial<LayoutDesign>, tokens: DesignTokens): GeneratedComponent[] {
    const components: GeneratedComponent[] = [];
    const designComponents = design.components || {};

    // Header component
    if (designComponents.header) {
      components.push(this.generateHeaderComponent(designComponents.header, tokens));
    }

    // Footer component
    if (designComponents.footer) {
      components.push(this.generateFooterComponent(designComponents.footer, tokens));
    }

    // Sidebar component
    if (designComponents.sidebar) {
      components.push(this.generateSidebarComponent(designComponents.sidebar, tokens));
    }

    // Hero component
    if (designComponents.hero) {
      components.push(this.generateHeroComponent(designComponents.hero, tokens));
    }

    return components;
  }

  /**
   * Generate Header component
   */
  private generateHeaderComponent(header: HeaderDesign, tokens: DesignTokens): GeneratedComponent {
    const bgColor = tokens.colors.surface;
    const textColor = tokens.colors.text.primary;
    const heightMap = { compact: '48px', standard: '64px', tall: '80px' };
    const height = heightMap[header.height] || '64px';
    const sticky = true;

    const code = `'use client';

import Link from 'next/link';

export function Header() {
  return (
    <header
      className="w-full border-b"
      style={{
        backgroundColor: '${bgColor}',
        color: '${textColor}',
        height: '${height}',
        position: ${sticky ? "'sticky'" : "'relative'"},
        top: ${sticky ? '0' : 'undefined'},
        zIndex: ${sticky ? '50' : 'undefined'},
      }}
    >
      <div className="container mx-auto h-full flex items-center justify-between px-4">
        <Link href="/" className="font-bold text-xl">
          Logo
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            Home
          </Link>
          <Link href="/about" className="hover:opacity-80 transition-opacity">
            About
          </Link>
          <Link href="/contact" className="hover:opacity-80 transition-opacity">
            Contact
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default Header;
`;

    return {
      name: 'Header',
      fileName: 'Header.tsx',
      code,
      imports: ['next/link'],
      dependencies: [],
    };
  }

  /**
   * Generate Footer component
   */
  private generateFooterComponent(footer: FooterDesign, tokens: DesignTokens): GeneratedComponent {
    const bgColor = tokens.colors.background;
    const textColor = tokens.colors.text.secondary;

    const code = `'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer
      className="w-full border-t py-8"
      style={{
        backgroundColor: '${bgColor}',
        color: '${textColor}',
      }}
    >
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm">
            © {new Date().getFullYear()} Your Company. All rights reserved.
          </p>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/privacy" className="hover:opacity-80 transition-opacity">
              Privacy
            </Link>
            <Link href="/terms" className="hover:opacity-80 transition-opacity">
              Terms
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
`;

    return {
      name: 'Footer',
      fileName: 'Footer.tsx',
      code,
      imports: ['next/link'],
      dependencies: [],
    };
  }

  /**
   * Generate Sidebar component
   */
  private generateSidebarComponent(
    sidebar: SidebarDesign,
    tokens: DesignTokens
  ): GeneratedComponent {
    const bgColor = tokens.colors.surface;
    const widthMap = { narrow: '200px', standard: '256px', wide: '320px' };
    const width = widthMap[sidebar.width] || '256px';
    const position = sidebar.position || 'left';

    const code = `'use client';

import { useState } from 'react';
import Link from 'next/link';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/projects', label: 'Projects', icon: '📁' },
    { href: '/tasks', label: 'Tasks', icon: '✅' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <aside
      className={\`h-full border-r transition-transform \${isOpen ? 'translate-x-0' : '-translate-x-full'}\`}
      style={{
        backgroundColor: '${bgColor}',
        width: '${width}',
        ${position === 'right' ? "marginLeft: 'auto'," : ''}
      }}
    >
      <div className="p-4">
        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}

export default Sidebar;
`;

    return {
      name: 'Sidebar',
      fileName: 'Sidebar.tsx',
      code,
      imports: ['react', 'next/link'],
      dependencies: [],
    };
  }

  /**
   * Generate Hero component
   */
  private generateHeroComponent(hero: HeroDesign, tokens: DesignTokens): GeneratedComponent {
    const bgColor = tokens.colors.background;
    const textColor = tokens.colors.text.primary;
    const heightMap = { compact: '300px', standard: '500px', tall: '700px', fullscreen: '100vh' };
    const height = heightMap[hero.height] || '500px';
    const alignment = hero.layout === 'left-aligned' ? 'left' : 'center';

    const code = `'use client';

export function Hero() {
  return (
    <section
      className="w-full py-20"
      style={{
        backgroundColor: '${bgColor}',
        color: '${textColor}',
        minHeight: '${height}',
        textAlign: '${alignment}',
      }}
    >
      <div className="container mx-auto px-4">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
          Welcome to Your App
        </h1>
        <p className="text-lg md:text-xl opacity-80 max-w-2xl ${alignment === 'center' ? 'mx-auto' : ''} mb-8">
          Build something amazing with our powerful platform.
          Get started today and see the difference.
        </p>
        <div className="flex ${alignment === 'center' ? 'justify-center' : ''} gap-4">
          <button className="px-6 py-3 bg-garden-600 hover:bg-garden-500 text-white rounded-lg font-medium transition-colors">
            Get Started
          </button>
          <button className="px-6 py-3 border border-current rounded-lg font-medium hover:bg-white/10 transition-colors">
            Learn More
          </button>
        </div>
      </div>
    </section>
  );
}

export default Hero;
`;

    return {
      name: 'Hero',
      fileName: 'Hero.tsx',
      code,
      imports: [],
      dependencies: [],
    };
  }

  /**
   * Generate Tailwind config extension
   */
  generateTailwindConfig(tokens: DesignTokens): string {
    return `// Add to tailwind.config.ts extend section
{
  colors: {
    primary: '${tokens.colors.primary}',
    secondary: '${tokens.colors.secondary}',
    accent: '${tokens.colors.accent}',
    background: '${tokens.colors.background}',
    surface: '${tokens.colors.surface}',
    border: '${tokens.colors.border}',
  },
  fontFamily: {
    heading: ['${tokens.typography.fontFamily.heading.split(',')[0]}', 'system-ui', 'sans-serif'],
    body: ['${tokens.typography.fontFamily.body.split(',')[0]}', 'system-ui', 'sans-serif'],
    mono: ['${tokens.typography.fontFamily.mono.split(',')[0]}', 'monospace'],
  },
  borderRadius: {
    sm: '${tokens.effects.borderRadius.sm}',
    md: '${tokens.effects.borderRadius.md}',
    lg: '${tokens.effects.borderRadius.lg}',
    xl: '${tokens.effects.borderRadius.xl}',
  },
}`;
  }

  /**
   * Generate CSS variables
   */
  generateCSSVariables(tokens: DesignTokens): string {
    return `:root {
  /* Colors */
  --color-primary: ${tokens.colors.primary};
  --color-secondary: ${tokens.colors.secondary};
  --color-accent: ${tokens.colors.accent};
  --color-background: ${tokens.colors.background};
  --color-surface: ${tokens.colors.surface};
  --color-text-primary: ${tokens.colors.text.primary};
  --color-text-secondary: ${tokens.colors.text.secondary};
  --color-text-muted: ${tokens.colors.text.muted};
  --color-border: ${tokens.colors.border};
  --color-error: ${tokens.colors.error};
  --color-warning: ${tokens.colors.warning};
  --color-success: ${tokens.colors.success};

  /* Spacing */
  --spacing-xs: ${tokens.spacing.xs};
  --spacing-sm: ${tokens.spacing.sm};
  --spacing-md: ${tokens.spacing.md};
  --spacing-lg: ${tokens.spacing.lg};
  --spacing-xl: ${tokens.spacing.xl};
  --spacing-2xl: ${tokens.spacing['2xl']};

  /* Typography */
  --font-heading: ${tokens.typography.fontFamily.heading};
  --font-body: ${tokens.typography.fontFamily.body};
  --font-mono: ${tokens.typography.fontFamily.mono};

  /* Border Radius */
  --radius-sm: ${tokens.effects.borderRadius.sm};
  --radius-md: ${tokens.effects.borderRadius.md};
  --radius-lg: ${tokens.effects.borderRadius.lg};
  --radius-xl: ${tokens.effects.borderRadius.xl};

  /* Transitions */
  --transition-fast: ${tokens.transitions.fast};
  --transition-normal: ${tokens.transitions.normal};
  --transition-slow: ${tokens.transitions.slow};
}`;
  }

  /**
   * Export design tokens as JSON
   */
  exportTokensAsJSON(design: Partial<LayoutDesign>): string {
    const tokens = this.extractDesignTokens(design);
    return JSON.stringify(tokens, null, 2);
  }

  /**
   * Export design tokens for Figma
   */
  exportForFigma(design: Partial<LayoutDesign>): string {
    const tokens = this.extractDesignTokens(design);

    const figmaTokens = {
      colors: {
        primary: { value: tokens.colors.primary, type: 'color' },
        secondary: { value: tokens.colors.secondary, type: 'color' },
        accent: { value: tokens.colors.accent, type: 'color' },
        background: { value: tokens.colors.background, type: 'color' },
        surface: { value: tokens.colors.surface, type: 'color' },
        'text-primary': { value: tokens.colors.text.primary, type: 'color' },
        'text-secondary': { value: tokens.colors.text.secondary, type: 'color' },
        'text-muted': { value: tokens.colors.text.muted, type: 'color' },
        border: { value: tokens.colors.border, type: 'color' },
      },
      spacing: Object.fromEntries(
        Object.entries(tokens.spacing).map(([key, value]) => [key, { value, type: 'spacing' }])
      ),
      borderRadius: Object.fromEntries(
        Object.entries(tokens.effects.borderRadius).map(([key, value]) => [
          key,
          { value, type: 'borderRadius' },
        ])
      ),
    };

    return JSON.stringify(figmaTokens, null, 2);
  }
}

// Export singleton instance
export const LayoutExportService = new LayoutExportServiceClass();

// Export class for testing
export { LayoutExportServiceClass };

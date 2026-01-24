import type { LayoutManifest } from '@/types/schema';

/**
 * Design tokens extracted from a LayoutManifest for use in app generation
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
 * LayoutExportService
 *
 * Extracts design tokens from LayoutManifest for use in app generation.
 * The Gemini 3 system uses LayoutManifest with a simpler structure.
 */
class LayoutExportServiceClass {
  /**
   * Extract design tokens from LayoutManifest
   * Maps from manifest.globals to DesignTokens format
   */
  extractDesignTokens(manifest: LayoutManifest | null | undefined): DesignTokens {
    const designSystem = manifest?.designSystem;
    const colors = designSystem?.colors || {};
    const fonts = designSystem?.fonts || { heading: 'Inter, system-ui, sans-serif', body: 'Inter, system-ui, sans-serif' };

    // Default spacing scale
    const defaultSpacing = {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '3rem',
    };

    // Default border radius scale
    const defaultRadius = {
      none: '0',
      sm: '0.25rem',
      md: '0.5rem',
      lg: '0.75rem',
      xl: '1rem',
      full: '9999px',
    };

    // Default shadow scale
    const defaultShadows = {
      none: 'none',
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
    };

    return {
      colors: {
        primary: colors.primary || '#6B7280',
        secondary: colors.secondary || '#9CA3AF',
        accent: colors.accent || '#6B7280',
        background: colors.background || '#F9FAFB',
        surface: colors.surface || '#FFFFFF',
        text: {
          primary: colors.text || '#374151',
          secondary: colors.textMuted || '#6B7280',
          muted: colors.textMuted || '#9CA3AF',
        },
        border: colors.border || '#E5E7EB',
        error: colors.error || '#EF4444',
        warning: colors.warning || '#F59E0B',
        success: colors.success || '#10B981',
      },
      spacing: defaultSpacing,
      typography: {
        fontFamily: {
          heading: fonts.heading || 'Inter, system-ui, sans-serif',
          body: fonts.body || 'Inter, system-ui, sans-serif',
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
          normal: 400,
          medium: 500,
          semibold: 600,
          bold: 700,
        },
        lineHeight: {
          tight: '1.25',
          normal: '1.5',
          relaxed: '1.75',
        },
      },
      effects: {
        borderRadius: defaultRadius,
        shadows: defaultShadows,
      },
      transitions: {
        fast: '150ms ease',
        normal: '200ms ease',
        slow: '300ms ease',
      },
    };
  }

  /**
   * Generate Tailwind config extension from design tokens
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
   * Generate CSS variables from design tokens
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
  exportTokensAsJSON(manifest: LayoutManifest | null | undefined): string {
    const tokens = this.extractDesignTokens(manifest);
    return JSON.stringify(tokens, null, 2);
  }
}

// Export singleton instance
export const LayoutExportService = new LayoutExportServiceClass();

// Export class for testing
export { LayoutExportServiceClass };

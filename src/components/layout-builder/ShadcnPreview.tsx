'use client';

import React, { useMemo } from 'react';
import type { LayoutDesign } from '@/types/layoutDesign';

interface ShadcnPreviewProps {
  design: Partial<LayoutDesign>;
}

/**
 * Preview common shadcn/ui components with current design tokens
 */
export function ShadcnPreview({ design }: ShadcnPreviewProps) {
  const colors = design.globalStyles?.colors;
  const effects = design.globalStyles?.effects;
  const typography = design.globalStyles?.typography;

  // Generate CSS variables from design
  const cssVars = useMemo(() => {
    if (!colors) return {};

    // Helper to convert hex to HSL for shadcn format
    const hexToHSL = (hex: string): string => {
      // Validate and sanitize input
      if (!hex || typeof hex !== 'string') return '0 0% 50%';
      hex = hex.trim();
      if (!hex.startsWith('#')) hex = '#' + hex;
      // Handle shorthand hex (#RGB -> #RRGGBB)
      if (hex.length === 4) {
        hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
      }
      if (hex.length !== 7) return '0 0% 50%';

      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;

      // Check for NaN values
      if (isNaN(r) || isNaN(g) || isNaN(b)) return '0 0% 50%';

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0;
      let s = 0;
      const l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r:
            h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
            break;
          case g:
            h = ((b - r) / d + 2) / 6;
            break;
          case b:
            h = ((r - g) / d + 4) / 6;
            break;
        }
      }

      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    const getForeground = (bg: string): string => {
      if (!bg || typeof bg !== 'string' || bg.length < 4) return '210 40% 98%';
      const r = parseInt(bg.slice(1, 3), 16);
      const g = parseInt(bg.slice(3, 5), 16);
      const b = parseInt(bg.slice(5, 7), 16);
      if (isNaN(r) || isNaN(g) || isNaN(b)) return '210 40% 98%';
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.5 ? '222.2 84% 4.9%' : '210 40% 98%';
    };

    const radiusMap: Record<string, string> = {
      none: '0',
      sm: '0.3rem',
      md: '0.5rem',
      lg: '0.75rem',
      xl: '1rem',
      full: '9999px',
    };

    return {
      '--background': hexToHSL(colors.background),
      '--foreground': hexToHSL(colors.text),
      '--card': hexToHSL(colors.surface),
      '--card-foreground': hexToHSL(colors.text),
      '--primary': hexToHSL(colors.primary),
      '--primary-foreground': getForeground(colors.primary),
      '--secondary': hexToHSL(colors.secondary || colors.primary),
      '--secondary-foreground': getForeground(colors.secondary || colors.primary),
      '--muted': hexToHSL(colors.surface),
      '--muted-foreground': hexToHSL(colors.textMuted),
      '--accent': hexToHSL(colors.accent || colors.primary),
      '--accent-foreground': getForeground(colors.accent || colors.primary),
      '--destructive': hexToHSL(colors.error || '#6B7280'),
      '--destructive-foreground': getForeground(colors.error || '#6B7280'),
      '--border': hexToHSL(colors.border),
      '--input': hexToHSL(colors.border),
      '--ring': hexToHSL(colors.primary),
      '--radius': radiusMap[effects?.borderRadius || 'md'] || '0.5rem',
    } as React.CSSProperties;
  }, [colors, effects]);

  if (!colors) {
    return (
      <div className="text-center py-8 text-slate-500">
        <p>No design tokens defined</p>
      </div>
    );
  }

  return (
    <div
      className="space-y-6 p-4"
      style={{
        ...cssVars,
        fontFamily: typography?.fontFamily || 'system-ui, sans-serif',
      }}
    >
      {/* Buttons Section */}
      <div>
        <h3 className="text-sm font-medium text-slate-400 mb-3">Buttons</h3>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 transition-colors"
            style={{
              backgroundColor: `hsl(var(--primary))`,
              color: `hsl(var(--primary-foreground))`,
              borderRadius: `var(--radius)`,
            }}
          >
            Primary
          </button>
          <button
            className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 transition-colors"
            style={{
              backgroundColor: `hsl(var(--secondary))`,
              color: `hsl(var(--secondary-foreground))`,
              borderRadius: `var(--radius)`,
            }}
          >
            Secondary
          </button>
          <button
            className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 transition-colors"
            style={{
              backgroundColor: `hsl(var(--destructive))`,
              color: `hsl(var(--destructive-foreground))`,
              borderRadius: `var(--radius)`,
            }}
          >
            Destructive
          </button>
          <button
            className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 transition-colors border"
            style={{
              backgroundColor: 'transparent',
              borderColor: `hsl(var(--border))`,
              color: `hsl(var(--foreground))`,
              borderRadius: `var(--radius)`,
            }}
          >
            Outline
          </button>
          <button
            className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 transition-colors"
            style={{
              backgroundColor: `hsl(var(--accent))`,
              color: `hsl(var(--accent-foreground))`,
              borderRadius: `var(--radius)`,
            }}
          >
            Ghost
          </button>
        </div>
      </div>

      {/* Card Section */}
      <div>
        <h3 className="text-sm font-medium text-slate-400 mb-3">Card</h3>
        <div
          className="p-4 border"
          style={{
            backgroundColor: `hsl(var(--card))`,
            borderColor: `hsl(var(--border))`,
            borderRadius: `var(--radius)`,
            boxShadow:
              effects?.shadows === 'none'
                ? 'none'
                : effects?.shadows === 'subtle'
                  ? '0 1px 2px rgba(0,0,0,0.05)'
                  : effects?.shadows === 'strong'
                    ? '0 10px 25px rgba(0,0,0,0.1)'
                    : '0 4px 6px rgba(0,0,0,0.1)',
          }}
        >
          <h4 className="font-semibold mb-1" style={{ color: `hsl(var(--card-foreground))` }}>
            Card Title
          </h4>
          <p className="text-sm" style={{ color: `hsl(var(--muted-foreground))` }}>
            Card description with muted text color.
          </p>
        </div>
      </div>

      {/* Input Section */}
      <div>
        <h3 className="text-sm font-medium text-slate-400 mb-3">Inputs</h3>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Text input..."
            className="flex h-9 w-full px-3 py-1 text-sm border transition-colors focus:outline-none"
            style={{
              backgroundColor: `hsl(var(--background))`,
              borderColor: `hsl(var(--input))`,
              color: `hsl(var(--foreground))`,
              borderRadius: `var(--radius)`,
            }}
          />
          <textarea
            placeholder="Textarea..."
            rows={3}
            className="flex w-full px-3 py-2 text-sm border transition-colors focus:outline-none resize-none"
            style={{
              backgroundColor: `hsl(var(--background))`,
              borderColor: `hsl(var(--input))`,
              color: `hsl(var(--foreground))`,
              borderRadius: `var(--radius)`,
            }}
          />
        </div>
      </div>

      {/* Badge Section */}
      <div>
        <h3 className="text-sm font-medium text-slate-400 mb-3">Badges</h3>
        <div className="flex flex-wrap gap-2">
          <span
            className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold"
            style={{
              backgroundColor: `hsl(var(--primary))`,
              color: `hsl(var(--primary-foreground))`,
              borderRadius: '9999px',
            }}
          >
            Primary
          </span>
          <span
            className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold"
            style={{
              backgroundColor: `hsl(var(--secondary))`,
              color: `hsl(var(--secondary-foreground))`,
              borderRadius: '9999px',
            }}
          >
            Secondary
          </span>
          <span
            className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold border"
            style={{
              backgroundColor: 'transparent',
              borderColor: `hsl(var(--border))`,
              color: `hsl(var(--foreground))`,
              borderRadius: '9999px',
            }}
          >
            Outline
          </span>
          <span
            className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold"
            style={{
              backgroundColor: `hsl(var(--destructive))`,
              color: `hsl(var(--destructive-foreground))`,
              borderRadius: '9999px',
            }}
          >
            Destructive
          </span>
        </div>
      </div>

      {/* Alert Section */}
      <div>
        <h3 className="text-sm font-medium text-slate-400 mb-3">Alerts</h3>
        <div className="space-y-2">
          <div
            className="p-3 border"
            style={{
              backgroundColor: `hsl(var(--card))`,
              borderColor: `hsl(var(--border))`,
              borderRadius: `var(--radius)`,
            }}
          >
            <p className="text-sm font-medium" style={{ color: `hsl(var(--foreground))` }}>
              Default Alert
            </p>
            <p className="text-xs mt-1" style={{ color: `hsl(var(--muted-foreground))` }}>
              This is a default alert message.
            </p>
          </div>
          <div
            className="p-3 border-l-4"
            style={{
              backgroundColor: `hsl(var(--destructive) / 0.1)`,
              borderLeftColor: `hsl(var(--destructive))`,
              borderRadius: `var(--radius)`,
            }}
          >
            <p className="text-sm font-medium" style={{ color: `hsl(var(--destructive))` }}>
              Error Alert
            </p>
            <p className="text-xs mt-1" style={{ color: `hsl(var(--muted-foreground))` }}>
              Something went wrong!
            </p>
          </div>
        </div>
      </div>

      {/* Separator */}
      <div>
        <h3 className="text-sm font-medium text-slate-400 mb-3">Separator</h3>
        <div className="h-px w-full" style={{ backgroundColor: `hsl(var(--border))` }} />
      </div>

      {/* Avatar */}
      <div>
        <h3 className="text-sm font-medium text-slate-400 mb-3">Avatar</h3>
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm"
            style={{
              backgroundColor: `hsl(var(--primary))`,
              color: `hsl(var(--primary-foreground))`,
            }}
          >
            JD
          </div>
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm"
            style={{
              backgroundColor: `hsl(var(--secondary))`,
              color: `hsl(var(--secondary-foreground))`,
            }}
          >
            AB
          </div>
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm border"
            style={{
              backgroundColor: `hsl(var(--background))`,
              borderColor: `hsl(var(--border))`,
              color: `hsl(var(--foreground))`,
            }}
          >
            CD
          </div>
        </div>
      </div>

      {/* Switch */}
      <div>
        <h3 className="text-sm font-medium text-slate-400 mb-3">Toggle</h3>
        <div className="flex items-center gap-4">
          <div
            className="w-11 h-6 rounded-full p-0.5 cursor-pointer"
            style={{ backgroundColor: `hsl(var(--primary))` }}
          >
            <div
              className="w-5 h-5 rounded-full transform translate-x-5 transition-transform"
              style={{ backgroundColor: `hsl(var(--primary-foreground))` }}
            />
          </div>
          <div
            className="w-11 h-6 rounded-full p-0.5 cursor-pointer"
            style={{ backgroundColor: `hsl(var(--muted))` }}
          >
            <div
              className="w-5 h-5 rounded-full transform translate-x-0 transition-transform"
              style={{ backgroundColor: `hsl(var(--background))` }}
            />
          </div>
        </div>
      </div>

      {/* Info Footer */}
      <div className="pt-4 border-t border-slate-700/50 text-xs text-slate-500 text-center">
        Preview shows how shadcn/ui components will look with your design tokens
      </div>
    </div>
  );
}

export default ShadcnPreview;

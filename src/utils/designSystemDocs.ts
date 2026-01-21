/**
 * Design System Documentation Generator
 *
 * Generates documentation for design systems in various formats:
 * - Markdown (for README, docs sites)
 * - HTML (standalone preview)
 */

import type {
  LayoutDesign,
  ColorSettings,
  TypographySettings,
  SpacingSettings,
  EffectsSettings,
} from '@/types/layoutDesign';

// ============================================================================
// TYPES
// ============================================================================

export type DocFormat = 'markdown' | 'html';

export interface DocSection {
  title: string;
  content: string;
}

export interface GeneratedDocs {
  format: DocFormat;
  content: string;
  sections: DocSection[];
}

// ============================================================================
// COLOR UTILITIES
// ============================================================================

/**
 * Get contrast text color for a background
 */
function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

// ============================================================================
// MARKDOWN GENERATOR
// ============================================================================

function generateColorSectionMd(colors: ColorSettings): string {
  const colorEntries = [
    { name: 'Primary', value: colors.primary, usage: 'Buttons, links, key actions' },
    {
      name: 'Secondary',
      value: colors.secondary || colors.primary,
      usage: 'Secondary buttons, accents',
    },
    { name: 'Accent', value: colors.accent || colors.primary, usage: 'Highlights, badges' },
    { name: 'Background', value: colors.background, usage: 'Page background' },
    { name: 'Surface', value: colors.surface, usage: 'Cards, modals, panels' },
    { name: 'Text', value: colors.text, usage: 'Primary text content' },
    { name: 'Text Muted', value: colors.textMuted, usage: 'Secondary text, captions' },
    { name: 'Border', value: colors.border, usage: 'Dividers, input borders' },
    { name: 'Success', value: colors.success || '#6B7280', usage: 'Success states, confirmations' },
    { name: 'Warning', value: colors.warning || '#6B7280', usage: 'Warning states, cautions' },
    { name: 'Error', value: colors.error || '#6B7280', usage: 'Error states, destructive actions' },
    { name: 'Info', value: colors.info || '#6B7280', usage: 'Informational states' },
  ];

  let md = '## Colors\n\n';
  md += '| Color | Value | Usage |\n';
  md += '|-------|-------|-------|\n';

  for (const color of colorEntries) {
    md += `| **${color.name}** | \`${color.value}\` | ${color.usage} |\n`;
  }

  md += '\n### CSS Variables\n\n```css\n:root {\n';
  for (const color of colorEntries) {
    const varName = color.name.toLowerCase().replace(/\s+/g, '-');
    md += `  --color-${varName}: ${color.value};\n`;
  }
  md += '}\n```\n';

  return md;
}

function generateTypographySectionMd(typography: TypographySettings): string {
  let md = '## Typography\n\n';

  md += '### Font Families\n\n';
  md += `- **Body:** \`${typography.fontFamily}\`\n`;
  md += `- **Headings:** \`${typography.headingFont || typography.fontFamily}\`\n\n`;

  md += '### Font Weights\n\n';
  md += `- **Body:** ${typography.bodyWeight}\n`;
  md += `- **Headings:** ${typography.headingWeight}\n\n`;

  md += '### Font Sizes\n\n';
  md += `- **Body:** ${typography.bodySize}\n`;
  md += `- **Headings:** ${typography.headingSize}\n\n`;

  md += '### Line Height & Spacing\n\n';
  md += `- **Line Height:** ${typography.lineHeight}\n`;
  md += `- **Letter Spacing:** ${typography.letterSpacing}\n\n`;

  md += '### CSS Variables\n\n```css\n:root {\n';
  md += `  --font-family-body: ${typography.fontFamily};\n`;
  md += `  --font-family-heading: ${typography.headingFont || typography.fontFamily};\n`;
  md += `  --font-weight-body: ${typography.bodyWeight};\n`;
  md += `  --font-weight-heading: ${typography.headingWeight};\n`;
  md += '}\n```\n';

  return md;
}

function generateSpacingSectionMd(spacing: SpacingSettings): string {
  const spacingValues: Record<string, string> = {
    compact: '0.5rem (8px)',
    normal: '1rem (16px)',
    relaxed: '1.5rem (24px)',
    sm: '0.5rem (8px)',
    md: '1rem (16px)',
    lg: '1.5rem (24px)',
    xl: '2rem (32px)',
  };

  let md = '## Spacing\n\n';

  md += '### Base Settings\n\n';
  md += `- **Density:** ${spacing.density} (${spacingValues[spacing.density] || spacing.density})\n`;
  md += `- **Container Width:** ${spacing.containerWidth}\n`;
  md += `- **Section Padding:** ${spacing.sectionPadding}\n`;
  md += `- **Component Gap:** ${spacing.componentGap}\n\n`;

  md += '### Spacing Scale\n\n';
  md += '| Token | Value | Use Case |\n';
  md += '|-------|-------|----------|\n';
  md += '| `xs` | 0.25rem (4px) | Tight spacing |\n';
  md += '| `sm` | 0.5rem (8px) | Compact elements |\n';
  md += '| `md` | 1rem (16px) | Default spacing |\n';
  md += '| `lg` | 1.5rem (24px) | Generous spacing |\n';
  md += '| `xl` | 2rem (32px) | Section breaks |\n';
  md += '| `2xl` | 3rem (48px) | Major sections |\n\n';

  return md;
}

function generateEffectsSectionMd(effects: EffectsSettings): string {
  const radiusValues: Record<string, string> = {
    none: '0',
    sm: '0.125rem (2px)',
    md: '0.375rem (6px)',
    lg: '0.5rem (8px)',
    xl: '0.75rem (12px)',
    full: '9999px',
  };

  const shadowValues: Record<string, string> = {
    none: 'none',
    subtle: '0 1px 2px rgba(0,0,0,0.05)',
    medium: '0 4px 6px rgba(0,0,0,0.1)',
    strong: '0 20px 25px rgba(0,0,0,0.1)',
  };

  let md = '## Effects\n\n';

  md += '### Border Radius\n\n';
  md += `Current setting: **${effects.borderRadius}** (${radiusValues[effects.borderRadius] || effects.borderRadius})\n\n`;

  md += '### Shadows\n\n';
  md += `Current setting: **${effects.shadows}**\n\n`;
  md += '```css\n';
  md += `box-shadow: ${shadowValues[effects.shadows] || 'none'};\n`;
  md += '```\n\n';

  md += '### Other Effects\n\n';
  md += `- **Animations:** ${effects.animations}\n`;
  md += `- **Blur:** ${effects.blur}\n`;
  md += `- **Gradients:** ${effects.gradients ? 'Enabled' : 'Disabled'}\n\n`;

  return md;
}

function generateUsageGuidelinesMd(): string {
  let md = '## Usage Guidelines\n\n';

  md += '### Color Usage\n\n';
  md += '1. Use **Primary** for main CTAs and interactive elements\n';
  md += '2. Use **Secondary** for less prominent actions\n';
  md += '3. Reserve **Error/Success/Warning** for status feedback only\n';
  md += '4. Ensure sufficient contrast between text and backgrounds\n\n';

  md += '### Typography Best Practices\n\n';
  md += '1. Use heading font for titles and navigation\n';
  md += '2. Use body font for paragraphs and UI text\n';
  md += '3. Maintain consistent line heights for readability\n';
  md += '4. Limit font weights to 2-3 variations\n\n';

  md += '### Spacing Guidelines\n\n';
  md += '1. Use the spacing scale consistently\n';
  md += '2. Larger spacing for section breaks, smaller for related elements\n';
  md += '3. Match density setting to content type (compact for data, relaxed for marketing)\n\n';

  return md;
}

/**
 * Generate Markdown documentation
 */
export function generateMarkdownDocs(design: Partial<LayoutDesign>): GeneratedDocs {
  const globalStyles = design.globalStyles;
  if (!globalStyles) {
    return {
      format: 'markdown',
      content: '# Design System\n\nNo design tokens defined.',
      sections: [],
    };
  }

  const sections: DocSection[] = [];
  let content = `# ${design.name || 'Design System'}\n\n`;
  content += `> Generated on ${new Date().toLocaleDateString()}\n\n`;
  content += '---\n\n';

  // Colors
  if (globalStyles.colors) {
    const colorSection = generateColorSectionMd(globalStyles.colors);
    sections.push({ title: 'Colors', content: colorSection });
    content += colorSection + '\n---\n\n';
  }

  // Typography
  if (globalStyles.typography) {
    const typographySection = generateTypographySectionMd(globalStyles.typography);
    sections.push({ title: 'Typography', content: typographySection });
    content += typographySection + '\n---\n\n';
  }

  // Spacing
  if (globalStyles.spacing) {
    const spacingSection = generateSpacingSectionMd(globalStyles.spacing);
    sections.push({ title: 'Spacing', content: spacingSection });
    content += spacingSection + '\n---\n\n';
  }

  // Effects
  if (globalStyles.effects) {
    const effectsSection = generateEffectsSectionMd(globalStyles.effects);
    sections.push({ title: 'Effects', content: effectsSection });
    content += effectsSection + '\n---\n\n';
  }

  // Usage Guidelines
  const guidelinesSection = generateUsageGuidelinesMd();
  sections.push({ title: 'Usage Guidelines', content: guidelinesSection });
  content += guidelinesSection;

  return {
    format: 'markdown',
    content,
    sections,
  };
}

// ============================================================================
// HTML GENERATOR
// ============================================================================

function generateColorSwatchesHtml(colors: ColorSettings): string {
  const colorEntries = [
    { name: 'Primary', value: colors.primary },
    { name: 'Secondary', value: colors.secondary || colors.primary },
    { name: 'Accent', value: colors.accent || colors.primary },
    { name: 'Background', value: colors.background },
    { name: 'Surface', value: colors.surface },
    { name: 'Text', value: colors.text },
    { name: 'Text Muted', value: colors.textMuted },
    { name: 'Border', value: colors.border },
    { name: 'Success', value: colors.success || '#6B7280' },
    { name: 'Warning', value: colors.warning || '#6B7280' },
    { name: 'Error', value: colors.error || '#6B7280' },
    { name: 'Info', value: colors.info || '#6B7280' },
  ];

  let html = '<div class="color-grid">\n';
  for (const color of colorEntries) {
    const textColor = getContrastColor(color.value);
    html += `  <div class="color-swatch" style="background-color: ${color.value}; color: ${textColor};">
    <span class="color-name">${color.name}</span>
    <span class="color-value">${color.value}</span>
  </div>\n`;
  }
  html += '</div>\n';

  return html;
}

function generateTypographySamplesHtml(typography: TypographySettings): string {
  return `
<div class="typography-samples">
  <div class="type-sample">
    <h1 style="font-family: ${typography.headingFont || typography.fontFamily}; font-weight: ${typography.headingWeight === 'bold' ? 700 : 600};">
      Heading 1 Example
    </h1>
    <p class="type-meta">Heading Font · ${typography.headingWeight} · ${typography.headingSize}</p>
  </div>
  <div class="type-sample">
    <h2 style="font-family: ${typography.headingFont || typography.fontFamily};">Heading 2 Example</h2>
  </div>
  <div class="type-sample">
    <h3 style="font-family: ${typography.headingFont || typography.fontFamily};">Heading 3 Example</h3>
  </div>
  <div class="type-sample">
    <p style="font-family: ${typography.fontFamily}; line-height: ${typography.lineHeight === 'tight' ? 1.25 : typography.lineHeight === 'relaxed' ? 1.75 : 1.5};">
      Body text example. The quick brown fox jumps over the lazy dog.
      This paragraph demonstrates the body font, weight, and line height settings.
    </p>
    <p class="type-meta">Body Font · ${typography.bodyWeight} · ${typography.bodySize} · Line Height: ${typography.lineHeight}</p>
  </div>
</div>
`;
}

function generateSpacingVisualsHtml(spacing: SpacingSettings): string {
  const sizes = [
    { name: 'xs', value: '4px' },
    { name: 'sm', value: '8px' },
    { name: 'md', value: '16px' },
    { name: 'lg', value: '24px' },
    { name: 'xl', value: '32px' },
  ];

  let html = '<div class="spacing-scale">\n';
  for (const size of sizes) {
    html += `  <div class="spacing-item">
    <div class="spacing-box" style="width: ${size.value}; height: ${size.value};"></div>
    <span class="spacing-label">${size.name} (${size.value})</span>
  </div>\n`;
  }
  html += '</div>\n';

  html += `<div class="spacing-info">
  <p><strong>Density:</strong> ${spacing.density}</p>
  <p><strong>Container Width:</strong> ${spacing.containerWidth}</p>
  <p><strong>Section Padding:</strong> ${spacing.sectionPadding}</p>
  <p><strong>Component Gap:</strong> ${spacing.componentGap}</p>
</div>`;

  return html;
}

/**
 * Generate HTML documentation
 */
export function generateHtmlDocs(design: Partial<LayoutDesign>): GeneratedDocs {
  const globalStyles = design.globalStyles;
  const colors = globalStyles?.colors;
  const typography = globalStyles?.typography;
  const spacing = globalStyles?.spacing;
  const effects = globalStyles?.effects;

  const bgColor = colors?.background || '#ffffff';
  const textColor = colors?.text || '#000000';
  const primaryColor = colors?.primary || '#6B7280';
  const surfaceColor = colors?.surface || '#f8fafc';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${design.name || 'Design System'} - Documentation</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ${typography?.fontFamily || 'system-ui, sans-serif'};
      background-color: ${bgColor};
      color: ${textColor};
      line-height: 1.6;
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 { font-size: 2.5rem; margin-bottom: 0.5rem; color: ${primaryColor}; }
    h2 { font-size: 1.5rem; margin: 2rem 0 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid ${colors?.border || '#e5e7eb'}; }
    h3 { font-size: 1.125rem; margin: 1.5rem 0 0.75rem; }
    .subtitle { color: ${colors?.textMuted || '#6b7280'}; margin-bottom: 2rem; }
    .color-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem; margin: 1rem 0; }
    .color-swatch {
      padding: 1.5rem 1rem;
      border-radius: ${effects?.borderRadius === 'none' ? '0' : effects?.borderRadius === 'sm' ? '4px' : '8px'};
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .color-name { display: block; font-weight: 600; margin-bottom: 0.25rem; }
    .color-value { display: block; font-size: 0.75rem; opacity: 0.8; font-family: monospace; }
    .typography-samples { background: ${surfaceColor}; padding: 1.5rem; border-radius: 8px; margin: 1rem 0; }
    .type-sample { margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid ${colors?.border || '#e5e7eb'}; }
    .type-sample:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .type-meta { font-size: 0.75rem; color: ${colors?.textMuted || '#6b7280'}; margin-top: 0.5rem; }
    .spacing-scale { display: flex; align-items: flex-end; gap: 1.5rem; margin: 1rem 0; padding: 1rem; background: ${surfaceColor}; border-radius: 8px; }
    .spacing-item { text-align: center; }
    .spacing-box { background: ${primaryColor}; border-radius: 4px; }
    .spacing-label { display: block; margin-top: 0.5rem; font-size: 0.75rem; color: ${colors?.textMuted || '#6b7280'}; }
    .spacing-info { margin-top: 1rem; font-size: 0.875rem; }
    .spacing-info p { margin: 0.25rem 0; }
    .effects-demo { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; margin: 1rem 0; }
    .effect-card {
      background: ${surfaceColor};
      padding: 1.5rem;
      border-radius: ${effects?.borderRadius === 'none' ? '0' : effects?.borderRadius === 'sm' ? '4px' : effects?.borderRadius === 'lg' ? '12px' : '8px'};
      box-shadow: ${effects?.shadows === 'none' ? 'none' : effects?.shadows === 'subtle' ? '0 1px 2px rgba(0,0,0,0.05)' : effects?.shadows === 'strong' ? '0 10px 25px rgba(0,0,0,0.1)' : '0 4px 6px rgba(0,0,0,0.1)'};
    }
    .effect-label { font-size: 0.875rem; font-weight: 600; margin-bottom: 0.25rem; }
    .effect-value { font-size: 0.75rem; color: ${colors?.textMuted || '#6b7280'}; }
    footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid ${colors?.border || '#e5e7eb'}; font-size: 0.75rem; color: ${colors?.textMuted || '#6b7280'}; text-align: center; }
  </style>
</head>
<body>
  <h1>${design.name || 'Design System'}</h1>
  <p class="subtitle">Design System Documentation · Generated ${new Date().toLocaleDateString()}</p>

  <h2>Colors</h2>
  ${colors ? generateColorSwatchesHtml(colors) : '<p>No colors defined</p>'}

  <h2>Typography</h2>
  ${typography ? generateTypographySamplesHtml(typography) : '<p>No typography defined</p>'}

  <h2>Spacing</h2>
  ${spacing ? generateSpacingVisualsHtml(spacing) : '<p>No spacing defined</p>'}

  <h2>Effects</h2>
  <div class="effects-demo">
    <div class="effect-card">
      <div class="effect-label">Border Radius</div>
      <div class="effect-value">${effects?.borderRadius || 'md'}</div>
    </div>
    <div class="effect-card">
      <div class="effect-label">Shadows</div>
      <div class="effect-value">${effects?.shadows || 'medium'}</div>
    </div>
    <div class="effect-card">
      <div class="effect-label">Animations</div>
      <div class="effect-value">${effects?.animations || 'smooth'}</div>
    </div>
    <div class="effect-card">
      <div class="effect-label">Gradients</div>
      <div class="effect-value">${effects?.gradients ? 'Enabled' : 'Disabled'}</div>
    </div>
  </div>

  <footer>
    Generated by AI App Builder · Design System Documentation
  </footer>
</body>
</html>`;

  return {
    format: 'html',
    content: html,
    sections: [
      { title: 'Colors', content: colors ? generateColorSwatchesHtml(colors) : '' },
      { title: 'Typography', content: typography ? generateTypographySamplesHtml(typography) : '' },
      { title: 'Spacing', content: spacing ? generateSpacingVisualsHtml(spacing) : '' },
    ],
  };
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

/**
 * Generate design system documentation
 */
export function generateDesignDocs(
  design: Partial<LayoutDesign>,
  format: DocFormat = 'markdown'
): GeneratedDocs {
  if (format === 'html') {
    return generateHtmlDocs(design);
  }
  return generateMarkdownDocs(design);
}

/**
 * Download documentation as file
 */
export function downloadDocs(docs: GeneratedDocs, filename?: string): void {
  const ext = docs.format === 'html' ? 'html' : 'md';
  const mimeType = docs.format === 'html' ? 'text/html' : 'text/markdown';
  const defaultName = `design-system.${ext}`;

  const blob = new Blob([docs.content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || defaultName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Documentation Generator Utilities
 *
 * Generate design system documentation in HTML, Markdown, and PDF formats.
 */

import type { LayoutDesign, CompleteDesignAnalysis, ColorSettings, TypographySettings } from '@/types/layoutDesign';

// ============================================================================
// TYPES
// ============================================================================

export type ExportFormat = 'html' | 'markdown' | 'json';

export interface DocumentationSection {
  id: string;
  title: string;
  enabled: boolean;
}

export interface DocumentationConfig {
  title: string;
  description?: string;
  version?: string;
  author?: string;
  logoUrl?: string;
  sections: DocumentationSection[];
  includeCodeSnippets: boolean;
  includeTailwindConfig: boolean;
  includeCSSVariables: boolean;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_SECTIONS: DocumentationSection[] = [
  { id: 'overview', title: 'Overview', enabled: true },
  { id: 'colors', title: 'Colors', enabled: true },
  { id: 'typography', title: 'Typography', enabled: true },
  { id: 'spacing', title: 'Spacing', enabled: true },
  { id: 'effects', title: 'Effects', enabled: true },
  { id: 'components', title: 'Components', enabled: true },
  { id: 'tokens', title: 'Design Tokens', enabled: true },
];

export const DEFAULT_CONFIG: DocumentationConfig = {
  title: 'Design System Documentation',
  version: '1.0.0',
  sections: DEFAULT_SECTIONS,
  includeCodeSnippets: true,
  includeTailwindConfig: true,
  includeCSSVariables: true,
};

// ============================================================================
// HTML GENERATION
// ============================================================================

function generateHTMLHead(config: DocumentationConfig): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: #0F172A;
      color: #F8FAFC;
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    h1 { font-size: 2.5rem; font-weight: 700; margin-bottom: 0.5rem; }
    h2 { font-size: 1.5rem; font-weight: 600; margin: 2rem 0 1rem; border-bottom: 1px solid #334155; padding-bottom: 0.5rem; }
    h3 { font-size: 1.25rem; font-weight: 500; margin: 1.5rem 0 0.75rem; }
    p { margin-bottom: 1rem; color: #94A3B8; }
    .header { margin-bottom: 3rem; }
    .version { color: #64748B; font-size: 0.875rem; }
    .section { margin-bottom: 3rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem; }
    .card { background: #1E293B; border-radius: 0.75rem; padding: 1rem; border: 1px solid #334155; }
    .color-swatch {
      width: 100%; height: 80px; border-radius: 0.5rem; margin-bottom: 0.5rem;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .color-name { font-size: 0.875rem; font-weight: 500; }
    .color-value { font-size: 0.75rem; color: #64748B; font-family: monospace; }
    .font-sample { margin-bottom: 1.5rem; }
    .font-name { font-size: 0.875rem; color: #64748B; margin-bottom: 0.25rem; }
    .spacing-item { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem; }
    .spacing-bar { background: #3B82F6; height: 1rem; border-radius: 0.25rem; }
    .spacing-label { font-size: 0.75rem; color: #64748B; width: 60px; }
    pre {
      background: #1E293B; padding: 1rem; border-radius: 0.5rem; overflow-x: auto;
      font-family: 'Monaco', 'Menlo', monospace; font-size: 0.875rem;
      border: 1px solid #334155;
    }
    code { color: #22D3EE; }
    .copy-btn {
      background: #334155; color: #94A3B8; border: none; padding: 0.25rem 0.75rem;
      border-radius: 0.25rem; cursor: pointer; font-size: 0.75rem; float: right;
    }
    .copy-btn:hover { background: #475569; color: #F8FAFC; }
    nav {
      position: fixed; top: 0; left: 0; width: 240px; height: 100vh;
      background: #1E293B; border-right: 1px solid #334155; padding: 2rem 1rem;
      overflow-y: auto;
    }
    nav a {
      display: block; padding: 0.5rem 1rem; color: #94A3B8; text-decoration: none;
      border-radius: 0.5rem; font-size: 0.875rem; margin-bottom: 0.25rem;
    }
    nav a:hover { background: #334155; color: #F8FAFC; }
    .main { margin-left: 240px; }
    @media (max-width: 768px) {
      nav { display: none; }
      .main { margin-left: 0; }
    }
  </style>
</head>`;
}

function generateNavigation(sections: DocumentationSection[]): string {
  const enabledSections = sections.filter(s => s.enabled);
  const links = enabledSections.map(s => `    <a href="#${s.id}">${s.title}</a>`).join('\n');

  return `<nav>
  <div style="font-weight: 600; margin-bottom: 1.5rem; padding: 0 1rem;">Contents</div>
${links}
</nav>`;
}

function generateColorsSection(colors: Partial<ColorSettings>): string {
  const colorEntries = Object.entries(colors).filter(([, v]) => v);
  const swatches = colorEntries.map(([name, value]) => `
      <div class="card">
        <div class="color-swatch" style="background: ${value}"></div>
        <div class="color-name">${name}</div>
        <div class="color-value">${value}</div>
      </div>`).join('');

  return `<section id="colors" class="section">
    <h2>Colors</h2>
    <p>The color palette defines all colors used throughout the design system.</p>
    <div class="grid">
${swatches}
    </div>
  </section>`;
}

function generateTypographySection(typography: Partial<TypographySettings>): string {
  const fontFamily = typography.fontFamily || 'Inter, system-ui, sans-serif';
  const headingFont = typography.headingFont || fontFamily;

  return `<section id="typography" class="section">
    <h2>Typography</h2>
    <p>Typography specifications for consistent text styling.</p>

    <h3>Font Families</h3>
    <div class="font-sample">
      <div class="font-name">Heading Font</div>
      <div style="font-family: ${headingFont}; font-size: 2rem; font-weight: 600;">
        The quick brown fox jumps over the lazy dog
      </div>
    </div>
    <div class="font-sample">
      <div class="font-name">Body Font</div>
      <div style="font-family: ${fontFamily}; font-size: 1rem;">
        The quick brown fox jumps over the lazy dog
      </div>
    </div>

    <h3>Type Scale</h3>
    <div class="font-sample" style="font-size: 3rem; font-weight: 700;">Display</div>
    <div class="font-sample" style="font-size: 2.25rem; font-weight: 700;">H1 Heading</div>
    <div class="font-sample" style="font-size: 1.875rem; font-weight: 600;">H2 Heading</div>
    <div class="font-sample" style="font-size: 1.5rem; font-weight: 600;">H3 Heading</div>
    <div class="font-sample" style="font-size: 1.25rem; font-weight: 500;">H4 Heading</div>
    <div class="font-sample" style="font-size: 1rem;">Body Text</div>
    <div class="font-sample" style="font-size: 0.875rem; color: #64748B;">Small Text</div>
  </section>`;
}

function generateSpacingSection(): string {
  const spacingScale = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64];

  const spacingItems = spacingScale.map(size => `
      <div class="spacing-item">
        <div class="spacing-label">${size}px</div>
        <div class="spacing-bar" style="width: ${size * 2}px"></div>
      </div>`).join('');

  return `<section id="spacing" class="section">
    <h2>Spacing</h2>
    <p>Spacing scale used for margins, padding, and gaps.</p>
${spacingItems}
  </section>`;
}

function generateTokensSection(design: Partial<LayoutDesign>, config: DocumentationConfig): string {
  let content = `<section id="tokens" class="section">
    <h2>Design Tokens</h2>
    <p>Copy-pasteable code snippets for implementing the design system.</p>`;

  if (config.includeCSSVariables) {
    const colors = design.globalStyles?.colors || {};
    const cssVars = Object.entries(colors)
      .filter(([, v]) => v)
      .map(([key, value]) => `  --color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value};`)
      .join('\n');

    content += `
    <h3>CSS Variables</h3>
    <pre><button class="copy-btn" onclick="copyCode(this)">Copy</button><code>:root {
${cssVars}
}</code></pre>`;
  }

  if (config.includeTailwindConfig) {
    const colors = design.globalStyles?.colors || {};
    const tailwindColors = Object.entries(colors)
      .filter(([, v]) => v)
      .map(([key, value]) => `        '${key}': '${value}',`)
      .join('\n');

    content += `
    <h3>Tailwind Config</h3>
    <pre><button class="copy-btn" onclick="copyCode(this)">Copy</button><code>module.exports = {
  theme: {
    extend: {
      colors: {
${tailwindColors}
      }
    }
  }
}</code></pre>`;
  }

  content += '\n  </section>';
  return content;
}

export function generateHTMLDocumentation(
  design: Partial<LayoutDesign>,
  analysis?: CompleteDesignAnalysis,
  config: Partial<DocumentationConfig> = {}
): string {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const { sections } = mergedConfig;

  let html = generateHTMLHead(mergedConfig);
  html += '\n<body>';
  html += generateNavigation(sections);
  html += '\n<main class="main">\n<div class="container">';

  // Header
  html += `
  <header class="header">
    <h1>${mergedConfig.title}</h1>
    ${mergedConfig.version ? `<div class="version">Version ${mergedConfig.version}</div>` : ''}
    ${mergedConfig.description ? `<p>${mergedConfig.description}</p>` : ''}
  </header>`;

  // Sections
  const colors = design.globalStyles?.colors || {};
  const typography = design.globalStyles?.typography || {};

  if (sections.find(s => s.id === 'colors' && s.enabled)) {
    html += generateColorsSection(colors);
  }

  if (sections.find(s => s.id === 'typography' && s.enabled)) {
    html += generateTypographySection(typography);
  }

  if (sections.find(s => s.id === 'spacing' && s.enabled)) {
    html += generateSpacingSection();
  }

  if (sections.find(s => s.id === 'tokens' && s.enabled)) {
    html += generateTokensSection(design, mergedConfig);
  }

  // Copy function
  html += `
</div>
</main>
<script>
function copyCode(btn) {
  const code = btn.parentElement.querySelector('code').textContent;
  navigator.clipboard.writeText(code);
  btn.textContent = 'Copied!';
  setTimeout(() => btn.textContent = 'Copy', 2000);
}
</script>
</body>
</html>`;

  return html;
}

// ============================================================================
// MARKDOWN GENERATION
// ============================================================================

export function generateMarkdownDocumentation(
  design: Partial<LayoutDesign>,
  analysis?: CompleteDesignAnalysis,
  config: Partial<DocumentationConfig> = {}
): string {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const colors: Partial<ColorSettings> = design.globalStyles?.colors || {};
  const typography: Partial<TypographySettings> = design.globalStyles?.typography || {};

  let md = `# ${mergedConfig.title}\n\n`;

  if (mergedConfig.version) {
    md += `Version: ${mergedConfig.version}\n\n`;
  }

  if (mergedConfig.description) {
    md += `${mergedConfig.description}\n\n`;
  }

  md += '---\n\n';

  // Colors
  md += '## Colors\n\n';
  md += '| Name | Value | Preview |\n';
  md += '|------|-------|----------|\n';
  Object.entries(colors).filter(([, v]) => v).forEach(([name, value]) => {
    const colorValue = String(value);
    md += `| ${name} | \`${colorValue}\` | ![${name}](https://via.placeholder.com/30/${colorValue.slice(1)}/${colorValue.slice(1)}) |\n`;
  });
  md += '\n';

  // Typography
  md += '## Typography\n\n';
  md += `- **Heading Font:** ${typography.headingFont || typography.fontFamily || 'System'}\n`;
  md += `- **Body Font:** ${typography.fontFamily || 'System'}\n`;
  md += `- **Heading Weight:** ${typography.headingWeight || 'semibold'}\n`;
  md += `- **Body Weight:** ${typography.bodyWeight || 'normal'}\n`;
  md += '\n';

  // CSS Variables
  if (mergedConfig.includeCSSVariables) {
    md += '## CSS Variables\n\n';
    md += '```css\n:root {\n';
    Object.entries(colors).filter(([, v]) => v).forEach(([key, value]) => {
      md += `  --color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value};\n`;
    });
    md += '}\n```\n\n';
  }

  // Tailwind Config
  if (mergedConfig.includeTailwindConfig) {
    md += '## Tailwind Config\n\n';
    md += '```javascript\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: {\n';
    Object.entries(colors).filter(([, v]) => v).forEach(([key, value]) => {
      md += `        '${key}': '${value}',\n`;
    });
    md += '      }\n    }\n  }\n}\n```\n';
  }

  return md;
}

// ============================================================================
// JSON EXPORT
// ============================================================================

export function generateJSONExport(
  design: Partial<LayoutDesign>,
  analysis?: CompleteDesignAnalysis
): string {
  const exportData = {
    metadata: {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    },
    design: {
      globalStyles: design.globalStyles,
      components: design.components,
      structure: design.structure,
      responsive: design.responsive,
    },
    analysis: analysis ? {
      colors: analysis.colors,
      typography: analysis.typography,
      spacing: analysis.spacing,
      effects: analysis.effects,
    } : undefined,
  };

  return JSON.stringify(exportData, null, 2);
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

export function generateDocumentation(
  format: ExportFormat,
  design: Partial<LayoutDesign>,
  analysis?: CompleteDesignAnalysis,
  config?: Partial<DocumentationConfig>
): string {
  switch (format) {
    case 'html':
      return generateHTMLDocumentation(design, analysis, config);
    case 'markdown':
      return generateMarkdownDocumentation(design, analysis, config);
    case 'json':
      return generateJSONExport(design, analysis);
    default:
      return generateHTMLDocumentation(design, analysis, config);
  }
}

export default {
  generateDocumentation,
  generateHTMLDocumentation,
  generateMarkdownDocumentation,
  generateJSONExport,
  DEFAULT_CONFIG,
  DEFAULT_SECTIONS,
};

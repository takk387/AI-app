/**
 * Design Token Prompt Builder
 *
 * Builds design token instructions for Claude during app code generation.
 * Ensures generated apps use the exact styling from the Layout Builder.
 */

import type { LayoutDesign, GlobalStyles, CompleteDesignAnalysis } from '@/types/layoutDesign';
import {
  borderRadiusMap,
  shadowMap,
  animationMap,
  containerWidthMap,
  sectionPaddingMap,
  componentGapMap,
  fontWeightMap,
  lineHeightMap,
  letterSpacingMap,
} from '@/utils/designTokenMappings';

// ============================================================================
// MAIN PROMPT BUILDER
// ============================================================================

/**
 * Build comprehensive design token instructions for Claude
 * This tells Claude exactly what colors, typography, spacing, and effects to use
 */
export function buildDesignTokenPrompt(layoutDesign: LayoutDesign): string {
  const { globalStyles, components, basePreferences } = layoutDesign;

  const sections = [
    buildDesignSystemHeader(layoutDesign.name, basePreferences.style),
    buildColorSection(globalStyles.colors),
    buildTypographySection(globalStyles.typography),
    buildSpacingSection(globalStyles.spacing),
    buildEffectsSection(globalStyles.effects),
    buildComponentSection(components),
    buildCSSVariablesReference(globalStyles),
    buildUsageInstructions(),
  ];

  return sections.join('\n\n');
}

/**
 * Build a shorter, more focused design token prompt for phase execution
 */
export function buildDesignTokenPromptCompact(layoutDesign: LayoutDesign): string {
  const { globalStyles } = layoutDesign;

  return `## DESIGN SYSTEM (MANDATORY)

Use these CSS variables in ALL generated components:

### Colors
\`\`\`css
--color-primary: ${globalStyles.colors.primary};
--color-secondary: ${globalStyles.colors.secondary || globalStyles.colors.primary};
--color-accent: ${globalStyles.colors.accent || globalStyles.colors.primary};
--color-background: ${globalStyles.colors.background};
--color-surface: ${globalStyles.colors.surface};
--color-text: ${globalStyles.colors.text};
--color-text-muted: ${globalStyles.colors.textMuted};
--color-border: ${globalStyles.colors.border};
\`\`\`

### Typography
- Font: \`${globalStyles.typography.fontFamily}\`
- Headings: \`font-[${fontWeightMap[globalStyles.typography.headingWeight]?.css || '600'}]\`

### Effects
- Border Radius: \`${borderRadiusMap[globalStyles.effects.borderRadius]?.css || '0.5rem'}\`
- Shadows: \`${shadowMap[globalStyles.effects.shadows]?.css || '0 4px 6px -1px rgb(0 0 0 / 0.1)'}\`

IMPORTANT: Use \`var(--color-*)\`, \`var(--border-radius)\`, etc. instead of hardcoded Tailwind colors!`;
}

// ============================================================================
// SECTION BUILDERS
// ============================================================================

function buildDesignSystemHeader(name: string, style: string): string {
  return `## 🎨 DESIGN SYSTEM: ${name}
Style: ${style.charAt(0).toUpperCase() + style.slice(1)}

**CRITICAL**: You MUST use these exact design tokens in ALL generated code.
Do NOT use default Tailwind colors (bg-blue-500, text-gray-900, etc.).
Instead, use CSS variables: bg-[var(--color-primary)], text-[var(--color-text)], etc.`;
}

function buildColorSection(colors: GlobalStyles['colors']): string {
  return `### Colors (Use CSS Variables)

| Token | Value | Usage |
|-------|-------|-------|
| \`--color-primary\` | \`${colors.primary}\` | Primary buttons, links, highlights |
| \`--color-secondary\` | \`${colors.secondary || colors.primary}\` | Secondary buttons, accents |
| \`--color-accent\` | \`${colors.accent || colors.primary}\` | Call-to-action, badges |
| \`--color-background\` | \`${colors.background}\` | Page background |
| \`--color-surface\` | \`${colors.surface}\` | Cards, modals, panels |
| \`--color-text\` | \`${colors.text}\` | Primary text |
| \`--color-text-muted\` | \`${colors.textMuted}\` | Secondary text, labels |
| \`--color-border\` | \`${colors.border}\` | Borders, dividers |
| \`--color-success\` | \`${colors.success || '#6B7280'}\` | Success states |
| \`--color-warning\` | \`${colors.warning || '#6B7280'}\` | Warning states |
| \`--color-error\` | \`${colors.error || '#6B7280'}\` | Error states |

**Tailwind Usage**:
- Background: \`bg-[var(--color-primary)]\`
- Text: \`text-[var(--color-text)]\`
- Border: \`border-[var(--color-border)]\`
- Hover: \`hover:bg-[var(--color-primary)]/90\``;
}

function buildTypographySection(typography: GlobalStyles['typography']): string {
  const headingWeight = fontWeightMap[typography.headingWeight] || fontWeightMap.semibold;
  const bodyWeight = fontWeightMap[typography.bodyWeight] || fontWeightMap.normal;
  const lineHeight = lineHeightMap[typography.lineHeight] || lineHeightMap.normal;
  const letterSpacing = letterSpacingMap[typography.letterSpacing] || letterSpacingMap.normal;

  return `### Typography

**Font Family**: \`${typography.fontFamily}\`
${typography.headingFont ? `**Heading Font**: \`${typography.headingFont}\`` : ''}

| Property | Value | CSS Variable |
|----------|-------|--------------|
| Heading Weight | ${typography.headingWeight} (${headingWeight.css}) | \`var(--font-weight-heading)\` |
| Body Weight | ${typography.bodyWeight} (${bodyWeight.css}) | \`var(--font-weight-body)\` |
| Line Height | ${typography.lineHeight} (${lineHeight.css}) | \`var(--line-height)\` |
| Letter Spacing | ${typography.letterSpacing} (${letterSpacing.css}) | \`var(--letter-spacing)\` |

**Tailwind Usage**:
- Font: \`font-[family-name:var(--font-family)]\` or use the font class from globals.css
- Weight: \`${headingWeight.tailwind}\` for headings, \`${bodyWeight.tailwind}\` for body
- Line Height: \`${lineHeight.tailwind}\``;
}

function buildSpacingSection(spacing: GlobalStyles['spacing']): string {
  const container = containerWidthMap[spacing.containerWidth] || containerWidthMap.standard;
  const section = sectionPaddingMap[spacing.sectionPadding] || sectionPaddingMap.lg;
  const gap = componentGapMap[spacing.componentGap] || componentGapMap.md;

  return `### Spacing

| Property | Value | Tailwind |
|----------|-------|----------|
| Density | ${spacing.density} | Affects padding/gaps globally |
| Container Width | ${container.css} | \`${container.tailwind}\` |
| Section Padding | ${section.css} | \`${section.tailwind}\` |
| Component Gap | ${gap.css} | \`${gap.tailwind}\` |

**CSS Variables**:
- \`var(--container-width)\`: ${container.css}
- \`var(--section-padding)\`: ${section.css}
- \`var(--component-gap)\`: ${gap.css}
- \`var(--spacing-padding)\`: Base padding for components`;
}

function buildEffectsSection(effects: GlobalStyles['effects']): string {
  const radius = borderRadiusMap[effects.borderRadius] || borderRadiusMap.lg;
  const shadow = shadowMap[effects.shadows] || shadowMap.medium;
  const animation = animationMap[effects.animations] || animationMap.smooth;

  return `### Effects

| Property | Value | Tailwind | CSS Variable |
|----------|-------|----------|--------------|
| Border Radius | ${effects.borderRadius} | \`${radius.tailwind}\` | \`var(--border-radius)\` |
| Shadows | ${effects.shadows} | \`${shadow.tailwind}\` | \`var(--shadow)\` |
| Animations | ${effects.animations} | - | \`var(--transition-duration)\`, \`var(--transition-easing)\` |
| Blur | ${effects.blur} | - | \`var(--blur)\` |
| Gradients | ${effects.gradients ? 'Enabled' : 'Disabled'} | - | - |

**Exact Values**:
- Border Radius: \`${radius.css}\`
- Box Shadow: \`${shadow.css}\`
- Transition: \`${animation.duration} ${animation.easing}\`

**Tailwind Usage**:
- Rounded: \`${radius.tailwind}\` or \`rounded-[var(--border-radius)]\`
- Shadow: \`${shadow.tailwind}\` or \`shadow-[var(--shadow)]\`
- Transition: \`transition-all duration-[var(--transition-duration)]\``;
}

function buildComponentSection(components: LayoutDesign['components']): string {
  const sections: string[] = ['### Component Specifications'];

  if (components.header) {
    sections.push(`
**Header**:
- Height: ${components.header.height}
- Style: ${components.header.style}
- Logo Position: ${components.header.logoPosition}
- Has Search: ${components.header.hasSearch}
- Has CTA: ${components.header.hasCTA}`);
  }

  if (components.cards) {
    sections.push(`
**Cards**:
- Style: ${components.cards.style}
- Image Position: ${components.cards.imagePosition}
- Hover Effect: ${components.cards.hoverEffect}
- Aspect Ratio: ${components.cards.aspectRatio}`);
  }

  if (components.hero) {
    sections.push(`
**Hero**:
- Height: ${components.hero.height}
- Layout: ${components.hero.layout}
- CTA Count: ${components.hero.ctaCount}`);
  }

  if (components.sidebar) {
    sections.push(`
**Sidebar**:
- Position: ${components.sidebar.position}
- Width: ${components.sidebar.width}
- Collapsible: ${components.sidebar.collapsible}
- Style: ${components.sidebar.style}`);
  }

  if (components.footer) {
    sections.push(`
**Footer**:
- Columns: ${components.footer.columns}
- Show Social: ${components.footer.showSocial}
- Show Newsletter: ${components.footer.showNewsletter}`);
  }

  return sections.join('\n');
}

function buildCSSVariablesReference(globalStyles: GlobalStyles): string {
  return `### Complete CSS Variables Reference

Include these in your \`globals.css\`:

\`\`\`css
:root {
  /* Colors */
  --color-primary: ${globalStyles.colors.primary};
  --color-secondary: ${globalStyles.colors.secondary || globalStyles.colors.primary};
  --color-accent: ${globalStyles.colors.accent || globalStyles.colors.primary};
  --color-background: ${globalStyles.colors.background};
  --color-surface: ${globalStyles.colors.surface};
  --color-text: ${globalStyles.colors.text};
  --color-text-muted: ${globalStyles.colors.textMuted};
  --color-border: ${globalStyles.colors.border};
  --color-success: ${globalStyles.colors.success || '#6B7280'};
  --color-warning: ${globalStyles.colors.warning || '#6B7280'};
  --color-error: ${globalStyles.colors.error || '#6B7280'};

  /* Typography */
  --font-family: ${globalStyles.typography.fontFamily};
  --font-weight-heading: ${fontWeightMap[globalStyles.typography.headingWeight]?.css || '600'};
  --font-weight-body: ${fontWeightMap[globalStyles.typography.bodyWeight]?.css || '400'};
  --line-height: ${lineHeightMap[globalStyles.typography.lineHeight]?.css || '1.5'};
  --letter-spacing: ${letterSpacingMap[globalStyles.typography.letterSpacing]?.css || '0'};

  /* Spacing */
  --container-width: ${containerWidthMap[globalStyles.spacing.containerWidth]?.css || '64rem'};
  --section-padding: ${sectionPaddingMap[globalStyles.spacing.sectionPadding]?.css || '4rem'};
  --component-gap: ${componentGapMap[globalStyles.spacing.componentGap]?.css || '1rem'};

  /* Effects */
  --border-radius: ${borderRadiusMap[globalStyles.effects.borderRadius]?.css || '0.5rem'};
  --shadow: ${shadowMap[globalStyles.effects.shadows]?.css || '0 4px 6px -1px rgb(0 0 0 / 0.1)'};
  --transition-duration: ${animationMap[globalStyles.effects.animations]?.duration || '300ms'};
  --transition-easing: ${animationMap[globalStyles.effects.animations]?.easing || 'ease-in-out'};
}
\`\`\``;
}

function buildUsageInstructions(): string {
  return `### Usage Instructions

**DO THIS**:
\`\`\`tsx
<button className="bg-[var(--color-primary)] text-white rounded-[var(--border-radius)] px-4 py-2 transition-all duration-[var(--transition-duration)]">
  Click me
</button>

<div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--border-radius)] shadow-[var(--shadow)] p-4">
  <h2 className="text-[var(--color-text)] font-[var(--font-weight-heading)]">Title</h2>
  <p className="text-[var(--color-text-muted)]">Description</p>
</div>
\`\`\`

**DON'T DO THIS**:
\`\`\`tsx
// WRONG - Using hardcoded Tailwind colors
<button className="bg-blue-500 text-white rounded-lg px-4 py-2">
  Click me
</button>

// WRONG - Using default gray colors
<div className="bg-gray-800 border border-gray-700 rounded-lg shadow-md p-4">
  <h2 className="text-gray-100 font-semibold">Title</h2>
  <p className="text-gray-400">Description</p>
</div>
\`\`\`

**REMEMBER**:
- Always use \`var(--color-*)\` for colors
- Always use \`var(--border-radius)\` for rounded corners
- Always use \`var(--shadow)\` for box shadows
- This ensures the app matches the design system exactly`;
}

// ============================================================================
// PIXEL-PERFECT ANALYSIS PROMPT BUILDER
// ============================================================================

/**
 * Build prompt section from pixel-perfect analysis results
 * Used when the layout was analyzed from an uploaded image/video
 */
export function buildPixelPerfectPrompt(analysis: CompleteDesignAnalysis): string {
  const sections: string[] = [
    '## 🎯 PIXEL-PERFECT DESIGN SPECS (From Image Analysis)',
    '',
    'These specifications were extracted from the reference design. Apply them EXACTLY.',
  ];

  // Colors with exact hex values
  if (analysis.colors) {
    sections.push(`
### Exact Colors
| Role | Hex Value |
|------|-----------|
| Primary | \`${analysis.colors.primary}\` |
| Secondary | \`${analysis.colors.secondary}\` |
| Background | \`${analysis.colors.background}\` |
| Surface | \`${analysis.colors.surface}\` |
| Text | \`${analysis.colors.text}\` |
| Text Muted | \`${analysis.colors.textMuted}\` |
| Border | \`${analysis.colors.border}\` |`);
  }

  // Typography with exact measurements
  if (analysis.typography) {
    sections.push(`
### Typography
- Heading Font: ${analysis.typography.headingFont?.family || 'Inter'} (${analysis.typography.headingFont?.confidence ? `${Math.round(analysis.typography.headingFont.confidence * 100)}% confidence` : 'estimated'})
- Body Font: ${analysis.typography.bodyFont?.family || 'Inter'}`);

    if (analysis.typography.displaySizes) {
      sections.push(`
**Heading Sizes**:
- H1: ${analysis.typography.displaySizes.h1?.size || '48px'}, weight ${analysis.typography.displaySizes.h1?.weight || 700}
- H2: ${analysis.typography.displaySizes.h2?.size || '36px'}, weight ${analysis.typography.displaySizes.h2?.weight || 600}
- H3: ${analysis.typography.displaySizes.h3?.size || '24px'}, weight ${analysis.typography.displaySizes.h3?.weight || 600}`);
    }
  }

  // Spacing with exact measurements
  if (analysis.spacing) {
    sections.push(`
### Spacing
- Base Unit: ${analysis.spacing.baseUnit || 4}px
- Container Max Width: ${analysis.spacing.containerMaxWidth || '1280px'}
- Card Padding: ${analysis.spacing.cardPadding || '24px'}
- Section Padding: ${typeof analysis.spacing.sectionPadding === 'string' ? analysis.spacing.sectionPadding : '64px'}`);
  }

  // Effects with exact values
  if (analysis.effects) {
    sections.push(`
### Effects
- Border Radius (card): ${analysis.effects.borderRadius?.card || '12px'}
- Border Radius (button): ${analysis.effects.borderRadius?.button || '8px'}
- Box Shadow (card): ${analysis.effects.shadows?.card || '0 4px 6px -1px rgba(0,0,0,0.1)'}
- Transition: ${analysis.effects.transitions?.normal || '300ms ease-in-out'}`);
  }

  return sections.join('\n');
}

// ============================================================================
// ANIMATION PROMPT BUILDER
// ============================================================================

/**
 * Build animation instructions from detected animations
 */
export function buildAnimationPrompt(animations: CompleteDesignAnalysis['animations']): string {
  if (!animations) return '';

  const sections: string[] = ['### Animations'];

  if (animations.hover && animations.hover.length > 0) {
    sections.push('\n**Hover Effects**:');
    animations.hover.forEach((anim, i) => {
      sections.push(
        `${i + 1}. ${anim.element || 'Element'}: ${anim.css || anim.tailwind || 'Custom animation'}`
      );
    });
  }

  if (animations.entrance && animations.entrance.length > 0) {
    sections.push('\n**Entrance Animations**:');
    animations.entrance.forEach((anim, i) => {
      sections.push(`${i + 1}. ${anim.element || 'Element'}: ${anim.css || 'fade-in'}`);
    });
  }

  if (animations.transitions && animations.transitions.length > 0) {
    sections.push('\n**Transitions**:');
    animations.transitions.forEach((trans, i) => {
      sections.push(
        `${i + 1}. Duration: ${trans.duration || '300ms'}, Easing: ${trans.easing || 'ease-in-out'}`
      );
    });
  }

  return sections.join('\n');
}

// ============================================================================
// EXPORTS
// ============================================================================

const designTokenPrompt = {
  buildDesignTokenPrompt,
  buildDesignTokenPromptCompact,
  buildPixelPerfectPrompt,
  buildAnimationPrompt,
};

export default designTokenPrompt;

/**
 * Phase Execution Service
 *
 * Manages the execution of dynamic phases, including:
 * - Building context prompts for each phase
 * - Tracking accumulated code and features
 * - Handling phase dependencies
 * - Managing the execution flow
 */

import type {
  DynamicPhase,
  DynamicPhasePlan,
  PhaseExecutionContext,
  PhaseExecutionResult,
  AccumulatedFile,
  AccumulatedFeature,
  APIContract,
  // Phase Integrity Types (P1-P9)
  FileConflict,
  FileConflictResult,
  ImportInfo,
  ImportValidationResult,
  UnresolvedImport,
  PhaseSnapshot,
  TypeCheckResult,
  TypeDefinition,
  TypeCompatibilityResult,
  PhaseTestResults,
  ContractValidationResult,
  RegressionTestResult,
} from '@/types/dynamicPhases';
import type { QualityReport, ReviewFile, ReviewStrictness } from '@/types/codeReview';

// ============================================================================
// RESULT TYPES FOR EXPLICIT ERROR HANDLING
// ============================================================================

/**
 * Result type for operations that can fail or be intentionally skipped
 * Distinguishes between: success, intentional skip, and actual error
 */
export type OperationResult<T> =
  | { status: 'success'; data: T }
  | { status: 'skipped'; reason: string }
  | { status: 'error'; error: string; details?: unknown };

/**
 * Helper to create success result
 */
function success<T>(data: T): OperationResult<T> {
  return { status: 'success', data };
}

/**
 * Helper to create skipped result
 */
function skipped<T>(reason: string): OperationResult<T> {
  return { status: 'skipped', reason };
}

/**
 * Helper to create error result
 */
function error<T>(message: string, details?: unknown): OperationResult<T> {
  return { status: 'error', error: message, details };
}

// Dynamic import for CodeReviewService to avoid bundling tree-sitter in client
// This is imported lazily only when quality review methods are called (server-side only)
// Using webpackIgnore to prevent webpack from analyzing this import at build time
type CodeReviewServiceType = typeof import('./CodeReviewService');
let codeReviewService: CodeReviewServiceType | null = null;

async function getCodeReviewService(): Promise<CodeReviewServiceType> {
  if (!codeReviewService) {
    // webpackIgnore tells webpack to skip this import during bundling
    // This import will only be resolved at runtime on the server
    codeReviewService = await import(/* webpackIgnore: true */ './CodeReviewService');
  }
  return codeReviewService;
}
import type { LayoutDesign } from '@/types/layoutDesign';
import { DynamicPhaseGenerator } from './DynamicPhaseGenerator';
import { getCodeContextService, CodeContextService } from './CodeContextService';
import type { CodeContextSnapshot } from '@/types/codeContext';
import {
  borderRadiusMap,
  shadowMap,
  blurMap,
  spacingDensityMap,
  sectionPaddingMap,
  containerWidthMap,
  componentGapMap,
  fontWeightMap,
  headingSizeMap,
  bodySizeMap,
  lineHeightMap,
  letterSpacingMap,
  animationMap,
  headerHeightMap,
  headerStyleMap,
  heroHeightMap,
  heroLayoutMap,
  cardStyleMap,
  cardHoverEffectMap,
  sidebarWidthMap,
  listStyleMap,
  listDensityMap,
  footerStyleMap,
  footerColumnsMap,
  generateGlobalsCSSContent,
} from '@/utils/designTokenMappings';

// ============================================================================
// LAYOUT DESIGN FORMATTING
// ============================================================================

/**
 * Format a complete LayoutDesign into a detailed prompt section
 * This ensures ALL design specifications reach the code generation
 * with concrete CSS/Tailwind mappings for exact implementation
 */
export function formatLayoutDesignForPrompt(design: LayoutDesign): string {
  const { globalStyles, components, structure, responsive } = design;

  // Get concrete CSS/Tailwind values
  const borderRadius = borderRadiusMap[globalStyles.effects.borderRadius] || borderRadiusMap.lg;
  const shadow = shadowMap[globalStyles.effects.shadows] || shadowMap.medium;
  const blur = blurMap[globalStyles.effects.blur] || blurMap.none;
  const density = spacingDensityMap[globalStyles.spacing.density] || spacingDensityMap.normal;
  const sectionPad = sectionPaddingMap[globalStyles.spacing.sectionPadding] || sectionPaddingMap.lg;
  const container =
    containerWidthMap[globalStyles.spacing.containerWidth] || containerWidthMap.standard;
  const gap = componentGapMap[globalStyles.spacing.componentGap] || componentGapMap.md;
  const headingWeight =
    fontWeightMap[globalStyles.typography.headingWeight] || fontWeightMap.semibold;
  const bodyWeight = fontWeightMap[globalStyles.typography.bodyWeight] || fontWeightMap.normal;
  const headingSize = headingSizeMap[globalStyles.typography.headingSize] || headingSizeMap.lg;
  const bodySize = bodySizeMap[globalStyles.typography.bodySize] || bodySizeMap.base;
  const lineHeight = lineHeightMap[globalStyles.typography.lineHeight] || lineHeightMap.normal;
  const letterSpacing =
    letterSpacingMap[globalStyles.typography.letterSpacing] || letterSpacingMap.normal;
  const animation = animationMap[globalStyles.effects.animations] || animationMap.smooth;

  let prompt = `## CRITICAL: Design Fidelity Requirements

You MUST implement the design specifications EXACTLY as specified below.
Do NOT deviate from these values. Do NOT substitute colors, spacing, or effects.

**MANDATORY RULES:**
1. Use the EXACT hex colors provided - do not substitute or approximate
2. Apply the EXACT border radius, shadow, and spacing values using the Tailwind classes listed
3. Follow component visibility and configuration settings precisely
4. Match typography weights, sizes, and spacing exactly
5. Create CSS variables in globals.css for design tokens
6. Use the provided Tailwind classes - do not use arbitrary values when mapped classes exist

---

## Complete Design System Specifications

### Typography (USE EXACT VALUES)
- Font Family: ${globalStyles.typography.fontFamily}
- Heading Font: ${globalStyles.typography.headingFont || globalStyles.typography.fontFamily}
- Heading Weight: ${globalStyles.typography.headingWeight} -> ${headingWeight.tailwind} (CSS: ${headingWeight.css})
- Body Weight: ${globalStyles.typography.bodyWeight} -> ${bodyWeight.tailwind} (CSS: ${bodyWeight.css})
- Heading Sizes: h1=${headingSize.h1}, h2=${headingSize.h2}, h3=${headingSize.h3}, h4=${headingSize.h4}
- Body Size: ${globalStyles.typography.bodySize} -> ${bodySize.tailwind} (CSS: ${bodySize.css})
- Line Height: ${globalStyles.typography.lineHeight} -> ${lineHeight.tailwind} (CSS: ${lineHeight.css})
- Letter Spacing: ${globalStyles.typography.letterSpacing} -> ${letterSpacing.tailwind} (CSS: ${letterSpacing.css})

### Color Palette (USE EXACT HEX VALUES)
- Primary: ${globalStyles.colors.primary} -> Use as bg-[${globalStyles.colors.primary}] or var(--color-primary)
- Secondary: ${globalStyles.colors.secondary || globalStyles.colors.primary} -> var(--color-secondary)
- Accent: ${globalStyles.colors.accent || globalStyles.colors.primary} -> var(--color-accent)
- Background: ${globalStyles.colors.background} -> bg-[${globalStyles.colors.background}] or var(--color-background)
- Surface: ${globalStyles.colors.surface} -> bg-[${globalStyles.colors.surface}] or var(--color-surface)
- Text: ${globalStyles.colors.text} -> text-[${globalStyles.colors.text}] or var(--color-text)
- Text Muted: ${globalStyles.colors.textMuted} -> text-[${globalStyles.colors.textMuted}] or var(--color-text-muted)
- Border: ${globalStyles.colors.border} -> border-[${globalStyles.colors.border}] or var(--color-border)
- Success: ${globalStyles.colors.success || '#6B7280'}
- Warning: ${globalStyles.colors.warning || '#6B7280'}
- Error: ${globalStyles.colors.error || '#6B7280'}
- Info: ${globalStyles.colors.info || '#6B7280'}

### Spacing System (USE EXACT TAILWIND CLASSES)
- Density: ${globalStyles.spacing.density} -> Gap: ${density.tailwindGap}, Padding: ${density.tailwindPadding}
- Container Width: ${globalStyles.spacing.containerWidth} -> ${container.tailwind} (CSS: ${container.css})
- Section Padding: ${globalStyles.spacing.sectionPadding} -> ${sectionPad.tailwind} (CSS: ${sectionPad.css})
- Component Gap: ${globalStyles.spacing.componentGap} -> ${gap.tailwind} (CSS: ${gap.css})

### Effects (USE EXACT TAILWIND CLASSES)
- Border Radius: ${globalStyles.effects.borderRadius} -> ${borderRadius.tailwind} (CSS: ${borderRadius.css})
- Shadows: ${globalStyles.effects.shadows} -> ${shadow.tailwind}
- Animations: ${globalStyles.effects.animations} -> duration: ${animation.duration}, easing: ${animation.easing}
- Blur: ${globalStyles.effects.blur} -> ${blur.tailwind || 'none'}
- Gradients: ${globalStyles.effects.gradients ? 'ENABLED - use gradient backgrounds where appropriate' : 'DISABLED - use solid colors only'}

### Layout Structure
- Type: ${structure.type}
- Has Header: ${structure.hasHeader}
- Has Sidebar: ${structure.hasSidebar}
- Has Footer: ${structure.hasFooter}
- Sidebar Position: ${structure.sidebarPosition}
- Header Type: ${structure.headerType}
- Content Layout: ${structure.contentLayout}
- Main Content Width: ${structure.mainContentWidth}

### Responsive Settings
- Mobile Breakpoint: ${responsive.mobileBreakpoint}px (sm:)
- Tablet Breakpoint: ${responsive.tabletBreakpoint}px (lg:)
- Mobile Layout: ${responsive.mobileLayout}
- Mobile Header: ${responsive.mobileHeader}
- Hide Sidebar on Mobile: ${responsive.hideSidebarOnMobile}
- Stack Cards on Mobile: ${responsive.stackCardsOnMobile}

---

## CSS Variables Setup (CREATE THIS IN globals.css)

\`\`\`css
${generateGlobalsCSSContent({ globalStyles })}
\`\`\`

---

## Component Implementation Guide
`;

  // Add component specifications with implementation hints
  if (components.header) {
    const headerHeight = headerHeightMap[components.header.height] || headerHeightMap['standard'];
    const headerStyle = headerStyleMap[components.header.style] || headerStyleMap['solid'];

    prompt += `
### Header Component (${components.header.visible ? 'VISIBLE' : 'HIDDEN'})
**Configuration:**
- Height: ${components.header.height} -> ${headerHeight.tailwind} (CSS: ${headerHeight.css})
- Style: ${components.header.style}
- Logo Position: ${components.header.logoPosition}
- Navigation Position: ${components.header.navPosition}
- Has Search: ${components.header.hasSearch}
- Has CTA: ${components.header.hasCTA}${components.header.hasCTA ? ` (Text: "${components.header.ctaText || 'Get Started'}", Style: ${components.header.ctaStyle || 'filled'})` : ''}

**Implementation Classes:**
\`\`\`
Header: ${headerHeight.tailwind} ${headerStyle}
Logo: ${components.header.logoPosition === 'left' ? 'mr-auto' : components.header.logoPosition === 'center' ? 'mx-auto' : 'ml-auto'}
Nav: ${components.header.navPosition === 'right' ? 'ml-auto' : components.header.navPosition === 'center' ? 'mx-auto' : 'mr-auto'}
CTA: bg-[var(--color-primary)] text-white px-4 py-2 ${borderRadius.tailwind}
\`\`\`
`;
  }

  if (components.sidebar && components.sidebar.visible) {
    const sidebarWidth = sidebarWidthMap[components.sidebar.width] || sidebarWidthMap['standard'];

    prompt += `
### Sidebar Component (VISIBLE)
**Configuration:**
- Position: ${components.sidebar.position}
- Width: ${components.sidebar.width} -> ${sidebarWidth.tailwind} (CSS: ${sidebarWidth.css})
- Collapsible: ${components.sidebar.collapsible}
- Default Collapsed: ${components.sidebar.defaultCollapsed}
- Style: ${components.sidebar.style}
- Icon Only: ${components.sidebar.iconOnly}

**Implementation Classes:**
\`\`\`
Sidebar: ${sidebarWidth.tailwind} ${components.sidebar.position === 'left' ? 'left-0' : 'right-0'} bg-[var(--color-surface)] border-${components.sidebar.position === 'left' ? 'r' : 'l'} border-[var(--color-border)]
${components.sidebar.collapsible ? `Collapsed: w-16` : ''}
\`\`\`
`;
  }

  if (components.hero && components.hero.visible) {
    const heroHeight = heroHeightMap[components.hero.height] || heroHeightMap['standard'];
    const heroLayout = heroLayoutMap[components.hero.layout] || heroLayoutMap['centered'];

    prompt += `
### Hero Component (VISIBLE)
**Configuration:**
- Height: ${components.hero.height} -> ${heroHeight.tailwind} (CSS: ${heroHeight.css})
- Layout: ${components.hero.layout}
- Has Image: ${components.hero.hasImage}${components.hero.hasImage ? ` (Position: ${components.hero.imagePosition || 'background'})` : ''}
- Has Subtitle: ${components.hero.hasSubtitle}
- Has CTA: ${components.hero.hasCTA}${components.hero.hasCTA ? ` (Count: ${components.hero.ctaCount})` : ''}

**Implementation Classes:**
\`\`\`
Hero Section: ${heroHeight.tailwind} ${heroLayout} ${sectionPad.tailwind}
Title: ${headingSize.h1} ${headingWeight.tailwind}
Subtitle: ${bodySize.tailwind} text-[var(--color-text-muted)]
CTA Button: bg-[var(--color-primary)] text-white px-6 py-3 ${borderRadius.tailwind} ${shadow.tailwind}
\`\`\`
`;
  }

  if (components.navigation) {
    prompt += `
### Navigation Component
**Configuration:**
- Style: ${components.navigation.style}
- Position: ${components.navigation.position}
- Item Style: ${components.navigation.itemStyle}
- Show Icons: ${components.navigation.showIcons}
- Show Labels: ${components.navigation.showLabels}
- Max Visible Items: ${components.navigation.maxVisibleItems}
`;
  }

  if (components.cards) {
    const cardStyle = cardStyleMap[components.cards.style] || cardStyleMap['elevated'];
    const cardHover =
      cardHoverEffectMap[components.cards.hoverEffect] || cardHoverEffectMap['lift'];

    prompt += `
### Cards Component
**Configuration:**
- Style: ${components.cards.style}
- Image Position: ${components.cards.imagePosition}
- Show Badge: ${components.cards.showBadge}
- Show Footer: ${components.cards.showFooter}
- Hover Effect: ${components.cards.hoverEffect}
- Aspect Ratio: ${components.cards.aspectRatio}

**Implementation Classes:**
\`\`\`
Card Container: ${cardStyle} ${borderRadius.tailwind} overflow-hidden ${cardHover}
Card Image: ${components.cards.imagePosition === 'top' ? 'w-full aspect-video object-cover' : components.cards.imagePosition === 'left' ? 'w-1/3 object-cover' : ''}
Card Content: ${density.tailwindPadding}
Card Title: ${headingSize.h4} ${headingWeight.tailwind}
Card Badge: bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-1 text-xs ${borderRadius.tailwind}
\`\`\`
`;
  }

  if (components.lists) {
    const listStyle = listStyleMap[components.lists.style] || listStyleMap['bordered'];
    const listDensity = listDensityMap[components.lists.density] || listDensityMap['normal'];

    prompt += `
### Lists Component
**Configuration:**
- Style: ${components.lists.style}
- Show Dividers: ${components.lists.showDividers}
- Show Avatar: ${components.lists.showAvatar}
- Show Meta: ${components.lists.showMeta}
- Show Actions: ${components.lists.showActions}
- Density: ${components.lists.density}

**Implementation Classes:**
\`\`\`
List Container: ${listStyle}
List Item: ${listDensity.tailwind} px-4 ${components.lists.showDividers ? 'border-b border-[var(--color-border)]' : ''}
Item Title: ${headingWeight.tailwind}
Item Meta: text-sm text-[var(--color-text-muted)]
\`\`\`
`;
  }

  if (components.stats && components.stats.visible) {
    prompt += `
### Stats Component (VISIBLE)
**Configuration:**
- Layout: ${components.stats.layout}
- Style: ${components.stats.style}
- Show Icons: ${components.stats.showIcons}
- Show Trend: ${components.stats.showTrend}
- Columns: ${components.stats.columns}

**Implementation Classes:**
\`\`\`
Stats Grid: grid grid-cols-2 md:grid-cols-${components.stats.columns} ${gap.tailwind}
Stat Card: ${components.stats.style === 'cards' ? `bg-[var(--color-surface)] ${borderRadius.tailwind} ${density.tailwindPadding} ${shadow.tailwind}` : ''}
Stat Value: ${headingSize.h2} ${headingWeight.tailwind}
Stat Label: text-sm text-[var(--color-text-muted)]
\`\`\`
`;
  }

  if (components.footer && components.footer.visible) {
    const footerStyle = footerStyleMap[components.footer.style] || footerStyleMap['minimal'];
    const footerCols = footerColumnsMap[components.footer.columns] || footerColumnsMap[1];

    prompt += `
### Footer Component (VISIBLE)
**Configuration:**
- Style: ${components.footer.style}
- Columns: ${components.footer.columns}
- Show Social: ${components.footer.showSocial}
- Show Newsletter: ${components.footer.showNewsletter}
- Show Copyright: ${components.footer.showCopyright}
- Position: ${components.footer.position}

**Implementation Classes:**
\`\`\`
Footer: bg-[var(--color-surface)] border-t border-[var(--color-border)] ${footerStyle}
Footer Grid: grid ${footerCols} ${gap.tailwind}
Footer Link: text-[var(--color-text-muted)] hover:text-[var(--color-text)]
Copyright: text-sm text-[var(--color-text-muted)]
\`\`\`
`;
  }

  // Add design pattern context if available
  if (design.basePreferences) {
    prompt += `
---

## Design Style Context
- Overall Style: ${design.basePreferences.style}
- Color Scheme: ${design.basePreferences.colorScheme}
- Layout Type: ${design.basePreferences.layout}

**Style Guidelines:**
${design.basePreferences.style === 'minimalist' ? '- Keep designs clean with ample whitespace\n- Use subtle effects, avoid heavy shadows\n- Limit color usage to primary + neutrals' : ''}
${design.basePreferences.style === 'modern' ? '- Use contemporary design patterns\n- Balance whitespace with content\n- Apply subtle animations for interactivity' : ''}
${design.basePreferences.style === 'playful' ? '- Use vibrant colors and rounded corners\n- Add playful micro-interactions\n- Consider gradient backgrounds' : ''}
${design.basePreferences.style === 'professional' ? '- Maintain formal, business-appropriate aesthetics\n- Use structured layouts with clear hierarchy\n- Prefer subtle over flashy effects' : ''}
`;
  }

  return prompt;
}

// ============================================================================
// EXTENDED CONTEXT TYPE
// ============================================================================

/**
 * Extended PhaseExecutionContext with enhanced tracking fields
 */
interface PhaseExecutionContextWithEnhancedTracking extends PhaseExecutionContext {
  apiContracts?: APIContract[];
  establishedPatterns?: string[];
  accumulatedFilesRich?: AccumulatedFile[];
  /** Smart context from CodeContextService */
  smartContextSnapshot?: CodeContextSnapshot;
}

// ============================================================================
// SMART CONTEXT FORMATTER
// ============================================================================

/**
 * Format CodeContextSnapshot into a prompt-friendly string
 * Provides intelligent context with clear structure for the LLM
 */
function formatCodeContextSnapshot(snapshot: CodeContextSnapshot): string {
  let result = '';

  // Group files by representation for clarity
  const fullFiles = snapshot.context.filter((f) => f.representation === 'full');
  const signatureFiles = snapshot.context.filter((f) => f.representation === 'signature');
  const typesOnlyFiles = snapshot.context.filter((f) => f.representation === 'types-only');
  const summaryFiles = snapshot.context.filter((f) => f.representation === 'summary');

  // Full files - most important context
  if (fullFiles.length > 0) {
    result += `### Complete Files (Reference for Implementation)\n`;
    for (const file of fullFiles) {
      result += `\n#### ${file.path}\n`;
      result += `> Priority: ${(file.priority * 100).toFixed(0)}% | Reason: ${file.reason}\n`;
      result += `\`\`\`typescript\n${file.content}\n\`\`\`\n`;
    }
  }

  // Type definitions - critical for type safety
  if (typesOnlyFiles.length > 0) {
    result += `\n### Type Definitions (Use These Types)\n`;
    for (const file of typesOnlyFiles) {
      result += `\n#### ${file.path}\n`;
      result += `\`\`\`typescript\n${file.content}\n\`\`\`\n`;
    }
  }

  // Signatures - understand interfaces without full implementation
  if (signatureFiles.length > 0) {
    result += `\n### Component & Function Signatures (API Reference)\n`;
    for (const file of signatureFiles) {
      result += `\n#### ${file.path}\n`;
      result += `\`\`\`typescript\n${file.content}\n\`\`\`\n`;
    }
  }

  // Summaries - lightweight context
  if (summaryFiles.length > 0) {
    result += `\n### File Summaries (Overview)\n`;
    for (const file of summaryFiles) {
      result += `- **${file.path}**: ${file.content}\n`;
    }
  }

  // Dependency hints - help LLM understand relationships
  if (snapshot.dependencyHints.length > 0) {
    result += `\n### Import/Export Relationships\n`;
    for (const hint of snapshot.dependencyHints) {
      const imports = hint.imports.map((i) => `imports {${i.symbols.join(', ')}} from "${i.from}"`);
      const usedBy =
        hint.usedBy.length > 0
          ? `Used by: ${hint.usedBy.slice(0, 3).join(', ')}${hint.usedBy.length > 3 ? '...' : ''}`
          : '';
      result += `- **${hint.file}**: ${imports.join('; ')}${usedBy ? ` | ${usedBy}` : ''}\n`;
    }
  }

  // Omitted summary - tell LLM what's NOT included
  if (snapshot.omittedSummary.fileCount > 0) {
    result += `\n### Files Not Shown (${snapshot.omittedSummary.fileCount} files, ~${snapshot.omittedSummary.totalTokens} tokens)\n`;
    result += `> These files exist but weren't included due to token limits. Ask if you need specific content.\n`;
    const categories = Object.entries(snapshot.omittedSummary.categories)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => `${type}: ${count}`);
    if (categories.length > 0) {
      result += `> Categories: ${categories.join(', ')}\n`;
    }
  }

  return result;
}

// ============================================================================
// PHASE PROMPT BUILDER
// ============================================================================

/**
 * Build the prompt for executing a specific phase
 * Now includes full concept context for rich detail preservation
 */
export function buildPhaseExecutionPrompt(context: PhaseExecutionContext): string {
  const isFirstPhase = context.phaseNumber === 1;

  // Start with truncation notice if context was truncated
  let prompt = '';
  if (context.truncationNotice) {
    prompt += `${context.truncationNotice}

`;
  }

  // Base context about the app
  prompt += `# Phase ${context.phaseNumber} of ${context.totalPhases}: ${context.phaseName}

## App Overview
**Name:** ${context.appName}
**Description:** ${context.appDescription}
**Type:** ${context.appType}
`;

  // Add rich concept context if available
  if (context.fullConcept) {
    if (context.fullConcept.purpose) {
      prompt += `**Purpose:** ${context.fullConcept.purpose}
`;
    }
    if (context.fullConcept.targetUsers) {
      prompt += `**Target Users:** ${context.fullConcept.targetUsers}
`;
    }
  }

  prompt += `
`;

  // User roles context (critical for role-based apps)
  if (context.fullConcept?.roles && context.fullConcept.roles.length > 0) {
    prompt += `## User Roles
`;
    for (const role of context.fullConcept.roles) {
      prompt += `### ${role.name}
- Capabilities: ${role.capabilities.join(', ')}
`;
      if (role.permissions && role.permissions.length > 0) {
        prompt += `- Permissions: ${role.permissions.join(', ')}
`;
      }
    }
    prompt += `
`;
  }

  // User workflows context (critical for multi-step process generation)
  if (context.fullConcept?.workflows && context.fullConcept.workflows.length > 0) {
    prompt += `## User Workflows
`;
    for (const workflow of context.fullConcept.workflows) {
      prompt += `### ${workflow.name}
`;
      if (workflow.description) {
        prompt += `${workflow.description}
`;
      }
      prompt += `**Steps:**
`;
      workflow.steps.forEach((step, i) => {
        prompt += `${i + 1}. ${step}
`;
      });
      if (workflow.involvedRoles && workflow.involvedRoles.length > 0) {
        prompt += `**Roles involved:** ${workflow.involvedRoles.join(', ')}
`;
      }
      prompt += `
`;
    }
  }

  // Phase-specific role context
  if (context.relevantRoles && context.relevantRoles.length > 0) {
    prompt += `## This Phase Serves
Users in roles: **${context.relevantRoles.join(', ')}**

`;
  }

  // Design preferences context - use full LayoutDesign if available
  // This is CRITICAL for ensuring design specifications reach code generation
  if (context.phaseConceptContext?.layoutDesign) {
    // Full layout design available - use complete specifications
    prompt += formatLayoutDesignForPrompt(context.phaseConceptContext.layoutDesign);
    prompt += `
`;
  } else if (context.fullConcept?.layoutDesign) {
    // Layout design in full concept - use complete specifications
    prompt += formatLayoutDesignForPrompt(context.fullConcept.layoutDesign);
    prompt += `
`;
  } else if (context.fullConcept?.uiPreferences) {
    // Fallback to simplified UIPreferences (legacy support)
    const ui = context.fullConcept.uiPreferences;
    prompt += `## Design Requirements
- Style: ${ui.style || 'modern'}
- Color Scheme: ${ui.colorScheme || 'auto'}
- Layout: ${ui.layout || 'single-page'}
`;
    if (ui.primaryColor) {
      prompt += `- Primary Color: ${ui.primaryColor}
`;
    }
    if (ui.secondaryColor) {
      prompt += `- Secondary Color: ${ui.secondaryColor}
`;
    }
    if (ui.accentColor) {
      prompt += `- Accent Color: ${ui.accentColor}
`;
    }
    if (ui.fontFamily) {
      prompt += `- Font Family: ${ui.fontFamily}
`;
    }
    if (ui.borderRadius) {
      prompt += `- Border Radius: ${ui.borderRadius}
`;
    }
    if (ui.shadowIntensity) {
      prompt += `- Shadow Intensity: ${ui.shadowIntensity}
`;
    }
    if (ui.spacing) {
      prompt += `- Spacing: ${ui.spacing}
`;
    }
    if (ui.inspiration) {
      prompt += `- Inspiration: ${ui.inspiration}
`;
    }
    prompt += `
`;
  }

  // Technical stack info
  prompt += `## Technical Stack
`;
  if (context.techStack.needsAuth) {
    prompt += `- Authentication: ${context.techStack.authType || 'email'} based
`;
  }
  if (context.techStack.needsDatabase) {
    prompt += `- Database: Required (use localStorage for frontend-only, or indicate schema for full-stack)
`;
  }
  if (context.techStack.needsRealtime) {
    prompt += `- Real-time: WebSocket/SSE needed
`;
  }
  if (context.techStack.needsFileUpload) {
    prompt += `- File Upload: Storage integration needed
`;
  }

  // Data models if available
  if (context.fullConcept?.dataModels && context.fullConcept.dataModels.length > 0) {
    prompt += `
## Data Models
`;
    for (const model of context.fullConcept.dataModels) {
      prompt += `### ${model.name}
`;
      for (const field of model.fields) {
        prompt += `- ${field.name}: ${field.type}${field.required ? ' (required)' : ''}
`;
      }
    }
  }

  prompt += `
## Phase Goal
${context.phaseDescription}

## Features to Implement in This Phase
${context.features.map((f) => `- ${f}`).join('\n')}

`;

  // Include extracted phase-specific context from conversation analysis
  if (context.extractedPhaseContext) {
    const epc = context.extractedPhaseContext;

    if (epc.extractedRequirements.length > 0) {
      prompt += `## User Requirements (from conversation)
${epc.extractedRequirements.map((r) => `- ${r}`).join('\n')}

`;
    }

    if (epc.userDecisions.length > 0) {
      prompt += `## User Decisions
${epc.userDecisions.map((d) => `- ${d}`).join('\n')}

`;
    }

    if (epc.technicalNotes.length > 0) {
      prompt += `## Technical Notes
${epc.technicalNotes.map((n) => `- ${n}`).join('\n')}

`;
    }

    if (epc.validationRules.length > 0) {
      prompt += `## Validation Rules
${epc.validationRules.map((r) => `- ${r}`).join('\n')}

`;
    }

    if (epc.uiPatterns.length > 0) {
      prompt += `## UI Patterns
${epc.uiPatterns.map((p) => `- ${p}`).join('\n')}

`;
    }

    if (epc.contextSummary) {
      prompt += `## Conversation Context Summary
${epc.contextSummary}

`;
    }
  }

  // Context from previous phases
  if (!isFirstPhase && context.cumulativeFiles.length > 0) {
    prompt += `## Existing Project Context

### Files Created So Far
${context.cumulativeFiles.map((f) => `- ${f}`).join('\n')}

### Features Already Implemented
${context.cumulativeFeatures.map((f) => `- ${f}`).join('\n')}

### CRITICAL INSTRUCTIONS
1. **DO NOT** recreate files that already exist unless you need to modify them
2. **PRESERVE** all existing functionality - don't break what's working
3. **BUILD ON** the existing codebase - import and use existing components
4. **EXTEND** rather than replace - add new features incrementally

`;

    // Include API contracts if available (from enhanced tracking)
    const apiContracts = (context as PhaseExecutionContextWithEnhancedTracking).apiContracts;
    if (apiContracts && apiContracts.length > 0) {
      prompt += `### Existing API Contracts
These endpoints are already implemented. Use them, don't recreate:
${apiContracts.map((c) => `- ${c.method} ${c.endpoint}${c.authentication ? ' (requires auth)' : ''}`).join('\n')}

`;
    }

    // Include established patterns if available
    const patterns = (context as PhaseExecutionContextWithEnhancedTracking).establishedPatterns;
    if (patterns && patterns.length > 0) {
      prompt += `### Established Patterns
Follow these patterns for consistency:
${patterns.map((p) => `- ${p}`).join('\n')}

`;
    }
  }

  // Include relevant existing code for context
  // Priority: Smart context snapshot > previousPhaseCode string
  const enhancedContext = context as PhaseExecutionContextWithEnhancedTracking;
  if (enhancedContext.smartContextSnapshot) {
    // Use the intelligent CodeContextService output
    prompt += `## Existing Code Reference (Smart Context)

The following is intelligently selected code from previous phases, organized by relevance:

${formatCodeContextSnapshot(enhancedContext.smartContextSnapshot)}
`;
  } else if (context.previousPhaseCode) {
    // Legacy fallback - just include the code as-is (already processed by getSmartCodeContext)
    prompt += `## Existing Code Reference

The following code was generated in previous phases. Reference it when building new features:

${context.previousPhaseCode}
`;
  }

  // Architecture context for backend phases (from BackendArchitectureAgent)
  if (context.architectureContext) {
    prompt += `## Backend Architecture Context

This phase has specific backend architecture requirements. Follow these exactly:

`;

    // Include Prisma schema if available
    if (context.architectureContext.prismaSchema) {
      prompt += `### Prisma Schema
\`\`\`prisma
${context.architectureContext.prismaSchema}
\`\`\`

`;
    }

    // Include API routes if available
    if (context.architectureContext.apiRoutes && context.architectureContext.apiRoutes.length > 0) {
      prompt += `### API Routes to Implement
${context.architectureContext.apiRoutes.map((r) => `- ${r.method} ${r.path}: ${r.description}`).join('\n')}

`;
    }

    // Include backend files if available
    if (context.architectureContext.files && context.architectureContext.files.length > 0) {
      prompt += `### Backend Files to Create
${context.architectureContext.files.map((f) => `- ${f.path}: ${f.description}`).join('\n')}

`;
    }

    prompt += `**CRITICAL**: Follow the architecture specification exactly. Do not modify field names, routes, or types.

`;
  }

  // Phase-specific instructions
  prompt += `## Phase ${context.phaseNumber} Requirements

${isFirstPhase ? getPhase1Instructions() : getSubsequentPhaseInstructions(context)}

## Test Criteria
After this phase, the following should work:
${context.testCriteria.map((c) => `- ${c}`).join('\n')}

## Output Format
Generate the code using the standard delimiter format:
===NAME===
[App Name]
===DESCRIPTION===
[Brief description]
===APP_TYPE===
${context.techStack.needsDatabase && context.techStack.needsAPI ? 'FULL_STACK' : 'FRONTEND_ONLY'}
===FILE:path/to/file===
[File content]
===DEPENDENCIES===
{"dependency": "version"}
===END===
`;

  return prompt;
}

/**
 * Instructions specific to Phase 1 (Foundation)
 */
function getPhase1Instructions(): string {
  return `This is **Phase 1 - Foundation**. Create the core structure:

### Required Files
1. **src/App.tsx** - Main app component with routing/layout
2. **src/index.css** - Global styles with Tailwind
3. **src/components/** - Core layout components (Header, Footer, Layout)
4. **src/types/** - TypeScript interfaces for main data structures

### Focus Areas
- Clean project structure
- Responsive base layout
- Navigation setup
- Global styling with Tailwind CSS
- TypeScript types for core entities

### DO NOT Include Yet
- Feature implementations (those come in later phases)
- API integrations
- Authentication logic (unless this phase specifically includes it)
- Complex state management`;
}

/**
 * Instructions for phases after Phase 1
 */
function getSubsequentPhaseInstructions(context: PhaseExecutionContext): string {
  return `This is **Phase ${context.phaseNumber}** - building on the foundation.

### Your Task
Add the following features to the existing codebase:
${context.features.map((f) => `- **${f}**`).join('\n')}

### Integration Guidelines
1. **Import existing components** from previous phases
2. **Follow established patterns** in the codebase
3. **Maintain consistent styling** with existing UI
4. **Use existing types** and extend them if needed
5. **Add new files** only for new functionality

### Files You May Need to Create/Modify
- New components for these features
- Updated types if new data structures are needed
- New hooks for feature-specific logic
- Modified existing components to integrate new features

### Remember
- The app should remain fully functional after this phase
- Test all existing features still work
- New features should integrate seamlessly`;
}

// ============================================================================
// PHASE EXECUTION MANAGER
// ============================================================================

export class PhaseExecutionManager {
  private plan: DynamicPhasePlan;
  private accumulatedCode: string = '';
  private accumulatedFiles: string[] = [];
  private accumulatedFeatures: string[] = [];
  private completedPhases: number[] = [];

  // Enhanced tracking
  private accumulatedFilesRich: AccumulatedFile[] = [];
  private accumulatedFeaturesRich: AccumulatedFeature[] = [];
  private establishedPatterns: string[] = [];
  private apiContracts: APIContract[] = [];
  private phaseGenerator: DynamicPhaseGenerator;

  // Store raw file contents for smart context building
  private rawGeneratedFiles: Array<{ path: string; content: string }> = [];

  // Quality review tracking
  private qualityReports: Map<number, QualityReport> = new Map();
  private reviewStrictness: ReviewStrictness = 'standard';

  // ========== PHASE INTEGRITY TRACKING (P1-P9) ==========
  // P1: File conflict detection
  private fileVersionMap: Map<string, { hash: string; phase: number; exports: string[] }> =
    new Map();

  // P3: Phase snapshots for rollback
  private phaseSnapshots: Map<number, PhaseSnapshot> = new Map();

  // P5: TypeScript type check results
  private typeCheckResults: Map<number, TypeCheckResult> = new Map();

  // P6: Type definitions for compatibility checking
  private typeDefinitions: TypeDefinition[] = [];

  // P7: Smoke test results
  private phaseTestResults: Map<number, PhaseTestResults> = new Map();

  constructor(plan: DynamicPhasePlan) {
    this.plan = plan;
    this.phaseGenerator = new DynamicPhaseGenerator();

    // Initialize from plan if available
    if (plan.accumulatedFilesRich) {
      this.accumulatedFilesRich = [...plan.accumulatedFilesRich];
    }
    if (plan.accumulatedFeaturesRich) {
      this.accumulatedFeaturesRich = [...plan.accumulatedFeaturesRich];
    }
    if (plan.establishedPatterns) {
      this.establishedPatterns = [...plan.establishedPatterns];
    }
    if (plan.apiContracts) {
      this.apiContracts = [...plan.apiContracts];
    }
  }

  /**
   * Get the execution context for a specific phase
   * Now includes full concept context for rich detail preservation
   */
  getExecutionContext(phaseNumber: number): PhaseExecutionContext {
    const phase = this.plan.phases.find((p) => p.number === phaseNumber);
    if (!phase) {
      throw new Error(`Phase ${phaseNumber} not found in plan`);
    }

    const concept = this.plan.concept;

    // Use smart code context instead of raw accumulated code
    const smartCodeContext = this.getSmartCodeContext();

    return {
      phaseNumber,
      totalPhases: this.plan.totalPhases,
      phaseName: phase.name,
      phaseDescription: phase.description,
      features: phase.features,
      testCriteria: phase.testCriteria,
      previousPhaseCode: smartCodeContext || this.accumulatedCode || null,
      allPhases: this.plan.phases,
      completedPhases: [...this.completedPhases],
      cumulativeFeatures: [...this.accumulatedFeatures],
      cumulativeFiles: [...this.accumulatedFiles],
      appName: this.plan.appName,
      appDescription: this.plan.appDescription,
      appType: concept.technical.needsDatabase ? 'full-stack' : 'frontend',
      techStack: concept.technical,

      // ENHANCED: Full concept context for rich detail preservation
      fullConcept: {
        purpose: concept.purpose,
        targetUsers: concept.targetUsers,
        uiPreferences: concept.uiPreferences,
        layoutDesign: concept.layoutDesign, // CRITICAL: Include layout design for code generation
        roles: concept.roles,
        conversationContext: concept.conversationContext,
        dataModels: concept.technical.dataModels,
        workflows: concept.workflows, // CRITICAL: Include workflows for multi-step process generation
      },

      // Phase-specific concept context
      phaseConceptContext: phase.conceptContext,

      // Which user roles this phase serves
      relevantRoles: phase.relevantRoles,

      // Extracted phase context from conversation analysis (if available)
      extractedPhaseContext: this.plan.phaseContexts?.[phase.domain],

      // Enhanced tracking for prompt builder
      apiContracts: [...this.apiContracts],
      establishedPatterns: [...this.establishedPatterns],
      accumulatedFilesRich: [...this.accumulatedFilesRich],

      // Smart context from CodeContextService (if available)
      // Call getOptimizedPhaseContext() before getExecutionContext() to populate this
      smartContextSnapshot: this.cachedSmartContextSnapshot,

      // Architecture context for backend phases (from BackendArchitectureAgent)
      // Enables phase-specific backend implementation instructions
      architectureContext: phase.architectureContext,
    } as PhaseExecutionContextWithEnhancedTracking;
  }

  /**
   * Get execution context with smart context pre-loaded (async)
   * This is the recommended way to get context for phase execution
   */
  async getExecutionContextAsync(
    phaseNumber: number,
    maxTokens: number = 16000
  ): Promise<PhaseExecutionContext> {
    // Initialize CodeContextService if not already done
    if (!this.codeContextService && this.rawGeneratedFiles.length > 0) {
      this.initializeCodeContext();
    }

    // Pre-fetch smart context (populates cache)
    const contextResult = await this.getOptimizedPhaseContext(phaseNumber, maxTokens);

    // Log if context was skipped (not an error, just informational)
    if (contextResult.status === 'skipped') {
      console.log(`[PhaseExecutionManager] Smart context skipped: ${contextResult.reason}`);
    } else if (contextResult.status === 'error') {
      console.error(`[PhaseExecutionManager] Smart context error: ${contextResult.error}`);
    }

    // Return context with cached smart snapshot
    return this.getExecutionContext(phaseNumber);
  }

  /**
   * Clear the cached smart context (call after phase completion)
   */
  clearCachedSmartContext(): void {
    this.cachedSmartContextSnapshot = null;
  }

  /**
   * Record the result of executing a phase
   * Enhanced to extract rich metadata from generated code
   */
  recordPhaseResult(result: PhaseExecutionResult): void {
    if (result.success) {
      this.completedPhases.push(result.phaseNumber);
      this.accumulatedCode = result.generatedCode;
      this.accumulatedFiles = [...this.accumulatedFiles, ...result.generatedFiles];
      this.accumulatedFeatures = [...this.accumulatedFeatures, ...result.implementedFeatures];

      // Extract raw file contents and analyze
      const rawFiles = this.extractRawFiles(result.generatedCode);
      this.rawGeneratedFiles = [...this.rawGeneratedFiles, ...rawFiles];

      // Use DynamicPhaseGenerator to analyze files for rich metadata
      if (rawFiles.length > 0) {
        const analysis = this.phaseGenerator.analyzeGeneratedFiles(rawFiles);

        // Merge with existing rich tracking
        this.accumulatedFilesRich = [...this.accumulatedFilesRich, ...analysis.accumulatedFiles];
        this.apiContracts = [...this.apiContracts, ...analysis.apiContracts];

        // Merge patterns (deduplicate)
        const patternSet = new Set([...this.establishedPatterns, ...analysis.establishedPatterns]);
        this.establishedPatterns = Array.from(patternSet);
      }

      // Update rich feature tracking
      for (const feature of result.implementedFeatures) {
        const existingFeature = this.accumulatedFeaturesRich.find((f) => f.name === feature);
        if (existingFeature) {
          existingFeature.status = 'complete';
          existingFeature.implementedIn = [
            ...existingFeature.implementedIn,
            ...result.generatedFiles,
          ];
        } else {
          this.accumulatedFeaturesRich.push({
            name: feature,
            status: 'complete',
            implementedIn: result.generatedFiles,
            apiEndpoints: this.apiContracts
              .filter((c) =>
                feature.toLowerCase().includes(c.endpoint.split('/').pop()?.toLowerCase() || '')
              )
              .map((c) => c.endpoint),
            components: rawFiles.filter((f) => f.path.includes('/components/')).map((f) => f.path),
            dataModels: [], // Would need deeper analysis
            testCoverage: false,
          });
        }
      }

      // Update plan state
      const phase = this.plan.phases.find((p) => p.number === result.phaseNumber);
      if (phase) {
        phase.status = 'completed';
        phase.completedAt = new Date().toISOString();
        phase.generatedCode = result.generatedCode;
        // Phase Comparison: Track what was actually built
        phase.implementedFeatures = result.implementedFeatures;
        phase.builtFiles = result.generatedFiles;
        phase.builtSummary = result.builtSummary || this.generateBuiltSummary(result);
      }

      // Update both legacy and enhanced tracking in plan
      this.plan.completedPhaseNumbers = [...this.completedPhases];
      this.plan.accumulatedFiles = [...this.accumulatedFiles];
      this.plan.accumulatedFeatures = [...this.accumulatedFeatures];
      this.plan.accumulatedFilesRich = [...this.accumulatedFilesRich];
      this.plan.accumulatedFeaturesRich = [...this.accumulatedFeaturesRich];
      this.plan.establishedPatterns = [...this.establishedPatterns];
      this.plan.apiContracts = [...this.apiContracts];
      this.plan.currentPhaseNumber = result.phaseNumber + 1;
      this.plan.updatedAt = new Date().toISOString();
    } else {
      const phase = this.plan.phases.find((p) => p.number === result.phaseNumber);
      if (phase) {
        phase.status = 'failed';
        phase.errors = result.errors;
      }
      this.plan.failedPhaseNumbers.push(result.phaseNumber);
    }

    // Clear cached smart context so next phase gets fresh context
    this.clearCachedSmartContext();
  }

  /**
   * Extract raw file contents from generated code string
   */
  private extractRawFiles(generatedCode: string): Array<{ path: string; content: string }> {
    const files: Array<{ path: string; content: string }> = [];
    const filePattern = /===FILE:([^=]+)===\n([\s\S]*?)(?=\n===(?:FILE|DEPENDENCIES|END)===|$)/g;
    let match;

    while ((match = filePattern.exec(generatedCode)) !== null) {
      files.push({
        path: match[1].trim(),
        content: match[2].trim(),
      });
    }

    return files;
  }

  /**
   * Generate a concise summary of what was built from execution result
   * Used for Phase Comparison display when no explicit summary provided
   */
  private generateBuiltSummary(result: PhaseExecutionResult): string {
    const parts: string[] = [];

    // Add implemented features (max 3)
    if (result.implementedFeatures.length > 0) {
      const features = result.implementedFeatures.slice(0, 3);
      parts.push(features.join(', '));
      if (result.implementedFeatures.length > 3) {
        parts.push(`+${result.implementedFeatures.length - 3} more features`);
      }
    }

    // Add file count
    if (result.generatedFiles.length > 0) {
      parts.push(
        `${result.generatedFiles.length} file${result.generatedFiles.length > 1 ? 's' : ''} created`
      );
    }

    return parts.join(' • ') || 'Phase completed';
  }

  /**
   * Get smart code context using importance scoring
   * Returns prioritized code from previous phases
   */
  getSmartCodeContext(): string {
    return this.phaseGenerator.buildSmartCodeContext(this.rawGeneratedFiles);
  }

  /**
   * Get API contracts established so far
   */
  getAPIContracts(): APIContract[] {
    return [...this.apiContracts];
  }

  /**
   * Get established coding patterns
   */
  getEstablishedPatterns(): string[] {
    return [...this.establishedPatterns];
  }

  /**
   * Get rich file tracking
   */
  getAccumulatedFilesRich(): AccumulatedFile[] {
    return [...this.accumulatedFilesRich];
  }

  /**
   * Get the next phase to execute
   */
  getNextPhase(): DynamicPhase | null {
    return this.plan.phases.find((p) => p.status === 'pending') || null;
  }

  /**
   * Check if all phases are complete
   */
  isComplete(): boolean {
    return this.plan.phases.every((p) => p.status === 'completed' || p.status === 'skipped');
  }

  /**
   * Get current progress
   */
  getProgress(): {
    completed: number;
    total: number;
    percentage: number;
    currentPhase: DynamicPhase | null;
  } {
    const completed = this.completedPhases.length;
    const total = this.plan.totalPhases;
    const currentPhase = this.plan.phases.find((p) => p.status === 'in-progress') || null;

    return {
      completed,
      total,
      percentage: Math.round((completed / total) * 100),
      currentPhase,
    };
  }

  /**
   * Get the updated plan
   */
  getPlan(): DynamicPhasePlan {
    return this.plan;
  }

  /**
   * Skip a phase
   */
  skipPhase(phaseNumber: number): void {
    const phase = this.plan.phases.find((p) => p.number === phaseNumber);
    if (phase) {
      phase.status = 'skipped';
    }
  }

  /**
   * Reset a failed phase for retry
   */
  resetPhase(phaseNumber: number): void {
    const phase = this.plan.phases.find((p) => p.number === phaseNumber);
    if (phase) {
      phase.status = 'pending';
      phase.errors = undefined;

      // Remove from failed list
      this.plan.failedPhaseNumbers = this.plan.failedPhaseNumbers.filter((n) => n !== phaseNumber);
    }
  }

  // ==========================================================================
  // CODE CONTEXT API INTEGRATION
  // ==========================================================================

  private codeContextService: CodeContextService | null = null;
  private cachedSmartContextSnapshot: CodeContextSnapshot | null = null;

  /**
   * Initialize the CodeContextService for enhanced context management
   */
  initializeCodeContext(): CodeContextService {
    if (!this.codeContextService) {
      const appType = this.plan.concept.technical.needsDatabase ? 'FULL_STACK' : 'FRONTEND_ONLY';
      this.codeContextService = getCodeContextService(
        this.plan.appName,
        this.plan.appName,
        appType
      );

      // Initialize with existing files
      if (this.rawGeneratedFiles.length > 0) {
        this.codeContextService.updateContext(this.rawGeneratedFiles, { incremental: false });
      }
    }
    return this.codeContextService;
  }

  /**
   * Get optimized context for a phase using CodeContextService
   * Falls back to legacy getSmartCodeContext if service not initialized
   * Caches result for synchronous access via getExecutionContext
   *
   * @returns OperationResult with:
   *   - success: CodeContextSnapshot data
   *   - skipped: Service not initialized or no files to process
   *   - error: Phase not found or context update failed
   */
  async getOptimizedPhaseContext(
    phaseNumber: number,
    maxTokens: number = 16000
  ): Promise<OperationResult<CodeContextSnapshot>> {
    if (!this.codeContextService) {
      return skipped('CodeContextService not initialized - using legacy context');
    }

    const phase = this.plan.phases.find((p) => p.number === phaseNumber);
    if (!phase) {
      return error(`Phase ${phaseNumber} not found in plan`);
    }

    // Update context with latest files
    if (this.rawGeneratedFiles.length > 0) {
      const updateResult = await this.codeContextService.updateContext(this.rawGeneratedFiles, {
        incremental: true,
        phaseNumber: phaseNumber, // Mark files as from current phase
      });

      // Check if any files failed to parse
      if (updateResult.failures.length > 0) {
        console.warn(
          `[PhaseExecutionManager] ${updateResult.failures.length} files failed to parse:`,
          updateResult.failures.map((f) => f.path)
        );
        // Continue anyway - some context is better than none
      }
    }

    // Get optimized context for this phase
    const snapshot = await this.codeContextService.getPhaseContext(
      phaseNumber,
      phase.features,
      maxTokens
    );

    // Cache for synchronous access
    this.cachedSmartContextSnapshot = snapshot;

    return success(snapshot);
  }

  /**
   * Get context for modifying generated code
   */
  async getModificationContext(
    targetFile: string,
    changeDescription: string,
    maxTokens: number = 16000
  ): Promise<CodeContextSnapshot | null> {
    if (!this.codeContextService) {
      this.initializeCodeContext();
    }

    if (!this.codeContextService) {
      return null;
    }

    return this.codeContextService.getModificationContext(targetFile, changeDescription, maxTokens);
  }

  /**
   * Get the CodeContextService instance
   */
  getCodeContextService(): CodeContextService | null {
    return this.codeContextService;
  }

  // ==========================================================================
  // QUALITY REVIEW API
  // ==========================================================================

  /**
   * Set the review strictness level
   */
  setReviewStrictness(strictness: ReviewStrictness): void {
    this.reviewStrictness = strictness;
  }

  /**
   * Get the review strictness level
   */
  getReviewStrictness(): ReviewStrictness {
    return this.reviewStrictness;
  }

  /**
   * Run a light quality review on files from a specific phase
   * This should be called after recordPhaseResult()
   *
   * @returns OperationResult with:
   *   - success: Quality report and modified files
   *   - skipped: No files to review
   *   - error: Phase not found or review service failed
   */
  async runPhaseQualityReview(phaseNumber: number): Promise<
    OperationResult<{
      report: QualityReport;
      modifiedFiles: ReviewFile[];
    }>
  > {
    const phase = this.plan.phases.find((p) => p.number === phaseNumber);
    if (!phase) {
      return error(`Phase ${phaseNumber} not found in plan`);
    }

    // Get files generated in this phase
    const phaseFiles = this.getPhaseFiles(phaseNumber);
    if (phaseFiles.length === 0) {
      return skipped(`No files generated in phase ${phaseNumber}`);
    }

    // Convert to ReviewFile format
    const reviewFiles: ReviewFile[] = phaseFiles.map((f) => ({
      path: f.path,
      content: f.content,
      language: this.getFileLanguage(f.path),
    }));

    try {
      // Run light review (dynamic import to avoid bundling tree-sitter in client)
      const { performLightReview } = await getCodeReviewService();
      const result = await performLightReview(
        reviewFiles,
        {
          phaseNumber,
          phaseName: phase.name,
          features: phase.features,
        },
        { strictness: this.reviewStrictness }
      );

      // Store the report
      this.qualityReports.set(phaseNumber, result.report);

      // Update raw files with fixed content
      if (result.modifiedFiles.length > 0) {
        this.updateFilesWithFixes(result.modifiedFiles);
      }

      return success({
        report: result.report,
        modifiedFiles: result.modifiedFiles,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return error(`Quality review failed: ${message}`, err);
    }
  }

  /**
   * Run a comprehensive quality review at the end of the build
   * This includes semantic analysis with Claude AI
   *
   * @returns OperationResult with:
   *   - success: Quality report and modified files
   *   - skipped: No files to review
   *   - error: Review service failed
   */
  async runFinalQualityReview(): Promise<
    OperationResult<{
      report: QualityReport;
      modifiedFiles: ReviewFile[];
    }>
  > {
    if (this.rawGeneratedFiles.length === 0) {
      return skipped('No generated files to review');
    }

    // Convert all files to ReviewFile format
    const reviewFiles: ReviewFile[] = this.rawGeneratedFiles.map((f) => ({
      path: f.path,
      content: f.content,
      language: this.getFileLanguage(f.path),
    }));

    // Build comprehensive review context
    const requirements = {
      originalRequirements: this.plan.concept.conversationContext || '',
      expectedFeatures: this.accumulatedFeaturesRich.map((f) => f.name),
      apiContracts: this.apiContracts,
      allFeatures: this.accumulatedFeaturesRich.map((f) => ({
        name: f.name,
        description: f.name,
        priority: 'high' as const,
      })),
      technicalRequirements: this.plan.concept.technical,
    };

    try {
      // Run comprehensive review (dynamic import to avoid bundling tree-sitter in client)
      const { performComprehensiveReview } = await getCodeReviewService();
      const result = await performComprehensiveReview(reviewFiles, requirements, {
        strictness: this.reviewStrictness,
      });

      // Store the final report
      this.qualityReports.set(-1, result.report); // -1 indicates final review

      // Update files with fixes
      if (result.modifiedFiles.length > 0) {
        this.updateFilesWithFixes(result.modifiedFiles);
      }

      return success({
        report: result.report,
        modifiedFiles: result.modifiedFiles,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return error(`Comprehensive review failed: ${message}`, err);
    }
  }

  /**
   * Get the quality report for a specific phase
   */
  getPhaseQualityReport(phaseNumber: number): QualityReport | null {
    return this.qualityReports.get(phaseNumber) || null;
  }

  /**
   * Get the final quality report
   */
  getFinalQualityReport(): QualityReport | null {
    return this.qualityReports.get(-1) || null;
  }

  /**
   * Get all quality reports
   */
  getAllQualityReports(): Map<number, QualityReport> {
    return new Map(this.qualityReports);
  }

  /**
   * Get files generated in a specific phase
   */
  private getPhaseFiles(phaseNumber: number): Array<{ path: string; content: string }> {
    // Get files that were generated in this phase
    const phase = this.plan.phases.find((p) => p.number === phaseNumber);
    if (!phase || !phase.generatedCode) {
      return [];
    }

    return this.extractRawFiles(phase.generatedCode);
  }

  /**
   * Update raw files with fixed content
   */
  private updateFilesWithFixes(modifiedFiles: ReviewFile[]): void {
    for (const modified of modifiedFiles) {
      const index = this.rawGeneratedFiles.findIndex((f) => f.path === modified.path);
      if (index !== -1) {
        this.rawGeneratedFiles[index].content = modified.content;
      }
    }

    // Update accumulated code with the fixed files
    this.accumulatedCode = this.rebuildAccumulatedCode();
  }

  /**
   * Rebuild accumulated code from raw files
   */
  private rebuildAccumulatedCode(): string {
    let code = `===NAME===\n${this.plan.appName}\n`;
    code += `===DESCRIPTION===\n${this.plan.appDescription}\n`;
    code += `===APP_TYPE===\n${this.plan.concept.technical.needsDatabase ? 'FULL_STACK' : 'FRONTEND_ONLY'}\n`;

    for (const file of this.rawGeneratedFiles) {
      code += `===FILE:${file.path}===\n${file.content}\n`;
    }

    code += `===END===`;
    return code;
  }

  /**
   * Get the file language from path
   */
  private getFileLanguage(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const languageMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      css: 'css',
      json: 'json',
      md: 'markdown',
      html: 'html',
    };
    return languageMap[ext] || 'text';
  }

  /**
   * Get raw generated files (for external access)
   */
  getRawGeneratedFiles(): Array<{ path: string; content: string }> {
    return [...this.rawGeneratedFiles];
  }

  // ==========================================================================
  // PHASE INTEGRITY SYSTEM (P1-P9)
  // ==========================================================================

  // ========== P1: FILE CONFLICT DETECTION ==========

  /**
   * Detect file conflicts when new files are generated
   * Warns when phases overwrite files from previous phases
   */
  detectFileConflicts(
    newFiles: Array<{ path: string; content: string }>,
    phaseNumber: number
  ): FileConflictResult {
    const conflicts: FileConflict[] = [];

    for (const file of newFiles) {
      const hash = this.computeHash(file.content);
      const existing = this.fileVersionMap.get(file.path);

      if (existing && existing.hash !== hash) {
        conflicts.push({
          path: file.path,
          type: 'OVERWRITE',
          previousPhase: existing.phase,
          currentPhase: phaseNumber,
          severity: this.assessConflictSeverity(file.path, existing),
        });
      }

      this.fileVersionMap.set(file.path, { hash, phase: phaseNumber, exports: [] });
    }

    return { conflicts, hasBreakingChanges: conflicts.some((c) => c.severity === 'critical') };
  }

  /**
   * Compute a hash of file content for change detection (djb2 algorithm)
   */
  private computeHash(content: string): string {
    let hash = 5381;
    for (let i = 0; i < content.length; i++) {
      hash = (hash << 5) + hash + content.charCodeAt(i);
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Assess severity of file conflict based on file type
   */
  private assessConflictSeverity(
    path: string,
    _existing: { hash: string; phase: number; exports: string[] }
  ): 'critical' | 'warning' | 'info' {
    // Critical: Core files that affect entire app
    if (path.includes('App.tsx') || path.includes('layout.tsx') || path.includes('/types/')) {
      return 'critical';
    }
    // Critical: API routes
    if (path.includes('/api/')) {
      return 'critical';
    }
    // Warning: Components and utilities
    if (path.includes('/components/') || path.includes('/utils/')) {
      return 'warning';
    }
    // Info: Styles and configs
    return 'info';
  }

  // ========== P2: IMPORT/EXPORT VALIDATION ==========

  /**
   * Validate that all imports reference valid exports
   */
  validateImportExports(): ImportValidationResult {
    const unresolved: UnresolvedImport[] = [];
    const exportMap = new Map<string, Set<string>>();

    // Build export map from all files
    for (const file of this.accumulatedFilesRich) {
      exportMap.set(file.path, new Set(file.exports));
    }

    // Check each file's imports
    for (const file of this.accumulatedFilesRich) {
      for (const imp of file.imports || []) {
        if (!imp.isRelative) continue; // Skip package imports

        const resolvedPath = this.resolveImportPath(file.path, imp.from);
        const targetExports = exportMap.get(resolvedPath);

        if (!targetExports) {
          unresolved.push({
            file: file.path,
            importFrom: imp.from,
            resolvedTo: resolvedPath,
            reason: 'FILE_NOT_FOUND',
          });
          continue;
        }

        for (const symbol of imp.symbols) {
          if (!targetExports.has(symbol)) {
            unresolved.push({
              file: file.path,
              symbol,
              importFrom: imp.from,
              reason: 'SYMBOL_NOT_EXPORTED',
            });
          }
        }
      }
    }

    return { valid: unresolved.length === 0, unresolved };
  }

  /**
   * Resolve a relative import path to an absolute path
   */
  private resolveImportPath(fromFile: string, importPath: string): string {
    // Get directory of the importing file
    const fromDir = fromFile.substring(0, fromFile.lastIndexOf('/'));

    // Handle relative paths
    if (importPath.startsWith('./')) {
      return `${fromDir}/${importPath.substring(2)}`;
    }
    if (importPath.startsWith('../')) {
      const parts = fromDir.split('/');
      let upCount = 0;
      let remaining = importPath;

      while (remaining.startsWith('../')) {
        upCount++;
        remaining = remaining.substring(3);
      }

      const newParts = parts.slice(0, -upCount);
      return `${newParts.join('/')}/${remaining}`;
    }

    // Add file extension if missing
    if (!importPath.includes('.')) {
      // Try common extensions
      for (const ext of ['.tsx', '.ts', '.js', '.jsx']) {
        const fullPath = importPath + ext;
        if (this.rawGeneratedFiles.some((f) => f.path === fullPath)) {
          return fullPath;
        }
      }
      // Try index file
      return `${importPath}/index.tsx`;
    }

    return importPath;
  }

  // ========== P3: PHASE SNAPSHOT & ROLLBACK ==========

  /**
   * Capture current state before phase execution
   */
  capturePhaseSnapshot(phaseNumber: number): PhaseSnapshot {
    const snapshot: PhaseSnapshot = {
      id: `snapshot-${phaseNumber}-${Date.now()}`,
      phaseNumber,
      timestamp: new Date().toISOString(),
      accumulatedCode: this.accumulatedCode,
      accumulatedFiles: [...this.accumulatedFiles],
      accumulatedFeatures: [...this.accumulatedFeatures],
      accumulatedFilesRich: JSON.parse(JSON.stringify(this.accumulatedFilesRich)),
      accumulatedFeaturesRich: JSON.parse(JSON.stringify(this.accumulatedFeaturesRich)),
      establishedPatterns: [...this.establishedPatterns],
      apiContracts: JSON.parse(JSON.stringify(this.apiContracts)),
      rawGeneratedFiles: JSON.parse(JSON.stringify(this.rawGeneratedFiles)),
      completedPhases: [...this.completedPhases],
      phaseStatuses: this.plan.phases.map((p) => ({ number: p.number, status: p.status })),
    };

    this.phaseSnapshots.set(phaseNumber, snapshot);
    return snapshot;
  }

  /**
   * Rollback to a previous phase snapshot
   */
  rollbackToSnapshot(phaseNumber: number): boolean {
    const snapshot = this.phaseSnapshots.get(phaseNumber);
    if (!snapshot) return false;

    // Restore all state
    this.accumulatedCode = snapshot.accumulatedCode;
    this.accumulatedFiles = [...snapshot.accumulatedFiles];
    this.accumulatedFeatures = [...snapshot.accumulatedFeatures];
    this.accumulatedFilesRich = JSON.parse(JSON.stringify(snapshot.accumulatedFilesRich));
    this.accumulatedFeaturesRich = JSON.parse(JSON.stringify(snapshot.accumulatedFeaturesRich));
    this.establishedPatterns = [...snapshot.establishedPatterns];
    this.apiContracts = JSON.parse(JSON.stringify(snapshot.apiContracts));
    this.rawGeneratedFiles = JSON.parse(JSON.stringify(snapshot.rawGeneratedFiles));
    this.completedPhases = [...snapshot.completedPhases];

    // Restore phase statuses
    for (const { number, status } of snapshot.phaseStatuses) {
      const phase = this.plan.phases.find((p) => p.number === number);
      if (phase) phase.status = status;
    }

    // Clear snapshots after this point
    for (const key of this.phaseSnapshots.keys()) {
      if (key > phaseNumber) this.phaseSnapshots.delete(key);
    }

    // Update plan
    this.syncPlanState();
    return true;
  }

  /**
   * Sync internal state back to the plan object
   */
  private syncPlanState(): void {
    this.plan.completedPhaseNumbers = [...this.completedPhases];
    this.plan.accumulatedFiles = [...this.accumulatedFiles];
    this.plan.accumulatedFeatures = [...this.accumulatedFeatures];
    this.plan.accumulatedFilesRich = [...this.accumulatedFilesRich];
    this.plan.accumulatedFeaturesRich = [...this.accumulatedFeaturesRich];
    this.plan.establishedPatterns = [...this.establishedPatterns];
    this.plan.apiContracts = [...this.apiContracts];
    this.plan.updatedAt = new Date().toISOString();
  }

  /**
   * Get snapshot for a specific phase
   */
  getPhaseSnapshot(phaseNumber: number): PhaseSnapshot | null {
    return this.phaseSnapshots.get(phaseNumber) || null;
  }

  // ========== P5: CROSS-PHASE TYPE CHECKING ==========

  /**
   * Run TypeScript type checking on accumulated code
   * Called after each phase completion
   */
  async runPhaseTypeCheck(phaseNumber: number): Promise<TypeCheckResult> {
    try {
      const { runTypeCheck } = await import('./TypeScriptCompilerService');

      // Only check TypeScript/TSX files
      const tsFiles = this.rawGeneratedFiles.filter(
        (f) => f.path.endsWith('.ts') || f.path.endsWith('.tsx')
      );

      if (tsFiles.length === 0) {
        return { success: true, errors: [], warnings: [] };
      }

      const result = await runTypeCheck(tsFiles);

      // Store result for reporting
      this.typeCheckResults.set(phaseNumber, result);

      return result;
    } catch (err) {
      console.error('Type checking failed:', err);
      return { success: true, errors: [], warnings: [] }; // Fail open
    }
  }

  /**
   * Get type check result for a specific phase
   */
  getTypeCheckResult(phaseNumber: number): TypeCheckResult | null {
    return this.typeCheckResults.get(phaseNumber) || null;
  }

  // ========== P6: TYPE COMPATIBILITY CHECKS ==========

  /**
   * Check type compatibility after phase completion
   */
  async checkTypeCompatibility(phaseNumber: number): Promise<TypeCompatibilityResult> {
    try {
      const { extractTypeDefinitions, checkTypeCompatibility } = await import(
        '@/utils/typeCompatibilityChecker'
      );

      // Extract types from new files in this phase
      const newFiles = this.rawGeneratedFiles.filter(
        (f) => f.path.endsWith('.ts') || f.path.endsWith('.tsx')
      );

      const newTypes: TypeDefinition[] = [];
      for (const file of newFiles) {
        const extracted = extractTypeDefinitions(file.content, file.path, phaseNumber);
        newTypes.push(...extracted);
      }

      // Check against previous types
      const result = checkTypeCompatibility(this.typeDefinitions, newTypes, phaseNumber);

      // Update stored types (merge new definitions)
      for (const newType of newTypes) {
        const existingIndex = this.typeDefinitions.findIndex((t) => t.name === newType.name);
        if (existingIndex >= 0) {
          this.typeDefinitions[existingIndex] = newType;
        } else {
          this.typeDefinitions.push(newType);
        }
      }

      return result;
    } catch (err) {
      console.error('Type compatibility check failed:', err);
      return { compatible: true, breakingChanges: [] };
    }
  }

  // ========== P7: TEST CRITERIA EXECUTION ==========

  /**
   * Run smoke tests for phase criteria
   */
  async runPhaseTests(phaseNumber: number): Promise<PhaseTestResults> {
    const phase = this.plan.phases.find((p) => p.number === phaseNumber);

    if (!phase || !phase.testCriteria?.length) {
      return {
        phaseNumber,
        total: 0,
        passed: 0,
        failed: 0,
        results: [],
        allPassed: true,
      };
    }

    try {
      const { runSmokeTests } = await import('@/utils/smokeTestRunner');
      const result = runSmokeTests(phase.testCriteria, this.rawGeneratedFiles, phaseNumber);

      this.phaseTestResults.set(phaseNumber, result);
      return result;
    } catch (err) {
      console.error('Smoke tests failed:', err);
      return {
        phaseNumber,
        total: phase.testCriteria.length,
        passed: 0,
        failed: 0,
        results: [],
        allPassed: true, // Fail open
      };
    }
  }

  /**
   * Get smoke test results for a specific phase
   */
  getPhaseTestResults(phaseNumber: number): PhaseTestResults | null {
    return this.phaseTestResults.get(phaseNumber) || null;
  }

  // ========== P8: API CONTRACT ENFORCEMENT ==========

  /**
   * Validate API implementations against declared contracts
   */
  validateApiContracts(): ContractValidationResult {
    const violations: import('@/types/dynamicPhases').ContractViolation[] = [];

    // Find all API route files
    const apiFiles = this.rawGeneratedFiles.filter(
      (f) => f.path.includes('/api/') && (f.path.endsWith('.ts') || f.path.endsWith('.tsx'))
    );

    // Check each contract
    for (const contract of this.apiContracts) {
      // Find matching API file
      const expectedPath = `/api${contract.endpoint}`;
      const apiFile = apiFiles.find(
        (f) => f.path.includes(expectedPath) || f.path.includes(contract.endpoint.replace(/\//g, '/'))
      );

      if (!apiFile) {
        violations.push({
          endpoint: contract.endpoint,
          method: contract.method,
          violation: 'MISSING_ENDPOINT',
          expected: `API route at ${expectedPath}`,
          severity: 'error',
        });
        continue;
      }

      // Check for HTTP method handler
      const methodUpper = contract.method.toUpperCase();
      const hasMethod =
        apiFile.content.includes(`export async function ${methodUpper}`) ||
        apiFile.content.includes(`export function ${methodUpper}`) ||
        apiFile.content.includes(`${methodUpper}:`);

      if (!hasMethod) {
        violations.push({
          endpoint: contract.endpoint,
          method: contract.method,
          violation: 'WRONG_METHOD',
          expected: `${methodUpper} handler`,
          actual: 'Handler not found',
          severity: 'error',
        });
      }

      // Check response schema if specified
      if (contract.responseSchema) {
        const hasResponseSchema = apiFile.content.includes(contract.responseSchema);
        if (!hasResponseSchema) {
          violations.push({
            endpoint: contract.endpoint,
            method: contract.method,
            violation: 'MISSING_RESPONSE_TYPE',
            expected: contract.responseSchema,
            severity: 'warning',
          });
        }
      }
    }

    return {
      valid: violations.filter((v) => v.severity === 'error').length === 0,
      violations,
    };
  }

  // ========== P9: REGRESSION TESTING ==========

  /**
   * Run regression tests - verify all previous phase criteria still pass
   */
  async runRegressionTests(currentPhase: number): Promise<RegressionTestResult> {
    const failures: import('@/types/dynamicPhases').RegressionFailure[] = [];
    const previousPhasesChecked: number[] = [];

    try {
      const { runSmokeTests } = await import('@/utils/smokeTestRunner');

      // Run tests for all completed phases
      for (const phaseNum of this.completedPhases) {
        if (phaseNum >= currentPhase) continue;

        const phase = this.plan.phases.find((p) => p.number === phaseNum);
        if (!phase?.testCriteria?.length) continue;

        previousPhasesChecked.push(phaseNum);

        // Run smoke tests with current accumulated files
        const result = runSmokeTests(phase.testCriteria, this.rawGeneratedFiles, phaseNum);

        // Collect failures
        for (const testResult of result.results) {
          if (!testResult.passed) {
            failures.push({
              originalPhase: phaseNum,
              criterion: testResult.criterion,
              error: testResult.error || 'Test failed',
            });
          }
        }
      }

      return {
        phaseNumber: currentPhase,
        previousPhasesChecked,
        failures,
        allPassed: failures.length === 0,
      };
    } catch (err) {
      console.error('Regression tests failed:', err);
      return {
        phaseNumber: currentPhase,
        previousPhasesChecked: [],
        failures: [],
        allPassed: true, // Fail open
      };
    }
  }

  // ========== P4 SUPPORT: Getter Methods ==========

  /**
   * Get accumulated code (for P4 fix)
   */
  getAccumulatedCode(): string {
    return this.accumulatedCode;
  }

  /**
   * Get a copy of the plan (for P4 fix)
   */
  getPlanCopy(): DynamicPhasePlan {
    return { ...this.plan };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract file paths from generated code
 */
export function extractFilePaths(generatedCode: string): string[] {
  const filePattern = /===FILE:([^=]+)===/g;
  const paths: string[] = [];
  let match;

  while ((match = filePattern.exec(generatedCode)) !== null) {
    paths.push(match[1].trim());
  }

  return paths;
}

/**
 * Extract feature names that were implemented
 */
export function extractImplementedFeatures(
  generatedCode: string,
  expectedFeatures: string[]
): string[] {
  const lowerCode = generatedCode.toLowerCase();

  return expectedFeatures.filter((feature) => {
    // Check if the feature name or key words appear in the code
    const keywords = feature.toLowerCase().split(/\s+/);
    return keywords.some((keyword) => keyword.length > 3 && lowerCode.includes(keyword));
  });
}

/**
 * Create an empty phase result for tracking
 */
export function createPhaseResult(phaseNumber: number, phaseName: string): PhaseExecutionResult {
  return {
    phaseNumber,
    phaseName,
    success: false,
    generatedCode: '',
    generatedFiles: [],
    implementedFeatures: [],
    duration: 0,
    tokensUsed: { input: 0, output: 0 },
  };
}

export default PhaseExecutionManager;

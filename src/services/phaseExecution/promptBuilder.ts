/**
 * Phase Prompt Builder
 *
 * Constructs the AI execution prompts for each phase, including:
 * - Layout manifest formatting (design tokens → CSS variables)
 * - Smart context snapshot formatting
 * - Full phase execution prompt assembly
 * - Phase-specific instruction generation
 */

import type { PhaseExecutionContext, APIContract, AccumulatedFile } from '@/types/dynamicPhases';
import type { LayoutManifest } from '@/types/schema';
import type { CodeContextSnapshot } from '@/types/codeContext';
import { NEUTRAL_PALETTE, STATUS_COLORS } from '@/constants/themeDefaults';
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
// EXTENDED CONTEXT TYPE
// ============================================================================

/**
 * Extended PhaseExecutionContext with enhanced tracking fields
 */
export interface PhaseExecutionContextWithEnhancedTracking extends PhaseExecutionContext {
  apiContracts?: APIContract[];
  establishedPatterns?: string[];
  accumulatedFilesRich?: AccumulatedFile[];
  /** Smart context from CodeContextService */
  smartContextSnapshot?: CodeContextSnapshot;
}

// ============================================================================
// LAYOUT MANIFEST FORMATTING
// ============================================================================

/**
 * Format a LayoutManifest into a detailed prompt section for code generation
 * Extracts design tokens from manifest.designSystem and provides implementation guidance
 */
export function formatLayoutManifestForPrompt(manifest: LayoutManifest): string {
  const colors = manifest.designSystem?.colors || {};
  const fonts = manifest.designSystem?.fonts || { heading: 'Inter', body: 'Inter' };

  const prompt = `## CRITICAL: Design Fidelity Requirements

You MUST implement the design specifications EXACTLY as specified below.
Do NOT deviate from these values. Do NOT substitute colors, spacing, or effects.

**MANDATORY RULES:**
1. Use the EXACT hex colors provided - do not substitute or approximate
2. Apply consistent border radius, shadow, and spacing
3. Match typography and font settings exactly
4. Create CSS variables in globals.css for design tokens

---

## Design System Specifications

### Typography
- Heading Font: ${fonts.heading || 'Inter, system-ui, sans-serif'}
- Body Font: ${fonts.body || 'Inter, system-ui, sans-serif'}

### Color Palette (USE EXACT HEX VALUES)
- Primary: ${colors.primary || NEUTRAL_PALETTE.gray500} -> var(--color-primary)
- Secondary: ${colors.secondary || NEUTRAL_PALETTE.gray400} -> var(--color-secondary)
- Accent: ${colors.accent || NEUTRAL_PALETTE.gray500} -> var(--color-accent)
- Background: ${colors.background || NEUTRAL_PALETTE.gray50} -> var(--color-background)
- Surface: ${colors.surface || NEUTRAL_PALETTE.white} -> var(--color-surface)
- Text: ${colors.text || NEUTRAL_PALETTE.gray700} -> var(--color-text)
- Text Muted: ${colors.textMuted || NEUTRAL_PALETTE.gray500} -> var(--color-text-muted)
- Border: ${colors.border || NEUTRAL_PALETTE.gray200} -> var(--color-border)
- Success: ${colors.success || STATUS_COLORS.success}
- Warning: ${colors.warning || STATUS_COLORS.warning}
- Error: ${colors.error || STATUS_COLORS.error}

---

## CSS Variables Setup (CREATE THIS IN globals.css)

\`\`\`css
:root {
  --color-primary: ${colors.primary || NEUTRAL_PALETTE.gray500};
  --color-secondary: ${colors.secondary || NEUTRAL_PALETTE.gray400};
  --color-accent: ${colors.accent || NEUTRAL_PALETTE.gray500};
  --color-background: ${colors.background || NEUTRAL_PALETTE.gray50};
  --color-surface: ${colors.surface || NEUTRAL_PALETTE.white};
  --color-text: ${colors.text || NEUTRAL_PALETTE.gray700};
  --color-text-muted: ${colors.textMuted || NEUTRAL_PALETTE.gray500};
  --color-border: ${colors.border || NEUTRAL_PALETTE.gray200};
  --font-heading: ${fonts.heading || 'Inter, system-ui, sans-serif'};
  --font-body: ${fonts.body || 'Inter, system-ui, sans-serif'};
}
\`\`\`

`;

  return prompt;
}

// Legacy placeholder to prevent breaking imports that may reference the old function
export const formatLayoutDesignForPrompt = formatLayoutManifestForPrompt;

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

  // Design preferences context - use full LayoutManifest if available
  // This is CRITICAL for ensuring design specifications reach code generation
  if (context.phaseConceptContext?.layoutManifest) {
    // Full layout manifest available - use complete specifications
    prompt += formatLayoutManifestForPrompt(context.phaseConceptContext.layoutManifest);
    prompt += `
`;
  } else if (context.fullConcept?.layoutManifest) {
    // Layout manifest in full concept - use complete specifications
    prompt += formatLayoutManifestForPrompt(context.fullConcept.layoutManifest);
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
    // Fallback - include raw accumulated code when CodeContextService snapshot is not available
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

// NOTE: The following design token imports are preserved for use via re-export.
// They are used by consumers who import them via this module:
export {
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
};

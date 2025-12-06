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
  PhaseConceptContext,
  AccumulatedFile,
  AccumulatedFeature,
  APIContract,
} from '@/types/dynamicPhases';
import type { TechnicalRequirements, UIPreferences, UserRole } from '@/types/appConcept';
import type { LayoutDesign } from '@/types/layoutDesign';
import { DynamicPhaseGenerator } from './DynamicPhaseGenerator';

// ============================================================================
// LAYOUT DESIGN FORMATTING
// ============================================================================

/**
 * Format a complete LayoutDesign into a detailed prompt section
 * This ensures ALL design specifications reach the code generation
 */
export function formatLayoutDesignForPrompt(design: LayoutDesign): string {
  const { globalStyles, components, structure, responsive } = design;

  let prompt = `## Complete Design System Specifications

### Typography
- Font Family: ${globalStyles.typography.fontFamily}
- Heading Font: ${globalStyles.typography.headingFont || 'same as body'}
- Font Weight: Headings ${globalStyles.typography.headingWeight}, Body ${globalStyles.typography.bodyWeight}
- Heading Size Scale: ${globalStyles.typography.headingSize}
- Body Size: ${globalStyles.typography.bodySize}
- Line Height: ${globalStyles.typography.lineHeight}
- Letter Spacing: ${globalStyles.typography.letterSpacing}

### Color Palette
- Primary: ${globalStyles.colors.primary}
- Secondary: ${globalStyles.colors.secondary || 'not specified'}
- Accent: ${globalStyles.colors.accent || 'not specified'}
- Background: ${globalStyles.colors.background}
- Surface: ${globalStyles.colors.surface}
- Text: ${globalStyles.colors.text}
- Text Muted: ${globalStyles.colors.textMuted}
- Border: ${globalStyles.colors.border}
- Success: ${globalStyles.colors.success || '#22C55E'}
- Warning: ${globalStyles.colors.warning || '#F59E0B'}
- Error: ${globalStyles.colors.error || '#EF4444'}
- Info: ${globalStyles.colors.info || '#3B82F6'}

### Spacing System
- Density: ${globalStyles.spacing.density}
- Container Width: ${globalStyles.spacing.containerWidth}
- Section Padding: ${globalStyles.spacing.sectionPadding}
- Component Gap: ${globalStyles.spacing.componentGap}

### Effects
- Border Radius: ${globalStyles.effects.borderRadius}
- Shadows: ${globalStyles.effects.shadows}
- Animations: ${globalStyles.effects.animations}
- Blur: ${globalStyles.effects.blur}
- Gradients: ${globalStyles.effects.gradients ? 'enabled' : 'disabled'}

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
- Mobile Breakpoint: ${responsive.mobileBreakpoint}px
- Tablet Breakpoint: ${responsive.tabletBreakpoint}px
- Mobile Layout: ${responsive.mobileLayout}
- Mobile Header: ${responsive.mobileHeader}
- Hide Sidebar on Mobile: ${responsive.hideSidebarOnMobile}
- Stack Cards on Mobile: ${responsive.stackCardsOnMobile}
`;

  // Add component specifications
  if (components.header) {
    prompt += `
### Header Component
- Visible: ${components.header.visible}
- Height: ${components.header.height}
- Style: ${components.header.style}
- Logo Position: ${components.header.logoPosition}
- Navigation Position: ${components.header.navPosition}
- Has Search: ${components.header.hasSearch}
- Has CTA: ${components.header.hasCTA}
- CTA Text: ${components.header.ctaText || 'Get Started'}
- CTA Style: ${components.header.ctaStyle || 'filled'}
`;
  }

  if (components.sidebar) {
    prompt += `
### Sidebar Component
- Visible: ${components.sidebar.visible}
- Position: ${components.sidebar.position}
- Width: ${components.sidebar.width}
- Collapsible: ${components.sidebar.collapsible}
- Default Collapsed: ${components.sidebar.defaultCollapsed}
- Style: ${components.sidebar.style}
- Icon Only: ${components.sidebar.iconOnly}
- Has Logo: ${components.sidebar.hasLogo}
`;
  }

  if (components.hero) {
    prompt += `
### Hero Component
- Visible: ${components.hero.visible}
- Height: ${components.hero.height}
- Layout: ${components.hero.layout}
- Has Image: ${components.hero.hasImage}
- Image Position: ${components.hero.imagePosition || 'none'}
- Has Subtitle: ${components.hero.hasSubtitle}
- Has CTA: ${components.hero.hasCTA}
- CTA Count: ${components.hero.ctaCount}
`;
  }

  if (components.navigation) {
    prompt += `
### Navigation Component
- Style: ${components.navigation.style}
- Position: ${components.navigation.position}
- Item Style: ${components.navigation.itemStyle}
- Show Icons: ${components.navigation.showIcons}
- Show Labels: ${components.navigation.showLabels}
- Max Visible Items: ${components.navigation.maxVisibleItems}
`;
  }

  if (components.cards) {
    prompt += `
### Cards Component
- Style: ${components.cards.style}
- Image Position: ${components.cards.imagePosition}
- Show Badge: ${components.cards.showBadge}
- Show Footer: ${components.cards.showFooter}
- Hover Effect: ${components.cards.hoverEffect}
- Aspect Ratio: ${components.cards.aspectRatio}
`;
  }

  if (components.lists) {
    prompt += `
### Lists Component
- Style: ${components.lists.style}
- Show Dividers: ${components.lists.showDividers}
- Show Avatar: ${components.lists.showAvatar}
- Show Meta: ${components.lists.showMeta}
- Show Actions: ${components.lists.showActions}
- Density: ${components.lists.density}
`;
  }

  if (components.stats) {
    prompt += `
### Stats Component
- Visible: ${components.stats.visible}
- Layout: ${components.stats.layout}
- Style: ${components.stats.style}
- Show Icons: ${components.stats.showIcons}
- Show Trend: ${components.stats.showTrend}
- Columns: ${components.stats.columns}
`;
  }

  if (components.footer) {
    prompt += `
### Footer Component
- Visible: ${components.footer.visible}
- Style: ${components.footer.style}
- Columns: ${components.footer.columns}
- Show Social: ${components.footer.showSocial}
- Show Newsletter: ${components.footer.showNewsletter}
- Show Copyright: ${components.footer.showCopyright}
- Position: ${components.footer.position}
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

  // Base context about the app
  let prompt = `# Phase ${context.phaseNumber} of ${context.totalPhases}: ${context.phaseName}

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
${apiContracts.map(c => `- ${c.method} ${c.endpoint}${c.authentication ? ' (requires auth)' : ''}`).join('\n')}

`;
    }

    // Include established patterns if available
    const patterns = (context as PhaseExecutionContextWithEnhancedTracking).establishedPatterns;
    if (patterns && patterns.length > 0) {
      prompt += `### Established Patterns
Follow these patterns for consistency:
${patterns.map(p => `- ${p}`).join('\n')}

`;
    }
  }

  // Include relevant existing code for context
  if (context.previousPhaseCode) {
    prompt += `## Existing Code Reference

The following code was generated in previous phases. Reference it when building new features:

${truncateCodeForContext(context.previousPhaseCode)}

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

/**
 * Truncate code to fit in context while preserving important parts
 */
function truncateCodeForContext(code: string, maxLength: number = 8000): string {
  if (code.length <= maxLength) return code;

  // Try to parse as JSON (it might be a full app structure)
  try {
    const parsed = JSON.parse(code);
    if (parsed.files && Array.isArray(parsed.files)) {
      // Include App.tsx and main files in full, truncate others
      const priorityFiles = ['App.tsx', 'index.tsx', 'types.ts', 'index.css'];
      let result = '';
      let remainingLength = maxLength;

      // First pass: priority files
      for (const file of parsed.files) {
        const isPriority = priorityFiles.some((pf) => file.path.includes(pf));
        if (isPriority && file.content.length < remainingLength) {
          result += `=== ${file.path} ===\n${file.content}\n\n`;
          remainingLength -= file.content.length + file.path.length + 10;
        }
      }

      // Second pass: other files (truncated)
      for (const file of parsed.files) {
        const isPriority = priorityFiles.some((pf) => file.path.includes(pf));
        if (!isPriority && remainingLength > 500) {
          const truncatedContent = file.content.substring(0, Math.min(500, remainingLength));
          result += `=== ${file.path} ===\n${truncatedContent}\n[... truncated ...]\n\n`;
          remainingLength -= 550;
        }
      }

      return result;
    }
  } catch {
    // Not JSON, just truncate
  }

  return code.substring(0, maxLength) + '\n\n[... truncated for context limit ...]';
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
        roles: concept.roles,
        conversationContext: concept.conversationContext,
        dataModels: concept.technical.dataModels,
      },

      // Phase-specific concept context
      phaseConceptContext: phase.conceptContext,

      // Which user roles this phase serves
      relevantRoles: phase.relevantRoles,

      // Enhanced tracking for prompt builder
      apiContracts: [...this.apiContracts],
      establishedPatterns: [...this.establishedPatterns],
      accumulatedFilesRich: [...this.accumulatedFilesRich],
    } as PhaseExecutionContextWithEnhancedTracking;
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
        const existingFeature = this.accumulatedFeaturesRich.find(f => f.name === feature);
        if (existingFeature) {
          existingFeature.status = 'complete';
          existingFeature.implementedIn = [...existingFeature.implementedIn, ...result.generatedFiles];
        } else {
          this.accumulatedFeaturesRich.push({
            name: feature,
            status: 'complete',
            implementedIn: result.generatedFiles,
            apiEndpoints: this.apiContracts
              .filter(c => feature.toLowerCase().includes(c.endpoint.split('/').pop()?.toLowerCase() || ''))
              .map(c => c.endpoint),
            components: rawFiles
              .filter(f => f.path.includes('/components/'))
              .map(f => f.path),
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

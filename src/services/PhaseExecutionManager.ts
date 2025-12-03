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
} from '@/types/dynamicPhases';
import type { TechnicalRequirements, UIPreferences, UserRole } from '@/types/appConcept';

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

  // Design preferences context
  if (context.fullConcept?.uiPreferences) {
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
${context.features.map(f => `- ${f}`).join('\n')}

`;

  // Context from previous phases
  if (!isFirstPhase && context.cumulativeFiles.length > 0) {
    prompt += `## Existing Project Context

### Files Created So Far
${context.cumulativeFiles.map(f => `- ${f}`).join('\n')}

### Features Already Implemented
${context.cumulativeFeatures.map(f => `- ${f}`).join('\n')}

### CRITICAL INSTRUCTIONS
1. **DO NOT** recreate files that already exist unless you need to modify them
2. **PRESERVE** all existing functionality - don't break what's working
3. **BUILD ON** the existing codebase - import and use existing components
4. **EXTEND** rather than replace - add new features incrementally

`;
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
${context.testCriteria.map(c => `- ${c}`).join('\n')}

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
${context.features.map(f => `- **${f}**`).join('\n')}

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
        const isPriority = priorityFiles.some(pf => file.path.includes(pf));
        if (isPriority && file.content.length < remainingLength) {
          result += `=== ${file.path} ===\n${file.content}\n\n`;
          remainingLength -= file.content.length + file.path.length + 10;
        }
      }

      // Second pass: other files (truncated)
      for (const file of parsed.files) {
        const isPriority = priorityFiles.some(pf => file.path.includes(pf));
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

  constructor(plan: DynamicPhasePlan) {
    this.plan = plan;
  }

  /**
   * Get the execution context for a specific phase
   * Now includes full concept context for rich detail preservation
   */
  getExecutionContext(phaseNumber: number): PhaseExecutionContext {
    const phase = this.plan.phases.find(p => p.number === phaseNumber);
    if (!phase) {
      throw new Error(`Phase ${phaseNumber} not found in plan`);
    }

    const concept = this.plan.concept;

    return {
      phaseNumber,
      totalPhases: this.plan.totalPhases,
      phaseName: phase.name,
      phaseDescription: phase.description,
      features: phase.features,
      testCriteria: phase.testCriteria,
      previousPhaseCode: this.accumulatedCode || null,
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
    };
  }

  /**
   * Record the result of executing a phase
   */
  recordPhaseResult(result: PhaseExecutionResult): void {
    if (result.success) {
      this.completedPhases.push(result.phaseNumber);
      this.accumulatedCode = result.generatedCode;
      this.accumulatedFiles = [...this.accumulatedFiles, ...result.generatedFiles];
      this.accumulatedFeatures = [...this.accumulatedFeatures, ...result.implementedFeatures];

      // Update plan state
      const phase = this.plan.phases.find(p => p.number === result.phaseNumber);
      if (phase) {
        phase.status = 'completed';
        phase.completedAt = new Date().toISOString();
        phase.generatedCode = result.generatedCode;
      }

      this.plan.completedPhaseNumbers = [...this.completedPhases];
      this.plan.accumulatedFiles = [...this.accumulatedFiles];
      this.plan.accumulatedFeatures = [...this.accumulatedFeatures];
      this.plan.currentPhaseNumber = result.phaseNumber + 1;
      this.plan.updatedAt = new Date().toISOString();
    } else {
      const phase = this.plan.phases.find(p => p.number === result.phaseNumber);
      if (phase) {
        phase.status = 'failed';
        phase.errors = result.errors;
      }
      this.plan.failedPhaseNumbers.push(result.phaseNumber);
    }
  }

  /**
   * Get the next phase to execute
   */
  getNextPhase(): DynamicPhase | null {
    return this.plan.phases.find(p => p.status === 'pending') || null;
  }

  /**
   * Check if all phases are complete
   */
  isComplete(): boolean {
    return this.plan.phases.every(p => p.status === 'completed' || p.status === 'skipped');
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
    const currentPhase = this.plan.phases.find(p => p.status === 'in-progress') || null;

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
    const phase = this.plan.phases.find(p => p.number === phaseNumber);
    if (phase) {
      phase.status = 'skipped';
    }
  }

  /**
   * Reset a failed phase for retry
   */
  resetPhase(phaseNumber: number): void {
    const phase = this.plan.phases.find(p => p.number === phaseNumber);
    if (phase) {
      phase.status = 'pending';
      phase.errors = undefined;

      // Remove from failed list
      this.plan.failedPhaseNumbers = this.plan.failedPhaseNumbers.filter(n => n !== phaseNumber);
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

  return expectedFeatures.filter(feature => {
    // Check if the feature name or key words appear in the code
    const keywords = feature.toLowerCase().split(/\s+/);
    return keywords.some(keyword =>
      keyword.length > 3 && lowerCode.includes(keyword)
    );
  });
}

/**
 * Create an empty phase result for tracking
 */
export function createPhaseResult(
  phaseNumber: number,
  phaseName: string
): PhaseExecutionResult {
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

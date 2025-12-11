/**
 * Prompt Builder Utility
 * Loads and combines compressed prompt sections modularly
 */

import { COMPONENT_SYNTAX_RULES } from './common/component-syntax';
import { DELIMITER_FORMAT } from './common/response-format';
import { AST_OPERATIONS_COMPRESSED } from './modify/ast-operations-compressed';
import { MODIFICATION_EXAMPLES } from './modify/examples-compressed';
import { FRONTEND_RULES_COMPRESSED } from './full-app/frontend-rules-compressed';
import { FULLSTACK_RULES_COMPRESSED } from './full-app/fullstack-rules-compressed';
import { FULLAPP_EXAMPLES_COMPRESSED } from './full-app/examples-compressed';
import { buildDesignTokenPrompt } from './designTokenPrompt';
import type { LayoutDesign } from '@/types/layoutDesign';

/**
 * Accuracy guidelines included in all builder prompts
 */
const ACCURACY_GUIDELINES = `
## ACCURACY & HONESTY

**CRITICAL: Generate only working, accurate code.**

- Use established libraries and patterns you know well
- Never invent APIs, functions, or features that don't exist
- If unsure about implementation, use simpler but reliable approaches
- Complete all code - never truncate or leave placeholders
- Test logic mentally before generating (will this actually work?)
- Be realistic about complexity - simpler is often better
`.trim();

/**
 * Build system prompt for modify route
 * Combines: base rules + AST operations + examples
 */
export function buildModifyPrompt(baseInstructions: string): string {
  return `${baseInstructions}

${ACCURACY_GUIDELINES}

${COMPONENT_SYNTAX_RULES}

${AST_OPERATIONS_COMPRESSED}

${MODIFICATION_EXAMPLES}

CRITICAL REMINDERS:
- Only JSON output (no conversational text)
- Minimal changes (surgical edits only)
- Exact searchFor patterns
- Preserve existing code unless explicitly requested
`.trim();
}

/**
 * Quality enforcement guidelines included in all builder prompts
 */
const QUALITY_ENFORCEMENT = `
## CODE ORGANIZATION REQUIREMENTS

**Component Structure:**
- Group imports: React first, then libraries, then local imports, then types
- Define component props interface directly above the component
- Declare all hooks at the top of the component function
- Define event handlers before the return statement
- Keep JSX clean - extract complex logic to variables or functions above

**File Organization:**
- src/components/ - React components
- src/components/ui/ - Reusable UI primitives (Button, Input, etc.)
- src/hooks/ - Custom React hooks
- src/types/ - TypeScript interfaces and types
- src/utils/ - Utility functions and helpers
- src/lib/ - External service configurations

**Type Safety:**
- Define interfaces for all component props
- Export types for reuse across the codebase
- Avoid 'any' type - use specific types or 'unknown' with type guards
- Use consistent naming: ComponentProps, FormData, ApiResponse

**Error Prevention:**
- Add try-catch for async operations
- Include loading states for data fetching
- Handle empty states with user-friendly messages
- Validate inputs before processing
`.trim();

/**
 * Build system prompt for full-app route
 * Combines: base rules + frontend + fullstack + examples + design tokens
 */
export function buildFullAppPrompt(
  baseInstructions: string,
  includeImageContext: boolean = false,
  isModification: boolean = false,
  layoutDesign?: LayoutDesign,
  qualityPromptAdditions?: string
): string {
  const imageContext = includeImageContext
    ? `
🎨 IMAGE-INSPIRED DESIGN:
Analyze uploaded image for colors, style, patterns. Apply aesthetic to app design using Tailwind CSS.
`
    : '';

  const modificationContext = isModification
    ? `
MODIFICATION MODE:
- Check conversation history for ===INTERNAL_PLAN===
- Maintain consistency with existing architecture
- Classify as MAJOR_CHANGE or MINOR_CHANGE
- Update INTERNAL_PLAN with completed features
- Use exact same delimiter format as new apps
`.trim()
    : '';

  // Build design token instructions if layoutDesign is provided
  const designTokenContext = layoutDesign
    ? `
${buildDesignTokenPrompt(layoutDesign)}

⚠️ DESIGN SYSTEM ENFORCEMENT:
- A globals.css file with CSS variables will be auto-generated
- Use var(--color-*), var(--border-radius), var(--shadow) in ALL components
- Do NOT use hardcoded Tailwind colors like bg-blue-500 or text-gray-900
- Use bg-[var(--color-primary)], text-[var(--color-text)], etc.
`
    : '';

  // Include quality prompt additions if provided (learned patterns, structure requirements)
  const qualityContext = qualityPromptAdditions ? `\n${qualityPromptAdditions}\n` : '';

  return `${baseInstructions}
${imageContext}
${modificationContext ? '\n' + modificationContext + '\n' : ''}
${designTokenContext}

${ACCURACY_GUIDELINES}

${QUALITY_ENFORCEMENT}
${qualityContext}

${COMPONENT_SYNTAX_RULES}

${DELIMITER_FORMAT}

APPLICATION TYPE DETECTION:
- FRONTEND_ONLY: UI components, calculators, games, dashboards (preview sandbox)
- FULL_STACK: Database, auth, API routes, file uploads (local dev required)

${FRONTEND_RULES_COMPRESSED}

${FULLSTACK_RULES_COMPRESSED}

${FULLAPP_EXAMPLES_COMPRESSED}

REMEMBER:
- Complete code (never truncate mid-line/tag/string)
- ${layoutDesign ? 'Use CSS variables from design system (var(--color-*), etc.)' : 'Tailwind CSS for styling'}
- Include setup instructions
- Follow the code organization structure above
`.trim();
}

/**
 * Build system prompt for ai-builder route (single components)
 * Simpler, already optimized
 */
export function buildComponentPrompt(): string {
  return `You are an expert React/TypeScript component generator.

${ACCURACY_GUIDELINES}

Rules:
1. Functional components with TypeScript
2. Include TypeScript interfaces for reusability
3. Modern React hooks (useState, useEffect) ONLY when necessary
4. Tailwind CSS for styling
5. React best practices
6. Accessible (ARIA labels, semantic HTML)

${COMPONENT_SYNTAX_RULES}

CRITICAL FOR PREVIEW:
- Default export returns PURE HTML with hardcoded values
- Include reusable component separately
- NO props in main return - use actual text values

${DELIMITER_FORMAT}

Respond with: ===NAME=== ===EXPLANATION=== ===CODE=== ===END===

CRITICAL RULES:
- Default export Demo must have ZERO curly braces with variables
- Use EXACT delimiters (===NAME===, ===EXPLANATION===, ===CODE===, ===END===)
- Do NOT wrap in markdown code blocks
- Do NOT add text before ===NAME=== or after ===END===
`.trim();
}

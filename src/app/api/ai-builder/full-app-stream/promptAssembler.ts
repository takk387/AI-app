/**
 * System prompt and message assembly for the full-app-stream route.
 */

import type Anthropic from '@anthropic-ai/sdk';
import { buildFullAppPrompt } from '@/prompts/builder';
import { sanitizeMessagesForAPI } from '@/utils/messageUtils';
import { getTokenBudget, type PhaseContext } from '../full-app/generation-logic';
import type { ValidatedRequest, AssembledPrompt } from './types';

/**
 * Assemble the system prompt and messages array from a validated request.
 */
export function assemblePrompt(request: ValidatedRequest): AssembledPrompt {
  const {
    prompt,
    conversationHistory,
    contextSummary,
    isModification,
    currentAppName,
    image,
    hasImage,
    isPhaseBuilding,
    rawPhaseContext,
    currentAppState,
    layoutManifest,
    architectureSpec,
    phaseContexts,
  } = request;

  // Build current app context
  let currentAppContext = '';
  if (currentAppState && currentAppState.files && Array.isArray(currentAppState.files)) {
    currentAppContext = `

===CURRENT APP CONTEXT===
The user has an existing app loaded. Here is the current state:

App Name: ${currentAppState.name || 'Unnamed App'}
App Type: ${currentAppState.appType || 'Unknown'}
Files in the app:
${currentAppState.files.map((f: { path: string }) => `- ${f.path}`).join('\n')}

FILE CONTENTS:
${currentAppState.files
  .map(
    (f: { path: string; content: string }) => `
--- ${f.path} ---
${f.content}
--- END ${f.path} ---
`
  )
  .join('\n')}
===END CURRENT APP CONTEXT===

When building new features or making changes, reference the actual code above. Preserve existing functionality unless explicitly asked to change it.`;
  }

  // Build phase contexts section if available (domain-specific extracted context)
  let phaseContextsSection = '';
  if (phaseContexts && Object.keys(phaseContexts).length > 0) {
    phaseContextsSection = '\n\n===PHASE-SPECIFIC CONTEXT===\n';
    for (const [domain, ctx] of Object.entries(phaseContexts)) {
      if (!ctx) continue;
      phaseContextsSection += `\n## ${domain.charAt(0).toUpperCase() + domain.slice(1)} Domain Context\n`;
      if (ctx.extractedRequirements && ctx.extractedRequirements.length > 0) {
        phaseContextsSection += `**Requirements:**\n${ctx.extractedRequirements.map((s) => `- ${s}`).join('\n')}\n`;
      }
      if (ctx.validationRules && ctx.validationRules.length > 0) {
        phaseContextsSection += `**Validation Rules:**\n${ctx.validationRules.map((r) => `- ${r}`).join('\n')}\n`;
      }
      if (ctx.uiPatterns && ctx.uiPatterns.length > 0) {
        phaseContextsSection += `**UI Patterns:**\n${ctx.uiPatterns.map((p) => `- ${p}`).join('\n')}\n`;
      }
      if (ctx.userDecisions && ctx.userDecisions.length > 0) {
        phaseContextsSection += `**User Decisions:**\n${ctx.userDecisions.map((d) => `- ${d}`).join('\n')}\n`;
      }
      if (ctx.technicalNotes && ctx.technicalNotes.length > 0) {
        phaseContextsSection += `**Technical Notes:**\n${ctx.technicalNotes.map((n) => `- ${n}`).join('\n')}\n`;
      }
      if (ctx.contextSummary) {
        phaseContextsSection += `**Summary:** ${ctx.contextSummary}\n`;
      }
    }
    phaseContextsSection += '\n===END PHASE-SPECIFIC CONTEXT===\n';
  }

  const baseInstructions = `You are an expert FULL-STACK Next.js application architect. Generate complete, production-ready applications with both frontend AND backend capabilities.

## QUALITY-FIRST REQUIREMENT
Generate production-ready code that passes quality review on FIRST generation.
Your code will be automatically reviewed for:
- React hooks violations (CRITICAL - blocks build)
- Missing key props in lists (HIGH)
- Security vulnerabilities (CRITICAL - blocks build)
- Performance anti-patterns (MEDIUM)
- Incomplete error handling (MEDIUM)

Generate code that passes ALL checks. Do NOT rely on post-generation fixes.

## PRODUCTION FEATURES (REQUIRED IN ALL APPS)
1. ErrorBoundary: Wrap main App component in ErrorBoundary with fallback UI and retry button
2. Accessibility: Semantic HTML (nav, main, section, footer), ARIA labels, keyboard navigation
3. SEO: Include <title> and <meta name="description"> tags
4. Loading States: Show spinner or skeleton while fetching data
5. Error States: Handle errors gracefully with user-friendly messages and retry options
${currentAppContext ? '\nIMPORTANT: The user has an existing app loaded. See CURRENT APP CONTEXT at the end of this prompt. When adding features, integrate with the existing code structure.' : ''}

APPLICATION TYPE DETECTION:
- FRONTEND_ONLY: UI components, calculators, games (preview sandbox)
- FULL_STACK: Database, auth, API routes (local dev required)

COMPLEX APPS - STAGING STRATEGY:
- Target 8K-10K tokens for Stage 1 (core architecture + 2-3 features)
- Build complete apps through conversation, not simplified versions
- NEVER truncate code mid-line/tag/string/function
- Stage 1: Solid foundation, invite extensions
- Conversational descriptions: "I've created your [app]! Want to add [X], [Y], [Z]?"

${
  isModification
    ? `
MODIFICATION MODE for "${currentAppName}":
- Classify: MAJOR_CHANGE (new features, redesigns) or MINOR_CHANGE (bug fixes, tweaks)
- PRESERVE all existing UI, styling, components, and functionality NOT mentioned in the user's request
- Only modify the specific elements the user asked about
- Do NOT reorganize, restructure, or "clean up" code the user didn't mention
- Do NOT change colors, fonts, layouts, or spacing unless explicitly requested
- Do NOT remove components, features, or sections unless explicitly asked
- If adding a new feature, integrate it INTO the existing structure — do not rebuild from scratch
- The output must include ALL existing code with the targeted changes applied, not just the changed parts
- Use EXACT delimiter format (===NAME===, ===FILE:===, etc.)
`
    : ''
}${currentAppContext}${phaseContextsSection}`;

  // Determine app type from request context
  const detectedAppType: 'FRONTEND_ONLY' | 'FULL_STACK' =
    currentAppState?.appType === 'FRONTEND_ONLY' ? 'FRONTEND_ONLY' : 'FULL_STACK';

  // Extract detected features from architecture spec
  const detectedFeatures = new Set<string>();
  if (architectureSpec?.auth) detectedFeatures.add('auth');
  if (architectureSpec?.database) detectedFeatures.add('database');
  if (architectureSpec?.storage) detectedFeatures.add('storage');
  if (architectureSpec?.realtime) detectedFeatures.add('realtime');
  const phaseName = rawPhaseContext?.phaseName?.toLowerCase() ?? '';
  if (phaseName.includes('form') || phaseName.includes('crud')) detectedFeatures.add('forms');

  const systemPrompt = buildFullAppPrompt({
    baseInstructions,
    appType: detectedAppType,
    features: detectedFeatures,
    phaseDomain: phaseName.includes('test') ? 'testing' : undefined,
    includeImageContext: hasImage,
    isModification,
    layoutManifest,
    architectureSpec,
  });

  // Build conversation context
  const messages: Anthropic.MessageParam[] = [];

  // Add compressed context summary if available (provides context from older messages)
  if (contextSummary) {
    messages.push({
      role: 'user',
      content: `[Context from earlier conversation]\n${contextSummary}`,
    });
    messages.push({
      role: 'assistant',
      content: 'I understand the context. Proceeding with the request.',
    });
  }

  if (conversationHistory && Array.isArray(conversationHistory)) {
    conversationHistory.forEach((msg: { role: string; content: string }) => {
      if (msg.role === 'user') {
        messages.push({ role: 'user', content: msg.content });
      } else if (msg.role === 'assistant') {
        messages.push({ role: 'assistant', content: msg.content });
      }
    });
  }

  // Sanitize to ensure user/assistant alternation (merges consecutive same-role messages)
  // Cast needed because messages array is typed as MessageParam[] but only contains string-content entries at this point
  const sanitizedHistory = sanitizeMessagesForAPI(
    messages as Array<{ role: string; content: string }>
  );
  messages.length = 0;
  messages.push(...sanitizedHistory);

  // Add user message with optional image
  if (hasImage && image) {
    const imageMatch = image.match(/^data:(image\/[^;]+);base64,(.+)$/);
    if (imageMatch) {
      const mediaType = imageMatch[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
      const base64Data = imageMatch[2];

      messages.push({
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Data,
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      });
    } else {
      messages.push({ role: 'user', content: prompt });
    }
  } else {
    messages.push({ role: 'user', content: prompt });
  }

  // Build phase context
  const phaseContext: PhaseContext | undefined =
    isPhaseBuilding && rawPhaseContext
      ? {
          phaseNumber: rawPhaseContext.phaseNumber || 1,
          previousPhaseCode: rawPhaseContext.previousPhaseCode || null,
          allPhases: rawPhaseContext.allPhases || [],
          completedPhases: rawPhaseContext.completedPhases || [],
          cumulativeFeatures: rawPhaseContext.cumulativeFeatures || [],
        }
      : undefined;

  const modelName = 'claude-sonnet-4-6';
  const phaseNumber = phaseContext?.phaseNumber || 1;
  const tokenBudget = getTokenBudget(phaseNumber);

  return {
    systemPrompt,
    messages,
    phaseContext,
    modelName,
    tokenBudget,
  };
}

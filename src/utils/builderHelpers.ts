/**
 * Builder Helper Utilities
 *
 * Pure utility functions extracted from BuilderContext.
 * Intent detection, phase reference parsing, project summary, and safe JSON parsing.
 */

import type { IntentType } from '@/contexts/BuilderContext';
import type { AppConcept } from '@/types/appConcept';

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export function detectIntent(text: string, errors: string[]): IntentType {
  const lower = text.toLowerCase();

  // Phase references
  if (/build phase \d|start phase \d|execute phase \d/i.test(lower)) return 'BUILD';
  if (/^(build|create|generate|make)\s/i.test(lower)) return 'BUILD';

  // Modify
  if (/^(change|fix|update|modify|replace|move|add .* to)\s/i.test(lower)) return 'MODIFY';

  // Debug
  if (errors.length > 0 && /(error|broken|not working|crash|blank|white screen)/i.test(lower))
    return 'DEBUG';
  if (/^(why is|debug|what's wrong|investigate)\s/i.test(lower)) return 'DEBUG';

  // Concept
  if (/^(add .* feature|rename|change the name|update the description)/i.test(lower))
    return 'CONCEPT';

  return 'QUESTION';
}

export function isPhaseReference(text: string): boolean {
  return /(?:build|start|execute) phase (\d+)/i.test(text);
}

export function extractPhaseNumber(text: string): number {
  const match = text.match(/(?:build|start|execute) phase (\d+)/i);
  return match ? parseInt(match[1], 10) : 1;
}

export function buildProjectSummary(concept: AppConcept | null): string {
  if (!concept) return 'No project loaded.';
  return [
    concept.name && `Project: ${concept.name}`,
    concept.description && `Description: ${concept.description}`,
    concept.purpose && `Purpose: ${concept.purpose}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function safeParseJSON(code: string | undefined): Record<string, unknown> | undefined {
  if (!code) return undefined;
  try {
    return JSON.parse(code);
  } catch {
    return undefined;
  }
}

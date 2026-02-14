/**
 * Execution Utilities
 *
 * Shared result types and standalone utility functions used across
 * the phase execution system.
 */

import type { PhaseExecutionResult } from '@/types/dynamicPhases';

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
export function success<T>(data: T): OperationResult<T> {
  return { status: 'success', data };
}

/**
 * Helper to create skipped result
 */
export function skipped<T>(reason: string): OperationResult<T> {
  return { status: 'skipped', reason };
}

/**
 * Helper to create error result
 */
export function error<T>(message: string, details?: unknown): OperationResult<T> {
  return { status: 'error', error: message, details };
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

/**
 * Get the file language from its path extension
 */
export function getFileLanguage(path: string): string {
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

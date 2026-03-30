/**
 * Response parsing, validation, truncation detection, and analytics for the full-app-stream route.
 */

import { validateGeneratedCode, autoFixCode, type ValidationError } from '@/utils/codeValidator';
import { detectTruncation } from '../full-app/generation-logic';
import type { CompleteEvent, StreamEvent } from '@/types/streaming';
import type { GeneratedFile, ParsedResponse, SSEWriter, StreamResult } from './types';

/**
 * Parse delimiter-based response text into structured metadata and files.
 * Returns null and writes error events if parsing fails.
 */
export async function parseResponse(
  responseText: string,
  sse: SSEWriter
): Promise<ParsedResponse | null> {
  const nameMatch = responseText.match(/===NAME===\s*([\s\S]*?)\s*===/);
  const descriptionMatch = responseText.match(/===DESCRIPTION===\s*([\s\S]*?)\s*===/);
  const appTypeMatch = responseText.match(/===APP_TYPE===\s*([\s\S]*?)\s*===/);
  const changeTypeMatch = responseText.match(/===CHANGE_TYPE===\s*([\s\S]*?)\s*===/);
  const changeSummaryMatch = responseText.match(/===CHANGE_SUMMARY===\s*([\s\S]*?)\s*===/);
  const dependenciesMatch = responseText.match(/===DEPENDENCIES===\s*([\s\S]*?)\s*===/);
  const setupMatch = responseText.match(/===SETUP===\s*([\s\S]*?)===END===/);

  if (!nameMatch || !descriptionMatch) {
    await sse.writeEvent({
      type: 'error',
      timestamp: Date.now(),
      message: 'Invalid response format - missing required delimiters',
      code: 'PARSE_ERROR',
      recoverable: true,
    } as StreamEvent);
    await sse.closeWriter();
    return null;
  }

  const name = nameMatch[1].trim().split('\n')[0].trim();
  const description = descriptionMatch[1].trim().split('\n')[0].trim();
  const appType = appTypeMatch ? appTypeMatch[1].trim().split('\n')[0].trim() : 'FRONTEND_ONLY';

  // Extract files
  const fileMatches = responseText.matchAll(
    /===FILE:([\s\S]*?)===\s*([\s\S]*?)(?====FILE:|===DEPENDENCIES===|===SETUP===|===END===|$)/g
  );
  const files: GeneratedFile[] = [];

  for (const match of fileMatches) {
    const path = match[1].trim();
    const content = match[2].trim();
    files.push({
      path,
      content,
      description: `${path.split('/').pop()} file`,
    });
  }

  if (files.length === 0) {
    const snippetLimit = 800;
    const responseSnippet = responseText.slice(0, snippetLimit).trim();
    await sse.writeEvent({
      type: 'error',
      timestamp: Date.now(),
      message: responseSnippet
        ? `AI responded but generated no code files. AI said: "${responseSnippet}${responseText.length > snippetLimit ? '...' : ''}"`
        : 'No files generated in response',
      code: 'NO_FILES',
      recoverable: true,
      detail: responseText.slice(0, 2000),
    } as StreamEvent);
    await sse.closeWriter();
    return null;
  }

  // Check for truncation
  const truncationInfo = detectTruncation(responseText, files);
  if (truncationInfo.isTruncated && truncationInfo.salvageableFiles > 0) {
    const completeFiles = files.slice(0, truncationInfo.salvageableFiles);
    files.length = 0;
    files.push(...completeFiles);
  }

  // Parse dependencies
  const dependencies: Record<string, string> = {};
  if (dependenciesMatch) {
    const depsText = dependenciesMatch[1].trim();
    const depsLines = depsText.split('\n');
    for (const line of depsLines) {
      const [pkg, version] = line.split(':').map((s) => s.trim());
      if (pkg && version) {
        dependencies[pkg] = version;
      }
    }
  }

  const changeType = changeTypeMatch ? changeTypeMatch[1].trim().split('\n')[0].trim() : 'NEW_APP';
  const changeSummary = changeSummaryMatch ? changeSummaryMatch[1].trim() : '';
  const setupInstructions = setupMatch ? setupMatch[1].trim() : 'Run npm install && npm run dev';

  return {
    name,
    description,
    appType,
    changeType,
    changeSummary,
    files,
    dependencies,
    setupInstructions,
  };
}

/**
 * Run post-hoc code validation on generated files.
 * Mutates file contents in-place when auto-fixes are applied.
 */
export async function validateFiles(
  files: GeneratedFile[],
  sse: SSEWriter,
  validationMessage: string
): Promise<{
  validationErrors: Array<{ file: string; errors: ValidationError[] }>;
  totalErrors: number;
  autoFixedCount: number;
}> {
  await sse.writeEvent({
    type: 'validation',
    timestamp: Date.now(),
    message: validationMessage,
    filesValidated: 0,
    totalFiles: files.length,
    errorsFound: 0,
    autoFixed: 0,
  });

  const validationErrors: Array<{ file: string; errors: ValidationError[] }> = [];
  let totalErrors = 0;
  let autoFixedCount = 0;

  for (let i = 0; i < files.length; i++) {
    if (sse.isWriterClosed()) break;

    const file = files[i];
    if (
      file.path.endsWith('.tsx') ||
      file.path.endsWith('.ts') ||
      file.path.endsWith('.jsx') ||
      file.path.endsWith('.js')
    ) {
      try {
        const validation = await validateGeneratedCode(file.content, file.path);

        if (!validation.valid) {
          totalErrors += validation.errors.length;

          const fixedCode = autoFixCode(file.content, validation.errors);
          if (fixedCode !== file.content) {
            file.content = fixedCode;
            autoFixedCount += validation.errors.filter((e) => e.type === 'UNCLOSED_STRING').length;

            const revalidation = await validateGeneratedCode(fixedCode, file.path);
            if (!revalidation.valid) {
              validationErrors.push({ file: file.path, errors: revalidation.errors });
            }
          } else {
            validationErrors.push({ file: file.path, errors: validation.errors });
          }
        }
      } catch (validationError) {
        console.error(`Validation error for ${file.path}:`, validationError);
      }
    }

    await sse.writeEvent({
      type: 'validation',
      timestamp: Date.now(),
      message: `Validated ${file.path}`,
      filesValidated: i + 1,
      totalFiles: files.length,
      errorsFound: totalErrors,
      autoFixed: autoFixedCount,
    });
  }

  return { validationErrors, totalErrors, autoFixedCount };
}

/**
 * Build the final CompleteEvent from parsed response and validation results.
 */
export function buildCompleteEvent(
  parsed: ParsedResponse,
  streamResult: StreamResult,
  startTime: number,
  validationResults: {
    validationErrors: Array<{ file: string; errors: ValidationError[] }>;
    totalErrors: number;
    autoFixedCount: number;
  }
): CompleteEvent {
  const validationWarnings =
    validationResults.validationErrors.length > 0
      ? {
          hasWarnings: true as const,
          message: `Code validation detected ${validationResults.totalErrors - validationResults.autoFixedCount} potential issue(s).`,
          details: validationResults.validationErrors,
        }
      : undefined;

  return {
    type: 'complete',
    timestamp: Date.now(),
    success: true,
    data: {
      name: parsed.name,
      description: parsed.description,
      appType: parsed.appType,
      changeType: parsed.changeType,
      changeSummary: parsed.changeSummary,
      files: parsed.files,
      dependencies: parsed.dependencies,
      setupInstructions: parsed.setupInstructions,
      validationWarnings,
    },
    stats: {
      totalTime: Date.now() - startTime,
      filesGenerated: parsed.files.length,
      inputTokens: streamResult.inputTokens,
      outputTokens: streamResult.outputTokens,
      cachedTokens: streamResult.cachedTokens,
      ...(streamResult.agenticToolCalls !== undefined && {
        agenticToolCalls: streamResult.agenticToolCalls,
      }),
    },
  };
}

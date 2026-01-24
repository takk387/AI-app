/**
 * AI Generation Logic for Full-App Route
 * Phase 5.2: Extracted for retry support
 * Phase Building Fix: Added size management, truncation detection, and recovery
 *
 * Separates AI generation logic from route handler to enable intelligent retries
 */

import Anthropic from '@anthropic-ai/sdk';
import { validateGeneratedCode, autoFixCode, type ValidationError } from '@/utils/codeValidator';
import type { ErrorCategory } from '@/utils/analytics';
import { generateImagesForApp } from '@/services/AppImageGenerator';
import { injectImageUrls } from '@/utils/imageUrlInjector';
import type { LayoutManifest } from '@/types/schema';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface GenerationContext {
  anthropic: Anthropic;
  systemPrompt: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: Array<{ role: 'user' | 'assistant'; content: string | any[] }>;
  modelName: string;
  correctionPrompt?: string; // Added for retry with specific fixes
  phaseContext?: PhaseContext; // Added for multi-phase builds
  // Image generation options
  imageOptions?: {
    generateImages?: boolean;
    imageQuality?: 'low' | 'medium' | 'high';
    maxImages?: number;
    appName?: string;
    appDescription?: string;
    layoutManifest?: LayoutManifest;
    features?: string[];
  };
}

export interface PhaseContext {
  phaseNumber: number;
  previousPhaseCode: string | null;
  allPhases: Phase[];
  completedPhases: number[];
  cumulativeFeatures: string[];
}

export interface Phase {
  number: number;
  name: string;
  description: string;
  features: string[];
  status: 'pending' | 'building' | 'complete';
}

export interface PhaseComplexity {
  level: 'small' | 'medium' | 'large' | 'too_large';
  estimatedTokens: number;
  shouldSplit: boolean;
  complexFeatureCount: number;
}

export interface TruncationInfo {
  isTruncated: boolean;
  reason: string;
  lastCompleteFile: string | null;
  salvageableFiles: number;
}

export interface GenerationResult {
  name: string;
  description: string;
  appType: string;
  changeType: string;
  changeSummary: string;
  files: Array<{ path: string; content: string; description: string }>;
  dependencies: Record<string, string>;
  setupInstructions: string;
  responseText: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  validationErrors: Array<{ file: string; errors: ValidationError[] }>;
  totalErrors: number;
  autoFixedCount: number;
  truncationInfo?: TruncationInfo;
  // Image generation results
  images?: {
    hero?: string;
    cards: string[];
    background?: string;
    fallbackUsed: boolean;
    cost: number;
    generationTime: number;
  };
}

export interface GenerationError extends Error {
  category: ErrorCategory;
  originalResponse?: string;
  validationDetails?: { file: string; errors: ValidationError[] }[];
}

// ============================================================================
// FIX 3.3.1: PHASE COMPLEXITY ESTIMATION
// ============================================================================

const COMPLEX_FEATURE_PATTERNS = [
  'authentication',
  'auth',
  'login',
  'signup',
  'sign up',
  'register',
  'database',
  'backend',
  'api',
  'server',
  'payment',
  'stripe',
  'checkout',
  'billing',
  'real-time',
  'realtime',
  'websocket',
  'socket',
  'chat',
  'file upload',
  'image upload',
  'storage',
  'upload',
  'email',
  'notification',
  'push',
  'dashboard',
  'analytics',
  'charts',
  'graphs',
  'search',
  'filter',
  'pagination',
  'drag and drop',
  'dnd',
  'sortable',
  'form validation',
  'multi-step',
  'wizard',
];

/**
 * Estimate the complexity of a phase based on its features
 */
export function estimatePhaseComplexity(phase: Phase): PhaseComplexity {
  const featureCount = phase.features.length;

  // Count complex features
  const complexFeatures = phase.features.filter((f) =>
    COMPLEX_FEATURE_PATTERNS.some((pattern) => f.toLowerCase().includes(pattern))
  );
  const complexFeatureCount = complexFeatures.length;

  // Estimation heuristics (tokens per feature)
  const baseTokensPerFeature = 1500;
  const complexFeatureMultiplier = 2.5;

  const estimatedTokens =
    (featureCount - complexFeatureCount) * baseTokensPerFeature +
    complexFeatureCount * baseTokensPerFeature * complexFeatureMultiplier;

  // Determine complexity level
  if (estimatedTokens > 14000 || featureCount > 5 || complexFeatureCount > 1) {
    return { level: 'too_large', estimatedTokens, shouldSplit: true, complexFeatureCount };
  }
  if (estimatedTokens > 10000 || featureCount > 3 || complexFeatureCount > 0) {
    return { level: 'large', estimatedTokens, shouldSplit: false, complexFeatureCount };
  }
  if (estimatedTokens > 5000 || featureCount > 2) {
    return { level: 'medium', estimatedTokens, shouldSplit: false, complexFeatureCount };
  }
  return { level: 'small', estimatedTokens, shouldSplit: false, complexFeatureCount };
}

// ============================================================================
// FIX 3.3.2: AUTO-SPLIT LARGE PHASES
// ============================================================================

/**
 * Split a phase into smaller sub-phases if it's too large
 */
export function splitPhaseIfNeeded(phase: Phase): Phase[] {
  const complexity = estimatePhaseComplexity(phase);

  if (!complexity.shouldSplit) {
    return [phase];
  }

  // Separate complex features from simple ones
  const complexFeatures: string[] = [];
  const simpleFeatures: string[] = [];

  phase.features.forEach((feature) => {
    const isComplex = COMPLEX_FEATURE_PATTERNS.some((pattern) =>
      feature.toLowerCase().includes(pattern)
    );
    if (isComplex) {
      complexFeatures.push(feature);
    } else {
      simpleFeatures.push(feature);
    }
  });

  const splitPhases: Phase[] = [];

  // First sub-phase: simple features (foundation)
  if (simpleFeatures.length > 0) {
    splitPhases.push({
      number: phase.number,
      name: `${phase.name} (Core)`,
      description: `${phase.description} - Core functionality`,
      features: simpleFeatures.slice(0, 3),
      status: 'pending',
    });

    // Additional simple features if any
    if (simpleFeatures.length > 3) {
      splitPhases.push({
        number: phase.number + 0.5,
        name: `${phase.name} (Extended)`,
        description: `${phase.description} - Additional features`,
        features: simpleFeatures.slice(3),
        status: 'pending',
      });
    }
  }

  // Complex features get their own phases
  complexFeatures.forEach((feature, idx) => {
    splitPhases.push({
      number: phase.number + 0.5 + (idx + 1) * 0.1,
      name: `${phase.name} (${feature.split(' ').slice(0, 2).join(' ')})`,
      description: feature,
      features: [feature],
      status: 'pending',
    });
  });

  return splitPhases;
}

// ============================================================================
// FIX 3.3.3: TRUNCATION DETECTION
// ============================================================================

/**
 * Detect if the response was truncated
 */
export function detectTruncation(
  responseText: string,
  files: Array<{ path: string; content: string }>
): TruncationInfo {
  // Check 1: Missing end delimiter
  if (responseText.includes('===FILE:') && !responseText.includes('===END===')) {
    return {
      isTruncated: true,
      reason: 'Missing ===END=== delimiter - response cut off',
      lastCompleteFile: findLastCompleteFile(files),
      salvageableFiles: countCompleteFiles(files),
    };
  }

  // Check 2: Unbalanced braces in any file
  for (const file of files) {
    const openBraces = (file.content.match(/{/g) || []).length;
    const closeBraces = (file.content.match(/}/g) || []).length;

    if (openBraces !== closeBraces && Math.abs(openBraces - closeBraces) > 2) {
      return {
        isTruncated: true,
        reason: `Unbalanced braces in ${file.path} (${openBraces} open, ${closeBraces} close)`,
        lastCompleteFile: findLastCompleteFile(files.slice(0, -1)),
        salvageableFiles: countCompleteFiles(files.slice(0, -1)),
      };
    }
  }

  // Check 3: Incomplete JSX in TSX/JSX files
  for (const file of files) {
    if (file.path.endsWith('.tsx') || file.path.endsWith('.jsx')) {
      const openTags = (file.content.match(/<[A-Z][a-zA-Z]*(?:\s|>)/g) || []).length;
      const closeTags = (file.content.match(/<\/[A-Z][a-zA-Z]*>/g) || []).length;
      const selfClosing = (file.content.match(/<[A-Z][a-zA-Z]*[^>]*\/>/g) || []).length;

      if (openTags > closeTags + selfClosing + 3) {
        return {
          isTruncated: true,
          reason: `Incomplete JSX in ${file.path} (${openTags} opening tags, ${closeTags + selfClosing} closing)`,
          lastCompleteFile: findLastCompleteFile(files.slice(0, -1)),
          salvageableFiles: countCompleteFiles(files.slice(0, -1)),
        };
      }
    }
  }

  // Check 4: File ends mid-string
  for (const file of files) {
    const lastLine = file.content.trim().split('\n').pop() || '';
    const unbalancedQuotes =
      (lastLine.match(/"/g) || []).length % 2 !== 0 ||
      (lastLine.match(/'/g) || []).length % 2 !== 0 ||
      (lastLine.match(/`/g) || []).length % 2 !== 0;

    if (
      unbalancedQuotes &&
      !lastLine.endsWith(';') &&
      !lastLine.endsWith('}') &&
      !lastLine.endsWith('>')
    ) {
      return {
        isTruncated: true,
        reason: `File ${file.path} ends mid-string or mid-statement`,
        lastCompleteFile: findLastCompleteFile(files.slice(0, -1)),
        salvageableFiles: countCompleteFiles(files.slice(0, -1)),
      };
    }
  }

  return { isTruncated: false, reason: '', lastCompleteFile: null, salvageableFiles: files.length };
}

function findLastCompleteFile(files: Array<{ path: string; content: string }>): string | null {
  for (let i = files.length - 1; i >= 0; i--) {
    const file = files[i];
    const openBraces = (file.content.match(/{/g) || []).length;
    const closeBraces = (file.content.match(/}/g) || []).length;
    if (Math.abs(openBraces - closeBraces) <= 1) {
      return file.path;
    }
  }
  return files.length > 0 ? files[0].path : null;
}

function countCompleteFiles(files: Array<{ path: string; content: string }>): number {
  return files.filter((file) => {
    const openBraces = (file.content.match(/{/g) || []).length;
    const closeBraces = (file.content.match(/}/g) || []).length;
    return Math.abs(openBraces - closeBraces) <= 1;
  }).length;
}

// ============================================================================
// FIX 3.3.5: DYNAMIC TOKEN BUDGET
// ============================================================================

interface TokenBudget {
  max_tokens: number;
  thinking_budget: number;
  timeout: number;
}

const TOKEN_BUDGETS = {
  // Phase 1 needs more tokens (building foundation)
  // max_tokens must be > thinking_budget to leave room for response
  foundation: {
    max_tokens: 48000, // 24000 thinking + 24000 response
    thinking_budget: 24000,
    timeout: 360000, // 6 minutes
  },
  // Later phases need less (additive changes)
  additive: {
    max_tokens: 32000, // 16000 thinking + 16000 response
    thinking_budget: 16000,
    timeout: 300000, // 5 minutes
  },
  // Small modifications
  small: {
    max_tokens: 24000, // 12000 thinking + 12000 response
    thinking_budget: 12000,
    timeout: 180000, // 3 minutes
  },
};

/**
 * Get appropriate token budget based on phase number and complexity
 */
export function getTokenBudget(phaseNumber: number, complexity?: PhaseComplexity): TokenBudget {
  if (phaseNumber === 1) {
    return TOKEN_BUDGETS.foundation;
  }

  if (complexity) {
    if (complexity.level === 'small') {
      return TOKEN_BUDGETS.small;
    }
    if (complexity.level === 'too_large' || complexity.level === 'large') {
      return TOKEN_BUDGETS.foundation;
    }
  }

  return TOKEN_BUDGETS.additive;
}

// ============================================================================
// FIX 3.6: PHASE CONTINUATION LOGIC (CONTEXT CHAIN)
// ============================================================================

/**
 * Build a prompt that includes context from previous phases
 */
export function buildPhasePrompt(phase: Phase, context: PhaseContext): string {
  if (context.phaseNumber === 1 || !context.previousPhaseCode) {
    // First phase: Build from scratch
    return `Build ${phase.name}: ${phase.description}
    
Features to implement:
${phase.features.map((f) => `- ${f}`).join('\n')}

This is Phase 1 - create the foundation app with these features.`;
  }

  // Subsequent phases: Build on existing code
  try {
    const existingApp = JSON.parse(context.previousPhaseCode);
    const existingFiles =
      existingApp.files?.map((f: { path: string }) => f.path).join(', ') || 'none';

    return `Continue building the app. This is Phase ${context.phaseNumber}.

EXISTING APP (from Phase ${context.phaseNumber - 1}):
- Files: ${existingFiles}
- Features already implemented: ${context.cumulativeFeatures.join(', ') || 'foundation'}

YOUR TASK FOR THIS PHASE:
${phase.name}: ${phase.description}

NEW FEATURES TO ADD:
${phase.features.map((f) => `- ${f}`).join('\n')}

CRITICAL INSTRUCTIONS:
1. DO NOT recreate existing files unless modifying them
2. PRESERVE all existing functionality
3. ADD the new features incrementally
4. Reference existing components/functions where appropriate

EXISTING CODE FOR REFERENCE (first 3 files):
${
  existingApp.files
    ?.slice(0, 3)
    .map(
      (f: { path: string; content: string }) => `
=== ${f.path} ===
${f.content.substring(0, 1500)}${f.content.length > 1500 ? '...(truncated)' : ''}
`
    )
    .join('\n') || '(no existing files)'
}`;
  } catch {
    // Fallback if parsing fails
    return `Build ${phase.name}: ${phase.description}
    
Features to implement:
${phase.features.map((f) => `- ${f}`).join('\n')}

This is Phase ${context.phaseNumber} - add these features to the existing app.`;
  }
}

// ============================================================================
// MAIN GENERATION FUNCTION
// ============================================================================

/**
 * Generate full application from AI with validation
 */
export async function generateFullApp(
  context: GenerationContext,
  attemptNumber: number = 1
): Promise<GenerationResult> {
  const { anthropic, systemPrompt, messages, modelName, correctionPrompt, phaseContext } = context;

  // Determine token budget based on phase
  const phaseNumber = phaseContext?.phaseNumber || 1;
  const tokenBudget = getTokenBudget(phaseNumber);

  // Add correction prompt if this is a retry
  const enhancedMessages =
    correctionPrompt && attemptNumber > 1
      ? [...messages, { role: 'user' as const, content: correctionPrompt }]
      : messages;

  // Use streaming API with dynamic token budget
  const stream = await anthropic.messages.stream({
    model: modelName,
    max_tokens: tokenBudget.max_tokens,
    temperature: 1, // Required for extended thinking
    thinking: {
      type: 'enabled',
      budget_tokens: tokenBudget.thinking_budget,
    },
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: enhancedMessages,
  });

  // Collect response with dynamic timeout
  let responseText = '';
  let inputTokens = 0;
  let outputTokens = 0;
  let cachedTokens = 0;
  const timeout = tokenBudget.timeout;
  const startTime = Date.now();

  try {
    for await (const chunk of stream) {
      if (Date.now() - startTime > timeout) {
        const error = new Error(
          `AI response timeout after ${timeout / 1000}s - the generation was taking too long. Please try a simpler request or try again.`
        ) as GenerationError;
        error.category = 'timeout_error';
        error.originalResponse = responseText; // Include partial response for recovery
        throw error;
      }
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        responseText += chunk.delta.text;
      }
      // Capture token usage from final message
      if (chunk.type === 'message_stop') {
        const finalMessage = await stream.finalMessage();
        inputTokens = finalMessage.usage.input_tokens || 0;
        outputTokens = finalMessage.usage.output_tokens || 0;
        cachedTokens = finalMessage.usage.cache_read_input_tokens || 0;
      }
    }
  } catch (streamError) {
    // If it's already our timeout error, re-throw
    if (streamError instanceof Error && streamError.message.includes('timeout')) {
      throw streamError;
    }
    console.error('Streaming error:', streamError);
    const error = new Error(
      streamError instanceof Error ? streamError.message : 'Failed to receive AI response'
    ) as GenerationError;
    error.category = 'ai_error';
    throw error;
  }

  if (!responseText) {
    const error = new Error('No response from Claude') as GenerationError;
    error.category = 'ai_error';
    throw error;
  }

  // ============================================================================
  // PARSE DELIMITER-BASED RESPONSE
  // ============================================================================

  const nameMatch = responseText.match(/===NAME===\s*([\s\S]*?)\s*===/);
  const descriptionMatch = responseText.match(/===DESCRIPTION===\s*([\s\S]*?)\s*===/);
  const appTypeMatch = responseText.match(/===APP_TYPE===\s*([\s\S]*?)\s*===/);
  const changeTypeMatch = responseText.match(/===CHANGE_TYPE===\s*([\s\S]*?)\s*===/);
  const changeSummaryMatch = responseText.match(/===CHANGE_SUMMARY===\s*([\s\S]*?)\s*===/);
  const dependenciesMatch = responseText.match(/===DEPENDENCIES===\s*([\s\S]*?)\s*===/);
  const setupMatch = responseText.match(/===SETUP===\s*([\s\S]*?)===END===/);

  if (!nameMatch || !descriptionMatch) {
    console.error('Failed to parse response');
    const error = new Error(
      'Invalid response format from Claude - missing required delimiters'
    ) as GenerationError;
    error.category = 'parsing_error';
    error.originalResponse = responseText;
    throw error;
  }

  const name = nameMatch[1].trim().split('\n')[0].trim();
  const descriptionText = descriptionMatch[1].trim().split('\n')[0].trim();
  const appType = appTypeMatch ? appTypeMatch[1].trim().split('\n')[0].trim() : 'FRONTEND_ONLY';

  // Extract files
  const fileMatches = responseText.matchAll(
    /===FILE:([\s\S]*?)===\s*([\s\S]*?)(?====FILE:|===DEPENDENCIES===|===SETUP===|===END===|$)/g
  );
  const files: Array<{ path: string; content: string; description: string }> = [];

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
    const error = new Error('No files generated in response') as GenerationError;
    error.category = 'parsing_error';
    error.originalResponse = responseText;
    throw error;
  }

  // ============================================================================
  // FIX 3.3.3: TRUNCATION DETECTION
  // ============================================================================

  const truncationInfo = detectTruncation(responseText, files);

  if (truncationInfo.isTruncated) {
    // Filter to only complete files
    if (truncationInfo.salvageableFiles > 0 && truncationInfo.salvageableFiles < files.length) {
      const completeFiles = files.slice(0, truncationInfo.salvageableFiles);
      files.length = 0;
      files.push(...completeFiles);
    }
  }

  // ============================================================================
  // VALIDATION LAYER
  // ============================================================================

  const validationErrors: Array<{ file: string; errors: ValidationError[] }> = [];
  let totalErrors = 0;
  let autoFixedCount = 0;

  for (const file of files) {
    if (
      file.path.endsWith('.tsx') ||
      file.path.endsWith('.ts') ||
      file.path.endsWith('.jsx') ||
      file.path.endsWith('.js')
    ) {
      const validation = await validateGeneratedCode(file.content, file.path);

      if (!validation.valid) {
        totalErrors += validation.errors.length;

        const fixedCode = autoFixCode(file.content, validation.errors);
        if (fixedCode !== file.content) {
          file.content = fixedCode;
          autoFixedCount += validation.errors.filter((e) => e.type === 'UNCLOSED_STRING').length;

          const revalidation = await validateGeneratedCode(fixedCode, file.path);
          if (!revalidation.valid) {
            validationErrors.push({
              file: file.path,
              errors: revalidation.errors,
            });
          }
        } else {
          validationErrors.push({
            file: file.path,
            errors: validation.errors,
          });
        }
      }
    }
  }

  // If validation failed on first attempt with unfixed errors, throw for retry
  if (validationErrors.length > 0 && attemptNumber === 1) {
    const error = new Error(
      `Validation failed: ${validationErrors.length} files with issues`
    ) as GenerationError;
    error.category = 'validation_error';
    error.validationDetails = validationErrors;
    error.originalResponse = responseText;
    throw error;
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

  // ============================================================================
  // IMAGE GENERATION STEP
  // ============================================================================

  let imageResult: GenerationResult['images'] = undefined;
  const { imageOptions } = context;

  if (imageOptions?.generateImages) {
    try {
      // Extract features from files if not provided
      const features = imageOptions.features || extractFeaturesFromFiles(files);

      const images = await generateImagesForApp(
        imageOptions.appName || name,
        imageOptions.appDescription || descriptionText,
        imageOptions.layoutManifest,
        features,
        {
          generateHero: true,
          generateCards: true,
          generateBackground: false,
          maxCards: imageOptions.maxImages || 4,
          quality: imageOptions.imageQuality || 'medium',
        }
      );

      // Inject image URLs into generated code
      if (!images.fallbackUsed || images.hero || images.cards.length > 0) {
        const injectionResult = injectImageUrls(
          files.map((f) => ({ path: f.path, content: f.content })),
          images
        );

        // Update files with injected image URLs
        files.length = 0;
        files.push(
          ...injectionResult.files.map((f) => ({
            path: f.path,
            content: f.content,
            description: `${f.path.split('/').pop()} file`,
          }))
        );

        // Add the image constants file
        files.push({
          path: injectionResult.imageConstantsFile.path,
          content: injectionResult.imageConstantsFile.content,
          description: 'Image constants file with generated image URLs',
        });
      }

      // Build image result metadata
      imageResult = {
        hero: images.hero?.url,
        cards: images.cards.map((c) => c.url),
        background: images.background?.url,
        fallbackUsed: images.fallbackUsed,
        cost: images.totalCost,
        generationTime: images.generationTime,
      };
    } catch (imageError) {
      console.error('⚠️ Image generation failed, continuing without images:', imageError);
      // Don't fail the entire generation if images fail
    }
  }

  return {
    name,
    description: descriptionText,
    appType,
    changeType,
    changeSummary,
    files,
    dependencies,
    setupInstructions,
    responseText,
    inputTokens,
    outputTokens,
    cachedTokens,
    validationErrors,
    totalErrors,
    autoFixedCount,
    truncationInfo: truncationInfo.isTruncated ? truncationInfo : undefined,
    images: imageResult,
  };
}

/**
 * Extract feature names from generated files for image context
 */
function extractFeaturesFromFiles(files: Array<{ path: string; content: string }>): string[] {
  const features: string[] = [];

  // Look for component files and extract names
  for (const file of files) {
    if (
      file.path.includes('/components/') &&
      (file.path.endsWith('.tsx') || file.path.endsWith('.jsx'))
    ) {
      const componentName = file.path
        .split('/')
        .pop()
        ?.replace(/\.(tsx|jsx)$/, '');
      if (componentName && !['index', 'layout', 'page'].includes(componentName.toLowerCase())) {
        features.push(componentName.replace(/([A-Z])/g, ' $1').trim());
      }
    }
  }

  // Limit to 4 features for card images
  return features.slice(0, 4);
}

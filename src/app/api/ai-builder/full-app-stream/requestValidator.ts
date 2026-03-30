/**
 * Request parsing and validation for the full-app-stream route.
 */

import type { StreamEvent } from '@/types/streaming';
import type { ValidatedRequest, SSEWriter } from './types';

// Request size limits (defense-in-depth)
const MAX_REQUEST_SIZE_BYTES = 10 * 1024 * 1024; // 10MB max request
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB max image (before base64 encoding)
const MAX_PROMPT_LENGTH = 100_000; // 100k chars max prompt
const MAX_CONVERSATION_HISTORY_ITEMS = 50; // Max messages in history

/**
 * Validate base64 image data
 * Returns decoded size or null if invalid
 */
function validateBase64Image(
  base64: string
): { valid: true; size: number } | { valid: false; error: string } {
  // Check if it looks like base64 (data URL or raw)
  let base64Data = base64;

  // Handle data URL format: data:image/...;base64,<data>
  const dataUrlMatch = base64.match(/^data:image\/[^;]+;base64,(.+)$/);
  if (dataUrlMatch) {
    base64Data = dataUrlMatch[1];
  }

  // Check for valid base64 characters
  if (!/^[A-Za-z0-9+/=]+$/.test(base64Data)) {
    return { valid: false, error: 'Invalid base64 characters detected' };
  }

  // Calculate decoded size (base64 is ~4/3 the size of original)
  const decodedSize = Math.floor((base64Data.length * 3) / 4);

  // Adjust for padding
  const paddingCount = (base64Data.match(/=+$/) || [''])[0].length;
  const actualSize = decodedSize - paddingCount;

  if (actualSize > MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      error: `Image size ${(actualSize / 1024 / 1024).toFixed(1)}MB exceeds limit of ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024}MB`,
    };
  }

  return { valid: true, size: actualSize };
}

/**
 * Validate and parse the incoming request.
 * Returns null and writes error events if validation fails.
 */
export async function validateRequest(
  request: Request,
  sse: SSEWriter
): Promise<ValidatedRequest | null> {
  // Check Content-Length header for early rejection
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_REQUEST_SIZE_BYTES) {
    await sse.writeEvent({
      type: 'error',
      timestamp: Date.now(),
      message: `Request size ${(parseInt(contentLength, 10) / 1024 / 1024).toFixed(1)}MB exceeds limit of ${MAX_REQUEST_SIZE_BYTES / 1024 / 1024}MB`,
      code: 'REQUEST_TOO_LARGE',
      recoverable: false,
    } as StreamEvent);
    await sse.closeWriter();
    return null;
  }

  // Parse request body with error handling
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let requestBody: any;
  try {
    requestBody = await request.json();
  } catch (parseError) {
    await sse.writeEvent({
      type: 'error',
      timestamp: Date.now(),
      message:
        'Invalid request: ' +
        (parseError instanceof Error ? parseError.message : 'Failed to parse JSON'),
      code: 'INVALID_REQUEST',
      recoverable: false,
    } as StreamEvent);
    await sse.closeWriter();
    return null;
  }

  const {
    prompt,
    conversationHistory,
    contextSummary,
    isModification,
    currentAppName,
    image,
    hasImage,
    isPhaseBuilding,
    phaseContext: rawPhaseContext,
    currentAppState,
    layoutManifest,
    architectureSpec,
    phaseContexts,
    useAgenticValidation,
  } = requestBody;

  // Validate request content limits
  if (prompt && prompt.length > MAX_PROMPT_LENGTH) {
    await sse.writeEvent({
      type: 'error',
      timestamp: Date.now(),
      message: `Prompt length ${prompt.length.toLocaleString()} chars exceeds limit of ${MAX_PROMPT_LENGTH.toLocaleString()} chars`,
      code: 'PROMPT_TOO_LARGE',
      recoverable: false,
    } as StreamEvent);
    await sse.closeWriter();
    return null;
  }

  if (conversationHistory && conversationHistory.length > MAX_CONVERSATION_HISTORY_ITEMS) {
    await sse.writeEvent({
      type: 'error',
      timestamp: Date.now(),
      message: `Conversation history has ${conversationHistory.length} items, limit is ${MAX_CONVERSATION_HISTORY_ITEMS}`,
      code: 'HISTORY_TOO_LARGE',
      recoverable: false,
    } as StreamEvent);
    await sse.closeWriter();
    return null;
  }

  // Validate base64 image if present
  if (image && hasImage) {
    const imageValidation = validateBase64Image(image);
    if (!imageValidation.valid) {
      await sse.writeEvent({
        type: 'error',
        timestamp: Date.now(),
        message: `Invalid image: ${imageValidation.error}`,
        code: 'INVALID_IMAGE',
        recoverable: false,
      } as StreamEvent);
      await sse.closeWriter();
      return null;
    }
  }

  return {
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
    useAgenticValidation,
  };
}

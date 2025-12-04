/**
 * Screenshot Capture Utility
 * Uses html2canvas to capture layout previews for AI vision
 */

import html2canvas from 'html2canvas';

export interface CaptureOptions {
  elementId?: string;
  element?: HTMLElement;
  quality?: number; // 0-1, default 0.7
  maxWidth?: number; // default 1200
  maxHeight?: number; // default 800
  format?: 'jpeg' | 'png';
  backgroundColor?: string;
}

export interface CaptureResult {
  success: boolean;
  dataUrl?: string;
  width?: number;
  height?: number;
  error?: string;
}

/**
 * Resize a canvas to fit within max dimensions while maintaining aspect ratio
 */
function resizeCanvas(
  canvas: HTMLCanvasElement,
  maxWidth: number,
  maxHeight: number
): HTMLCanvasElement {
  const { width, height } = canvas;

  // If already within bounds, return original
  if (width <= maxWidth && height <= maxHeight) {
    return canvas;
  }

  // Calculate scale factor
  const scaleX = maxWidth / width;
  const scaleY = maxHeight / height;
  const scale = Math.min(scaleX, scaleY);

  const newWidth = Math.floor(width * scale);
  const newHeight = Math.floor(height * scale);

  // Create new canvas with resized dimensions
  const resizedCanvas = document.createElement('canvas');
  resizedCanvas.width = newWidth;
  resizedCanvas.height = newHeight;

  const ctx = resizedCanvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, newWidth, newHeight);
  }

  return resizedCanvas;
}

/**
 * Capture an element as a base64 image
 */
export async function captureElement(options: CaptureOptions): Promise<CaptureResult> {
  const {
    elementId,
    element,
    quality = 0.7,
    maxWidth = 1200,
    maxHeight = 800,
    format = 'jpeg',
    backgroundColor = '#0F172A', // Dark background matching preview
  } = options;

  try {
    // Get the element to capture
    let targetElement: HTMLElement | null = element || null;

    if (!targetElement && elementId) {
      targetElement = document.getElementById(elementId);
    }

    if (!targetElement) {
      return {
        success: false,
        error: 'Element not found',
      };
    }

    // Capture with html2canvas
    const canvas = await html2canvas(targetElement, {
      useCORS: true,
      allowTaint: true,
      scale: 1, // Use 1x scale for API efficiency
      logging: false,
      backgroundColor,
      // Ignore elements that might cause issues
      ignoreElements: (el) => {
        // Ignore hidden elements or those with data-html2canvas-ignore
        return el.hasAttribute('data-html2canvas-ignore');
      },
    });

    // Resize if needed
    const resizedCanvas = resizeCanvas(canvas, maxWidth, maxHeight);

    // Convert to base64
    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    const dataUrl = resizedCanvas.toDataURL(mimeType, quality);

    return {
      success: true,
      dataUrl,
      width: resizedCanvas.width,
      height: resizedCanvas.height,
    };
  } catch (error) {
    console.error('Screenshot capture error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown capture error',
    };
  }
}

/**
 * Capture the layout preview specifically
 * Looks for the preview frame element
 */
export async function captureLayoutPreview(
  previewElementId: string = 'layout-preview-frame'
): Promise<CaptureResult> {
  return captureElement({
    elementId: previewElementId,
    quality: 0.75,
    maxWidth: 1200,
    maxHeight: 900,
    format: 'jpeg',
  });
}

/**
 * Check if an element contains visual keywords that suggest
 * the user is talking about something they can see
 */
export function containsVisualKeywords(text: string): boolean {
  const visualKeywords = [
    'this',
    'that',
    'here',
    'there',
    'move',
    'color',
    'colour',
    'size',
    'bigger',
    'smaller',
    'spacing',
    'padding',
    'margin',
    'font',
    'text',
    'button',
    'header',
    'sidebar',
    'footer',
    'card',
    'image',
    'icon',
    'looks',
    'see',
    'showing',
    'display',
    'appears',
    'visible',
    'hidden',
    'change',
    'adjust',
    'modify',
    'update',
    'fix',
    'wrong',
    'right',
    'left',
    'top',
    'bottom',
    'center',
    'align',
    'position',
  ];

  const lowerText = text.toLowerCase();
  return visualKeywords.some((keyword) => lowerText.includes(keyword));
}

/**
 * Debounced capture function to prevent excessive captures
 */
export function createDebouncedCapture(delayMs: number = 500) {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastCapture: CaptureResult | null = null;

  return async function debouncedCapture(options: CaptureOptions): Promise<CaptureResult> {
    // Clear any pending capture
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    return new Promise((resolve) => {
      timeoutId = setTimeout(async () => {
        lastCapture = await captureElement(options);
        resolve(lastCapture);
        timeoutId = null;
      }, delayMs);
    });
  };
}

/**
 * Extract base64 data from a data URL
 */
export function extractBase64FromDataUrl(dataUrl: string): {
  mediaType: string;
  base64: string;
} | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return null;
  }
  return {
    mediaType: match[1],
    base64: match[2],
  };
}

/**
 * Validate that an image data URL is properly formatted
 */
export function isValidImageDataUrl(dataUrl: string): boolean {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return false;
  }

  const validPrefixes = [
    'data:image/jpeg;base64,',
    'data:image/jpg;base64,',
    'data:image/png;base64,',
    'data:image/gif;base64,',
    'data:image/webp;base64,',
  ];

  return validPrefixes.some((prefix) => dataUrl.startsWith(prefix));
}

/**
 * Estimate the token cost of an image based on its dimensions
 * Claude charges based on image size
 */
export function estimateImageTokens(width: number, height: number): number {
  // Rough estimation based on Claude's image token pricing
  // ~1 token per 1.2 pixels at base quality
  const pixels = width * height;
  return Math.ceil(pixels / 750);
}

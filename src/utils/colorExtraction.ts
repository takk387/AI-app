/**
 * Color Extraction Utility
 *
 * Extract dominant colors from reference images using canvas.
 * Uses k-means clustering to identify the most prominent colors.
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
}

export interface ExtractedColor {
  hex: string;
  rgb: RGB;
  hsl: { h: number; s: number; l: number };
  percentage: number;
  role?: keyof ColorPalette;
}

export interface ExtractionResult {
  colors: ExtractedColor[];
  palette: ColorPalette;
  dominantColor: string;
  isDarkImage: boolean;
}

// ============================================================================
// Color Conversion Utilities
// ============================================================================

/**
 * Convert RGB to hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Convert hex to RGB
 */
export function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Calculate luminance of a color
 */
export function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: RGB, color2: RGB): number {
  const l1 = getLuminance(color1.r, color1.g, color1.b);
  const l2 = getLuminance(color2.r, color2.g, color2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get saturation from RGB (currently unused but kept for future use)
 */
// function getSaturation(r: number, g: number, b: number): number {
//   const max = Math.max(r, g, b);
//   const min = Math.min(r, g, b);
//   if (max === 0) return 0;
//   return (max - min) / max;
// }

// ============================================================================
// K-Means Clustering
// ============================================================================

/**
 * Calculate Euclidean distance between two RGB colors
 */
function colorDistance(c1: RGB, c2: RGB): number {
  return Math.sqrt(Math.pow(c1.r - c2.r, 2) + Math.pow(c1.g - c2.g, 2) + Math.pow(c1.b - c2.b, 2));
}

/**
 * Find nearest centroid for a color
 */
function findNearestCentroid(color: RGB, centroids: RGB[]): number {
  let minDist = Infinity;
  let nearest = 0;

  for (let i = 0; i < centroids.length; i++) {
    const dist = colorDistance(color, centroids[i]);
    if (dist < minDist) {
      minDist = dist;
      nearest = i;
    }
  }

  return nearest;
}

/**
 * K-means clustering for color quantization
 */
function kMeansClustering(pixels: RGB[], k: number, maxIterations: number = 10): RGB[] {
  if (pixels.length === 0) {
    return [];
  }

  // Initialize centroids randomly from pixels
  const centroids: RGB[] = [];
  const usedIndices = new Set<number>();

  while (centroids.length < k && centroids.length < pixels.length) {
    const index = Math.floor(Math.random() * pixels.length);
    if (!usedIndices.has(index)) {
      usedIndices.add(index);
      centroids.push({ ...pixels[index] });
    }
  }

  for (let iter = 0; iter < maxIterations; iter++) {
    // Assign pixels to nearest centroid
    const clusters: RGB[][] = Array.from({ length: k }, (): RGB[] => []);

    for (const pixel of pixels) {
      const nearestIdx = findNearestCentroid(pixel, centroids);
      clusters[nearestIdx].push(pixel);
    }

    // Update centroids
    let changed = false;
    for (let i = 0; i < k; i++) {
      if (clusters[i].length === 0) continue;

      const newCentroid = {
        r: clusters[i].reduce((sum, c) => sum + c.r, 0) / clusters[i].length,
        g: clusters[i].reduce((sum, c) => sum + c.g, 0) / clusters[i].length,
        b: clusters[i].reduce((sum, c) => sum + c.b, 0) / clusters[i].length,
      };

      if (colorDistance(newCentroid, centroids[i]) > 1) {
        changed = true;
        centroids[i] = newCentroid;
      }
    }

    if (!changed) break;
  }

  return centroids;
}

// ============================================================================
// Pixel Sampling
// ============================================================================

/**
 * Sample pixels from image data
 */
function samplePixels(imageData: Uint8ClampedArray, sampleSize: number = 1000): RGB[] {
  const pixels: RGB[] = [];
  const step = Math.max(1, Math.floor(imageData.length / 4 / sampleSize));

  for (let i = 0; i < imageData.length; i += step * 4) {
    const r = imageData[i];
    const g = imageData[i + 1];
    const b = imageData[i + 2];
    const a = imageData[i + 3];

    // Skip transparent pixels
    if (a < 128) continue;

    // Only skip near-black pixels - allow ALL other colors including white
    // This ensures white backgrounds are captured for light theme images
    const luminance = getLuminance(r, g, b);
    if (luminance < 0.01) continue;

    pixels.push({ r, g, b });
  }

  return pixels;
}

// ============================================================================
// Color Role Assignment
// ============================================================================

/**
 * Categorize extracted colors into design roles
 * Uses area coverage (percentage) for primary/secondary selection
 * Uses adaptive lightness-based selection for background/surface
 */
function categorizeColors(colors: ExtractedColor[], isDark: boolean): ColorPalette {
  // Sort by different criteria for role assignment
  const byArea = [...colors].sort((a, b) => b.percentage - a.percentage);
  const bySaturation = [...colors].sort((a, b) => b.hsl.s - a.hsl.s);

  // Filter out very light (background-like) and very dark colors from accent candidates
  const accentCandidates = colors.filter((c) => c.hsl.l >= 20 && c.hsl.l <= 80 && c.hsl.s >= 20);
  const sortedAccentCandidates = [...accentCandidates].sort((a, b) => b.percentage - a.percentage);

  // Primary: largest area color that has some saturation (not pure white/black/gray)
  // If no saturated colors, fall back to largest area overall, then neutral gray
  const primary = sortedAccentCandidates[0]?.hex || byArea[0]?.hex || '#6B7280';

  // Accent: most saturated color for visual pop
  const accent = bySaturation[0]?.hex || primary;

  // Secondary: second largest accent candidate with different hue, or fallback to accent
  let secondary = accent;
  const primaryHsl = rgbToHsl(hexToRgb(primary).r, hexToRgb(primary).g, hexToRgb(primary).b);
  for (const color of sortedAccentCandidates) {
    if (color.hex === primary) continue;
    const hueDiff = Math.abs(color.hsl.h - primaryHsl.h);
    // Accept colors with different hue or similar hue but different saturation
    if (hueDiff > 30 || Math.abs(color.hsl.s - primaryHsl.s) > 20) {
      secondary = color.hex;
      break;
    }
  }

  // Adaptive background/surface selection based on actual image content
  // Group colors by lightness ranges
  const darkColors = colors.filter((c) => c.hsl.l < 30);
  const lightColors = colors.filter((c) => c.hsl.l > 70);

  // Calculate total area for each lightness group
  const darkArea = darkColors.reduce((sum, c) => sum + c.percentage, 0);
  const lightArea = lightColors.reduce((sum, c) => sum + c.percentage, 0);

  // Determine background based on which lightness group dominates
  // Use a threshold to avoid flipping on borderline cases
  let background: string;
  let surface: string;
  let text: string;
  let textMuted: string;
  let border: string;

  // If light colors dominate (>30% of image) or isDark is false, use light theme
  const useLightTheme = lightArea > 30 || (!isDark && lightArea > 10);

  if (useLightTheme) {
    // Light mode - use lightest colors for background
    const sortedLight = [...lightColors].sort((a, b) => b.hsl.l - a.hsl.l);
    background = sortedLight[0]?.hex || '#FFFFFF';
    surface = sortedLight[1]?.hex || sortedLight[0]?.hex || '#F8FAFC';
    text = '#0F172A';
    textMuted = '#64748B';
    border = '#E2E8F0';
  } else {
    // Dark mode - use darkest colors for background
    const sortedDark = [...darkColors].sort((a, b) => a.hsl.l - b.hsl.l);
    background = sortedDark[0]?.hex || '#0F172A';
    surface = sortedDark[1]?.hex || sortedDark[0]?.hex || '#1E293B';
    text = '#F8FAFC';
    textMuted = '#94A3B8';
    border = '#334155';
  }

  return {
    primary,
    secondary,
    accent,
    background,
    surface,
    text,
    textMuted,
    border,
  };
}

// ============================================================================
// Main Extraction Function
// ============================================================================

/**
 * Extract dominant colors from an image
 *
 * @param imageSource - Image element, canvas, or data URL
 * @param numColors - Number of colors to extract (default: 8)
 * @returns Extraction result with colors and palette
 */
export async function extractColorsFromImage(
  imageSource: HTMLImageElement | HTMLCanvasElement | string,
  numColors: number = 8
): Promise<ExtractionResult> {
  // Create canvas to extract pixel data
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  let img: HTMLImageElement;

  // Handle different source types
  if (typeof imageSource === 'string') {
    // Data URL or URL - need to load image
    img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageSource;
    });
  } else if (imageSource instanceof HTMLImageElement) {
    img = imageSource;
  } else {
    // Canvas - draw directly
    canvas.width = imageSource.width;
    canvas.height = imageSource.height;
    ctx.drawImage(imageSource, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return processImageData(imageData, numColors);
  }

  // Scale down large images for performance
  const maxDimension = 200;
  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  return processImageData(imageData, numColors);
}

/**
 * Process image data to extract colors
 */
function processImageData(imageData: ImageData, numColors: number): ExtractionResult {
  // Sample pixels from image
  const pixels = samplePixels(imageData.data, 2000);

  if (pixels.length === 0) {
    // Return neutral gray palette if no valid pixels - actual colors should come from AI
    return {
      colors: [],
      palette: {
        primary: '#6B7280',
        secondary: '#9CA3AF',
        accent: '#6B7280',
        background: '#F9FAFB',
        surface: '#FFFFFF',
        text: '#374151',
        textMuted: '#6B7280',
        border: '#E5E7EB',
      },
      dominantColor: '#6B7280',
      isDarkImage: false,
    };
  }

  // Run k-means clustering
  const centroids = kMeansClustering(pixels, numColors);

  // Count pixels per cluster for percentage
  const clusterCounts = new Array(centroids.length).fill(0);
  for (const pixel of pixels) {
    const idx = findNearestCentroid(pixel, centroids);
    clusterCounts[idx]++;
  }

  // Convert centroids to extracted colors
  const totalPixels = pixels.length;
  const colors: ExtractedColor[] = centroids.map((centroid, idx) => {
    const hex = rgbToHex(centroid.r, centroid.g, centroid.b);
    const hsl = rgbToHsl(centroid.r, centroid.g, centroid.b);
    return {
      hex,
      rgb: {
        r: Math.round(centroid.r),
        g: Math.round(centroid.g),
        b: Math.round(centroid.b),
      },
      hsl,
      percentage: (clusterCounts[idx] / totalPixels) * 100,
    };
  });

  // Sort by percentage
  colors.sort((a, b) => b.percentage - a.percentage);

  // Determine if image is predominantly dark
  const avgLuminance =
    pixels.reduce((sum, p) => sum + getLuminance(p.r, p.g, p.b), 0) / pixels.length;
  const isDarkImage = avgLuminance < 0.5;

  // Create palette from extracted colors
  const palette = categorizeColors(colors, isDarkImage);

  return {
    colors,
    palette,
    dominantColor: colors[0]?.hex || '#6B7280',
    isDarkImage,
  };
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Extract colors from a file input
 */
export async function extractColorsFromFile(file: File): Promise<ExtractionResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const dataUrl = e.target?.result as string;
        const result = await extractColorsFromImage(dataUrl);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Check if two colors are visually similar
 */
export function areColorsSimilar(color1: string, color2: string, threshold: number = 30): boolean {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  return colorDistance(rgb1, rgb2) < threshold;
}

/**
 * Generate a contrasting text color for a background
 */
export function getContrastingTextColor(backgroundColor: string): string {
  const rgb = hexToRgb(backgroundColor);
  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  return luminance > 0.5 ? '#0F172A' : '#F8FAFC';
}

/**
 * Adjust color lightness
 */
export function adjustLightness(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  const newL = Math.max(0, Math.min(100, hsl.l + amount));

  // Convert back to RGB
  const c = (1 - Math.abs((2 * newL) / 100 - 1)) * (hsl.s / 100);
  const x = c * (1 - Math.abs(((hsl.h / 60) % 2) - 1));
  const m = newL / 100 - c / 2;

  let r = 0,
    g = 0,
    b = 0;
  if (hsl.h < 60) {
    r = c;
    g = x;
  } else if (hsl.h < 120) {
    r = x;
    g = c;
  } else if (hsl.h < 180) {
    g = c;
    b = x;
  } else if (hsl.h < 240) {
    g = x;
    b = c;
  } else if (hsl.h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

const colorUtils = {
  extractColorsFromImage,
  extractColorsFromFile,
  rgbToHex,
  hexToRgb,
  rgbToHsl,
  getLuminance,
  getContrastRatio,
  areColorsSimilar,
  getContrastingTextColor,
  adjustLightness,
};

export default colorUtils;

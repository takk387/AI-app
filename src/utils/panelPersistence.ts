// Panel Persistence Utilities
// Handles saving and loading panel layout configurations to localStorage

export interface PanelLayout {
  sizes: number[];
  timestamp: number;
}

export interface PersistenceOptions {
  key: string;
  version?: number;
  maxAge?: number; // Max age in milliseconds before layout expires
}

const STORAGE_PREFIX = 'resizable-panel-layout-';
const DEFAULT_VERSION = 1;
const DEFAULT_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

// Debounce timeout for saving
let saveTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();
const DEBOUNCE_DELAY = 300;

/**
 * Generates the full storage key including prefix and version
 */
function getStorageKey(key: string, version: number): string {
  return `${STORAGE_PREFIX}${key}-v${version}`;
}

/**
 * Validates that a layout object has the correct structure
 */
function isValidLayout(layout: unknown): layout is PanelLayout {
  if (typeof layout !== 'object' || layout === null) return false;
  const obj = layout as Record<string, unknown>;
  
  if (!Array.isArray(obj.sizes)) return false;
  if (!obj.sizes.every(s => typeof s === 'number' && s >= 0)) return false;
  if (typeof obj.timestamp !== 'number') return false;
  
  return true;
}

/**
 * Saves panel sizes to localStorage with debouncing
 */
export function savePanelLayout(
  sizes: number[],
  options: PersistenceOptions
): void {
  if (typeof window === 'undefined') return;
  
  const { key, version = DEFAULT_VERSION } = options;
  const storageKey = getStorageKey(key, version);
  
  // Clear existing timeout for this key
  const existingTimeout = saveTimeouts.get(storageKey);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }
  
  // Debounce the save operation
  const timeout = setTimeout(() => {
    try {
      const layout: PanelLayout = {
        sizes,
        timestamp: Date.now(),
      };
      localStorage.setItem(storageKey, JSON.stringify(layout));
      saveTimeouts.delete(storageKey);
    } catch (error) {
      // Storage might be full or disabled
      console.warn('Failed to save panel layout:', error);
    }
  }, DEBOUNCE_DELAY);
  
  saveTimeouts.set(storageKey, timeout);
}

/**
 * Loads panel sizes from localStorage
 * Returns null if no valid layout is found or if it's expired
 */
export function loadPanelLayout(
  options: PersistenceOptions
): number[] | null {
  if (typeof window === 'undefined') return null;
  
  const { key, version = DEFAULT_VERSION, maxAge = DEFAULT_MAX_AGE } = options;
  const storageKey = getStorageKey(key, version);
  
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    if (!isValidLayout(parsed)) return null;
    
    // Check if layout has expired
    const age = Date.now() - parsed.timestamp;
    if (age > maxAge) {
      // Clean up expired layout
      localStorage.removeItem(storageKey);
      return null;
    }
    
    return parsed.sizes;
  } catch (error) {
    // JSON parsing failed or other error
    console.warn('Failed to load panel layout:', error);
    return null;
  }
}

/**
 * Clears a specific panel layout from storage
 */
export function clearPanelLayout(options: PersistenceOptions): void {
  if (typeof window === 'undefined') return;
  
  const { key, version = DEFAULT_VERSION } = options;
  const storageKey = getStorageKey(key, version);
  
  try {
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.warn('Failed to clear panel layout:', error);
  }
}

/**
 * Clears all panel layouts from storage
 */
export function clearAllPanelLayouts(): void {
  if (typeof window === 'undefined') return;
  
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.warn('Failed to clear all panel layouts:', error);
  }
}

/**
 * Validates and normalizes panel sizes
 * Ensures all sizes are positive and sum to 100%
 */
export function normalizeSizes(sizes: number[]): number[] {
  if (sizes.length === 0) return [];
  
  // Ensure all values are positive
  const positiveSizes = sizes.map(s => Math.max(0, s));
  
  // Calculate total
  const total = positiveSizes.reduce((sum, size) => sum + size, 0);
  
  // If total is 0, distribute equally
  if (total === 0) {
    const equalSize = 100 / sizes.length;
    return sizes.map(() => equalSize);
  }
  
  // Normalize to 100%
  return positiveSizes.map(size => (size / total) * 100);
}

/**
 * Constrain sizes within min/max bounds
 */
export function constrainSizes(
  sizes: number[],
  minSizes: number[] = [],
  maxSizes: number[] = []
): number[] {
  return sizes.map((size, index) => {
    const min = minSizes[index] ?? 0;
    const max = maxSizes[index] ?? 100;
    return Math.max(min, Math.min(max, size));
  });
}

/**
 * Calculate optimal initial sizes based on default sizes and constraints
 */
export function calculateInitialSizes(
  panelCount: number,
  defaultSizes?: number[],
  minSizes: number[] = [],
  maxSizes: number[] = []
): number[] {
  // Start with default sizes or equal distribution
  let sizes: number[];
  
  if (defaultSizes && defaultSizes.length === panelCount) {
    sizes = [...defaultSizes];
  } else {
    const equalSize = 100 / panelCount;
    sizes = Array(panelCount).fill(equalSize);
  }
  
  // Normalize and constrain
  sizes = normalizeSizes(sizes);
  sizes = constrainSizes(sizes, minSizes, maxSizes);
  
  // Re-normalize after constraints
  return normalizeSizes(sizes);
}

/**
 * Merge persisted layout with current constraints
 * If persisted sizes don't fit current constraints, they're adjusted
 */
export function mergePersistedLayout(
  persistedSizes: number[] | null,
  panelCount: number,
  defaultSizes?: number[],
  minSizes: number[] = [],
  maxSizes: number[] = []
): number[] {
  // If no persisted sizes or wrong count, calculate fresh
  if (!persistedSizes || persistedSizes.length !== panelCount) {
    return calculateInitialSizes(panelCount, defaultSizes, minSizes, maxSizes);
  }
  
  // Validate persisted sizes against constraints
  const constrained = constrainSizes(persistedSizes, minSizes, maxSizes);
  
  // Check if constraints changed the sizes significantly
  const totalDiff = persistedSizes.reduce((sum, size, i) => 
    sum + Math.abs(size - constrained[i]), 0
  );
  
  // If constraints didn't change much, use persisted (renormalized)
  if (totalDiff < 5) {
    return normalizeSizes(constrained);
  }
  
  // Otherwise, prefer fresh calculation
  return calculateInitialSizes(panelCount, defaultSizes, minSizes, maxSizes);
}

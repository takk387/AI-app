/**
 * Layout Design - Helper Types & Utility Functions
 *
 * Foundational types used across other layout design modules.
 * No internal dependencies - this is the leaf module.
 */

// ============================================================================
// CUSTOMIZABLE VALUE WRAPPER
// ============================================================================

/**
 * Wrapper type for values that can be preset or custom
 * Allows pixel-level control while maintaining preset options
 */
export interface CustomizableValue<T extends string> {
  preset?: T;
  custom?: string; // Allows '16px', '1rem', '2.5em', etc.
}

/**
 * Helper to get the actual value from a CustomizableValue
 */
export function getCustomizableValue<T extends string>(
  value: CustomizableValue<T> | T | undefined,
  presetMap: Record<T, string>,
  defaultValue: string
): string {
  if (!value) return defaultValue;
  if (typeof value === 'string') return presetMap[value] || defaultValue;
  if (value.custom) return value.custom;
  if (value.preset) return presetMap[value.preset] || defaultValue;
  return defaultValue;
}

/**
 * Helper to extract the preset key from a CustomizableValue or string
 * Returns the preset key for use as an index, or undefined if custom-only
 */
export function getPresetKey<T extends string>(
  value: CustomizableValue<T> | T | undefined,
  defaultKey: T
): T {
  if (!value) return defaultKey;
  if (typeof value === 'string') return value;
  if (value.preset) return value.preset;
  return defaultKey;
}

// ============================================================================
// RESPONSIVE OVERRIDES
// ============================================================================

/**
 * Generic responsive overrides wrapper for any component type
 * Allows per-breakpoint customization of component properties
 */
export interface ResponsiveOverrides<T> {
  mobile?: Partial<T>;
  tablet?: Partial<T>;
  desktop?: Partial<T>;
  wide?: Partial<T>;
  custom?: Record<string, Partial<T>>; // Custom breakpoint names
}

/**
 * Component with responsive support
 */
export type ResponsiveComponent<T> = T & {
  responsive?: ResponsiveOverrides<T>;
};

// ============================================================================
// EXTENDED RESPONSIVE & BREAKPOINT TYPES
// ============================================================================

/**
 * Custom breakpoint configuration
 */
export interface CustomBreakpoints {
  mobile: number; // Default: 375
  mobileLandscape?: number; // Optional: 480
  tablet: number; // Default: 768
  tabletLandscape?: number; // Optional: 1024
  laptop?: number; // Optional: 1024
  desktop: number; // Default: 1200
  wide?: number; // Optional: 1440
  ultrawide?: number; // Optional: 1920
}

/**
 * Per-breakpoint visibility settings
 */
export interface BreakpointVisibility {
  mobile: boolean;
  tablet: boolean;
  desktop: boolean;
  wide?: boolean;
}

/**
 * Responsive value that changes per breakpoint
 */
export interface ResponsiveValue<T = string> {
  mobile: T;
  tablet: T;
  desktop: T;
}

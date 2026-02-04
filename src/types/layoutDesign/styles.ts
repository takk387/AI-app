/**
 * Layout Design - Global Style Types
 *
 * Typography, color, spacing settings and the GlobalStyles composite type.
 *
 * Depends on: helpers.ts (CustomizableValue), effects.ts (EffectsSettings)
 */

import type { CustomizableValue } from './helpers';
import type { EffectsSettings } from './effects';

// ============================================================================
// Global Style Types
// ============================================================================

export interface TypographySettings {
  fontFamily: string;
  headingFont?: string;
  headingWeight: 'light' | 'normal' | 'medium' | 'semibold' | 'bold';
  bodyWeight: 'light' | 'normal' | 'medium' | 'semibold' | 'bold';
  headingSize: CustomizableValue<'sm' | 'base' | 'lg' | 'xl'> | 'sm' | 'base' | 'lg' | 'xl';
  bodySize: CustomizableValue<'xs' | 'sm' | 'base'> | 'xs' | 'sm' | 'base';
  lineHeight: CustomizableValue<'tight' | 'normal' | 'relaxed'> | 'tight' | 'normal' | 'relaxed';
  letterSpacing: CustomizableValue<'tight' | 'normal' | 'wide'> | 'tight' | 'normal' | 'wide';
}

export interface ColorSettings {
  primary: string;
  secondary?: string;
  accent?: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  success?: string;
  warning?: string;
  error?: string;
  info?: string;
}

export interface SpacingSettings {
  density: CustomizableValue<'compact' | 'normal' | 'relaxed'> | 'compact' | 'normal' | 'relaxed';
  containerWidth:
    | CustomizableValue<'narrow' | 'standard' | 'wide' | 'full'>
    | 'narrow'
    | 'standard'
    | 'wide'
    | 'full';
  sectionPadding: CustomizableValue<'sm' | 'md' | 'lg' | 'xl'> | 'sm' | 'md' | 'lg' | 'xl';
  componentGap: CustomizableValue<'sm' | 'md' | 'lg'> | 'sm' | 'md' | 'lg';
}

export interface GlobalStyles {
  typography: TypographySettings;
  colors: ColorSettings;
  spacing: SpacingSettings;
  effects: EffectsSettings;
}

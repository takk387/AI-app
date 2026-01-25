/**
 * Centralized Theme Defaults
 *
 * These are fallback colors for user-generated apps when users don't provide colors.
 * NOT the Garden theme (which is in globals.css and tailwind.config.js).
 */

// ============================================
// 1. NEUTRAL PALETTE (raw gray values)
// ============================================
export const NEUTRAL_PALETTE = {
  gray50: '#F9FAFB',
  gray100: '#F8FAFC',
  gray200: '#E5E7EB',
  gray300: '#E2E8F0',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray700: '#374151',
  gray800: '#1F2937',
  white: '#FFFFFF',
} as const;

// ============================================
// 2. STATUS COLORS (semantic)
// ============================================
export const STATUS_COLORS = {
  error: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  info: '#6B7280',
} as const;

// ============================================
// 3. DARK MODE PALETTE
// ============================================
export const DARK_PALETTE = {
  background: '#0F172A',
  surface: '#1E293B',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  border: '#334155',
} as const;

// ============================================
// 4. Z-INDEX LAYER VISUALIZATION COLORS
// (Used by ZIndexEditor and layerUtils)
// ============================================
export const LAYER_COLORS = {
  base: '#64748B',
  content: '#3B82F6',
  dropdown: '#06B6D4',
  sticky: '#10B981',
  overlay: '#8B5CF6',
  modal: '#EC4899',
  toast: '#F59E0B',
  tooltip: '#EF4444',
  max: '#1F2937',
} as const;

// ============================================
// 5. DEFAULT COLOR FALLBACKS
// (Used by generators and services)
// ============================================
export const DEFAULT_COLORS = {
  primary: NEUTRAL_PALETTE.gray500,
  secondary: NEUTRAL_PALETTE.gray400,
  accent: NEUTRAL_PALETTE.gray500,
  background: NEUTRAL_PALETTE.gray50,
  surface: NEUTRAL_PALETTE.white,
  text: NEUTRAL_PALETTE.gray700,
  textMuted: NEUTRAL_PALETTE.gray500,
  border: NEUTRAL_PALETTE.gray200,
  ...STATUS_COLORS,
} as const;

// ============================================
// Type exports
// ============================================
export type NeutralColor = keyof typeof NEUTRAL_PALETTE;
export type StatusColor = keyof typeof STATUS_COLORS;
export type DarkPaletteColor = keyof typeof DARK_PALETTE;
export type LayerColor = keyof typeof LAYER_COLORS;
export type DefaultColor = keyof typeof DEFAULT_COLORS;

import type { LayoutManifest } from '@/types/schema';
import { DARK_PALETTE } from '@/constants/themeDefaults';

/**
 * Generate a dark mode variant of a LayoutManifest
 */
export function generateDarkMode(manifest: LayoutManifest): LayoutManifest {
  if (!manifest.designSystem?.colors) return manifest;

  const colors = manifest.designSystem.colors;

  const darkColors = {
    ...colors,
    background: DARK_PALETTE.background,
    surface: DARK_PALETTE.surface,
    text: DARK_PALETTE.text,
    textMuted: DARK_PALETTE.textMuted,
    border: DARK_PALETTE.border,
  };

  return {
    ...manifest,
    designSystem: {
      ...manifest.designSystem,
      colors: darkColors,
    },
  };
}

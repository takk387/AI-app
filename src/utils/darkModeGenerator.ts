import type { LayoutManifest } from '@/types/schema';

/**
 * Generate a dark mode variant of a LayoutManifest
 */
export function generateDarkMode(manifest: LayoutManifest): LayoutManifest {
  if (!manifest.designSystem?.colors) return manifest;

  const colors = manifest.designSystem.colors;

  const darkColors = {
    ...colors,
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f8fafc',
    textMuted: '#94a3b8',
    border: '#334155',
  };

  return {
    ...manifest,
    designSystem: {
      ...manifest.designSystem,
      colors: darkColors,
    },
  };
}

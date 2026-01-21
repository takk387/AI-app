/**
 * Figma Transformer Service
 * Converts Figma extraction data to LayoutDesign format
 */

import type {
  FigmaExtraction,
  FigmaExtractedColor,
  FigmaExtractedTypography,
  FigmaExtractedSpacing,
  FigmaExtractedEffect,
  FigmaExtractedComponent,
  FigmaAPIFile,
  FigmaAPINode,
  FigmaUrlParseResult,
} from '@/types/figma';
import type {
  LayoutDesign,
  ColorSettings,
  TypographySettings,
  SpacingSettings,
  EffectsSettings,
} from '@/types/layoutDesign';

// ============================================================================
// URL PARSING
// ============================================================================

/**
 * Parse a Figma URL to extract file key and node ID
 */
export function parseFigmaUrl(url: string): FigmaUrlParseResult | null {
  try {
    const urlObj = new URL(url);

    // Match patterns:
    // https://www.figma.com/file/{fileKey}/{fileName}
    // https://www.figma.com/design/{fileKey}/{fileName}
    // https://www.figma.com/file/{fileKey}/{fileName}?node-id={nodeId}

    const pathMatch = urlObj.pathname.match(/^\/(file|design)\/([a-zA-Z0-9]+)(?:\/([^/?]+))?/);

    if (!pathMatch) return null;

    const fileKey = pathMatch[2];
    const fileName = pathMatch[3] ? decodeURIComponent(pathMatch[3]) : undefined;
    const nodeId = urlObj.searchParams.get('node-id') || undefined;

    return { fileKey, nodeId, fileName };
  } catch {
    return null;
  }
}

// ============================================================================
// COLOR TRANSFORMATION
// ============================================================================

function inferColorRoles(colors: FigmaExtractedColor[]): ColorSettings {
  // Separate by usage
  const fillColors = colors.filter((c) => c.usage === 'fill');
  const textColors = colors.filter((c) => c.usage === 'text');
  const bgColors = colors.filter((c) => c.usage === 'background');
  const strokeColors = colors.filter((c) => c.usage === 'stroke');

  const getMostFrequent = (arr: FigmaExtractedColor[], fallback: string): string => {
    return arr.length > 0 ? arr[0].hex : fallback;
  };

  const isLight = (hex: string): boolean => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  };

  const background = getMostFrequent(bgColors, '#FFFFFF');
  const text = getMostFrequent(textColors, isLight(background) ? '#000000' : '#FFFFFF');

  // Primary is the most frequent saturated fill color
  const saturatedFills = fillColors.filter((c) => {
    const { r, g, b } = c.rgba;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;
    return saturation > 0.2;
  });

  const primary = getMostFrequent(saturatedFills, '#6B7280');
  const secondary =
    saturatedFills.length > 1 ? saturatedFills[1].hex : getMostFrequent(fillColors, '#9CA3AF');
  const accent = saturatedFills.length > 2 ? saturatedFills[2].hex : primary;
  const border = getMostFrequent(strokeColors, '#E5E7EB');
  const surface =
    bgColors.length > 1 ? bgColors[1].hex : isLight(background) ? '#F9FAFB' : '#1F2937';
  const textMuted = isLight(background) ? '#6B7280' : '#9CA3AF';

  return {
    primary,
    secondary,
    accent,
    background,
    surface,
    text,
    textMuted,
    border,
    success: '#6B7280', // Neutral gray - actual colors from Figma design
    warning: '#6B7280',
    error: '#6B7280',
    info: '#6B7280',
  };
}

// ============================================================================
// TYPOGRAPHY TRANSFORMATION
// ============================================================================

function inferTypographySettings(typography: FigmaExtractedTypography[]): TypographySettings {
  // Get most common font
  const fontCounts = new Map<string, number>();
  for (const t of typography) {
    const count = fontCounts.get(t.fontFamily) || 0;
    fontCounts.set(t.fontFamily, count + t.frequency);
  }

  const sortedFonts = Array.from(fontCounts.entries()).sort((a, b) => b[1] - a[1]);
  const primaryFont = sortedFonts.length > 0 ? sortedFonts[0][0] : 'Inter';

  const headings = typography.filter((t) => t.usage === 'heading');
  const bodies = typography.filter((t) => t.usage === 'body');

  const headingFont = headings.length > 0 ? headings[0].fontFamily : primaryFont;

  // Heading weight
  const avgHeadingWeight =
    headings.length > 0
      ? headings.reduce((sum, h) => sum + h.fontWeight, 0) / headings.length
      : 600;

  const headingWeight: TypographySettings['headingWeight'] =
    avgHeadingWeight >= 700
      ? 'bold'
      : avgHeadingWeight >= 600
        ? 'semibold'
        : avgHeadingWeight >= 500
          ? 'medium'
          : 'normal';

  // Body weight
  const avgBodyWeight =
    bodies.length > 0 ? bodies.reduce((sum, b) => sum + b.fontWeight, 0) / bodies.length : 400;

  const bodyWeight: TypographySettings['bodyWeight'] =
    avgBodyWeight >= 500 ? 'medium' : avgBodyWeight >= 400 ? 'normal' : 'light';

  // Heading size
  const maxHeadingSize = headings.length > 0 ? Math.max(...headings.map((h) => h.fontSize)) : 32;

  const headingSize: TypographySettings['headingSize'] =
    maxHeadingSize >= 48
      ? 'xl'
      : maxHeadingSize >= 36
        ? 'lg'
        : maxHeadingSize >= 24
          ? 'base'
          : 'sm';

  // Body size
  const avgBodySize =
    bodies.length > 0 ? bodies.reduce((sum, b) => sum + b.fontSize, 0) / bodies.length : 16;

  const bodySize: TypographySettings['bodySize'] =
    avgBodySize <= 12 ? 'xs' : avgBodySize <= 14 ? 'sm' : 'base';

  // Line height
  const lineHeights = typography
    .filter((t) => typeof t.lineHeight === 'number')
    .map((t) => (t.lineHeight as number) / t.fontSize);

  const avgLineHeight =
    lineHeights.length > 0 ? lineHeights.reduce((a, b) => a + b, 0) / lineHeights.length : 1.5;

  const lineHeight: TypographySettings['lineHeight'] =
    avgLineHeight <= 1.3 ? 'tight' : avgLineHeight >= 1.7 ? 'relaxed' : 'normal';

  // Letter spacing
  const letterSpacings = typography.map((t) => t.letterSpacing / t.fontSize);
  const avgLetterSpacing =
    letterSpacings.length > 0
      ? letterSpacings.reduce((a, b) => a + b, 0) / letterSpacings.length
      : 0;

  const letterSpacing: TypographySettings['letterSpacing'] =
    avgLetterSpacing < -0.01 ? 'tight' : avgLetterSpacing > 0.01 ? 'wide' : 'normal';

  return {
    fontFamily: primaryFont,
    headingFont,
    headingWeight,
    bodyWeight,
    headingSize,
    bodySize,
    lineHeight,
    letterSpacing,
  };
}

// ============================================================================
// SPACING TRANSFORMATION
// ============================================================================

function inferSpacingSettings(spacing: FigmaExtractedSpacing): SpacingSettings {
  const density: SpacingSettings['density'] =
    spacing.itemSpacing <= 8 ? 'compact' : spacing.itemSpacing >= 24 ? 'relaxed' : 'normal';

  const avgPadding =
    (spacing.paddingTop + spacing.paddingRight + spacing.paddingBottom + spacing.paddingLeft) / 4;

  const sectionPadding: SpacingSettings['sectionPadding'] =
    avgPadding <= 8 ? 'sm' : avgPadding <= 16 ? 'md' : avgPadding <= 32 ? 'lg' : 'xl';

  const componentGap: SpacingSettings['componentGap'] =
    spacing.itemSpacing <= 8 ? 'sm' : spacing.itemSpacing >= 24 ? 'lg' : 'md';

  return {
    density,
    containerWidth: 'standard',
    sectionPadding,
    componentGap,
  };
}

// ============================================================================
// EFFECTS TRANSFORMATION
// ============================================================================

function inferEffectsSettings(
  effects: FigmaExtractedEffect[],
  cornerRadius: number
): EffectsSettings {
  const borderRadius: EffectsSettings['borderRadius'] =
    cornerRadius <= 0
      ? 'none'
      : cornerRadius <= 4
        ? 'sm'
        : cornerRadius <= 8
          ? 'md'
          : cornerRadius <= 12
            ? 'lg'
            : cornerRadius <= 24
              ? 'xl'
              : 'full';

  const shadowEffects = effects.filter(
    (e) => e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW'
  );
  const maxShadowRadius =
    shadowEffects.length > 0 ? Math.max(...shadowEffects.map((e) => e.radius)) : 0;

  const shadows: EffectsSettings['shadows'] =
    maxShadowRadius <= 0
      ? 'none'
      : maxShadowRadius <= 4
        ? 'subtle'
        : maxShadowRadius <= 16
          ? 'medium'
          : 'strong';

  const blurEffects = effects.filter(
    (e) => e.type === 'LAYER_BLUR' || e.type === 'BACKGROUND_BLUR'
  );
  const maxBlurRadius = blurEffects.length > 0 ? Math.max(...blurEffects.map((e) => e.radius)) : 0;

  const blur: EffectsSettings['blur'] =
    maxBlurRadius <= 0
      ? 'none'
      : maxBlurRadius <= 8
        ? 'subtle'
        : maxBlurRadius <= 20
          ? 'medium'
          : 'strong';

  return {
    borderRadius,
    shadows,
    blur,
    animations: 'subtle',
    gradients: false,
  };
}

// ============================================================================
// LAYOUT STRUCTURE TRANSFORMATION
// ============================================================================

function inferLayoutStructure(components: FigmaExtractedComponent[]): {
  type: 'single-page' | 'multi-page' | 'dashboard';
  hasHeader: boolean;
  hasSidebar: boolean;
  hasFooter: boolean;
  sidebarPosition: 'left' | 'right';
  contentLayout: 'centered' | 'full-width';
  mainContentWidth: 'narrow' | 'standard' | 'wide' | 'full';
} {
  const flatComponents = flattenComponents(components);

  const hasHeader = flatComponents.some((c) => c.type === 'header');
  const hasSidebar = flatComponents.some((c) => c.type === 'sidebar');
  const hasFooter = flatComponents.some((c) => c.type === 'footer');

  const sidebar = flatComponents.find((c) => c.type === 'sidebar');
  const sidebarPosition: 'left' | 'right' = sidebar && sidebar.bounds.x > 200 ? 'right' : 'left';

  let type: 'single-page' | 'multi-page' | 'dashboard' = 'single-page';
  if (hasSidebar) {
    type = 'dashboard';
  } else if (flatComponents.filter((c) => c.type === 'navigation').length > 1) {
    type = 'multi-page';
  }

  return {
    type,
    hasHeader,
    hasSidebar,
    hasFooter,
    sidebarPosition,
    contentLayout: hasSidebar ? 'full-width' : 'centered',
    mainContentWidth: hasSidebar ? 'full' : 'standard',
  };
}

function flattenComponents(components: FigmaExtractedComponent[]): FigmaExtractedComponent[] {
  const result: FigmaExtractedComponent[] = [];

  function flatten(comp: FigmaExtractedComponent): void {
    result.push(comp);
    for (const child of comp.children) {
      flatten(child);
    }
  }

  for (const comp of components) {
    flatten(comp);
  }

  return result;
}

// ============================================================================
// MAIN TRANSFORMER
// ============================================================================

/**
 * Transform Figma extraction data to LayoutDesign
 */
export function transformFigmaToLayoutDesign(extraction: FigmaExtraction): Partial<LayoutDesign> {
  const colors = inferColorRoles(extraction.colors);
  const typography = inferTypographySettings(extraction.typography);
  const spacing = inferSpacingSettings(extraction.spacing);
  const effects = inferEffectsSettings(extraction.effects, extraction.cornerRadius);
  const structure = inferLayoutStructure(extraction.components);

  // Determine responsive breakpoints based on frame size
  const mobileBreakpoint = 640;
  const tabletBreakpoint = extraction.frameSize.width > 1200 ? 1024 : 768;

  return {
    name: extraction.selectionName || extraction.documentName || 'Figma Import',
    basePreferences: {
      style: 'modern',
      colorScheme: isLightBackground(colors.background) ? 'light' : 'dark',
      layout: structure.type === 'dashboard' ? 'dashboard' : 'single-page',
    },
    globalStyles: {
      typography,
      colors,
      spacing,
      effects,
    },
    structure: {
      type: structure.type,
      hasHeader: structure.hasHeader,
      hasSidebar: structure.hasSidebar,
      hasFooter: structure.hasFooter,
      sidebarPosition: structure.sidebarPosition,
      headerType: 'sticky' as const,
      contentLayout: structure.contentLayout,
      mainContentWidth: structure.mainContentWidth,
    },
    responsive: {
      mobileBreakpoint,
      tabletBreakpoint,
      mobileLayout: 'stack' as const,
      mobileHeader: 'hamburger' as const,
      hideSidebarOnMobile: true,
      stackCardsOnMobile: true,
    },
    components: {
      header: {
        visible: structure.hasHeader,
        height: 'standard' as const,
        style: 'solid' as const,
        logoPosition: 'left' as const,
        navPosition: 'right' as const,
        hasSearch: false,
        hasCTA: true,
        ctaText: 'Get Started',
        ctaStyle: 'filled' as const,
      },
      sidebar: {
        visible: structure.hasSidebar,
        position: structure.sidebarPosition,
        width: 'standard' as const,
        collapsible: true,
        defaultCollapsed: false,
        style: 'standard' as const,
        iconOnly: false,
        hasLogo: false,
      },
      footer: {
        visible: structure.hasFooter,
        style: 'standard' as const,
        columns: 4 as const,
        showSocial: true,
        showNewsletter: false,
        showCopyright: true,
        position: 'static' as const,
      },
    },
  };
}

function isLightBackground(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

// ============================================================================
// FIGMA API TRANSFORMER (for URL import)
// ============================================================================

/**
 * Transform Figma API file response to FigmaExtraction format
 */
export function transformFigmaAPIToExtraction(
  file: FigmaAPIFile,
  nodeId?: string
): FigmaExtraction {
  // Find target node (or use entire document)
  const targetNode = nodeId ? findNodeById(file.document, nodeId) : file.document.children[0];

  if (!targetNode) {
    throw new Error('Could not find target node in Figma file');
  }

  const colors = extractColorsFromAPI(targetNode);
  const typography = extractTypographyFromAPI(targetNode);
  const spacing = extractSpacingFromAPI(targetNode);
  const effects = extractEffectsFromAPI(targetNode);
  const components = extractComponentsFromAPI(targetNode);
  const cornerRadius = extractCornerRadiusFromAPI(targetNode);

  return {
    documentName: file.name,
    pageName: file.document.name,
    selectionName: targetNode.name,
    colors,
    typography,
    spacing,
    effects,
    components,
    cornerRadius,
    frameSize: {
      width: targetNode.absoluteBoundingBox?.width || 1440,
      height: targetNode.absoluteBoundingBox?.height || 900,
    },
  };
}

function findNodeById(node: FigmaAPINode, id: string): FigmaAPINode | null {
  if (node.id === id) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }
  return null;
}

function extractColorsFromAPI(node: FigmaAPINode): FigmaExtractedColor[] {
  const colorMap = new Map<string, FigmaExtractedColor>();

  function processNode(n: FigmaAPINode): void {
    // Extract fills
    if (n.fills) {
      for (const fill of n.fills) {
        if (fill.type === 'SOLID' && fill.visible !== false && fill.color) {
          const hex = rgbaToHex(fill.color.r, fill.color.g, fill.color.b);
          const key = `${hex}-fill`;
          const existing = colorMap.get(key);
          if (existing) {
            existing.frequency++;
          } else {
            colorMap.set(key, {
              hex,
              rgba: fill.color,
              usage: n.type === 'TEXT' ? 'text' : 'fill',
              frequency: 1,
            });
          }
        }
      }
    }

    // Recurse
    if (n.children) {
      for (const child of n.children) {
        processNode(child);
      }
    }
  }

  processNode(node);

  return Array.from(colorMap.values()).sort((a, b) => b.frequency - a.frequency);
}

function extractTypographyFromAPI(node: FigmaAPINode): FigmaExtractedTypography[] {
  const typographyMap = new Map<string, FigmaExtractedTypography>();

  function processNode(n: FigmaAPINode): void {
    if (n.type === 'TEXT' && n.style) {
      const { fontFamily, fontWeight, fontSize, lineHeightPx, letterSpacing } = n.style;
      const key = `${fontFamily}-${fontWeight}-${fontSize}`;

      const existing = typographyMap.get(key);
      if (existing) {
        existing.frequency++;
      } else {
        typographyMap.set(key, {
          fontFamily,
          fontWeight,
          fontSize,
          lineHeight: lineHeightPx || 'auto',
          letterSpacing: letterSpacing || 0,
          usage:
            fontSize >= 24 || fontWeight >= 600 ? 'heading' : fontSize <= 12 ? 'caption' : 'body',
          frequency: 1,
        });
      }
    }

    if (n.children) {
      for (const child of n.children) {
        processNode(child);
      }
    }
  }

  processNode(node);

  return Array.from(typographyMap.values()).sort((a, b) => b.frequency - a.frequency);
}

function extractSpacingFromAPI(node: FigmaAPINode): FigmaExtractedSpacing {
  return {
    itemSpacing: node.itemSpacing || 16,
    paddingTop: node.paddingTop || 16,
    paddingRight: node.paddingRight || 16,
    paddingBottom: node.paddingBottom || 16,
    paddingLeft: node.paddingLeft || 16,
    layoutMode: node.layoutMode || 'NONE',
  };
}

function extractEffectsFromAPI(node: FigmaAPINode): FigmaExtractedEffect[] {
  const effects: FigmaExtractedEffect[] = [];

  function processNode(n: FigmaAPINode): void {
    if (n.effects) {
      for (const effect of n.effects) {
        if (effect.visible !== false) {
          effects.push({
            type: effect.type,
            radius: effect.radius,
            color: effect.color,
            offset: effect.offset,
            spread: effect.spread,
          });
        }
      }
    }

    if (n.children) {
      for (const child of n.children) {
        processNode(child);
      }
    }
  }

  processNode(node);

  return effects;
}

function extractComponentsFromAPI(node: FigmaAPINode): FigmaExtractedComponent[] {
  function processNode(n: FigmaAPINode, depth: number = 0): FigmaExtractedComponent {
    const name = n.name.toLowerCase();
    let type: FigmaExtractedComponent['type'] = 'unknown';

    if (name.includes('header') || name.includes('navbar')) type = 'header';
    else if (name.includes('sidebar') || name.includes('sidenav')) type = 'sidebar';
    else if (name.includes('footer')) type = 'footer';
    else if (name.includes('hero') || name.includes('banner')) type = 'hero';
    else if (name.includes('card') || name.includes('tile')) type = 'card';
    else if (name.includes('nav') || name.includes('menu')) type = 'navigation';
    else if (name.includes('list') || name.includes('table')) type = 'list';

    const children: FigmaExtractedComponent[] = [];
    if (n.children && depth < 3) {
      for (const child of n.children) {
        children.push(processNode(child, depth + 1));
      }
    }

    return {
      id: n.id,
      name: n.name,
      type,
      bounds: n.absoluteBoundingBox || { x: 0, y: 0, width: 0, height: 0 },
      children,
      properties: { nodeType: n.type },
    };
  }

  return [processNode(node)];
}

function extractCornerRadiusFromAPI(node: FigmaAPINode): number {
  const radii: number[] = [];

  function processNode(n: FigmaAPINode): void {
    if (n.cornerRadius && n.cornerRadius > 0) {
      radii.push(n.cornerRadius);
    }
    if (n.children) {
      for (const child of n.children) {
        processNode(child);
      }
    }
  }

  processNode(node);

  if (radii.length === 0) return 8;

  // Return most common
  const counts = new Map<number, number>();
  for (const r of radii) {
    counts.set(r, (counts.get(r) || 0) + 1);
  }

  let maxCount = 0;
  let mostCommon = 8;
  for (const [radius, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = radius;
    }
  }

  return mostCommon;
}

function rgbaToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

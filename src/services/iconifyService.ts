/**
 * Iconify Service
 *
 * Universal icon library access via the Iconify API.
 * Provides search and retrieval for 150,000+ icons from 100+ icon sets.
 *
 * API: https://api.iconify.design/
 * Cost: FREE (no API key required)
 *
 * Popular icon sets:
 * - heroicons: Heroicons by Tailwind Labs
 * - lucide: Lucide icons (fork of Feather)
 * - mdi: Material Design Icons
 * - ri: Remix Icons
 * - ph: Phosphor Icons
 * - tabler: Tabler Icons
 * - carbon: IBM Carbon Icons
 * - fa6-solid/fa6-regular: Font Awesome 6
 */

const ICONIFY_API = 'https://api.iconify.design';

// Popular icon sets with their prefixes
export const ICON_SETS = {
  heroicons: { prefix: 'heroicons', name: 'Heroicons', style: 'outline' },
  'heroicons-solid': { prefix: 'heroicons-solid', name: 'Heroicons Solid', style: 'solid' },
  lucide: { prefix: 'lucide', name: 'Lucide', style: 'outline' },
  mdi: { prefix: 'mdi', name: 'Material Design Icons', style: 'solid' },
  ri: { prefix: 'ri', name: 'Remix Icons', style: 'mixed' },
  ph: { prefix: 'ph', name: 'Phosphor', style: 'outline' },
  'ph-bold': { prefix: 'ph-bold', name: 'Phosphor Bold', style: 'solid' },
  tabler: { prefix: 'tabler', name: 'Tabler Icons', style: 'outline' },
  carbon: { prefix: 'carbon', name: 'Carbon', style: 'outline' },
  'fa6-solid': { prefix: 'fa6-solid', name: 'Font Awesome 6 Solid', style: 'solid' },
  'fa6-regular': { prefix: 'fa6-regular', name: 'Font Awesome 6 Regular', style: 'outline' },
} as const;

export type IconSetId = keyof typeof ICON_SETS;
export type IconStyle = 'outline' | 'solid' | 'duotone' | 'all';

export interface IconSearchResult {
  prefix: string; // Icon set prefix
  name: string; // Icon name within the set
  fullId: string; // Full icon ID (prefix:name)
  title?: string; // Human-readable title
}

export interface IconData {
  svg: string; // SVG markup
  width: number;
  height: number;
  viewBox: string;
}

export interface IconDetails {
  id: string;
  svg: string;
  svgDataUri: string;
  react: string;
  css: {
    backgroundImage: string;
    maskImage: string;
  };
  size: {
    width: number;
    height: number;
  };
}

export interface SearchOptions {
  query: string;
  iconSets?: IconSetId[];
  style?: IconStyle;
  limit?: number;
}

/**
 * Search for icons across icon sets
 */
export async function searchIcons(options: SearchOptions): Promise<IconSearchResult[]> {
  const { query, iconSets, style = 'all', limit = 20 } = options;

  if (!query.trim()) {
    return [];
  }

  // Build prefixes parameter
  let prefixes: string[] = [];
  if (iconSets && iconSets.length > 0) {
    prefixes = iconSets.map((id) => ICON_SETS[id]?.prefix).filter(Boolean) as string[];
  } else {
    // Default to popular sets
    prefixes = ['heroicons', 'lucide', 'mdi', 'tabler', 'ph'];
  }

  // Filter by style if specified
  if (style !== 'all') {
    prefixes = prefixes.filter((prefix) => {
      const setInfo = Object.values(ICON_SETS).find((s) => s.prefix === prefix);
      if (!setInfo) return true;
      if (style === 'outline') return setInfo.style === 'outline' || setInfo.style === 'mixed';
      if (style === 'solid') return setInfo.style === 'solid' || setInfo.style === 'mixed';
      return true;
    });
  }

  const results: IconSearchResult[] = [];

  // Search each prefix
  for (const prefix of prefixes) {
    try {
      const url = `${ICONIFY_API}/search?query=${encodeURIComponent(query)}&prefix=${prefix}&limit=${Math.ceil(limit / prefixes.length)}`;
      const response = await fetch(url);

      if (!response.ok) continue;

      const data = await response.json();

      if (data.icons && Array.isArray(data.icons)) {
        for (const iconId of data.icons) {
          const [iconPrefix, iconName] = iconId.includes(':')
            ? iconId.split(':')
            : [prefix, iconId];
          results.push({
            prefix: iconPrefix,
            name: iconName,
            fullId: `${iconPrefix}:${iconName}`,
            title: iconName.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
          });
        }
      }
    } catch (error) {
      console.warn(`Error searching ${prefix}:`, error);
    }

    // Avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return results.slice(0, limit);
}

/**
 * Get SVG data for a specific icon
 */
export async function getIcon(
  iconId: string,
  options: {
    size?: number;
    color?: string;
    strokeWidth?: number;
  } = {}
): Promise<IconDetails | null> {
  const { size = 24, color, strokeWidth } = options;

  // Parse icon ID
  const [prefix, name] = iconId.includes(':') ? iconId.split(':') : ['', iconId];
  if (!prefix || !name) {
    console.error(`Invalid icon ID: ${iconId}`);
    return null;
  }

  try {
    // Get SVG from Iconify API
    let url = `${ICONIFY_API}/${prefix}/${name}.svg?height=${size}`;
    if (color) {
      url += `&color=${encodeURIComponent(color)}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch icon: ${iconId}`);
      return null;
    }

    let svg = await response.text();

    // Apply stroke width if specified (for outline icons)
    if (strokeWidth && svg.includes('stroke-width')) {
      svg = svg.replace(/stroke-width="[^"]*"/g, `stroke-width="${strokeWidth}"`);
    }

    // Parse viewBox
    const viewBoxMatch = svg.match(/viewBox="([^"]*)"/);
    const _viewBox = viewBoxMatch ? viewBoxMatch[1] : `0 0 ${size} ${size}`;

    // Generate data URI
    const svgBase64 = Buffer.from(svg).toString('base64');
    const svgDataUri = `data:image/svg+xml;base64,${svgBase64}`;

    // Generate React component code
    const reactComponent = generateReactComponent(iconId, svg, size);

    // Generate CSS usage
    const cssBackgroundImage = `url("${svgDataUri}")`;
    const cssMaskImage = `url("${svgDataUri}")`;

    return {
      id: iconId,
      svg,
      svgDataUri,
      react: reactComponent,
      css: {
        backgroundImage: cssBackgroundImage,
        maskImage: cssMaskImage,
      },
      size: {
        width: size,
        height: size,
      },
    };
  } catch (error) {
    console.error(`Error fetching icon ${iconId}:`, error);
    return null;
  }
}

/**
 * Generate a React component from SVG
 */
function generateReactComponent(iconId: string, svg: string, size: number): string {
  // Convert icon ID to component name
  const [, name] = iconId.split(':');
  const componentName =
    name
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('') + 'Icon';

  // Clean SVG for React
  const reactSvg = svg
    .replace(/class=/g, 'className=')
    .replace(/stroke-width=/g, 'strokeWidth=')
    .replace(/stroke-linecap=/g, 'strokeLinecap=')
    .replace(/stroke-linejoin=/g, 'strokeLinejoin=')
    .replace(/fill-rule=/g, 'fillRule=')
    .replace(/clip-rule=/g, 'clipRule=')
    .replace(/xmlns:xlink/g, 'xmlnsXlink');

  return `
interface ${componentName}Props {
  size?: number;
  color?: string;
  className?: string;
}

export function ${componentName}({ size = ${size}, color = "currentColor", className }: ${componentName}Props) {
  return (
    ${reactSvg
      .replace(/width="[^"]*"/, 'width={size}')
      .replace(/height="[^"]*"/, 'height={size}')
      .replace(/fill="[^"]*"/g, 'fill={color}')
      .replace(/stroke="[^"]*"/g, 'stroke={color}')}
  );
}
`.trim();
}

/**
 * Get popular/suggested icons for common use cases
 */
export function getSuggestedIcons(category: string): string[] {
  const suggestions: Record<string, string[]> = {
    navigation: [
      'heroicons:home',
      'heroicons:menu-2',
      'heroicons:x-mark',
      'heroicons:chevron-down',
      'heroicons:arrow-left',
      'heroicons:arrow-right',
    ],
    actions: [
      'heroicons:plus',
      'heroicons:pencil',
      'heroicons:trash',
      'heroicons:check',
      'heroicons:x-mark',
      'heroicons:arrow-path',
    ],
    social: [
      'mdi:twitter',
      'mdi:facebook',
      'mdi:instagram',
      'mdi:linkedin',
      'mdi:github',
      'mdi:youtube',
    ],
    ecommerce: [
      'heroicons:shopping-cart',
      'heroicons:shopping-bag',
      'heroicons:credit-card',
      'heroicons:receipt-percent',
      'heroicons:truck',
      'heroicons:gift',
    ],
    user: [
      'heroicons:user',
      'heroicons:user-circle',
      'heroicons:users',
      'heroicons:user-plus',
      'heroicons:cog-6-tooth',
      'heroicons:bell',
    ],
    media: [
      'heroicons:photo',
      'heroicons:camera',
      'heroicons:video-camera',
      'heroicons:microphone',
      'heroicons:play',
      'heroicons:pause',
    ],
    communication: [
      'heroicons:envelope',
      'heroicons:chat-bubble-left',
      'heroicons:phone',
      'heroicons:paper-airplane',
      'heroicons:at-symbol',
      'heroicons:share',
    ],
    files: [
      'heroicons:document',
      'heroicons:folder',
      'heroicons:cloud-arrow-up',
      'heroicons:cloud-arrow-down',
      'heroicons:clipboard',
      'heroicons:link',
    ],
  };

  return suggestions[category] || suggestions.navigation;
}

/**
 * Get all available icon sets
 */
export function getIconSets(): Array<{ id: IconSetId; name: string; style: string }> {
  return Object.entries(ICON_SETS).map(([id, info]) => ({
    id: id as IconSetId,
    name: info.name,
    style: info.style,
  }));
}

/**
 * Generate inline SVG string for direct embedding
 */
export function getInlineSvg(svg: string, color?: string): string {
  if (color) {
    return svg
      .replace(/fill="[^"]*"/g, `fill="${color}"`)
      .replace(/stroke="[^"]*"/g, `stroke="${color}"`);
  }
  return svg;
}

const iconifyService = {
  searchIcons,
  getIcon,
  getSuggestedIcons,
  getIconSets,
  getInlineSvg,
  ICON_SETS,
};
export default iconifyService;

'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { UIPreferences, AppConcept, Feature } from '../types/appConcept';
import type {
  HeaderDesign,
  CardDesign,
  SidebarDesign,
  NavigationDesign,
  EffectsSettings,
  ColorSettings,
  LayoutStructure,
  DetectedComponentEnhanced,
} from '../types/layoutDesign';
import { generateMockContent } from '../utils/mockContentGenerator';
import { DragDropCanvas, useSectionOrder, type LayoutSection } from './layout/DragDropCanvas';
import { imageAssets, getFallbackImage } from '../utils/imageAssets';
import { imageCache } from '../utils/imageCache';
import { ViewOptionsMenu } from './layout-builder/ViewOptionsMenu';
import { ColorPickerMenu } from './layout-builder/ColorPickerMenu';
import { DynamicLayoutRenderer } from './layout-builder/DynamicLayoutRenderer';

// ============================================================================
// Image Generation Types
// ============================================================================

interface GeneratedImages {
  hero?: string;
  cards: string[];
  background?: string;
}

interface ImageGenerationState {
  isGenerating: boolean;
  progress: number;
  error?: string;
}

type ViewMode = 'mobile' | 'tablet' | 'desktop';

/** Default primary color used throughout the app - neutral gray to avoid color contamination */
const DEFAULT_PRIMARY_COLOR = '#6B7280';

/** Current year for copyright - extracted to avoid creating Date on every render */
const CURRENT_YEAR = new Date().getFullYear();

/** Default status colors for semantic states - neutral gray to avoid color contamination */
const DEFAULT_STATUS_COLORS = {
  success: '#6B7280',
  warning: '#6B7280',
  error: '#6B7280',
  info: '#6B7280',
} as const;

/** Status type for list items and badges */
type StatusType = 'success' | 'warning' | 'error' | 'info' | 'default';

/**
 * Get status color from color settings or use defaults
 */
function getStatusColor(status: StatusType, colorSettings?: Partial<ColorSettings>): string {
  switch (status) {
    case 'success':
      return colorSettings?.success || DEFAULT_STATUS_COLORS.success;
    case 'warning':
      return colorSettings?.warning || DEFAULT_STATUS_COLORS.warning;
    case 'error':
      return colorSettings?.error || DEFAULT_STATUS_COLORS.error;
    case 'info':
      return colorSettings?.info || DEFAULT_STATUS_COLORS.info;
    default:
      return colorSettings?.primary || DEFAULT_PRIMARY_COLOR;
  }
}

/**
 * Map status string to StatusType
 * FIXED: Added null safety to prevent crash when status is undefined
 */
function mapStatusToType(status: string | undefined): StatusType {
  // Return default if status is missing or invalid
  if (!status || typeof status !== 'string') {
    return 'default';
  }

  const normalizedStatus = status.toLowerCase();
  if (
    normalizedStatus.includes('success') ||
    normalizedStatus.includes('complete') ||
    normalizedStatus.includes('active')
  ) {
    return 'success';
  }
  if (
    normalizedStatus.includes('warning') ||
    normalizedStatus.includes('pending') ||
    normalizedStatus.includes('review')
  ) {
    return 'warning';
  }
  if (
    normalizedStatus.includes('error') ||
    normalizedStatus.includes('fail') ||
    normalizedStatus.includes('rejected')
  ) {
    return 'error';
  }
  if (
    normalizedStatus.includes('info') ||
    normalizedStatus.includes('draft') ||
    normalizedStatus.includes('new')
  ) {
    return 'info';
  }
  return 'default';
}

/**
 * Component design props for customization
 */
interface ComponentDesignProps {
  headerDesign?: Partial<HeaderDesign>;
  sidebarDesign?: Partial<SidebarDesign>;
  cardDesign?: Partial<CardDesign>;
  navDesign?: Partial<NavigationDesign>;
  effectsSettings?: Partial<EffectsSettings>;
  colorSettings?: Partial<ColorSettings>;
  structure?: Partial<LayoutStructure>;
  /** Full detected components array from Gemini for dynamic layout rendering */
  detectedComponents?: DetectedComponentEnhanced[];
}

/**
 * Props for LayoutPreview component
 */
interface LayoutPreviewProps {
  preferences: UIPreferences;
  concept?: Partial<AppConcept>;
  className?: string;
  onPreferenceChange?: (prefs: Partial<UIPreferences>) => void;
  onElementSelect?: (elementId: string | null) => void;
  selectedElement?: string | null;
  componentDesign?: ComponentDesignProps;
  /** Enable drag-and-drop section reordering */
  enableDragDrop?: boolean;
  /** Current section order (controlled) */
  sectionOrder?: LayoutSection[];
  /** Callback when sections are reordered */
  onSectionOrderChange?: (sections: LayoutSection[]) => void;
  /** Show 12-column grid overlay for alignment */
  showGridOverlay?: boolean;
  /** Callback when grid overlay is toggled */
  onGridOverlayToggle?: (show: boolean) => void;
}

/**
 * Breakpoint configuration with detailed info
 */
interface BreakpointInfo {
  width: string;
  height: string;
  numericWidth: number;
  label: string;
  description: string;
  layoutMode: 'mobile' | 'tablet' | 'desktop';
}

const BREAKPOINTS: Record<ViewMode, BreakpointInfo> = {
  mobile: {
    width: '375px',
    height: '667px',
    numericWidth: 375,
    label: 'Mobile',
    description: 'iPhone SE / Small phones',
    layoutMode: 'mobile',
  },
  tablet: {
    width: '768px',
    height: '1024px',
    numericWidth: 768,
    label: 'Tablet',
    description: 'iPad / Tablets',
    layoutMode: 'tablet',
  },
  desktop: {
    width: '100%',
    height: '100%',
    numericWidth: 1200,
    label: 'Desktop',
    description: 'Large screens',
    layoutMode: 'desktop',
  },
};

/**
 * Animation demo configuration - sequence of elements to animate
 */
const ANIMATION_DEMO_SEQUENCE = ['header', 'hero', 'stats', 'cards', 'list', 'footer'] as const;

/** Duration for each element highlight in ms */
const ANIMATION_DEMO_DURATION = 800;

/**
 * Get device frame dimensions
 */
function getDeviceDimensions(mode: ViewMode): { width: string; height: string } {
  const breakpoint = BREAKPOINTS[mode];
  return { width: breakpoint.width, height: breakpoint.height };
}

/**
 * Style presets based on UI style preference
 */
const stylePresets = {
  modern: {
    borderRadius: '0.75rem',
    cardShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    buttonStyle: 'rounded-xl font-medium',
    fontWeight: 'font-medium',
    spacing: 'gap-4',
  },
  minimalist: {
    borderRadius: '0.25rem',
    cardShadow: 'none',
    buttonStyle: 'rounded font-normal',
    fontWeight: 'font-normal',
    spacing: 'gap-6',
  },
  playful: {
    borderRadius: '1.5rem',
    cardShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    buttonStyle: 'rounded-full font-bold',
    fontWeight: 'font-bold',
    spacing: 'gap-3',
  },
  professional: {
    borderRadius: '0.375rem',
    cardShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    buttonStyle: 'rounded-md font-semibold',
    fontWeight: 'font-semibold',
    spacing: 'gap-5',
  },
  custom: {
    borderRadius: '0.5rem',
    cardShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    buttonStyle: 'rounded-lg font-medium',
    fontWeight: 'font-medium',
    spacing: 'gap-4',
  },
} as const;

/** Type for style preset values */
type StylePreset = (typeof stylePresets)[keyof typeof stylePresets];

/**
 * Color scheme presets
 */
const colorSchemes = {
  light: {
    bg: 'bg-gray-50',
    text: 'text-gray-900',
    textMuted: 'text-gray-600',
    card: 'bg-white',
    border: 'border-gray-200',
    sidebar: 'bg-white',
    header: 'bg-white',
  },
  dark: {
    bg: 'bg-slate-900',
    text: 'text-white',
    textMuted: 'text-slate-400',
    card: 'bg-slate-800',
    border: 'border-slate-700',
    sidebar: 'bg-slate-800',
    header: 'bg-slate-800',
  },
  auto: {
    // Auto mode: uses a balanced theme that works in both light/dark contexts
    bg: 'bg-slate-900',
    text: 'text-slate-100',
    textMuted: 'text-slate-400',
    card: 'bg-slate-800',
    border: 'border-slate-700',
    sidebar: 'bg-slate-850',
    header: 'bg-slate-800',
  },
  custom: {
    // Custom mode: neutral base that works well with custom primary colors
    bg: 'bg-neutral-900',
    text: 'text-neutral-100',
    textMuted: 'text-neutral-400',
    card: 'bg-neutral-800',
    border: 'border-neutral-700',
    sidebar: 'bg-neutral-800',
    header: 'bg-neutral-800',
  },
} as const;

/** Type for color scheme values */
type ColorScheme = (typeof colorSchemes)[keyof typeof colorSchemes];

/**
 * Card hover effect classes based on CardDesign.hoverEffect
 */
const cardHoverEffects = {
  none: '',
  lift: 'hover:-translate-y-1 hover:shadow-lg transition-all duration-200',
  glow: 'hover:shadow-[0_0_20px_rgba(46,204,113,0.3)] transition-all duration-200',
  scale: 'hover:scale-[1.02] transition-transform duration-200',
  border: 'hover:border-garden-500 transition-colors duration-200',
} as const;

/**
 * Animation classes based on EffectsSettings.animations
 */
const animationClasses = {
  none: {
    base: '',
    hover: '',
    transition: '',
  },
  subtle: {
    base: 'transition-all duration-150 ease-out',
    hover: 'hover:scale-[1.01]',
    transition: 'transition-opacity duration-150',
  },
  smooth: {
    base: 'transition-all duration-300 ease-in-out',
    hover: 'hover:scale-[1.02]',
    transition: 'transition-all duration-300',
  },
  playful: {
    base: 'transition-all duration-500 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)]',
    hover: 'hover:scale-[1.05] hover:-rotate-1',
    transition: 'transition-all duration-500',
  },
} as const;

/**
 * Get animation class based on animation level
 */
function getAnimationClass(
  animation?: EffectsSettings['animations'],
  type: 'base' | 'hover' | 'transition' = 'base'
): string {
  const level = animation || 'none';
  return animationClasses[level]?.[type] || '';
}

/**
 * Blur intensity classes based on EffectsSettings.blur
 */
const blurClasses = {
  none: '',
  subtle: 'backdrop-blur-sm',
  medium: 'backdrop-blur-md',
  strong: 'backdrop-blur-xl',
} as const;

/**
 * Get blur class based on blur level
 */
function getBlurClass(blur?: EffectsSettings['blur']): string {
  return blurClasses[blur || 'none'] || '';
}

/**
 * Border radius classes based on EffectsSettings.borderRadius
 */
const borderRadiusClasses = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
} as const;

/**
 * Get border radius class
 */
function getBorderRadiusClass(radius?: EffectsSettings['borderRadius']): string {
  return borderRadiusClasses[radius || 'md'] || 'rounded-md';
}

/**
 * Shadow classes based on EffectsSettings.shadows
 */
const shadowClasses = {
  none: 'shadow-none',
  subtle: 'shadow-sm',
  medium: 'shadow-md',
  strong: 'shadow-xl',
} as const;

/**
 * Get shadow class
 */
function getShadowClass(shadow?: EffectsSettings['shadows']): string {
  return shadowClasses[shadow || 'medium'] || 'shadow-md';
}

/**
 * Selectable wrapper component for element selection
 * Includes data attributes for Click + Talk element detection
 */
interface SelectableProps {
  id: string;
  children: React.ReactNode;
  isSelected: boolean;
  onClick: (id: string) => void;
  className?: string;
  style?: React.CSSProperties;
  /** Optional element type override (defaults to inferring from id) */
  elementType?: string;
  /** Optional display label */
  elementLabel?: string;
}

function Selectable({
  id,
  children,
  isSelected,
  onClick,
  className = '',
  style,
  elementType,
  elementLabel,
}: SelectableProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onClick(id);
    }
  };

  // Infer element type from id if not explicitly provided
  const inferredType = elementType || id.replace(/-\d+$/, '').split('-')[0];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onClick(id);
      }}
      onKeyDown={handleKeyDown}
      aria-pressed={isSelected}
      aria-label={`Select ${elementLabel || id} element`}
      data-element-id={id}
      data-element-type={inferredType}
      data-element-label={elementLabel}
      className={`cursor-pointer transition-all ${
        isSelected
          ? 'ring-2 ring-garden-500 ring-offset-2 ring-offset-transparent'
          : 'hover:ring-1 hover:ring-garden-400/50'
      } ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

/**
 * Header component for preview with style variants
 */
interface HeaderProps {
  appName: string;
  navItems: string[];
  colors: ColorScheme;
  style: StylePreset;
  primaryColor?: string;
  onElementSelect?: (id: string | null) => void;
  selectedElement?: string | null;
  headerDesign?: Partial<HeaderDesign>;
  navDesign?: Partial<NavigationDesign>;
  effectsSettings?: Partial<EffectsSettings>;
  colorSettings?: Partial<ColorSettings>;
  isMobile?: boolean;
}

function Header({
  appName,
  navItems,
  colors,
  style,
  primaryColor,
  onElementSelect,
  selectedElement,
  headerDesign,
  navDesign,
  effectsSettings,
  colorSettings,
  isMobile = false,
}: HeaderProps) {
  // Compute inline styles from AI-generated colorSettings (overrides Tailwind classes)
  // NOTE: Use [colorSettings] as dependency to ensure re-render when design changes
  const headerInlineStyle = useMemo(
    () => (colorSettings?.background ? { backgroundColor: colorSettings.background } : undefined),
    [colorSettings]
  );

  const textInlineStyle = useMemo(
    () => (colorSettings?.text ? { color: colorSettings.text } : undefined),
    [colorSettings]
  );

  const mutedTextInlineStyle = useMemo(
    () => (colorSettings?.textMuted ? { color: colorSettings.textMuted } : undefined),
    [colorSettings]
  );
  // Animation classes based on effects settings
  const animBase = getAnimationClass(effectsSettings?.animations, 'base');
  const animHover = getAnimationClass(effectsSettings?.animations, 'hover');
  const handleSelect = (id: string) => {
    onElementSelect?.(selectedElement === id ? null : id);
  };

  // Get header background style with blur and gradient support
  const getHeaderBgStyle = () => {
    const headerStyle = headerDesign?.style || 'solid';
    const blurLevel = effectsSettings?.blur || 'none';
    const useGradients = effectsSettings?.gradients ?? false;

    switch (headerStyle) {
      case 'gradient':
        return useGradients
          ? `bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800`
          : `bg-gradient-to-r from-slate-800 to-slate-700`;
      case 'blur':
        const blurClass = getBlurClass(blurLevel !== 'none' ? blurLevel : 'medium');
        return `${blurClass} bg-slate-800/70`;
      case 'transparent':
        return blurLevel !== 'none'
          ? `${getBlurClass(blurLevel)} bg-transparent`
          : 'bg-transparent';
      case 'solid':
      default:
        return colors.header;
    }
  };

  // Get navigation item style
  const getNavItemStyle = (isActive: boolean) => {
    const itemStyle = navDesign?.itemStyle || 'text';
    const baseStyle = 'text-sm cursor-pointer transition-all';

    if (isActive) {
      return `${baseStyle} text-white`;
    }

    switch (itemStyle) {
      case 'pills':
        return `${baseStyle} px-3 py-1 rounded-full ${colors.textMuted} hover:bg-white/10`;
      case 'underline':
        return `${baseStyle} ${colors.textMuted} border-b-2 border-transparent hover:border-current pb-1`;
      case 'boxed':
        return `${baseStyle} px-3 py-1 border rounded ${colors.border} ${colors.textMuted} hover:border-current`;
      case 'text':
      default:
        return `${baseStyle} ${colors.textMuted} hover:opacity-80`;
    }
  };

  // Get height classes
  const getHeightClass = () => {
    switch (headerDesign?.height) {
      case 'compact':
        return 'py-2';
      case 'tall':
        return 'py-5';
      case 'standard':
      default:
        return 'py-3';
    }
  };

  return (
    <Selectable
      id="header"
      isSelected={selectedElement === 'header'}
      onClick={handleSelect}
      className={`${getHeaderBgStyle()} border-b ${colors.border} px-4 ${getHeightClass()}`}
      style={headerInlineStyle}
    >
      <div className="flex items-center justify-between">
        <div
          className={`${style.fontWeight} ${colors.text} ${isMobile ? 'text-sm' : ''}`}
          style={textInlineStyle}
        >
          {appName || 'App Name'}
        </div>
        {/* Navigation - hidden on mobile */}
        {!isMobile && (
          <nav className="flex items-center gap-4">
            {navItems.slice(0, 4).map((item, index) => (
              <span
                key={`nav-${item}`}
                className={getNavItemStyle(index === 0)}
                style={index !== 0 ? mutedTextInlineStyle : textInlineStyle}
              >
                {item}
              </span>
            ))}
          </nav>
        )}
        <div className="flex items-center gap-2">
          {/* Mobile menu button */}
          {isMobile && (
            <button
              type="button"
              className={`p-2 rounded-lg ${colors.textMuted} hover:opacity-80`}
              style={mutedTextInlineStyle}
              aria-label="Open menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          )}
          {headerDesign?.hasCTA !== false && !isMobile && (
            <button
              type="button"
              className={`px-3 py-1.5 text-sm text-white ${style.buttonStyle} ${animBase} ${animHover}`}
              style={{
                backgroundColor: colorSettings?.primary || primaryColor || DEFAULT_PRIMARY_COLOR,
              }}
            >
              {headerDesign?.ctaText || 'Sign In'}
            </button>
          )}
        </div>
      </div>
    </Selectable>
  );
}

/**
 * Sidebar component for dashboard layout with collapsibility
 */
interface SidebarProps {
  navItems: string[];
  colors: ColorScheme;
  style: StylePreset;
  primaryColor?: string;
  onElementSelect?: (id: string | null) => void;
  selectedElement?: string | null;
  sidebarDesign?: Partial<SidebarDesign>;
  colorSettings?: Partial<ColorSettings>;
}

function Sidebar({
  navItems,
  colors,
  style,
  primaryColor,
  onElementSelect,
  selectedElement,
  sidebarDesign,
  colorSettings,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(sidebarDesign?.defaultCollapsed || false);

  const handleSelect = (id: string) => {
    onElementSelect?.(selectedElement === id ? null : id);
  };

  // Compute inline styles from AI-generated colorSettings (overrides Tailwind classes)
  // Use surface for sidebar background, falling back to secondary
  // NOTE: Use [colorSettings] as dependency to ensure re-render when design changes
  const sidebarInlineStyle = useMemo(
    () =>
      colorSettings?.surface
        ? { backgroundColor: colorSettings.surface }
        : colorSettings?.secondary
          ? { backgroundColor: colorSettings.secondary }
          : undefined,
    [colorSettings]
  );

  const textInlineStyle = useMemo(
    () => (colorSettings?.text ? { color: colorSettings.text } : undefined),
    [colorSettings]
  );

  const mutedTextInlineStyle = useMemo(
    () => (colorSettings?.textMuted ? { color: colorSettings.textMuted } : undefined),
    [colorSettings]
  );

  // Get width based on design settings
  const getWidthClass = () => {
    if (isCollapsed && sidebarDesign?.collapsible) {
      return 'w-16';
    }
    switch (sidebarDesign?.width) {
      case 'narrow':
        return 'w-36';
      case 'wide':
        return 'w-64';
      case 'standard':
      default:
        return 'w-48';
    }
  };

  // Icon placeholder component
  const IconPlaceholder = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  );

  return (
    <Selectable
      id="sidebar"
      isSelected={selectedElement === 'sidebar'}
      onClick={handleSelect}
      className={`${colors.sidebar} border-r ${colors.border} ${getWidthClass()} p-4 flex-shrink-0 transition-all duration-200`}
      style={sidebarInlineStyle}
    >
      <div className={`${style.spacing} flex flex-col`}>
        {/* Collapse toggle button */}
        {sidebarDesign?.collapsible && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(!isCollapsed);
            }}
            className={`mb-4 p-2 rounded-lg ${colors.textMuted} hover:bg-white/10 transition-colors self-end`}
            style={mutedTextInlineStyle}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
          </button>
        )}

        {/* Menu title */}
        {!isCollapsed && (
          <div className={`${style.fontWeight} ${colors.text} mb-4`} style={textInlineStyle}>
            Menu
          </div>
        )}

        {/* Navigation items */}
        {navItems.map((item, index) => (
          <div
            key={`sidebar-${item}`}
            className={`px-3 py-2 rounded-lg text-sm cursor-pointer transition-all flex items-center gap-3 ${
              index === 0 ? 'text-white' : `${colors.textMuted} hover:opacity-80`
            }`}
            style={
              index === 0
                ? {
                    backgroundColor:
                      colorSettings?.primary || primaryColor || DEFAULT_PRIMARY_COLOR,
                  }
                : mutedTextInlineStyle || {}
            }
            title={isCollapsed ? item : undefined}
          >
            {(sidebarDesign?.iconOnly || isCollapsed) && <IconPlaceholder />}
            {!isCollapsed && !sidebarDesign?.iconOnly && item}
          </div>
        ))}
      </div>
    </Selectable>
  );
}

/**
 * Hero section component
 */
interface HeroProps {
  title: string;
  subtitle: string;
  cta: string;
  colors: ColorScheme;
  style: StylePreset;
  primaryColor?: string;
  onElementSelect?: (id: string | null) => void;
  selectedElement?: string | null;
  effectsSettings?: Partial<EffectsSettings>;
  backgroundImage?: string;
  colorSettings?: Partial<ColorSettings>;
}

function Hero({
  title,
  subtitle,
  cta,
  colors,
  style,
  primaryColor,
  onElementSelect,
  selectedElement,
  effectsSettings,
  backgroundImage,
  colorSettings,
}: HeroProps) {
  const handleSelect = (id: string) => {
    onElementSelect?.(selectedElement === id ? null : id);
  };

  const animationBase = getAnimationClass(effectsSettings?.animations, 'base');
  const animationHover = getAnimationClass(effectsSettings?.animations, 'hover');
  const radiusClass = getBorderRadiusClass(effectsSettings?.borderRadius);

  // Compute inline styles from AI-generated colorSettings
  // NOTE: Use [colorSettings] as dependency to ensure re-render when design changes
  const textInlineStyle = useMemo(
    () => (colorSettings?.text ? { color: colorSettings.text } : undefined),
    [colorSettings]
  );

  const mutedTextInlineStyle = useMemo(
    () => (colorSettings?.textMuted ? { color: colorSettings.textMuted } : undefined),
    [colorSettings]
  );

  // Generate background style with image or gradient fallback
  const getHeroBackgroundStyle = (): React.CSSProperties => {
    const color = colorSettings?.primary || primaryColor || DEFAULT_PRIMARY_COLOR;

    if (backgroundImage) {
      return {
        backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url('${backgroundImage}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }

    if (effectsSettings?.gradients) {
      return {
        background: `linear-gradient(135deg, ${color}10 0%, transparent 50%)`,
      };
    }
    return {};
  };

  const hasImage = !!backgroundImage;

  return (
    <Selectable
      id="hero"
      isSelected={selectedElement === 'hero'}
      onClick={handleSelect}
      className={`py-12 px-6 text-center relative ${hasImage ? 'min-h-[200px] flex flex-col justify-center' : ''}`}
      style={getHeroBackgroundStyle()}
    >
      <h1
        className={`text-2xl ${style.fontWeight} ${hasImage ? 'text-white' : colors.text} mb-3 ${animationBase}`}
        style={hasImage ? undefined : textInlineStyle}
      >
        {title}
      </h1>
      <p
        className={`${hasImage ? 'text-white/80' : colors.textMuted} mb-6 max-w-md mx-auto text-sm ${animationBase}`}
        style={hasImage ? undefined : mutedTextInlineStyle}
      >
        {subtitle}
      </p>
      <button
        type="button"
        className={`px-6 py-2.5 text-white ${style.buttonStyle} ${radiusClass} ${animationBase} ${animationHover}`}
        style={{ backgroundColor: colorSettings?.primary || primaryColor || DEFAULT_PRIMARY_COLOR }}
      >
        {cta}
      </button>
    </Selectable>
  );
}

/**
 * Stats row component
 */
interface StatsRowProps {
  stats: Array<{ label: string; value: string }>;
  colors: ColorScheme;
  style: StylePreset;
  onElementSelect?: (id: string | null) => void;
  selectedElement?: string | null;
  effectsSettings?: Partial<EffectsSettings>;
  colorSettings?: Partial<ColorSettings>;
}

function StatsRow({
  stats,
  colors,
  style,
  onElementSelect,
  selectedElement,
  effectsSettings,
  colorSettings,
}: StatsRowProps) {
  const handleSelect = (id: string) => {
    onElementSelect?.(selectedElement === id ? null : id);
  };

  const radiusClass = getBorderRadiusClass(effectsSettings?.borderRadius);
  const shadowClass = getShadowClass(effectsSettings?.shadows);
  const animationBase = getAnimationClass(effectsSettings?.animations, 'base');
  const hoverAnimation = getAnimationClass(effectsSettings?.animations, 'hover');

  // Compute inline styles from AI-generated colorSettings
  // NOTE: Use [colorSettings] as dependency to ensure re-render when design changes
  const cardInlineStyle = useMemo(
    () =>
      colorSettings?.surface
        ? { backgroundColor: colorSettings.surface }
        : colorSettings?.secondary
          ? { backgroundColor: colorSettings.secondary }
          : undefined,
    [colorSettings]
  );

  const textInlineStyle = useMemo(
    () => (colorSettings?.text ? { color: colorSettings.text } : undefined),
    [colorSettings]
  );

  const mutedTextInlineStyle = useMemo(
    () => (colorSettings?.textMuted ? { color: colorSettings.textMuted } : undefined),
    [colorSettings]
  );

  return (
    <Selectable
      id="stats"
      isSelected={selectedElement === 'stats'}
      onClick={handleSelect}
      className="px-4 py-6"
    >
      <div className={`grid grid-cols-2 sm:grid-cols-4 ${style.spacing}`}>
        {stats.slice(0, 4).map((stat) => (
          <div
            key={`stat-${stat.label}`}
            className={`${colors.card} border ${colors.border} p-4 text-center ${radiusClass} ${shadowClass} ${animationBase} ${hoverAnimation}`}
            style={cardInlineStyle}
          >
            <div className={`text-xl ${style.fontWeight} ${colors.text}`} style={textInlineStyle}>
              {stat.value}
            </div>
            <div className={`text-xs ${colors.textMuted} mt-1`} style={mutedTextInlineStyle}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </Selectable>
  );
}

/**
 * Card grid component with hover effects
 */
interface CardGridProps {
  cards: Array<{ title: string; subtitle: string; tag: string }>;
  colors: ColorScheme;
  style: StylePreset;
  primaryColor?: string;
  onElementSelect?: (id: string | null) => void;
  selectedElement?: string | null;
  cardDesign?: Partial<CardDesign>;
  effectsSettings?: Partial<EffectsSettings>;
  cardImages?: string[];
  colorSettings?: Partial<ColorSettings>;
}

function CardGrid({
  cards,
  colors,
  style,
  primaryColor,
  onElementSelect,
  selectedElement,
  cardDesign,
  effectsSettings,
  cardImages = [],
  colorSettings,
}: CardGridProps) {
  const handleSelect = (id: string) => {
    onElementSelect?.(selectedElement === id ? null : id);
  };

  // Compute inline styles from AI-generated colorSettings (overrides Tailwind classes)
  // Use surface for card background, falling back to secondary
  // NOTE: Use [colorSettings] as dependency to ensure re-render when design changes
  const cardInlineStyle = useMemo(
    () =>
      colorSettings?.surface
        ? { backgroundColor: colorSettings.surface }
        : colorSettings?.secondary
          ? { backgroundColor: colorSettings.secondary }
          : undefined,
    [colorSettings]
  );

  const textInlineStyle = useMemo(
    () => (colorSettings?.text ? { color: colorSettings.text } : undefined),
    [colorSettings]
  );

  const mutedTextInlineStyle = useMemo(
    () => (colorSettings?.textMuted ? { color: colorSettings.textMuted } : undefined),
    [colorSettings]
  );

  // Get hover effect class - combine with animation level
  const getHoverEffect = () => {
    const effect = cardDesign?.hoverEffect || 'none';
    const animationHover = getAnimationClass(effectsSettings?.animations, 'hover');
    const hoverEffect = cardHoverEffects[effect] || '';
    return `${hoverEffect} ${animationHover}`.trim();
  };

  // Get card style class with shadow from effects settings
  const getCardStyleClass = () => {
    const cardStyle = cardDesign?.style || 'bordered';
    const shadowClass = getShadowClass(effectsSettings?.shadows);
    switch (cardStyle) {
      case 'minimal':
        return `${colors.card}`;
      case 'elevated':
        return `${colors.card} ${shadowClass}`;
      case 'filled':
        return 'bg-gradient-to-br from-slate-700 to-slate-800';
      case 'bordered':
      default:
        return `${colors.card} border ${colors.border}`;
    }
  };

  // Get border radius from effects settings
  const radiusClass = getBorderRadiusClass(effectsSettings?.borderRadius);
  const animationBase = getAnimationClass(effectsSettings?.animations, 'base');

  return (
    <Selectable
      id="cards"
      isSelected={selectedElement === 'cards'}
      onClick={handleSelect}
      className="px-4 py-6"
    >
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${style.spacing}`}>
        {cards.slice(0, 4).map((card, index) => {
          const cardImage = cardImages[index];
          const hasImage = !!cardImage;

          return (
            <div
              key={`card-${card.title}`}
              className={`${getCardStyleClass()} overflow-hidden ${getHoverEffect()} ${radiusClass} ${animationBase}`}
              style={cardInlineStyle}
            >
              {/* Card Image */}
              {hasImage && (
                <div className="relative h-32 overflow-hidden">
                  <img
                    src={cardImage}
                    alt={card.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to placeholder on error
                      e.currentTarget.src = imageAssets.getPlaceholder(400, 200, {
                        text: card.title,
                      });
                    }}
                  />
                </div>
              )}
              {/* Card Content */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3
                    className={`${style.fontWeight} ${colors.text} text-sm`}
                    style={textInlineStyle}
                  >
                    {card.title}
                  </h3>
                  {cardDesign?.showBadge !== false && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full text-white"
                      style={{
                        backgroundColor:
                          colorSettings?.primary || primaryColor || DEFAULT_PRIMARY_COLOR,
                      }}
                    >
                      {card.tag}
                    </span>
                  )}
                </div>
                <p className={`text-xs ${colors.textMuted}`} style={mutedTextInlineStyle}>
                  {card.subtitle}
                </p>
                {cardDesign?.showFooter && (
                  <div className={`mt-3 pt-3 border-t ${colors.border} flex justify-end`}>
                    <button
                      type="button"
                      className={`text-xs ${colors.textMuted} hover:opacity-80`}
                      style={mutedTextInlineStyle}
                    >
                      View Details
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Selectable>
  );
}

/**
 * List items component with status colors
 */
interface ListItemsProps {
  items: Array<{ title: string; status: string; meta: string }>;
  colors: ColorScheme;
  style: StylePreset;
  onElementSelect?: (id: string | null) => void;
  selectedElement?: string | null;
  effectsSettings?: Partial<EffectsSettings>;
  colorSettings?: Partial<ColorSettings>;
}

function ListItems({
  items,
  colors,
  style: _style,
  onElementSelect,
  selectedElement,
  effectsSettings,
  colorSettings,
}: ListItemsProps) {
  const handleSelect = (id: string) => {
    onElementSelect?.(selectedElement === id ? null : id);
  };

  const radiusClass = getBorderRadiusClass(effectsSettings?.borderRadius);
  const animationBase = getAnimationClass(effectsSettings?.animations, 'base');
  const hoverAnimation = getAnimationClass(effectsSettings?.animations, 'hover');

  // Compute inline styles from AI-generated colorSettings
  // NOTE: Use [colorSettings] as dependency to ensure re-render when design changes
  const cardInlineStyle = useMemo(
    () =>
      colorSettings?.surface
        ? { backgroundColor: colorSettings.surface }
        : colorSettings?.secondary
          ? { backgroundColor: colorSettings.secondary }
          : undefined,
    [colorSettings]
  );

  const textInlineStyle = useMemo(
    () => (colorSettings?.text ? { color: colorSettings.text } : undefined),
    [colorSettings]
  );

  const mutedTextInlineStyle = useMemo(
    () => (colorSettings?.textMuted ? { color: colorSettings.textMuted } : undefined),
    [colorSettings]
  );

  // Get status badge styling based on status text
  const getStatusBadgeStyle = (status: string): { backgroundColor: string; color: string } => {
    const statusType = mapStatusToType(status);
    const bgColor = getStatusColor(statusType, colorSettings);
    return {
      backgroundColor: `${bgColor}20`, // 20% opacity background
      color: bgColor,
    };
  };

  return (
    <Selectable
      id="list"
      isSelected={selectedElement === 'list'}
      onClick={handleSelect}
      className="px-4 py-6"
    >
      <div
        className={`${colors.card} border ${colors.border} overflow-hidden ${radiusClass}`}
        style={cardInlineStyle}
      >
        {items.slice(0, 5).map((item, index, slicedArr) => (
          <div
            key={`list-${item.title}`}
            className={`px-4 py-3 flex items-center justify-between ${animationBase} ${hoverAnimation} hover:${colors.card} ${
              index !== slicedArr.length - 1 ? `border-b ${colors.border}` : ''
            }`}
          >
            <div>
              <div className={`text-sm ${colors.text}`} style={textInlineStyle}>
                {item.title}
              </div>
              <div className={`text-xs ${colors.textMuted}`} style={mutedTextInlineStyle}>
                {item.meta}
              </div>
            </div>
            <span
              className="text-xs px-2 py-1 rounded-full font-medium"
              style={getStatusBadgeStyle(item.status)}
            >
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </Selectable>
  );
}

/**
 * Footer component for preview
 */
interface FooterProps {
  appName: string;
  colors: ColorScheme;
  onElementSelect?: (id: string | null) => void;
  selectedElement?: string | null;
  colorSettings?: Partial<ColorSettings>;
}

function Footer({ appName, colors, onElementSelect, selectedElement, colorSettings }: FooterProps) {
  const handleSelect = (id: string) => {
    onElementSelect?.(selectedElement === id ? null : id);
  };

  // Compute inline styles from AI-generated colorSettings
  // NOTE: Use [colorSettings] as dependency to ensure re-render when design changes
  const footerInlineStyle = useMemo(
    () =>
      colorSettings?.surface
        ? { backgroundColor: colorSettings.surface }
        : colorSettings?.background
          ? { backgroundColor: colorSettings.background }
          : undefined,
    [colorSettings]
  );

  const mutedTextInlineStyle = useMemo(
    () => (colorSettings?.textMuted ? { color: colorSettings.textMuted } : undefined),
    [colorSettings]
  );

  return (
    <Selectable
      id="footer"
      isSelected={selectedElement === 'footer'}
      onClick={handleSelect}
      className={`${colors.header} border-t ${colors.border} px-4 py-4`}
      style={footerInlineStyle}
    >
      <div className="flex items-center justify-between">
        <div className={`text-xs ${colors.textMuted}`} style={mutedTextInlineStyle}>
          © {CURRENT_YEAR} {appName || 'My App'}. All rights reserved.
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            className={`text-xs ${colors.textMuted} hover:opacity-80`}
            style={mutedTextInlineStyle}
            aria-label="View privacy policy"
          >
            Privacy
          </button>
          <button
            type="button"
            className={`text-xs ${colors.textMuted} hover:opacity-80`}
            style={mutedTextInlineStyle}
            aria-label="View terms of service"
          >
            Terms
          </button>
        </div>
      </div>
    </Selectable>
  );
}

/**
 * Shared props for layout components
 */
interface LayoutComponentProps {
  content: ReturnType<typeof generateMockContent>;
  colors: ColorScheme;
  style: StylePreset;
  primaryColor?: string;
  appName: string;
  onElementSelect?: (id: string | null) => void;
  selectedElement?: string | null;
  // Component design props
  headerDesign?: Partial<HeaderDesign>;
  sidebarDesign?: Partial<SidebarDesign>;
  cardDesign?: Partial<CardDesign>;
  navDesign?: Partial<NavigationDesign>;
  effectsSettings?: Partial<EffectsSettings>;
  colorSettings?: Partial<ColorSettings>;
  // Layout structure from Gemini detection
  structure?: Partial<LayoutStructure>;
  // Responsive
  viewMode?: ViewMode;
  // Generated images
  generatedImages?: GeneratedImages;
}

/**
 * Dashboard layout renderer
 */
function DashboardLayout({
  content,
  colors,
  style,
  primaryColor,
  appName,
  onElementSelect,
  selectedElement,
  headerDesign,
  sidebarDesign,
  cardDesign,
  navDesign,
  effectsSettings,
  colorSettings,
  structure,
  viewMode = 'desktop',
  generatedImages,
}: LayoutComponentProps) {
  const isMobile = viewMode === 'mobile';
  const isTablet = viewMode === 'tablet';

  // Determine which components to render based on structure detection
  // Default to true (show component) if structure doesn't specify
  const showHeader = structure?.hasHeader !== false;
  const showSidebar = structure?.hasSidebar !== false;
  const showFooter = structure?.hasFooter !== false;

  // Inline style for main background - overrides Tailwind bg class when colorSettings is set
  const containerStyle = colorSettings?.background
    ? { backgroundColor: colorSettings.background }
    : undefined;

  return (
    <div
      className={`flex flex-col h-full ${!colorSettings?.background ? colors.bg : ''}`}
      style={containerStyle}
    >
      {showHeader && (
        <Header
          appName={appName}
          navItems={content.navItems}
          colors={colors}
          style={style}
          primaryColor={primaryColor}
          onElementSelect={onElementSelect}
          selectedElement={selectedElement}
          headerDesign={headerDesign}
          navDesign={navDesign}
          effectsSettings={effectsSettings}
          isMobile={isMobile}
          colorSettings={colorSettings}
        />
      )}
      <div className="flex flex-1 overflow-hidden">
        {/* Hide sidebar on mobile, show collapsed on tablet, or hide if structure says no sidebar */}
        {!isMobile && showSidebar && (
          <Sidebar
            navItems={content.navItems}
            colors={colors}
            style={style}
            primaryColor={primaryColor}
            onElementSelect={onElementSelect}
            selectedElement={selectedElement}
            sidebarDesign={{
              ...sidebarDesign,
              // Force collapsed on tablet
              defaultCollapsed: isTablet ? true : sidebarDesign?.defaultCollapsed,
            }}
            colorSettings={colorSettings}
          />
        )}
        <main className={`flex-1 min-h-0 overflow-y-auto ${isMobile ? 'p-2' : 'p-4'}`}>
          <StatsRow
            stats={content.stats}
            colors={colors}
            style={style}
            onElementSelect={onElementSelect}
            selectedElement={selectedElement}
            effectsSettings={effectsSettings}
            colorSettings={colorSettings}
          />
          <CardGrid
            cards={content.cards}
            colors={colors}
            style={style}
            primaryColor={primaryColor}
            onElementSelect={onElementSelect}
            selectedElement={selectedElement}
            cardDesign={cardDesign}
            effectsSettings={effectsSettings}
            cardImages={generatedImages?.cards}
            colorSettings={colorSettings}
          />
          <ListItems
            items={content.listItems}
            colors={colors}
            style={style}
            onElementSelect={onElementSelect}
            selectedElement={selectedElement}
            effectsSettings={effectsSettings}
            colorSettings={colorSettings}
          />
        </main>
      </div>
      {showFooter && (
        <Footer
          appName={appName}
          colors={colors}
          onElementSelect={onElementSelect}
          selectedElement={selectedElement}
          colorSettings={colorSettings}
        />
      )}
    </div>
  );
}

/**
 * Multi-page layout renderer
 */
function MultiPageLayout({
  content,
  colors,
  style,
  primaryColor,
  appName,
  onElementSelect,
  selectedElement,
  headerDesign,
  cardDesign,
  navDesign,
  effectsSettings,
  colorSettings,
  structure,
  viewMode = 'desktop',
  generatedImages,
}: LayoutComponentProps) {
  const isMobile = viewMode === 'mobile';

  // Determine which components to render based on structure detection
  const showHeader = structure?.hasHeader !== false;
  const showFooter = structure?.hasFooter !== false;

  // Inline style for main background - overrides Tailwind bg class when colorSettings is set
  const containerStyle = colorSettings?.background
    ? { backgroundColor: colorSettings.background }
    : undefined;

  return (
    <div
      className={`flex flex-col h-full ${!colorSettings?.background ? colors.bg : ''}`}
      style={containerStyle}
    >
      {showHeader && (
        <Header
          appName={appName}
          navItems={content.navItems}
          colors={colors}
          style={style}
          primaryColor={primaryColor}
          onElementSelect={onElementSelect}
          selectedElement={selectedElement}
          headerDesign={headerDesign}
          navDesign={navDesign}
          effectsSettings={effectsSettings}
          isMobile={isMobile}
          colorSettings={colorSettings}
        />
      )}
      <main className={`flex-1 min-h-0 overflow-y-auto ${isMobile ? 'px-2' : ''}`}>
        <Hero
          title={content.hero.title}
          subtitle={content.hero.subtitle}
          cta={content.hero.cta}
          colors={colors}
          style={style}
          primaryColor={primaryColor}
          onElementSelect={onElementSelect}
          selectedElement={selectedElement}
          effectsSettings={effectsSettings}
          backgroundImage={generatedImages?.hero}
          colorSettings={colorSettings}
        />
        <StatsRow
          stats={content.stats}
          colors={colors}
          style={style}
          onElementSelect={onElementSelect}
          selectedElement={selectedElement}
          effectsSettings={effectsSettings}
          colorSettings={colorSettings}
        />
        <CardGrid
          cards={content.cards}
          colors={colors}
          style={style}
          primaryColor={primaryColor}
          onElementSelect={onElementSelect}
          selectedElement={selectedElement}
          cardDesign={cardDesign}
          effectsSettings={effectsSettings}
          cardImages={generatedImages?.cards}
          colorSettings={colorSettings}
        />
      </main>
      {showFooter && (
        <Footer
          appName={appName}
          colors={colors}
          onElementSelect={onElementSelect}
          selectedElement={selectedElement}
          colorSettings={colorSettings}
        />
      )}
    </div>
  );
}

/**
 * Single-page layout renderer
 */
function SinglePageLayout({
  content,
  colors,
  style,
  primaryColor,
  appName,
  onElementSelect,
  selectedElement,
  headerDesign,
  sidebarDesign,
  cardDesign,
  navDesign,
  effectsSettings,
  colorSettings,
  structure,
  viewMode = 'desktop',
  generatedImages,
}: LayoutComponentProps) {
  const isMobile = viewMode === 'mobile';
  const isTablet = viewMode === 'tablet';

  // Determine which components to render based on structure detection
  const showHeader = structure?.hasHeader !== false;
  const showSidebar = structure?.hasSidebar === true; // Only show if explicitly detected
  const showFooter = structure?.hasFooter !== false;

  // Inline style for main background - overrides Tailwind bg class when colorSettings is set
  const containerStyle = colorSettings?.background
    ? { backgroundColor: colorSettings.background }
    : undefined;

  return (
    <div
      className={`flex flex-col h-full ${!colorSettings?.background ? colors.bg : ''}`}
      style={containerStyle}
    >
      {showHeader && (
        <Header
          appName={appName}
          navItems={content.navItems}
          colors={colors}
          style={style}
          primaryColor={primaryColor}
          onElementSelect={onElementSelect}
          selectedElement={selectedElement}
          headerDesign={headerDesign}
          navDesign={navDesign}
          effectsSettings={effectsSettings}
          isMobile={isMobile}
          colorSettings={colorSettings}
        />
      )}
      <div className="flex flex-1 overflow-hidden">
        {/* Show sidebar in single-page mode if Gemini detected one in the reference image */}
        {!isMobile && showSidebar && (
          <Sidebar
            navItems={content.navItems}
            colors={colors}
            style={style}
            primaryColor={primaryColor}
            onElementSelect={onElementSelect}
            selectedElement={selectedElement}
            sidebarDesign={{
              ...sidebarDesign,
              defaultCollapsed: isTablet ? true : sidebarDesign?.defaultCollapsed,
            }}
            colorSettings={colorSettings}
          />
        )}
        <main className={`flex-1 min-h-0 overflow-y-auto ${isMobile ? 'px-2' : ''}`}>
          <Hero
            title={content.hero.title}
            subtitle={content.hero.subtitle}
            cta={content.hero.cta}
            colors={colors}
            style={style}
            primaryColor={primaryColor}
            onElementSelect={onElementSelect}
            selectedElement={selectedElement}
            effectsSettings={effectsSettings}
            backgroundImage={generatedImages?.hero}
            colorSettings={colorSettings}
          />
          <CardGrid
            cards={content.cards}
            colors={colors}
            style={style}
            primaryColor={primaryColor}
            onElementSelect={onElementSelect}
            selectedElement={selectedElement}
            cardDesign={cardDesign}
            effectsSettings={effectsSettings}
            cardImages={generatedImages?.cards}
            colorSettings={colorSettings}
          />
          <ListItems
            items={content.listItems}
            colors={colors}
            style={style}
            onElementSelect={onElementSelect}
            selectedElement={selectedElement}
            effectsSettings={effectsSettings}
            colorSettings={colorSettings}
          />
        </main>
      </div>
      {showFooter && (
        <Footer
          appName={appName}
          colors={colors}
          onElementSelect={onElementSelect}
          selectedElement={selectedElement}
          colorSettings={colorSettings}
        />
      )}
    </div>
  );
}

/**
 * LayoutPreview component - Real-time visual preview
 */
export function LayoutPreview({
  preferences,
  concept,
  className = '',
  onPreferenceChange,
  onElementSelect,
  selectedElement,
  componentDesign,
  enableDragDrop = false,
  sectionOrder: externalSectionOrder,
  onSectionOrderChange,
  showGridOverlay: externalShowGridOverlay,
  onGridOverlayToggle,
}: LayoutPreviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [isAnimationDemo, setIsAnimationDemo] = useState(false);
  const [animationDemoIndex, setAnimationDemoIndex] = useState(0);
  const [showSectionPanel, setShowSectionPanel] = useState(false);
  const [internalShowGridOverlay, setInternalShowGridOverlay] = useState(false);
  const [secondaryColor, setSecondaryColor] = useState('#9CA3AF'); // Neutral gray - AI generates actual colors
  const [accentColor, setAccentColor] = useState('#6B7280'); // Neutral gray - AI generates actual colors

  // Use external grid overlay state if provided, otherwise use internal
  const showGridOverlay = externalShowGridOverlay ?? internalShowGridOverlay;

  // Toggle grid overlay handler
  const toggleGridOverlay = useCallback(() => {
    if (onGridOverlayToggle) {
      onGridOverlayToggle(!showGridOverlay);
    } else {
      setInternalShowGridOverlay(!showGridOverlay);
    }
  }, [showGridOverlay, onGridOverlayToggle]);

  // Keyboard shortcut for grid overlay (G key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if not in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'g' || e.key === 'G') {
        toggleGridOverlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleGridOverlay]);

  // Image generation state
  const [generatedImages, setGeneratedImages] = useState<GeneratedImages>({ cards: [] });
  const [imageGenState, setImageGenState] = useState<ImageGenerationState>({
    isGenerating: false,
    progress: 0,
  });

  // Initialize image cache on mount
  useEffect(() => {
    imageCache.initialize();
  }, []);

  // Internal section order state (used when not controlled externally)
  const layoutType = preferences.layout || 'single-page';
  const {
    sections: internalSections,
    reorderSections: internalReorder,
    toggleSectionVisibility,
    resetToDefault,
  } = useSectionOrder(layoutType);

  // Use external section order if provided, otherwise use internal
  const sections = externalSectionOrder || internalSections;
  const handleSectionReorder = useCallback(
    (newSections: LayoutSection[]) => {
      if (onSectionOrderChange) {
        onSectionOrderChange(newSections);
      } else {
        internalReorder(newSections);
      }
    },
    [onSectionOrderChange, internalReorder]
  );

  // Animation demo element (overrides selectedElement during demo)
  const demoElement = isAnimationDemo ? ANIMATION_DEMO_SEQUENCE[animationDemoIndex] : null;
  const effectiveSelectedElement = isAnimationDemo ? demoElement : selectedElement;

  // Start animation demo
  const startAnimationDemo = useCallback(() => {
    setIsAnimationDemo(true);
    setAnimationDemoIndex(0);
  }, []);

  // Stop animation demo
  const stopAnimationDemo = useCallback(() => {
    setIsAnimationDemo(false);
    setAnimationDemoIndex(0);
  }, []);

  // Animation demo cycle effect
  useEffect(() => {
    if (!isAnimationDemo) return;

    const timer = setInterval(() => {
      setAnimationDemoIndex((prev) => {
        const nextIndex = prev + 1;
        if (nextIndex >= ANIMATION_DEMO_SEQUENCE.length) {
          // End demo after cycling through all elements
          setIsAnimationDemo(false);
          return 0;
        }
        return nextIndex;
      });
    }, ANIMATION_DEMO_DURATION);

    return () => clearInterval(timer);
  }, [isAnimationDemo]);

  // Stable stringified key for coreFeatures to avoid unnecessary re-computation
  const coreFeaturesKey = useMemo(
    () => JSON.stringify(concept?.coreFeatures ?? []),
    [concept?.coreFeatures]
  );

  // Generate mock content based on concept
  const mockContent = useMemo(() => {
    // Safely handle coreFeatures - parse from key or use empty array
    const features: Feature[] =
      concept?.coreFeatures && Array.isArray(concept.coreFeatures) ? concept.coreFeatures : [];

    return generateMockContent(
      concept?.name || 'My App',
      concept?.description || '',
      features,
      concept?.purpose || ''
    );
  }, [concept?.name, concept?.description, coreFeaturesKey, concept?.purpose]);

  // Get style and color presets
  const style = stylePresets[preferences.style] || stylePresets.modern;
  const colors = colorSchemes[preferences.colorScheme] || colorSchemes.dark;
  const primaryColor = preferences.primaryColor || DEFAULT_PRIMARY_COLOR;

  // PHASE 3 DEBUG: Enhanced logging for component tracking
  useEffect(() => {
    // Always log component data (not just in debug mode) since this is critical for troubleshooting
    const detectedComponents =
      componentDesign?.detectedComponents || componentDesign?.structure?.detectedComponents;

    console.log('[LayoutPreview] 🎨 Component design received:', {
      'preferences.layout': preferences.layout,
      'componentDesign exists': !!componentDesign,
      'componentDesign keys': componentDesign ? Object.keys(componentDesign) : [],
      'detectedComponents (direct)': componentDesign?.detectedComponents?.length ?? 0,
      'detectedComponents (in structure)':
        componentDesign?.structure?.detectedComponents?.length ?? 0,
      'final detectedComponents count': detectedComponents?.length ?? 0,
      'will use DynamicLayoutRenderer': !!(detectedComponents && detectedComponents.length > 0),
      colorSettings: componentDesign?.colorSettings,
      structure: componentDesign?.structure,
    });

    // Show warning if components were expected but not found
    if (!detectedComponents || detectedComponents.length === 0) {
      console.warn('[LayoutPreview] ⚠️ No detected components - falling back to fixed templates');
      console.warn(
        '[LayoutPreview] This will show the hardcoded "Sign In" button instead of detected layout'
      );
    } else {
      console.log(
        '[LayoutPreview] ✅ Using DynamicLayoutRenderer with',
        detectedComponents.length,
        'components'
      );
    }
  }, [preferences.layout, componentDesign, preferences.colorScheme]);

  // Get device dimensions
  const dimensions = getDeviceDimensions(viewMode);

  // Generate images handler - tries DALL-E first, falls back to free services
  const handleGenerateImages = useCallback(async () => {
    setImageGenState({ isGenerating: true, progress: 0, error: undefined });

    const designContext = {
      colorScheme: preferences.colorScheme || 'dark',
      style: preferences.style || 'modern',
      primaryColor: primaryColor,
    };

    try {
      // Check if DALL-E is enabled
      const isDalleEnabled = process.env.NEXT_PUBLIC_ENABLE_DALLE === 'true';

      if (isDalleEnabled) {
        // Try DALL-E API for hero image
        setImageGenState((prev) => ({ ...prev, progress: 10 }));

        try {
          const heroResponse = await fetch('/api/images/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'hero',
              designContext: {
                ...designContext,
                appDescription: concept?.description || mockContent.hero.subtitle,
              },
            }),
          });

          if (heroResponse.ok) {
            const heroData = await heroResponse.json();
            if (heroData.success && heroData.image?.url) {
              setGeneratedImages((prev) => ({ ...prev, hero: heroData.image.url }));
            }
          }
        } catch {
          // Fall through to fallback
        }

        setImageGenState((prev) => ({ ...prev, progress: 40 }));

        // Try DALL-E API for card images
        try {
          const cardResponse = await fetch('/api/images/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'batch-cards',
              designContext,
              cards: mockContent.cards.slice(0, 4).map((card) => ({
                title: card.title,
                context: card.subtitle,
              })),
            }),
          });

          if (cardResponse.ok) {
            const cardData = await cardResponse.json();
            if (cardData.success && cardData.images) {
              setGeneratedImages((prev) => ({
                ...prev,
                cards: cardData.images.map((img: { url: string }) => img.url),
              }));
              setImageGenState({ isGenerating: false, progress: 100 });
              return;
            }
          }
        } catch {
          // Fall through to fallback
        }
      }

      // Fallback to free image services
      setImageGenState((prev) => ({ ...prev, progress: 60 }));

      const heroFallback = getFallbackImage('hero', {
        width: 1200,
        height: 600,
        seed: concept?.name || 'app',
      });

      const cardFallbacks = mockContent.cards.slice(0, 4).map((card, index) =>
        getFallbackImage('card', {
          width: 400,
          height: 300,
          seed: `${card.title}-${index}`,
        })
      );

      setGeneratedImages({
        hero: heroFallback,
        cards: cardFallbacks,
      });

      setImageGenState({ isGenerating: false, progress: 100 });
    } catch (error) {
      console.error('Image generation failed:', error);
      setImageGenState({
        isGenerating: false,
        progress: 0,
        error: 'Failed to generate images. Please try again.',
      });
    }
  }, [
    preferences.colorScheme,
    preferences.style,
    primaryColor,
    concept?.description,
    concept?.name,
    mockContent,
  ]);

  // Clear generated images
  const handleClearImages = useCallback(() => {
    setGeneratedImages({ cards: [] });
  }, []);

  // Check if design is empty (no styles configured yet)
  const isDesignEmpty = useMemo(() => {
    // Design is empty if there are no color settings and no effects settings
    const hasColors =
      componentDesign?.colorSettings && Object.keys(componentDesign.colorSettings).length > 0;
    const hasEffects =
      componentDesign?.effectsSettings && Object.keys(componentDesign.effectsSettings).length > 0;
    const hasStructure =
      componentDesign?.structure && Object.keys(componentDesign.structure).length > 0;
    const hasHeader =
      componentDesign?.headerDesign && Object.keys(componentDesign.headerDesign).length > 0;

    return !hasColors && !hasEffects && !hasStructure && !hasHeader;
  }, [componentDesign]);

  // Render the appropriate layout
  const renderLayout = () => {
    // Show empty state placeholder if design hasn't been configured yet
    if (isDesignEmpty) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center">
          <div className="w-24 h-24 mb-6 rounded-2xl border-2 border-dashed border-slate-600 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-300 mb-2">Design Your Layout</h3>
          <p className="text-sm text-slate-500 max-w-xs mb-4">
            Upload a reference image or describe your design to get started
          </p>
          <div className="flex flex-col gap-2 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              <span>Upload a screenshot or mockup</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <span>Or describe what you want to build</span>
            </div>
          </div>
        </div>
      );
    }

    // Check for dynamic mode: use DynamicLayoutRenderer when detected components exist
    const detectedComponents =
      componentDesign?.detectedComponents || componentDesign?.structure?.detectedComponents;
    if (detectedComponents && detectedComponents.length > 0) {
      return (
        <DynamicLayoutRenderer
          components={detectedComponents}
          colorSettings={componentDesign?.colorSettings}
          effectsSettings={componentDesign?.effectsSettings}
          content={mockContent}
          primaryColor={primaryColor}
          appName={concept?.name || 'My App'}
          onElementSelect={isAnimationDemo ? undefined : onElementSelect}
          selectedElement={effectiveSelectedElement}
          viewMode={viewMode}
        />
      );
    }

    // Fallback to fixed templates when no detected components
    const layoutProps: LayoutComponentProps = {
      content: mockContent,
      colors,
      style,
      primaryColor,
      appName: concept?.name || 'My App',
      onElementSelect: isAnimationDemo ? undefined : onElementSelect, // Disable selection during demo
      selectedElement: effectiveSelectedElement,
      // Pass component design props
      headerDesign: componentDesign?.headerDesign,
      sidebarDesign: componentDesign?.sidebarDesign,
      cardDesign: componentDesign?.cardDesign,
      navDesign: componentDesign?.navDesign,
      effectsSettings: componentDesign?.effectsSettings,
      colorSettings: componentDesign?.colorSettings,
      // Layout structure from Gemini detection (hasHeader, hasSidebar, hasFooter)
      structure: componentDesign?.structure,
      // Responsive
      viewMode,
      // Generated images
      generatedImages,
    };

    switch (preferences.layout) {
      case 'dashboard':
        return <DashboardLayout {...layoutProps} />;
      case 'multi-page':
        return <MultiPageLayout {...layoutProps} />;
      case 'single-page':
      case 'custom':
      default:
        return <SinglePageLayout {...layoutProps} />;
    }
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 px-2">
        {/* View Mode Toggle */}
        <div
          className="flex gap-1 p-1 rounded-lg"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          <button
            type="button"
            onClick={() => setViewMode('mobile')}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            style={
              viewMode === 'mobile'
                ? { backgroundColor: '#6B7280', color: '#ffffff' }
                : { color: 'var(--text-muted)' }
            }
            title="Mobile view (375x667)"
          >
            📱 Mobile
          </button>
          <button
            type="button"
            onClick={() => setViewMode('tablet')}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            style={
              viewMode === 'tablet'
                ? { backgroundColor: '#6B7280', color: '#ffffff' }
                : { color: 'var(--text-muted)' }
            }
            title="Tablet view (768x1024)"
          >
            📲 Tablet
          </button>
          <button
            type="button"
            onClick={() => setViewMode('desktop')}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            style={
              viewMode === 'desktop'
                ? { backgroundColor: '#6B7280', color: '#ffffff' }
                : { color: 'var(--text-muted)' }
            }
            title="Desktop view (full width)"
          >
            🖥️ Desktop
          </button>
        </div>

        {/* Quick Preference Controls */}
        {onPreferenceChange && (
          <div className="flex items-center gap-2">
            {/* Color Scheme Toggle */}
            <button
              type="button"
              onClick={() =>
                onPreferenceChange({
                  colorScheme: preferences.colorScheme === 'dark' ? 'light' : 'dark',
                })
              }
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-muted)',
              }}
              title="Toggle color scheme"
              aria-label={`Switch to ${preferences.colorScheme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {preferences.colorScheme === 'dark' ? '🌙' : '☀️'}
            </button>

            {/* Color Picker Menu */}
            <ColorPickerMenu
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              accentColor={accentColor}
              onColorChange={(colors) => {
                if (colors.primaryColor) onPreferenceChange({ primaryColor: colors.primaryColor });
                if (colors.secondaryColor) setSecondaryColor(colors.secondaryColor);
                if (colors.accentColor) setAccentColor(colors.accentColor);
              }}
            />

            {/* View Options Menu (Demo, Images, Grid) */}
            <ViewOptionsMenu
              isAnimationDemo={isAnimationDemo}
              onStartDemo={startAnimationDemo}
              onStopDemo={stopAnimationDemo}
              hasGeneratedImages={!!generatedImages.hero}
              isGeneratingImages={imageGenState.isGenerating}
              imageProgress={imageGenState.progress}
              onGenerateImages={handleGenerateImages}
              onClearImages={handleClearImages}
              showGridOverlay={showGridOverlay}
              onToggleGrid={toggleGridOverlay}
            />

            {/* Section Order Panel Toggle */}
            {enableDragDrop && (
              <button
                type="button"
                onClick={() => setShowSectionPanel(!showSectionPanel)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  showSectionPanel ? 'bg-green-600 text-white' : ''
                }`}
                style={
                  !showSectionPanel
                    ? {
                        backgroundColor: 'var(--bg-tertiary)',
                        color: 'var(--text-muted)',
                      }
                    : undefined
                }
                title={showSectionPanel ? 'Hide section panel' : 'Reorder sections'}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
                Sections
              </button>
            )}
          </div>
        )}
      </div>

      {/* Section Ordering Panel */}
      {enableDragDrop && showSectionPanel && (
        <div className="mb-4 px-2">
          <div
            className="rounded-lg border p-3"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Section Order
              </h3>
              <button
                type="button"
                onClick={resetToDefault}
                className="text-xs transition-colors hover:opacity-80"
                style={{ color: 'var(--text-muted)' }}
              >
                Reset
              </button>
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              Drag sections to reorder. Locked sections (header/footer) stay in place.
            </p>
            <DragDropCanvas
              sections={sections}
              onSectionsChange={handleSectionReorder}
              className="space-y-2"
            >
              {(section) => (
                <div
                  className={`flex items-center justify-between p-2 rounded-lg transition-colors ${section.locked ? 'cursor-not-allowed' : 'cursor-grab'}`}
                  style={{
                    backgroundColor: section.visible
                      ? 'color-mix(in srgb, var(--bg-tertiary) 50%, transparent)'
                      : 'color-mix(in srgb, var(--bg-secondary) 50%, transparent)',
                    border: `1px solid ${section.visible ? 'var(--border-color)' : 'var(--border-color)'}`,
                    opacity: section.visible ? 1 : 0.5,
                  }}
                >
                  <div className="flex items-center gap-2">
                    {section.locked ? (
                      <svg
                        className="w-4 h-4"
                        style={{ color: 'var(--text-muted)' }}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4"
                        style={{ color: 'var(--text-secondary)' }}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 8h16M4 16h16"
                        />
                      </svg>
                    )}
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      {section.label}
                    </span>
                  </div>
                  {!section.locked && (
                    <button
                      type="button"
                      onClick={() => toggleSectionVisibility(section.id)}
                      className="p-1 rounded transition-colors"
                      style={{
                        color: section.visible ? '#4ade80' : 'var(--text-muted)',
                      }}
                      title={section.visible ? 'Hide section' : 'Show section'}
                    >
                      {section.visible ? (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              )}
            </DragDropCanvas>
          </div>
        </div>
      )}

      {/* Preview Frame */}
      <div
        className="flex-1 flex items-center justify-center rounded-xl p-4 overflow-hidden relative"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        {/* Width ruler indicator */}
        {viewMode !== 'desktop' && (
          <div
            className="absolute top-2 left-1/2 transform -translate-x-1/2 flex items-center gap-1 px-2 py-1 rounded text-xs"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 80%, transparent)',
              color: 'var(--text-muted)',
            }}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
            <span>
              {BREAKPOINTS[viewMode].numericWidth} × {parseInt(BREAKPOINTS[viewMode].height)}px
            </span>
          </div>
        )}
        <div
          className="bg-white rounded-lg overflow-hidden shadow-2xl transition-all duration-300 relative"
          style={{
            width: dimensions.width,
            height: dimensions.height,
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        >
          {renderLayout()}

          {/* 12-Column Grid Overlay */}
          {showGridOverlay && (
            <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
              <div className="h-full w-full max-w-full px-4">
                <div className="h-full grid grid-cols-12 gap-2">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="h-full bg-cyan-500/10 border-x border-cyan-500/20" />
                  ))}
                </div>
              </div>
              {/* Grid Overlay Label */}
              <div className="absolute bottom-2 right-2 bg-cyan-600/90 text-white text-xs px-2 py-1 rounded">
                12-column grid
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Animation Demo Progress */}
      {isAnimationDemo && (
        <div className="mt-4 px-4 py-3 bg-gold-500/20 border border-gold-500/30 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-gold-500"></span>
            </span>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gold-200">
                  Previewing: <strong className="font-medium capitalize">{demoElement}</strong>
                </span>
                <span className="text-xs text-gold-400">
                  {animationDemoIndex + 1} / {ANIMATION_DEMO_SEQUENCE.length}
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-1 bg-gold-900/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold-500 transition-all duration-200"
                  style={{
                    width: `${((animationDemoIndex + 1) / ANIMATION_DEMO_SEQUENCE.length) * 100}%`,
                  }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={stopAnimationDemo}
              className="text-xs text-gold-400 hover:text-gold-300 px-2 py-1 rounded hover:bg-gold-500/20"
              aria-label="Stop animation demo"
            >
              Stop
            </button>
          </div>
        </div>
      )}

      {/* Selected Element Info */}
      {!isAnimationDemo && selectedElement && (
        <div className="mt-4 px-4 py-3 bg-garden-500/20 border border-garden-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-garden-400">🎯</span>
            <span className="text-sm text-garden-200">
              Selected: <strong className="font-medium">{selectedElement}</strong>
            </span>
            <button
              type="button"
              onClick={() => onElementSelect?.(null)}
              className="ml-auto text-xs text-garden-400 hover:text-garden-300"
              aria-label="Clear element selection"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LayoutPreview;

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
} from '../types/layoutDesign';
import { generateMockContent } from '../utils/mockContentGenerator';

type ViewMode = 'mobile' | 'tablet' | 'desktop';

/** Default primary color used throughout the app */
const DEFAULT_PRIMARY_COLOR = '#3B82F6';

/** Current year for copyright - extracted to avoid creating Date on every render */
const CURRENT_YEAR = new Date().getFullYear();

/** Default status colors for semantic states */
const DEFAULT_STATUS_COLORS = {
  success: '#22c55e',
  warning: '#eab308',
  error: '#ef4444',
  info: '#3b82f6',
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
 */
function mapStatusToType(status: string): StatusType {
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
    bg: 'bg-zinc-900',
    text: 'text-zinc-100',
    textMuted: 'text-zinc-400',
    card: 'bg-zinc-800',
    border: 'border-zinc-700',
    sidebar: 'bg-zinc-850',
    header: 'bg-zinc-800',
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
 * Header style classes based on HeaderDesign.style
 */
const headerStyles = {
  solid: (colors: ColorScheme) => colors.header,
  gradient: (colors: ColorScheme, primary: string) =>
    `bg-gradient-to-r from-[${primary}] to-[${primary}80]`,
  blur: (colors: ColorScheme) => `backdrop-blur-md bg-opacity-80 ${colors.header}`,
  transparent: () => 'bg-transparent',
} as const;

/**
 * Card hover effect classes based on CardDesign.hoverEffect
 */
const cardHoverEffects = {
  none: '',
  lift: 'hover:-translate-y-1 hover:shadow-lg transition-all duration-200',
  glow: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all duration-200',
  scale: 'hover:scale-[1.02] transition-transform duration-200',
  border: 'hover:border-blue-500 transition-colors duration-200',
} as const;

/**
 * Navigation item style classes based on NavigationDesign.itemStyle
 */
const navItemStyles = {
  text: (colors: ColorScheme) => `${colors.textMuted} hover:opacity-80`,
  pills: (colors: ColorScheme, primary: string) =>
    `px-3 py-1 rounded-full ${colors.textMuted} hover:bg-[${primary}]/10`,
  underline: (colors: ColorScheme) =>
    `${colors.textMuted} border-b-2 border-transparent hover:border-current pb-1`,
  boxed: (colors: ColorScheme) =>
    `px-3 py-1 border rounded ${colors.border} ${colors.textMuted} hover:border-current`,
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
 */
interface SelectableProps {
  id: string;
  children: React.ReactNode;
  isSelected: boolean;
  onClick: (id: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

function Selectable({ id, children, isSelected, onClick, className = '', style }: SelectableProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onClick(id);
    }
  };

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
      aria-label={`Select ${id} element`}
      className={`cursor-pointer transition-all ${
        isSelected
          ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-transparent'
          : 'hover:ring-1 hover:ring-blue-400/50'
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
  isMobile = false,
}: HeaderProps) {
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
    >
      <div className="flex items-center justify-between">
        <div className={`${style.fontWeight} ${colors.text} ${isMobile ? 'text-sm' : ''}`}>
          {appName || 'App Name'}
        </div>
        {/* Navigation - hidden on mobile */}
        {!isMobile && (
          <nav className="flex items-center gap-4">
            {navItems.slice(0, 4).map((item, index) => (
              <span key={`nav-${item}`} className={getNavItemStyle(index === 0)}>
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
              style={{ backgroundColor: primaryColor || DEFAULT_PRIMARY_COLOR }}
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
}

function Sidebar({
  navItems,
  colors,
  style,
  primaryColor,
  onElementSelect,
  selectedElement,
  sidebarDesign,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(sidebarDesign?.defaultCollapsed || false);

  const handleSelect = (id: string) => {
    onElementSelect?.(selectedElement === id ? null : id);
  };

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
        {!isCollapsed && <div className={`${style.fontWeight} ${colors.text} mb-4`}>Menu</div>}

        {/* Navigation items */}
        {navItems.map((item, index) => (
          <div
            key={`sidebar-${item}`}
            className={`px-3 py-2 rounded-lg text-sm cursor-pointer transition-all flex items-center gap-3 ${
              index === 0 ? 'text-white' : `${colors.textMuted} hover:opacity-80`
            }`}
            style={index === 0 ? { backgroundColor: primaryColor || DEFAULT_PRIMARY_COLOR } : {}}
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
}: HeroProps) {
  const handleSelect = (id: string) => {
    onElementSelect?.(selectedElement === id ? null : id);
  };

  const animationBase = getAnimationClass(effectsSettings?.animations, 'base');
  const animationHover = getAnimationClass(effectsSettings?.animations, 'hover');
  const radiusClass = getBorderRadiusClass(effectsSettings?.borderRadius);

  // Generate gradient background style if gradients are enabled
  const getHeroBackgroundStyle = (): React.CSSProperties => {
    if (effectsSettings?.gradients) {
      const color = primaryColor || DEFAULT_PRIMARY_COLOR;
      return {
        background: `linear-gradient(135deg, ${color}10 0%, transparent 50%)`,
      };
    }
    return {};
  };

  return (
    <Selectable
      id="hero"
      isSelected={selectedElement === 'hero'}
      onClick={handleSelect}
      className="py-12 px-6 text-center"
      style={getHeroBackgroundStyle()}
    >
      <h1 className={`text-2xl ${style.fontWeight} ${colors.text} mb-3 ${animationBase}`}>
        {title}
      </h1>
      <p className={`${colors.textMuted} mb-6 max-w-md mx-auto text-sm ${animationBase}`}>
        {subtitle}
      </p>
      <button
        type="button"
        className={`px-6 py-2.5 text-white ${style.buttonStyle} ${radiusClass} ${animationBase} ${animationHover}`}
        style={{ backgroundColor: primaryColor || DEFAULT_PRIMARY_COLOR }}
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
}

function StatsRow({
  stats,
  colors,
  style,
  onElementSelect,
  selectedElement,
  effectsSettings,
}: StatsRowProps) {
  const handleSelect = (id: string) => {
    onElementSelect?.(selectedElement === id ? null : id);
  };

  const radiusClass = getBorderRadiusClass(effectsSettings?.borderRadius);
  const shadowClass = getShadowClass(effectsSettings?.shadows);
  const animationBase = getAnimationClass(effectsSettings?.animations, 'base');
  const hoverAnimation = getAnimationClass(effectsSettings?.animations, 'hover');

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
          >
            <div className={`text-xl ${style.fontWeight} ${colors.text}`}>{stat.value}</div>
            <div className={`text-xs ${colors.textMuted} mt-1`}>{stat.label}</div>
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
}: CardGridProps) {
  const handleSelect = (id: string) => {
    onElementSelect?.(selectedElement === id ? null : id);
  };

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
        {cards.slice(0, 4).map((card) => (
          <div
            key={`card-${card.title}`}
            className={`${getCardStyleClass()} p-4 ${getHoverEffect()} ${radiusClass} ${animationBase}`}
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className={`${style.fontWeight} ${colors.text} text-sm`}>{card.title}</h3>
              {cardDesign?.showBadge !== false && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: primaryColor || DEFAULT_PRIMARY_COLOR }}
                >
                  {card.tag}
                </span>
              )}
            </div>
            <p className={`text-xs ${colors.textMuted}`}>{card.subtitle}</p>
            {cardDesign?.showFooter && (
              <div className={`mt-3 pt-3 border-t ${colors.border} flex justify-end`}>
                <button type="button" className={`text-xs ${colors.textMuted} hover:opacity-80`}>
                  View Details
                </button>
              </div>
            )}
          </div>
        ))}
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
  style,
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
      <div className={`${colors.card} border ${colors.border} overflow-hidden ${radiusClass}`}>
        {items.slice(0, 5).map((item, index, slicedArr) => (
          <div
            key={`list-${item.title}`}
            className={`px-4 py-3 flex items-center justify-between ${animationBase} ${hoverAnimation} hover:${colors.card} ${
              index !== slicedArr.length - 1 ? `border-b ${colors.border}` : ''
            }`}
          >
            <div>
              <div className={`text-sm ${colors.text}`}>{item.title}</div>
              <div className={`text-xs ${colors.textMuted}`}>{item.meta}</div>
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
}

function Footer({ appName, colors, onElementSelect, selectedElement }: FooterProps) {
  const handleSelect = (id: string) => {
    onElementSelect?.(selectedElement === id ? null : id);
  };

  return (
    <Selectable
      id="footer"
      isSelected={selectedElement === 'footer'}
      onClick={handleSelect}
      className={`${colors.header} border-t ${colors.border} px-4 py-4`}
    >
      <div className="flex items-center justify-between">
        <div className={`text-xs ${colors.textMuted}`}>
          © {CURRENT_YEAR} {appName || 'My App'}. All rights reserved.
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            className={`text-xs ${colors.textMuted} hover:opacity-80`}
            aria-label="View privacy policy"
          >
            Privacy
          </button>
          <button
            type="button"
            className={`text-xs ${colors.textMuted} hover:opacity-80`}
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
  // Responsive
  viewMode?: ViewMode;
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
  viewMode = 'desktop',
}: LayoutComponentProps) {
  const isMobile = viewMode === 'mobile';
  const isTablet = viewMode === 'tablet';

  return (
    <div className={`flex flex-col h-full ${colors.bg}`}>
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
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Hide sidebar on mobile, show collapsed on tablet */}
        {!isMobile && (
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
          />
        )}
        <main className={`flex-1 overflow-y-auto ${isMobile ? 'p-2' : 'p-4'}`}>
          <StatsRow
            stats={content.stats}
            colors={colors}
            style={style}
            onElementSelect={onElementSelect}
            selectedElement={selectedElement}
            effectsSettings={effectsSettings}
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
      <Footer
        appName={appName}
        colors={colors}
        onElementSelect={onElementSelect}
        selectedElement={selectedElement}
      />
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
  colorSettings: _colorSettings, // Not used in this layout but part of shared props
  viewMode = 'desktop',
}: LayoutComponentProps) {
  const isMobile = viewMode === 'mobile';

  return (
    <div className={`flex flex-col h-full ${colors.bg}`}>
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
      />
      <main className={`flex-1 overflow-y-auto ${isMobile ? 'px-2' : ''}`}>
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
        />
        <StatsRow
          stats={content.stats}
          colors={colors}
          style={style}
          onElementSelect={onElementSelect}
          selectedElement={selectedElement}
          effectsSettings={effectsSettings}
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
        />
      </main>
      <Footer
        appName={appName}
        colors={colors}
        onElementSelect={onElementSelect}
        selectedElement={selectedElement}
      />
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
  cardDesign,
  navDesign,
  effectsSettings,
  colorSettings,
  viewMode = 'desktop',
}: LayoutComponentProps) {
  const isMobile = viewMode === 'mobile';

  return (
    <div className={`flex flex-col h-full ${colors.bg}`}>
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
      />
      <main className={`flex-1 overflow-y-auto ${isMobile ? 'px-2' : ''}`}>
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
      <Footer
        appName={appName}
        colors={colors}
        onElementSelect={onElementSelect}
        selectedElement={selectedElement}
      />
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
}: LayoutPreviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [isAnimationDemo, setIsAnimationDemo] = useState(false);
  const [animationDemoIndex, setAnimationDemoIndex] = useState(0);

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

  // Get device dimensions
  const dimensions = getDeviceDimensions(viewMode);

  // Render the appropriate layout
  const renderLayout = () => {
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
      // Responsive
      viewMode,
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
        <div className="flex gap-1 bg-slate-800 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setViewMode('mobile')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === 'mobile' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Mobile view (375x667)"
          >
            📱 Mobile
          </button>
          <button
            type="button"
            onClick={() => setViewMode('tablet')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === 'tablet' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Tablet view (768x1024)"
          >
            📲 Tablet
          </button>
          <button
            type="button"
            onClick={() => setViewMode('desktop')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === 'desktop' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
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
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs font-medium transition-all"
              title="Toggle color scheme"
              aria-label={`Switch to ${preferences.colorScheme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {preferences.colorScheme === 'dark' ? '🌙' : '☀️'}
            </button>

            {/* Primary Color Picker */}
            <label className="relative cursor-pointer" title="Change primary color">
              <span className="sr-only">Choose primary color</span>
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => onPreferenceChange({ primaryColor: e.target.value })}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="Choose primary color"
              />
              <div
                className="w-8 h-8 rounded-lg border-2 border-white/20"
                style={{ backgroundColor: primaryColor }}
                aria-hidden="true"
              />
            </label>

            {/* Animation Preview Button */}
            <button
              type="button"
              onClick={isAnimationDemo ? stopAnimationDemo : startAnimationDemo}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                isAnimationDemo
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
              title={isAnimationDemo ? 'Stop animation preview' : 'Preview element animations'}
            >
              {isAnimationDemo ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-300 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-200"></span>
                  </span>
                  Stop
                </>
              ) : (
                <>
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Demo
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Breakpoint Indicator */}
      <div className="mb-2 px-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500">Breakpoint:</span>
            <span className="text-xs font-medium text-slate-300">
              {BREAKPOINTS[viewMode].label}
            </span>
          </div>
          <span className="text-xs text-slate-600">•</span>
          <span className="text-xs text-slate-500">
            {viewMode === 'desktop' ? 'Full width' : `${BREAKPOINTS[viewMode].numericWidth}px`}
          </span>
        </div>
        <span className="text-xs text-slate-600 italic">{BREAKPOINTS[viewMode].description}</span>
      </div>

      {/* Preview Frame */}
      <div className="flex-1 flex items-center justify-center bg-slate-950 rounded-xl p-4 overflow-hidden relative">
        {/* Width ruler indicator */}
        {viewMode !== 'desktop' && (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded text-xs text-slate-400">
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
          className="bg-white rounded-lg overflow-hidden shadow-2xl transition-all duration-300"
          style={{
            width: dimensions.width,
            height: dimensions.height,
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        >
          {renderLayout()}
        </div>
      </div>

      {/* Animation Demo Progress */}
      {isAnimationDemo && (
        <div className="mt-4 px-4 py-3 bg-purple-500/20 border border-purple-500/30 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
            </span>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-purple-200">
                  Previewing: <strong className="font-medium capitalize">{demoElement}</strong>
                </span>
                <span className="text-xs text-purple-400">
                  {animationDemoIndex + 1} / {ANIMATION_DEMO_SEQUENCE.length}
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-1 bg-purple-900/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all duration-200"
                  style={{
                    width: `${((animationDemoIndex + 1) / ANIMATION_DEMO_SEQUENCE.length) * 100}%`,
                  }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={stopAnimationDemo}
              className="text-xs text-purple-400 hover:text-purple-300 px-2 py-1 rounded hover:bg-purple-500/20"
              aria-label="Stop animation demo"
            >
              Stop
            </button>
          </div>
        </div>
      )}

      {/* Selected Element Info */}
      {!isAnimationDemo && selectedElement && (
        <div className="mt-4 px-4 py-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-blue-400">🎯</span>
            <span className="text-sm text-blue-200">
              Selected: <strong className="font-medium">{selectedElement}</strong>
            </span>
            <button
              type="button"
              onClick={() => onElementSelect?.(null)}
              className="ml-auto text-xs text-blue-400 hover:text-blue-300"
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

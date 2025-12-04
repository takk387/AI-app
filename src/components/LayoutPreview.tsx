'use client';

import React, { useState, useMemo } from 'react';
import type { UIPreferences, AppConcept, Feature } from '../types/appConcept';
import { generateMockContent } from '../utils/mockContentGenerator';

type ViewMode = 'mobile' | 'tablet' | 'desktop';

/** Default primary color used throughout the app */
const DEFAULT_PRIMARY_COLOR = '#3B82F6';

/** Current year for copyright - extracted to avoid creating Date on every render */
const CURRENT_YEAR = new Date().getFullYear();

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
}

/**
 * Get device frame dimensions
 */
function getDeviceDimensions(mode: ViewMode): { width: string; height: string } {
  switch (mode) {
    case 'mobile':
      return { width: '375px', height: '667px' };
    case 'tablet':
      return { width: '768px', height: '1024px' };
    case 'desktop':
      return { width: '100%', height: '100%' };
  }
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
 * Selectable wrapper component for element selection
 */
interface SelectableProps {
  id: string;
  children: React.ReactNode;
  isSelected: boolean;
  onClick: (id: string) => void;
  className?: string;
}

function Selectable({ id, children, isSelected, onClick, className = '' }: SelectableProps) {
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
    >
      {children}
    </div>
  );
}

/**
 * Header component for preview
 */
interface HeaderProps {
  appName: string;
  navItems: string[];
  colors: ColorScheme;
  style: StylePreset;
  primaryColor?: string;
  onElementSelect?: (id: string | null) => void;
  selectedElement?: string | null;
}

function Header({
  appName,
  navItems,
  colors,
  style,
  primaryColor,
  onElementSelect,
  selectedElement,
}: HeaderProps) {
  const handleSelect = (id: string) => {
    onElementSelect?.(selectedElement === id ? null : id);
  };

  return (
    <Selectable
      id="header"
      isSelected={selectedElement === 'header'}
      onClick={handleSelect}
      className={`${colors.header} border-b ${colors.border} px-4 py-3`}
    >
      <div className="flex items-center justify-between">
        <div className={`${style.fontWeight} ${colors.text}`}>{appName || 'App Name'}</div>
        <nav className="hidden sm:flex items-center gap-4">
          {navItems.slice(0, 4).map((item) => (
            <span
              key={`nav-${item}`}
              className={`text-sm ${colors.textMuted} hover:opacity-80 transition-opacity cursor-pointer`}
            >
              {item}
            </span>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {/* Mobile menu button - visible only on small screens */}
          <button
            type="button"
            className={`sm:hidden p-2 rounded-lg ${colors.textMuted} hover:opacity-80`}
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
          <button
            type="button"
            className={`px-3 py-1.5 text-sm text-white ${style.buttonStyle}`}
            style={{ backgroundColor: primaryColor || DEFAULT_PRIMARY_COLOR }}
          >
            Sign In
          </button>
        </div>
      </div>
    </Selectable>
  );
}

/**
 * Sidebar component for dashboard layout
 */
interface SidebarProps {
  navItems: string[];
  colors: ColorScheme;
  style: StylePreset;
  primaryColor?: string;
  onElementSelect?: (id: string | null) => void;
  selectedElement?: string | null;
}

function Sidebar({
  navItems,
  colors,
  style,
  primaryColor,
  onElementSelect,
  selectedElement,
}: SidebarProps) {
  const handleSelect = (id: string) => {
    onElementSelect?.(selectedElement === id ? null : id);
  };

  return (
    <Selectable
      id="sidebar"
      isSelected={selectedElement === 'sidebar'}
      onClick={handleSelect}
      className={`${colors.sidebar} border-r ${colors.border} w-48 p-4 flex-shrink-0`}
    >
      <div className={`${style.spacing} flex flex-col`}>
        <div className={`${style.fontWeight} ${colors.text} mb-4`}>Menu</div>
        {navItems.map((item, index) => (
          <div
            key={`sidebar-${item}`}
            className={`px-3 py-2 rounded-lg text-sm cursor-pointer transition-all ${
              index === 0 ? 'text-white' : `${colors.textMuted} hover:opacity-80`
            }`}
            style={index === 0 ? { backgroundColor: primaryColor || DEFAULT_PRIMARY_COLOR } : {}}
          >
            {item}
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
}: HeroProps) {
  const handleSelect = (id: string) => {
    onElementSelect?.(selectedElement === id ? null : id);
  };

  return (
    <Selectable
      id="hero"
      isSelected={selectedElement === 'hero'}
      onClick={handleSelect}
      className="py-12 px-6 text-center"
    >
      <h1 className={`text-2xl ${style.fontWeight} ${colors.text} mb-3`}>{title}</h1>
      <p className={`${colors.textMuted} mb-6 max-w-md mx-auto text-sm`}>{subtitle}</p>
      <button
        type="button"
        className={`px-6 py-2.5 text-white ${style.buttonStyle}`}
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
}

function StatsRow({ stats, colors, style, onElementSelect, selectedElement }: StatsRowProps) {
  const handleSelect = (id: string) => {
    onElementSelect?.(selectedElement === id ? null : id);
  };

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
            className={`${colors.card} border ${colors.border} p-4 text-center`}
            style={{ borderRadius: style.borderRadius, boxShadow: style.cardShadow }}
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
 * Card grid component
 */
interface CardGridProps {
  cards: Array<{ title: string; subtitle: string; tag: string }>;
  colors: ColorScheme;
  style: StylePreset;
  primaryColor?: string;
  onElementSelect?: (id: string | null) => void;
  selectedElement?: string | null;
}

function CardGrid({
  cards,
  colors,
  style,
  primaryColor,
  onElementSelect,
  selectedElement,
}: CardGridProps) {
  const handleSelect = (id: string) => {
    onElementSelect?.(selectedElement === id ? null : id);
  };

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
            className={`${colors.card} border ${colors.border} p-4`}
            style={{ borderRadius: style.borderRadius, boxShadow: style.cardShadow }}
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className={`${style.fontWeight} ${colors.text} text-sm`}>{card.title}</h3>
              <span
                className="text-xs px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: primaryColor || DEFAULT_PRIMARY_COLOR }}
              >
                {card.tag}
              </span>
            </div>
            <p className={`text-xs ${colors.textMuted}`}>{card.subtitle}</p>
          </div>
        ))}
      </div>
    </Selectable>
  );
}

/**
 * List items component
 */
interface ListItemsProps {
  items: Array<{ title: string; status: string; meta: string }>;
  colors: ColorScheme;
  style: StylePreset;
  onElementSelect?: (id: string | null) => void;
  selectedElement?: string | null;
}

function ListItems({ items, colors, style, onElementSelect, selectedElement }: ListItemsProps) {
  const handleSelect = (id: string) => {
    onElementSelect?.(selectedElement === id ? null : id);
  };

  return (
    <Selectable
      id="list"
      isSelected={selectedElement === 'list'}
      onClick={handleSelect}
      className="px-4 py-6"
    >
      <div
        className={`${colors.card} border ${colors.border} overflow-hidden`}
        style={{ borderRadius: style.borderRadius }}
      >
        {items.slice(0, 5).map((item, index, slicedArr) => (
          <div
            key={`list-${item.title}`}
            className={`px-4 py-3 flex items-center justify-between ${
              index !== slicedArr.length - 1 ? `border-b ${colors.border}` : ''
            }`}
          >
            <div>
              <div className={`text-sm ${colors.text}`}>{item.title}</div>
              <div className={`text-xs ${colors.textMuted}`}>{item.meta}</div>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${colors.card} ${colors.textMuted}`}>
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
}: LayoutComponentProps) {
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
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          navItems={content.navItems}
          colors={colors}
          style={style}
          primaryColor={primaryColor}
          onElementSelect={onElementSelect}
          selectedElement={selectedElement}
        />
        <main className="flex-1 overflow-y-auto p-4">
          <StatsRow
            stats={content.stats}
            colors={colors}
            style={style}
            onElementSelect={onElementSelect}
            selectedElement={selectedElement}
          />
          <CardGrid
            cards={content.cards}
            colors={colors}
            style={style}
            primaryColor={primaryColor}
            onElementSelect={onElementSelect}
            selectedElement={selectedElement}
          />
          <ListItems
            items={content.listItems}
            colors={colors}
            style={style}
            onElementSelect={onElementSelect}
            selectedElement={selectedElement}
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
}: LayoutComponentProps) {
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
      />
      <main className="flex-1 overflow-y-auto">
        <Hero
          title={content.hero.title}
          subtitle={content.hero.subtitle}
          cta={content.hero.cta}
          colors={colors}
          style={style}
          primaryColor={primaryColor}
          onElementSelect={onElementSelect}
          selectedElement={selectedElement}
        />
        <StatsRow
          stats={content.stats}
          colors={colors}
          style={style}
          onElementSelect={onElementSelect}
          selectedElement={selectedElement}
        />
        <CardGrid
          cards={content.cards}
          colors={colors}
          style={style}
          primaryColor={primaryColor}
          onElementSelect={onElementSelect}
          selectedElement={selectedElement}
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
}: LayoutComponentProps) {
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
      />
      <main className="flex-1 overflow-y-auto">
        <Hero
          title={content.hero.title}
          subtitle={content.hero.subtitle}
          cta={content.hero.cta}
          colors={colors}
          style={style}
          primaryColor={primaryColor}
          onElementSelect={onElementSelect}
          selectedElement={selectedElement}
        />
        <CardGrid
          cards={content.cards}
          colors={colors}
          style={style}
          primaryColor={primaryColor}
          onElementSelect={onElementSelect}
          selectedElement={selectedElement}
        />
        <ListItems
          items={content.listItems}
          colors={colors}
          style={style}
          onElementSelect={onElementSelect}
          selectedElement={selectedElement}
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
}: LayoutPreviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');

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
    const layoutProps = {
      content: mockContent,
      colors,
      style,
      primaryColor,
      appName: concept?.name || 'My App',
      onElementSelect,
      selectedElement,
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
          </div>
        )}
      </div>

      {/* Preview Frame */}
      <div className="flex-1 flex items-center justify-center bg-slate-950 rounded-xl p-4 overflow-hidden">
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

      {/* Selected Element Info */}
      {selectedElement && (
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

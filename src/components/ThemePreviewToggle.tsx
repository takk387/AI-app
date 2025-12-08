'use client';

/**
 * ThemePreviewToggle Component
 *
 * In-preview theme switcher for toggling between light and dark modes.
 */

import React, { useState, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemePreviewToggleProps {
  mode?: ThemeMode;
  onChange?: (mode: ThemeMode) => void;
  className?: string;
  variant?: 'toggle' | 'buttons' | 'dropdown';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function SunIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function MoonIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
  );
}

function SystemIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

// ============================================================================
// TOGGLE VARIANT
// ============================================================================

function ToggleVariant({
  mode,
  onChange,
  size,
}: {
  mode: ThemeMode;
  onChange: (mode: ThemeMode) => void;
  size: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: { track: 'w-12 h-6', thumb: 'w-4 h-4', icon: 'w-3 h-3' },
    md: { track: 'w-14 h-7', thumb: 'w-5 h-5', icon: 'w-4 h-4' },
    lg: { track: 'w-16 h-8', thumb: 'w-6 h-6', icon: 'w-5 h-5' },
  };

  const { track, thumb, icon } = sizeClasses[size];
  const isDark = mode === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={() => onChange(isDark ? 'light' : 'dark')}
      className={`
        relative ${track} rounded-full transition-colors duration-200
        ${isDark ? 'bg-slate-700' : 'bg-amber-400'}
      `}
    >
      <span
        className={`
          absolute top-0.5 ${thumb} rounded-full bg-white shadow-md
          transition-transform duration-200 flex items-center justify-center
          ${isDark ? 'translate-x-[calc(100%+2px)]' : 'translate-x-0.5'}
        `}
      >
        {isDark ? (
          <MoonIcon className={`${icon} text-slate-700`} />
        ) : (
          <SunIcon className={`${icon} text-amber-500`} />
        )}
      </span>
    </button>
  );
}

// ============================================================================
// BUTTONS VARIANT
// ============================================================================

function ButtonsVariant({
  mode,
  onChange,
  size,
}: {
  mode: ThemeMode;
  onChange: (mode: ThemeMode) => void;
  size: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const options: { value: ThemeMode; icon: React.ReactNode; label: string }[] = [
    { value: 'light', icon: <SunIcon className={iconSizes[size]} />, label: 'Light' },
    { value: 'dark', icon: <MoonIcon className={iconSizes[size]} />, label: 'Dark' },
    { value: 'system', icon: <SystemIcon className={iconSizes[size]} />, label: 'System' },
  ];

  return (
    <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`
            flex items-center gap-1.5 rounded-md transition-all ${sizeClasses[size]}
            ${
              mode === option.value
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }
          `}
          title={option.label}
        >
          {option.icon}
          <span className="hidden sm:inline">{option.label}</span>
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// DROPDOWN VARIANT
// ============================================================================

function DropdownVariant({
  mode,
  onChange,
  size,
}: {
  mode: ThemeMode;
  onChange: (mode: ThemeMode) => void;
  size: 'sm' | 'md' | 'lg';
}) {
  const [isOpen, setIsOpen] = useState(false);

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const options: { value: ThemeMode; icon: React.ReactNode; label: string }[] = [
    { value: 'light', icon: <SunIcon className={iconSizes[size]} />, label: 'Light' },
    { value: 'dark', icon: <MoonIcon className={iconSizes[size]} />, label: 'Dark' },
    { value: 'system', icon: <SystemIcon className={iconSizes[size]} />, label: 'System' },
  ];

  const currentOption = options.find((o) => o.value === mode) || options[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800
          ${sizeClasses[size]} text-slate-200 hover:bg-slate-700 transition-colors
        `}
      >
        {currentOption.icon}
        <span>{currentOption.label}</span>
        <svg
          className={`${iconSizes[size]} ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full mt-1 right-0 z-20 bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center gap-2 ${sizeClasses[size]} text-left
                  ${
                    mode === option.value
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700'
                  }
                `}
              >
                {option.icon}
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ThemePreviewToggle({
  mode: initialMode = 'light',
  onChange,
  className = '',
  variant = 'toggle',
  showLabel = false,
  size = 'md',
}: ThemePreviewToggleProps) {
  const [mode, setMode] = useState<ThemeMode>(initialMode);

  const handleChange = useCallback(
    (newMode: ThemeMode) => {
      setMode(newMode);
      onChange?.(newMode);
    },
    [onChange]
  );

  const renderToggle = () => {
    switch (variant) {
      case 'buttons':
        return <ButtonsVariant mode={mode} onChange={handleChange} size={size} />;
      case 'dropdown':
        return <DropdownVariant mode={mode} onChange={handleChange} size={size} />;
      default:
        return <ToggleVariant mode={mode} onChange={handleChange} size={size} />;
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && (
        <span className="text-xs text-slate-400">
          Theme: {mode.charAt(0).toUpperCase() + mode.slice(1)}
        </span>
      )}
      {renderToggle()}
    </div>
  );
}

/**
 * Floating theme toggle for preview panels
 */
export function FloatingThemeToggle({
  mode,
  onChange,
  position = 'bottom-right',
}: {
  mode: ThemeMode;
  onChange: (mode: ThemeMode) => void;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}) {
  const positionClasses = {
    'top-left': 'top-2 left-2',
    'top-right': 'top-2 right-2',
    'bottom-left': 'bottom-2 left-2',
    'bottom-right': 'bottom-2 right-2',
  };

  return (
    <div className={`absolute ${positionClasses[position]} z-10`}>
      <ThemePreviewToggle mode={mode} onChange={onChange} variant="toggle" size="sm" />
    </div>
  );
}

export default ThemePreviewToggle;

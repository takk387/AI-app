'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme, type UseTheme } from '@/hooks/useTheme';
import type { Theme } from '@/contexts/ThemeContext';

interface ThemeToggleProps {
  /** Size variant of the toggle */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show text label */
  showLabel?: boolean;
  /** Whether to show dropdown for system option */
  showDropdown?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
};

const iconSizeClasses = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-2xl',
};

export function ThemeToggle({
  size = 'md',
  showLabel = false,
  showDropdown = true,
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const themeOptions: { value: Theme; label: string; icon: string }[] = [
    { value: 'light', label: 'Light', icon: '☀️' },
    { value: 'dark', label: 'Dark', icon: '🌙' },
    { value: 'system', label: 'System', icon: '💻' },
  ];

  const currentIcon = resolvedTheme === 'dark' ? '🌙' : '☀️';
  const currentLabel =
    theme === 'system'
      ? `System (${resolvedTheme})`
      : theme.charAt(0).toUpperCase() + theme.slice(1);

  if (!showDropdown) {
    // Simple toggle button (just toggles between light and dark)
    return (
      <button
        onClick={toggleTheme}
        className={`
          ${sizeClasses[size]}
          flex items-center justify-center gap-2
          rounded-xl
          bg-white/10 hover:bg-white/20
          dark:bg-slate-800 dark:hover:bg-slate-700
          border border-white/20 dark:border-white/10
          text-slate-800 dark:text-slate-200
          transition-all duration-300
          hover:scale-105 active:scale-95
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          dark:focus:ring-offset-slate-900
        `}
        aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
        title={`Current: ${currentLabel}. Click to switch.`}
      >
        <span className={`${iconSizeClasses[size]} transition-transform duration-300`}>
          {currentIcon}
        </span>
        {showLabel && <span className="text-sm font-medium">{currentLabel}</span>}
      </button>
    );
  }

  // Dropdown toggle
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          ${sizeClasses[size]}
          flex items-center justify-center gap-2
          rounded-xl
          bg-white/10 hover:bg-white/20
          dark:bg-slate-800 dark:hover:bg-slate-700
          border border-white/20 dark:border-white/10
          text-slate-800 dark:text-slate-200
          transition-all duration-300
          hover:scale-105 active:scale-95
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          dark:focus:ring-offset-slate-900
        `}
        aria-label="Theme settings"
        aria-haspopup="true"
        aria-expanded={isOpen}
        title={`Current theme: ${currentLabel}`}
      >
        <span className={`${iconSizeClasses[size]} transition-transform duration-300`}>
          {currentIcon}
        </span>
        {showLabel && <span className="text-sm font-medium">{currentLabel}</span>}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="
            absolute right-0 mt-2 w-40
            bg-white dark:bg-slate-800
            border border-slate-200 dark:border-slate-700
            rounded-xl shadow-lg
            py-1 z-50
            animate-fade-in-up
          "
          role="menu"
          aria-orientation="vertical"
        >
          {themeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setTheme(option.value);
                setIsOpen(false);
              }}
              className={`
                w-full px-4 py-2.5 text-left
                flex items-center gap-3
                transition-colors duration-200
                ${
                  theme === option.value
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }
              `}
              role="menuitem"
              aria-current={theme === option.value ? 'true' : undefined}
            >
              <span className="text-lg">{option.icon}</span>
              <span className="text-sm font-medium">{option.label}</span>
              {theme === option.value && <span className="ml-auto text-blue-500">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ThemeToggle;

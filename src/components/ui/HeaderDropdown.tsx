'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from './Icons';

export interface DropdownItem {
  id: string;
  label: string;
  description?: string; // Helper text shown below label
  icon?: React.ReactNode;
  shortcut?: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
  dividerAfter?: boolean;
  subItems?: DropdownItem[];
  badge?: string | number;
}

export interface HeaderDropdownProps {
  trigger: React.ReactNode;
  label: string;
  items: DropdownItem[];
  align?: 'left' | 'right';
  disabled?: boolean;
}

export const HeaderDropdown: React.FC<HeaderDropdownProps> = ({
  trigger,
  label,
  items,
  align = 'left',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveSubmenu(null);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setActiveSubmenu(null);
        triggerRef.current?.focus();
      } else if (event.key === 'Enter' || event.key === ' ') {
        if (!isOpen) {
          event.preventDefault();
          setIsOpen(true);
        }
      }
    },
    [isOpen]
  );

  const handleItemClick = (item: DropdownItem) => {
    if (item.disabled) return;
    if (item.subItems) {
      setActiveSubmenu(activeSubmenu === item.id ? null : item.id);
      return;
    }
    item.onClick?.();
    setIsOpen(false);
    setActiveSubmenu(null);
  };

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      setActiveSubmenu(null);
    }
  };

  const renderItem = (item: DropdownItem, isSubmenuItem = false) => {
    const hasSubmenu = item.subItems && item.subItems.length > 0;
    const isSubmenuOpen = activeSubmenu === item.id;

    return (
      <div key={item.id} className="relative">
        <button
          onClick={() => handleItemClick(item)}
          onMouseEnter={() => hasSubmenu && setActiveSubmenu(item.id)}
          disabled={item.disabled}
          className={`
            w-full px-3 py-2 text-sm flex items-center gap-3 transition-colors
            ${
              item.variant === 'danger'
                ? 'text-error-400 hover:text-error-300 hover:bg-error-950/50'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }
            ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${isSubmenuItem ? 'pl-4' : ''}
          `}
          role="menuitem"
          aria-disabled={item.disabled}
        >
          {item.icon && (
            <span className="w-4 h-4 flex items-center justify-center text-slate-500 shrink-0">
              {item.icon}
            </span>
          )}
          <span className="flex-1 text-left">
            <span className="block">{item.label}</span>
            {item.description && (
              <span className="block text-xs text-slate-500 font-normal mt-0.5">
                {item.description}
              </span>
            )}
          </span>
          {item.badge !== undefined && (
            <span className="px-1.5 py-0.5 text-xs bg-slate-700 text-slate-300 rounded">
              {item.badge}
            </span>
          )}
          {item.shortcut && (
            <span className="ml-auto text-xs text-slate-500 font-mono">{item.shortcut}</span>
          )}
          {hasSubmenu && <ChevronRightIcon size={14} className="text-slate-500" />}
        </button>

        {/* Submenu */}
        {hasSubmenu && isSubmenuOpen && (
          <div
            className="absolute left-full top-0 ml-1 min-w-[180px] py-1 bg-slate-900 border border-slate-800 rounded-lg shadow-lg shadow-black/30 z-50"
            role="menu"
          >
            {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
            {item.subItems!.map((subItem) => renderItem(subItem, true))}
          </div>
        )}

        {item.dividerAfter && <div className="my-1 h-px bg-slate-800" />}
      </div>
    );
  };

  // Filter out items that have no visible content
  const visibleItems = items.filter((item) => !item.disabled || item.label);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div ref={dropdownRef} className="relative" onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        onClick={toggleDropdown}
        disabled={disabled}
        className={`
          linear-btn-ghost flex items-center gap-1.5
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${isOpen ? 'bg-slate-800 text-white' : ''}
        `}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={label}
      >
        {trigger}
        <ChevronDownIcon
          size={14}
          className={`transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          className={`
            absolute top-full mt-1 min-w-[200px] py-1
            bg-slate-900 border border-slate-800 rounded-lg
            shadow-lg shadow-black/30 z-dropdown
            animate-fade-in
            ${align === 'right' ? 'right-0' : 'left-0'}
          `}
          role="menu"
          aria-label={label}
        >
          {visibleItems.map((item) => renderItem(item))}
        </div>
      )}
    </div>
  );
};

export default HeaderDropdown;

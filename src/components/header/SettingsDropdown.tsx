'use client';

import React from 'react';
import { HeaderDropdown, DropdownItem } from '../ui/HeaderDropdown';
import { SettingsIcon, SunIcon, MoonIcon, HelpIcon } from '../ui/Icons';

type Theme = 'light' | 'dark' | 'system';

interface SettingsDropdownProps {
  theme?: Theme;
  onThemeChange?: (theme: Theme) => void;
  onSettings?: () => void;
  onHelp?: () => void;
}

export const SettingsDropdown: React.FC<SettingsDropdownProps> = ({
  theme = 'dark',
  onThemeChange,
  onSettings,
  onHelp,
}) => {
  const items: DropdownItem[] = [
    {
      id: 'settings',
      label: 'Settings',
      description: 'Configure app preferences',
      icon: <SettingsIcon size={16} />,
      onClick: onSettings,
      dividerAfter: true,
    },
    {
      id: 'theme',
      label: 'Theme',
      description: 'Switch appearance mode',
      icon: theme === 'dark' ? <MoonIcon size={16} /> : <SunIcon size={16} />,
      subItems: [
        {
          id: 'theme-light',
          label: 'Light',
          icon: <SunIcon size={16} />,
          onClick: () => onThemeChange?.('light'),
        },
        {
          id: 'theme-dark',
          label: 'Dark',
          icon: <MoonIcon size={16} />,
          onClick: () => onThemeChange?.('dark'),
        },
        {
          id: 'theme-system',
          label: 'System',
          description: 'Match OS setting',
          icon: <SettingsIcon size={16} />,
          onClick: () => onThemeChange?.('system'),
        },
      ],
      dividerAfter: true,
    },
    {
      id: 'help',
      label: 'Help & Shortcuts',
      description: 'View keyboard shortcuts',
      icon: <HelpIcon size={16} />,
      shortcut: '?',
      onClick: onHelp,
    },
  ];

  return (
    <HeaderDropdown
      trigger={<SettingsIcon size={18} />}
      label="Settings menu"
      items={items}
      align="right"
    />
  );
};

export default SettingsDropdown;

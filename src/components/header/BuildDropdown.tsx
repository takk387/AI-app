'use client';

import React from 'react';
import { HeaderDropdown, DropdownItem } from '../ui/HeaderDropdown';
import {
  LayersIcon,
  RocketIcon,
  HistoryIcon,
  ToggleLeftIcon,
  ToggleRightIcon,
} from '../ui/Icons';

interface BuildDropdownProps {
  // Conditional visibility props
  showPlanApp?: boolean;
  showPhasedBuild?: boolean;
  showPhasesToggle?: boolean;
  showVersionHistory?: boolean;

  // State props
  isPhasedMode?: boolean;
  versionCount?: number;

  // Action handlers
  onPlanApp?: () => void;
  onPhasedBuild?: () => void;
  onTogglePhases?: () => void;
  onVersionHistory?: () => void;
}

export const BuildDropdown: React.FC<BuildDropdownProps> = ({
  showPlanApp = false,
  showPhasedBuild = false,
  showPhasesToggle = false,
  showVersionHistory = false,
  isPhasedMode = false,
  versionCount = 0,
  onPlanApp,
  onPhasedBuild,
  onTogglePhases,
  onVersionHistory,
}) => {
  const items: DropdownItem[] = [];

  // Plan App (conditional)
  if (showPlanApp && onPlanApp) {
    items.push({
      id: 'plan-app',
      label: 'Plan App',
      icon: <RocketIcon size={16} />,
      onClick: onPlanApp,
    });
  }

  // Phased Build (conditional)
  if (showPhasedBuild && onPhasedBuild) {
    items.push({
      id: 'phased-build',
      label: 'Phased Build',
      icon: <LayersIcon size={16} />,
      onClick: onPhasedBuild,
    });
  }

  // Phases Toggle (conditional)
  if (showPhasesToggle && onTogglePhases) {
    items.push({
      id: 'phases-toggle',
      label: isPhasedMode ? 'Hide Phases' : 'Show Phases',
      icon: isPhasedMode ? <ToggleRightIcon size={16} /> : <ToggleLeftIcon size={16} />,
      onClick: onTogglePhases,
      dividerAfter: showVersionHistory,
    });
  }

  // Version History (conditional)
  if (showVersionHistory && onVersionHistory) {
    items.push({
      id: 'version-history',
      label: 'Version History',
      icon: <HistoryIcon size={16} />,
      onClick: onVersionHistory,
      badge: versionCount > 0 ? versionCount : undefined,
    });
  }

  // If no items are available, show a disabled message
  if (items.length === 0) {
    items.push({
      id: 'no-options',
      label: 'No build options available',
      disabled: true,
    });
  }

  return (
    <HeaderDropdown
      trigger={
        <span className="flex items-center gap-2">
          <LayersIcon size={16} />
          <span className="hidden sm:inline">Build</span>
        </span>
      }
      label="Build menu"
      items={items}
      align="left"
    />
  );
};

export default BuildDropdown;

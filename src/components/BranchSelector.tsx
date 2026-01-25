'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { AppBranch } from '@/types/aiBuilderTypes';
import { GitBranchIcon, ChevronDownIcon, CheckIcon, PlusIcon, TrashIcon } from './ui/Icons';

/**
 * Props for BranchSelector component
 */
export interface BranchSelectorProps {
  /** All branches in the app */
  branches: AppBranch[];
  /** ID of the currently active branch */
  activeBranchId: string;
  /** Callback when user switches to a different branch */
  onBranchSwitch: (branchId: string) => void;
  /** Callback when user wants to create a new branch */
  onCreateBranch: () => void;
  /** Callback when user wants to delete a branch */
  onDeleteBranch?: (branchId: string) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * BranchSelector - Dropdown to switch between branches
 *
 * Displays the current branch name and provides a dropdown menu
 * to switch branches or create new ones.
 */
export const BranchSelector: React.FC<BranchSelectorProps> = ({
  branches,
  activeBranchId,
  onBranchSwitch,
  onCreateBranch,
  onDeleteBranch,
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // When no branches exist, show a virtual "main" branch as the current state
  const displayBranches: AppBranch[] =
    branches.length > 0
      ? branches
      : [
          {
            id: 'main',
            name: 'main',
            description: 'Default branch',
            code: '',
            versions: [],
            conversationHistory: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdFrom: null,
            isDefault: true,
          },
        ];

  // Find active branch from display branches
  const activeBranch = displayBranches.find((b) => b.id === activeBranchId);
  const activeBranchName = activeBranch?.name || 'main';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleBranchClick = (branchId: string) => {
    if (branchId !== activeBranchId) {
      onBranchSwitch(branchId);
    }
    setIsOpen(false);
  };

  const handleCreateClick = () => {
    onCreateBranch();
    setIsOpen(false);
  };

  const handleDeleteClick = (e: React.MouseEvent, branchId: string) => {
    e.stopPropagation();
    if (onDeleteBranch) {
      onDeleteBranch(branchId);
    }
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg
          text-sm font-medium transition-colors
          ${
            disabled
              ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
              : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-slate-100'
          }
          border border-slate-700
        `}
        title={`Current branch: ${activeBranchName}`}
      >
        <GitBranchIcon size={16} className="text-garden-400" />
        <span className="max-w-[120px] truncate">{activeBranchName}</span>
        <ChevronDownIcon
          size={14}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="
            absolute top-full left-0 mt-1 z-50
            min-w-[200px] max-w-[280px]
            bg-slate-900 border border-slate-700 rounded-lg shadow-xl
            overflow-hidden
          "
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-slate-800">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Branches
            </span>
          </div>

          {/* Branch List */}
          <div className="max-h-[240px] overflow-y-auto">
            {displayBranches.map((branch) => {
              const isActive = branch.id === activeBranchId;
              const canDelete = !branch.isDefault && onDeleteBranch;

              return (
                <div
                  key={branch.id}
                  onClick={() => handleBranchClick(branch.id)}
                  className={`
                    flex items-center justify-between px-3 py-2 cursor-pointer
                    transition-colors group
                    ${
                      isActive
                        ? 'bg-garden-500/10 text-garden-300'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {isActive ? (
                      <CheckIcon size={14} className="text-garden-400 flex-shrink-0" />
                    ) : (
                      <span className="w-[14px]" />
                    )}
                    <span className="truncate text-sm">{branch.name}</span>
                    {branch.isDefault && (
                      <span className="text-xs text-slate-500 flex-shrink-0">(default)</span>
                    )}
                  </div>

                  {/* Delete button (only for non-default, non-active branches) */}
                  {canDelete && !isActive && (
                    <button
                      onClick={(e) => handleDeleteClick(e, branch.id)}
                      className="
                        p-1 rounded opacity-0 group-hover:opacity-100
                        text-slate-500 hover:text-error-400 hover:bg-error-500/10
                        transition-all
                      "
                      title="Delete branch"
                    >
                      <TrashIcon size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Create New Branch */}
          <div className="border-t border-slate-800">
            <button
              onClick={handleCreateClick}
              className="
                flex items-center gap-2 w-full px-3 py-2.5
                text-sm text-slate-300 hover:text-slate-100 hover:bg-slate-800
                transition-colors
              "
            >
              <PlusIcon size={14} className="text-success-400" />
              <span>Create New Branch...</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchSelector;

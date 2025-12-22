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

  // Find active branch
  const activeBranch = branches.find((b) => b.id === activeBranchId);
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

  // Don't render if no branches
  if (branches.length === 0) {
    return null;
  }

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
              ? 'bg-zinc-800/50 text-zinc-500 cursor-not-allowed'
              : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-zinc-100'
          }
          border border-zinc-700
        `}
        title={`Current branch: ${activeBranchName}`}
      >
        <GitBranchIcon size={16} className="text-violet-400" />
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
            bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl
            overflow-hidden
          "
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-zinc-800">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
              Branches
            </span>
          </div>

          {/* Branch List */}
          <div className="max-h-[240px] overflow-y-auto">
            {branches.map((branch) => {
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
                        ? 'bg-violet-500/10 text-violet-300'
                        : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {isActive ? (
                      <CheckIcon size={14} className="text-violet-400 flex-shrink-0" />
                    ) : (
                      <span className="w-[14px]" />
                    )}
                    <span className="truncate text-sm">{branch.name}</span>
                    {branch.isDefault && (
                      <span className="text-xs text-zinc-500 flex-shrink-0">(default)</span>
                    )}
                  </div>

                  {/* Delete button (only for non-default, non-active branches) */}
                  {canDelete && !isActive && (
                    <button
                      onClick={(e) => handleDeleteClick(e, branch.id)}
                      className="
                        p-1 rounded opacity-0 group-hover:opacity-100
                        text-zinc-500 hover:text-red-400 hover:bg-red-500/10
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
          <div className="border-t border-zinc-800">
            <button
              onClick={handleCreateClick}
              className="
                flex items-center gap-2 w-full px-3 py-2.5
                text-sm text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800
                transition-colors
              "
            >
              <PlusIcon size={14} className="text-green-400" />
              <span>Create New Branch...</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchSelector;

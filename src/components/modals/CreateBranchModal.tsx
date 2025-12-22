'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { AppBranch } from '@/types/aiBuilderTypes';
import { GitBranchIcon, XIcon, AlertCircleIcon } from '../ui/Icons';
import { FocusTrap } from '../ui/FocusTrap';
import { validateBranchName } from '@/utils/branchMigration';

export interface CreateBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateBranch: (name: string, description?: string) => void;
  existingBranches: AppBranch[];
  sourceBranch?: AppBranch | null;
}

export function CreateBranchModal({
  isOpen,
  onClose,
  onCreateBranch,
  existingBranches,
  sourceBranch,
}: CreateBranchModalProps) {
  const [branchName, setBranchName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setBranchName('');
      setDescription('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Validate on name change
  useEffect(() => {
    if (branchName.trim()) {
      const validation = validateBranchName(branchName, existingBranches);
      setError(validation.valid ? null : validation.error || null);
    } else {
      setError(null);
    }
  }, [branchName, existingBranches]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const trimmedName = branchName.trim();
      if (!trimmedName) {
        setError('Branch name is required');
        return;
      }

      const validation = validateBranchName(trimmedName, existingBranches);
      if (!validation.valid) {
        setError(validation.error || 'Invalid branch name');
        return;
      }

      setIsSubmitting(true);
      try {
        onCreateBranch(trimmedName, description.trim() || undefined);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create branch');
        setIsSubmitting(false);
      }
    },
    [branchName, description, existingBranches, onCreateBranch, onClose]
  );

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Auto-slugify as user types (allow intermediate states)
    setBranchName(value.replace(/\s+/g, '-').toLowerCase());
  };

  if (!isOpen) return null;

  const sourceVersionNumber = sourceBranch?.versions?.length
    ? sourceBranch.versions[sourceBranch.versions.length - 1].versionNumber
    : 1;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <FocusTrap onEscape={onClose}>
        <div
          className="bg-zinc-900 rounded-xl border border-zinc-800 max-w-md w-full overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-600/20 flex items-center justify-center">
                  <GitBranchIcon size={20} className="text-violet-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-100">Create New Branch</h3>
                  <p className="text-sm text-zinc-400">
                    Branch from {sourceBranch?.name || 'main'} (v{sourceVersionNumber})
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="btn-icon" disabled={isSubmitting}>
                <XIcon size={18} />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Branch Name Input */}
            <div>
              <label
                htmlFor="branch-name"
                className="block text-sm font-medium text-zinc-300 mb-1.5"
              >
                Branch Name <span className="text-red-400">*</span>
              </label>
              <input
                id="branch-name"
                type="text"
                value={branchName}
                onChange={handleNameChange}
                placeholder="feature-dark-mode"
                autoFocus
                disabled={isSubmitting}
                className={`
                  w-full px-3 py-2 rounded-lg
                  bg-zinc-800 border text-zinc-100
                  placeholder:text-zinc-500
                  focus:outline-none focus:ring-2
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${
                    error
                      ? 'border-red-500/50 focus:ring-red-500/30'
                      : 'border-zinc-700 focus:ring-violet-500/30 focus:border-violet-500'
                  }
                `}
              />
              {error && (
                <div className="flex items-center gap-1.5 mt-1.5 text-sm text-red-400">
                  <AlertCircleIcon size={14} />
                  <span>{error}</span>
                </div>
              )}
              <p className="mt-1.5 text-xs text-zinc-500">
                Use lowercase letters, numbers, and hyphens
              </p>
            </div>

            {/* Description Input (Optional) */}
            <div>
              <label
                htmlFor="branch-description"
                className="block text-sm font-medium text-zinc-300 mb-1.5"
              >
                Description <span className="text-zinc-500">(optional)</span>
              </label>
              <textarea
                id="branch-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What changes are you planning to make?"
                rows={2}
                disabled={isSubmitting}
                className="
                  w-full px-3 py-2 rounded-lg
                  bg-zinc-800 border border-zinc-700 text-zinc-100
                  placeholder:text-zinc-500
                  focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500
                  disabled:opacity-50 disabled:cursor-not-allowed
                  resize-none
                "
              />
            </div>

            {/* Info Box */}
            <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
              <p className="text-xs text-zinc-400">
                Creating a branch copies the current code and conversation history. Changes made on
                this branch won&apos;t affect other branches.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="
                  px-4 py-2 rounded-lg text-sm font-medium
                  text-zinc-300 hover:text-zinc-100
                  bg-zinc-800 hover:bg-zinc-700
                  border border-zinc-700
                  transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !branchName.trim() || !!error}
                className="
                  px-4 py-2 rounded-lg text-sm font-medium
                  text-white
                  bg-violet-600 hover:bg-violet-500
                  transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                {isSubmitting ? 'Creating...' : 'Create Branch'}
              </button>
            </div>
          </form>
        </div>
      </FocusTrap>
    </div>
  );
}

export default CreateBranchModal;

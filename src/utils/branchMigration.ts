/**
 * Branch Migration Utility
 *
 * Handles migrating legacy GeneratedComponents (without branches)
 * to the new branch-aware format. Creates a "main" branch from
 * existing code, versions, and conversation history.
 */

import type { GeneratedComponent, AppBranch } from '@/types/aiBuilderTypes';

/**
 * Generate a unique branch ID
 */
function generateBranchId(): string {
  return `branch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Check if a component has been migrated to branch format
 */
export function hasBranches(component: GeneratedComponent): boolean {
  return Boolean(component.branches && component.branches.length > 0);
}

/**
 * Get the active branch from a component
 * Returns undefined if no branches exist
 */
export function getActiveBranch(component: GeneratedComponent): AppBranch | undefined {
  if (!component.branches || component.branches.length === 0) {
    return undefined;
  }

  // Find active branch by ID, or fall back to default branch
  const activeBranch = component.branches.find((b) => b.id === component.activeBranchId);

  if (activeBranch) {
    return activeBranch;
  }

  // Fall back to default branch
  return component.branches.find((b) => b.isDefault) || component.branches[0];
}

/**
 * Get the default (main) branch from a component
 */
export function getDefaultBranch(component: GeneratedComponent): AppBranch | undefined {
  if (!component.branches || component.branches.length === 0) {
    return undefined;
  }

  return component.branches.find((b) => b.isDefault) || component.branches[0];
}

/**
 * Migrate a legacy GeneratedComponent to branch format
 *
 * Creates a "main" branch containing:
 * - Current code
 * - Current versions array
 * - Current conversation history
 *
 * The original fields are preserved for backward compatibility,
 * but branches become the source of truth.
 *
 * @param component - The component to migrate
 * @returns The migrated component with branches
 */
export function migrateToBranchFormat(component: GeneratedComponent): GeneratedComponent {
  // Already migrated - return as-is
  if (hasBranches(component)) {
    return component;
  }

  const now = new Date().toISOString();

  // Create the main branch from existing data
  const mainBranch: AppBranch = {
    id: 'main', // Use predictable ID for main branch
    name: 'main',
    description: 'Default branch',
    code: component.code,
    versions: component.versions || [],
    conversationHistory: component.conversationHistory || [],
    createdAt: component.timestamp || now,
    updatedAt: now,
    createdFrom: null,
    isDefault: true,
  };

  return {
    ...component,
    branches: [mainBranch],
    activeBranchId: 'main',
  };
}

/**
 * Create a new branch from the current state of another branch
 *
 * @param component - The component to create a branch in
 * @param name - Name for the new branch
 * @param description - Optional description
 * @param sourceBranchId - ID of the branch to copy from (defaults to active branch)
 * @returns Updated component with the new branch added and set as active
 */
export function createBranch(
  component: GeneratedComponent,
  name: string,
  description?: string,
  sourceBranchId?: string
): GeneratedComponent {
  // Ensure component has branches
  const migratedComponent = migrateToBranchFormat(component);
  const branches = migratedComponent.branches || [];

  // Find source branch
  const sourceId = sourceBranchId || migratedComponent.activeBranchId || 'main';
  const sourceBranch = branches.find((b) => b.id === sourceId);

  if (!sourceBranch) {
    throw new Error(`Source branch not found: ${sourceId}`);
  }

  const now = new Date().toISOString();
  const newBranchId = generateBranchId();

  // Create new branch with copied data
  const newBranch: AppBranch = {
    id: newBranchId,
    name: name.trim(),
    description,
    code: sourceBranch.code,
    versions: [], // Fresh version history for new branch
    conversationHistory: [...sourceBranch.conversationHistory], // Copy chat history
    createdAt: now,
    updatedAt: now,
    createdFrom: {
      branchId: sourceBranch.id,
      branchName: sourceBranch.name,
      versionNumber:
        sourceBranch.versions.length > 0
          ? sourceBranch.versions[sourceBranch.versions.length - 1].versionNumber
          : undefined,
    },
    isDefault: false,
  };

  return {
    ...migratedComponent,
    branches: [...branches, newBranch],
    activeBranchId: newBranchId,
    // Also update top-level fields to reflect active branch
    code: newBranch.code,
    conversationHistory: newBranch.conversationHistory,
  };
}

/**
 * Switch to a different branch
 *
 * @param component - The component
 * @param branchId - ID of the branch to switch to
 * @returns Updated component with the new active branch
 */
export function switchBranch(component: GeneratedComponent, branchId: string): GeneratedComponent {
  if (!component.branches || component.branches.length === 0) {
    throw new Error('Component has no branches');
  }

  const branch = component.branches.find((b) => b.id === branchId);
  if (!branch) {
    throw new Error(`Branch not found: ${branchId}`);
  }

  return {
    ...component,
    activeBranchId: branchId,
    // Update top-level fields to reflect active branch
    code: branch.code,
    conversationHistory: branch.conversationHistory,
    versions: branch.versions,
  };
}

/**
 * Delete a branch from a component
 *
 * @param component - The component
 * @param branchId - ID of the branch to delete
 * @returns Updated component with the branch removed
 */
export function deleteBranch(component: GeneratedComponent, branchId: string): GeneratedComponent {
  if (!component.branches || component.branches.length === 0) {
    throw new Error('Component has no branches');
  }

  const branch = component.branches.find((b) => b.id === branchId);
  if (!branch) {
    throw new Error(`Branch not found: ${branchId}`);
  }

  if (branch.isDefault) {
    throw new Error('Cannot delete the default branch');
  }

  const updatedBranches = component.branches.filter((b) => b.id !== branchId);

  // If deleting active branch, switch to default
  let newActiveBranchId = component.activeBranchId;
  if (component.activeBranchId === branchId) {
    const defaultBranch = updatedBranches.find((b) => b.isDefault);
    newActiveBranchId = defaultBranch?.id || updatedBranches[0]?.id;
  }

  const newActiveBranch = updatedBranches.find((b) => b.id === newActiveBranchId);

  return {
    ...component,
    branches: updatedBranches,
    activeBranchId: newActiveBranchId,
    // Update top-level fields if active branch changed
    ...(newActiveBranch && {
      code: newActiveBranch.code,
      conversationHistory: newActiveBranch.conversationHistory,
      versions: newActiveBranch.versions,
    }),
  };
}

/**
 * Rename a branch
 *
 * @param component - The component
 * @param branchId - ID of the branch to rename
 * @param newName - New name for the branch
 * @returns Updated component with the renamed branch
 */
export function renameBranch(
  component: GeneratedComponent,
  branchId: string,
  newName: string
): GeneratedComponent {
  if (!component.branches || component.branches.length === 0) {
    throw new Error('Component has no branches');
  }

  const branchIndex = component.branches.findIndex((b) => b.id === branchId);
  if (branchIndex === -1) {
    throw new Error(`Branch not found: ${branchId}`);
  }

  // Check for duplicate name
  const nameExists = component.branches.some(
    (b) => b.id !== branchId && b.name.toLowerCase() === newName.trim().toLowerCase()
  );
  if (nameExists) {
    throw new Error(`Branch name already exists: ${newName}`);
  }

  const updatedBranches = [...component.branches];
  updatedBranches[branchIndex] = {
    ...updatedBranches[branchIndex],
    name: newName.trim(),
    updatedAt: new Date().toISOString(),
  };

  return {
    ...component,
    branches: updatedBranches,
  };
}

/**
 * Update the code for the active branch
 *
 * @param component - The component
 * @param code - New code
 * @returns Updated component with the new code in the active branch
 */
export function updateActiveBranchCode(
  component: GeneratedComponent,
  code: string
): GeneratedComponent {
  if (!component.branches || component.branches.length === 0) {
    // No branches yet - just update the code directly
    return { ...component, code };
  }

  const activeBranchId = component.activeBranchId || 'main';
  const branchIndex = component.branches.findIndex((b) => b.id === activeBranchId);

  if (branchIndex === -1) {
    // Active branch not found - update code directly
    return { ...component, code };
  }

  const updatedBranches = [...component.branches];
  updatedBranches[branchIndex] = {
    ...updatedBranches[branchIndex],
    code,
    updatedAt: new Date().toISOString(),
  };

  return {
    ...component,
    branches: updatedBranches,
    code, // Keep top-level in sync
  };
}

/**
 * Sync current component state to the active branch
 * Call this before switching branches to save unsaved changes
 *
 * @param component - The component
 * @returns Updated component with active branch synced
 */
export function syncToActiveBranch(component: GeneratedComponent): GeneratedComponent {
  if (!component.branches || component.branches.length === 0) {
    return component;
  }

  const activeBranchId = component.activeBranchId || 'main';
  const branchIndex = component.branches.findIndex((b) => b.id === activeBranchId);

  if (branchIndex === -1) {
    return component;
  }

  const updatedBranches = [...component.branches];
  updatedBranches[branchIndex] = {
    ...updatedBranches[branchIndex],
    code: component.code,
    conversationHistory: component.conversationHistory,
    updatedAt: new Date().toISOString(),
  };

  return {
    ...component,
    branches: updatedBranches,
  };
}

/**
 * Add a message to the active branch's conversation history
 *
 * @param component - The component
 * @param message - Message to add
 * @returns Updated component with the message added
 */
export function addMessageToActiveBranch(
  component: GeneratedComponent,
  message: GeneratedComponent['conversationHistory'][0]
): GeneratedComponent {
  if (!component.branches || component.branches.length === 0) {
    // No branches yet - just update conversation history directly
    return {
      ...component,
      conversationHistory: [...component.conversationHistory, message],
    };
  }

  const activeBranchId = component.activeBranchId || 'main';
  const branchIndex = component.branches.findIndex((b) => b.id === activeBranchId);

  if (branchIndex === -1) {
    return {
      ...component,
      conversationHistory: [...component.conversationHistory, message],
    };
  }

  const updatedBranches = [...component.branches];
  updatedBranches[branchIndex] = {
    ...updatedBranches[branchIndex],
    conversationHistory: [...updatedBranches[branchIndex].conversationHistory, message],
    updatedAt: new Date().toISOString(),
  };

  return {
    ...component,
    branches: updatedBranches,
    conversationHistory: updatedBranches[branchIndex].conversationHistory,
  };
}

/**
 * Slugify a branch name (for URL-safe names)
 */
export function slugifyBranchName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Validate a branch name
 */
export function validateBranchName(
  name: string,
  existingBranches: AppBranch[]
): { valid: boolean; error?: string } {
  const trimmed = name.trim();

  if (!trimmed) {
    return { valid: false, error: 'Branch name is required' };
  }

  if (trimmed.length < 2) {
    return { valid: false, error: 'Branch name must be at least 2 characters' };
  }

  if (trimmed.length > 50) {
    return { valid: false, error: 'Branch name must be 50 characters or less' };
  }

  if (!/^[a-zA-Z0-9]/.test(trimmed)) {
    return { valid: false, error: 'Branch name must start with a letter or number' };
  }

  if (!/^[a-zA-Z0-9][a-zA-Z0-9-_]*$/.test(trimmed)) {
    return {
      valid: false,
      error: 'Branch name can only contain letters, numbers, hyphens, and underscores',
    };
  }

  const nameExists = existingBranches.some((b) => b.name.toLowerCase() === trimmed.toLowerCase());
  if (nameExists) {
    return { valid: false, error: 'A branch with this name already exists' };
  }

  return { valid: true };
}

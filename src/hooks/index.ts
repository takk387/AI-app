/**
 * Custom Hooks Index
 *
 * This module re-exports all custom hooks for the AI Builder application.
 * Import hooks from this file for cleaner imports.
 *
 * @example
 * ```tsx
 * import {
 *   useDatabaseSync,
 *   useFileStorage,
 *   useVersionControl,
 *   useMessageSender,
 *   useChatSystem,
 *   useKeyboardShortcuts,
 * } from '@/hooks';
 * ```
 */

// Database synchronization hook
export { useDatabaseSync } from './useDatabaseSync';
export type { UseDatabaseSyncOptions, UseDatabaseSyncReturn } from './useDatabaseSync';

// File storage hook
export { useFileStorage } from './useFileStorage';
export type { UseFileStorageOptions, UseFileStorageReturn } from './useFileStorage';

// Version control hook
export { useVersionControl } from './useVersionControl';
export type { UseVersionControlOptions, UseVersionControlReturn } from './useVersionControl';

// Message sender hook
export { useMessageSender } from './useMessageSender';
export type { UseMessageSenderOptions, UseMessageSenderReturn } from './useMessageSender';

// Chat system hook
export { useChatSystem } from './useChatSystem';
export type { UseChatSystemReturn } from './useChatSystem';

// Keyboard shortcuts hook
export { useKeyboardShortcuts } from './useKeyboardShortcuts';
export type { UseKeyboardShortcutsOptions } from './useKeyboardShortcuts';

// Smart context hook (compression + semantic memory)
export { useSmartContext } from './useSmartContext';
export type {
  UseSmartContextReturn,
  SmartContextOptions,
  SmartContextResult,
} from './useSmartContext';

// Re-export existing hooks for completeness
// Note: useBuildPhases replaced by useDynamicBuildPhases
export { useDynamicBuildPhases } from './useDynamicBuildPhases';
export type {
  UseDynamicBuildPhasesOptions,
  UseDynamicBuildPhasesReturn,
} from './useDynamicBuildPhases';

export { useResizable } from './useResizable';
export type { UseResizableOptions, UseResizableReturn } from './useResizable';

export { useReview } from './useReview';
export type { UseReviewReturn } from './useReview';

export { useSettings } from './useSettings';

export { useTheme } from './useTheme';

// Element Inspector hook (dev tool)
export { useElementInspector } from './useElementInspector';
export type { UseElementInspectorOptions, UseElementInspectorReturn } from './useElementInspector';

// Send message hook (extracted from MainBuilderView)
export { useSendMessage } from './useSendMessage';
export type { UseSendMessageOptions, UseSendMessageReturn, WizardState } from './useSendMessage';

// Version handlers hook (extracted from MainBuilderView)
export { useVersionHandlers } from './useVersionHandlers';
export type { UseVersionHandlersOptions, UseVersionHandlersReturn } from './useVersionHandlers';

// App CRUD hook (extracted from MainBuilderView)
export { useAppCrud } from './useAppCrud';
export type { UseAppCrudOptions, UseAppCrudReturn } from './useAppCrud';

// Auto-save on navigation hook (ensures wizard/design data persists on page changes)
export { useAutoSaveOnNavigation } from './useAutoSaveOnNavigation';
export type { UseAutoSaveOnNavigationOptions } from './useAutoSaveOnNavigation';

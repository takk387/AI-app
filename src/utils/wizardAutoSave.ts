/**
 * Auto-save functionality for wizard forms
 */

export const WIZARD_DRAFT_KEYS = {
  APP_CONCEPT: 'wizard_draft_app_concept',
  BASIC_INFO: 'wizard_draft_basic_info',
  FEATURES: 'wizard_draft_features',
  DESIGN: 'wizard_draft_design',
  TECHNICAL: 'wizard_draft_technical',
  CONVERSATIONAL: 'wizard_conversational'
} as const;

interface DraftMetadata {
  key: string;
  savedAt: string;
  version: number;
}

interface DraftWithMetadata<T> {
  data: T;
  metadata: DraftMetadata;
}

/**
 * Save wizard draft to localStorage
 */
export function saveWizardDraft<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;

  try {
    const draft: DraftWithMetadata<T> = {
      data,
      metadata: {
        key,
        savedAt: new Date().toISOString(),
        version: 1
      }
    };

    localStorage.setItem(key, JSON.stringify(draft));
  } catch (error) {
    console.error('Failed to save wizard draft:', error);
  }
}

/**
 * Load wizard draft from localStorage
 */
export function loadWizardDraft<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const draft: DraftWithMetadata<T> = JSON.parse(stored);
    return draft.data;
  } catch (error) {
    console.error('Failed to load wizard draft:', error);
    return null;
  }
}

/**
 * Check if a draft exists
 */
export function hasDraft(key: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

/**
 * Delete a specific draft
 */
export function deleteDraft(key: string): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to delete wizard draft:', error);
  }
}

/**
 * Get draft metadata without loading full data
 */
export function getDraftMetadata(key: string): DraftMetadata | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const draft = JSON.parse(stored);
    return draft.metadata || null;
  } catch {
    return null;
  }
}

/**
 * Format draft age in human-readable format
 */
export function formatDraftAge(timestamp: string): string {
  const savedDate = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - savedDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else {
    return savedDate.toLocaleDateString();
  }
}

/**
 * AutoSaver class for managing auto-save with debouncing
 * Supports both simple data saving and callback-based periodic saving
 */
export class AutoSaver<T> {
  private key: string;
  private debounceMs: number;
  private autoSaveIntervalMs: number;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private getDataFn: (() => T) | null = null;
  private onSaveCallback: (() => void) | null = null;

  constructor(key: string, debounceMs: number = 1000, autoSaveIntervalMs: number = 60000) {
    // Don't add prefix if key already starts with wizard_
    this.key = key.startsWith('wizard_') ? key : `wizard_draft_${key}`;
    this.debounceMs = debounceMs;
    this.autoSaveIntervalMs = autoSaveIntervalMs;
  }

  /**
   * Start auto-saving with a data getter function
   * @param getData - Function that returns current data to save
   * @param onSave - Optional callback called after each save
   */
  start(getData: (() => T) | T, onSave?: () => void): void {
    // Handle both API styles: start(getData, onSave) and start(data)
    if (typeof getData === 'function') {
      // New API: callback-based periodic saving
      this.getDataFn = getData as () => T;
      this.onSaveCallback = onSave || null;

      // Save immediately
      this.save(this.getDataFn());

      // Set up interval for periodic saving (configurable, default 60s)
      if (this.intervalId) {
        clearInterval(this.intervalId);
      }
      this.intervalId = setInterval(() => {
        if (this.getDataFn) {
          this.save(this.getDataFn());
        }
      }, this.autoSaveIntervalMs);
    } else {
      // Legacy API: debounced single data save
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
      }

      this.timeoutId = setTimeout(() => {
        saveWizardDraft(this.key, getData);
        this.timeoutId = null;
      }, this.debounceMs);
    }
  }

  /**
   * Stop pending auto-save and periodic saving
   */
  stop(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.getDataFn = null;
    this.onSaveCallback = null;
  }

  /**
   * Immediately save (no debounce)
   */
  save(data: T): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    saveWizardDraft(this.key, data);
    if (this.onSaveCallback) {
      this.onSaveCallback();
    }
  }

  /**
   * Load draft data
   */
  load(): T | null {
    return loadWizardDraft<T>(this.key);
  }

  /**
   * Check if draft exists
   */
  hasDraft(): boolean {
    return hasDraft(this.key);
  }

  /**
   * Delete draft
   */
  delete(): void {
    this.stop();
    deleteDraft(this.key);
  }

  /**
   * Get draft metadata with exists flag for ConversationalAppWizard compatibility
   */
  getMetadata(): { exists: boolean; timestamp?: string; ageInMinutes?: number } | null {
    const metadata = getDraftMetadata(this.key);
    if (!metadata) {
      return { exists: false };
    }
    const ageInMinutes = Math.floor(
      (Date.now() - new Date(metadata.savedAt).getTime()) / 60000
    );
    return {
      exists: true,
      timestamp: metadata.savedAt,
      ageInMinutes,
    };
  }
}

/**
 * Create a new AutoSaver instance
 */
export function createAutoSaver<T>(
  key: string,
  debounceMs: number = 1000,
  autoSaveIntervalMs: number = 60000
): AutoSaver<T> {
  return new AutoSaver<T>(key, debounceMs, autoSaveIntervalMs);
}

/**
 * Clear all wizard drafts
 */
export function clearAllDrafts(): void {
  if (typeof window === 'undefined') return;

  try {
    Object.values(WIZARD_DRAFT_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error('Failed to clear all wizard drafts:', error);
  }
}

/**
 * Get all existing drafts
 */
export function getAllDrafts(): Array<{
  key: string;
  metadata: DraftMetadata | null;
}> {
  if (typeof window === 'undefined') return [];

  return Object.values(WIZARD_DRAFT_KEYS)
    .map((key) => ({
      key,
      metadata: getDraftMetadata(key)
    }))
    .filter((draft) => draft.metadata !== null);
}

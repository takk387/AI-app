/**
 * Auto-save functionality for wizard forms
 */

export const WIZARD_DRAFT_KEYS = {
  APP_CONCEPT: 'wizard_draft_app_concept',
  BASIC_INFO: 'wizard_draft_basic_info',
  FEATURES: 'wizard_draft_features',
  DESIGN: 'wizard_draft_design',
  TECHNICAL: 'wizard_draft_technical'
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
 */
export class AutoSaver<T> {
  private key: string;
  private debounceMs: number;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(key: string, debounceMs: number = 1000) {
    this.key = key;
    this.debounceMs = debounceMs;
  }

  /**
   * Start auto-saving (debounced)
   */
  start(data: T): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      saveWizardDraft(this.key, data);
      this.timeoutId = null;
    }, this.debounceMs);
  }

  /**
   * Stop pending auto-save
   */
  stop(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * Immediately save (no debounce)
   */
  save(data: T): void {
    this.stop();
    saveWizardDraft(this.key, data);
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
   * Get draft metadata
   */
  getMetadata(): DraftMetadata | null {
    return getDraftMetadata(this.key);
  }
}

/**
 * Create a new AutoSaver instance
 */
export function createAutoSaver<T>(
  key: string,
  debounceMs: number = 1000
): AutoSaver<T> {
  return new AutoSaver<T>(key, debounceMs);
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

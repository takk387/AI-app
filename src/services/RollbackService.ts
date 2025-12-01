/**
 * RollbackService - Manages restore points for staged rollback
 * 
 * Features:
 * - Create and store restore points before changes
 * - One-click rollback to previous state
 * - Rollback individual files
 * - Maintain rollback history with configurable max points
 * - Automatic pruning of old restore points
 */

import type { RestorePoint, IRollbackService } from '@/types/review';

/**
 * Storage key for restore points in localStorage
 */
const STORAGE_KEY = 'review_restore_points';

/**
 * Default maximum number of restore points to keep
 */
const DEFAULT_MAX_RESTORE_POINTS = 10;

/**
 * RollbackService implementation
 */
export class RollbackService implements IRollbackService {
  private restorePoints: RestorePoint[] = [];
  private maxRestorePoints: number = DEFAULT_MAX_RESTORE_POINTS;

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load restore points from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate that parsed data is an array
        if (!Array.isArray(parsed)) {
          console.error('Invalid restore points data: expected array');
          this.restorePoints = [];
          return;
        }
        // Validate and convert each restore point
        this.restorePoints = parsed
          .filter((point: unknown) => {
            // Basic validation of restore point structure
            if (typeof point !== 'object' || point === null) return false;
            const p = point as Record<string, unknown>;
            return (
              typeof p.id === 'string' &&
              typeof p.label === 'string' &&
              (typeof p.timestamp === 'string' || p.timestamp instanceof Date) &&
              Array.isArray(p.files)
            );
          })
          .map((point: RestorePoint) => ({
            ...point,
            timestamp: new Date(point.timestamp),
          }));
      }
    } catch (error) {
      console.error('Error loading restore points from storage:', error);
      this.restorePoints = [];
    }
  }

  /**
   * Save restore points to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.restorePoints));
    } catch (error) {
      console.error('Error saving restore points to storage:', error);
    }
  }

  /**
   * Generate a unique ID for a restore point
   */
  private generateId(): string {
    // Use crypto.randomUUID if available, fallback to timestamp-based ID
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `rp_${crypto.randomUUID()}`;
    }
    return `rp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Create a new restore point
   */
  async createRestorePoint(
    label: string,
    files: { path: string; content: string }[],
    metadata: RestorePoint['metadata']
  ): Promise<RestorePoint> {
    const restorePoint: RestorePoint = {
      id: this.generateId(),
      label,
      timestamp: new Date(),
      files: files.map(f => ({ ...f })), // Deep copy files
      metadata: { ...metadata },
    };

    // Add to beginning of array (most recent first)
    this.restorePoints.unshift(restorePoint);

    // Prune if necessary
    this.pruneOldPoints();

    // Save to storage
    this.saveToStorage();

    return restorePoint;
  }

  /**
   * Get all restore points
   */
  getRestorePoints(): RestorePoint[] {
    return [...this.restorePoints];
  }

  /**
   * Rollback to a specific restore point
   * Returns the files from that restore point
   */
  async rollbackTo(pointId: string): Promise<{ path: string; content: string }[]> {
    const point = this.restorePoints.find(p => p.id === pointId);
    
    if (!point) {
      throw new Error(`Restore point not found: ${pointId}`);
    }

    // Return a copy of the files
    return point.files.map(f => ({ ...f }));
  }

  /**
   * Rollback a specific file from a restore point
   */
  async rollbackFile(
    pointId: string,
    filePath: string
  ): Promise<{ path: string; content: string } | null> {
    const point = this.restorePoints.find(p => p.id === pointId);
    
    if (!point) {
      throw new Error(`Restore point not found: ${pointId}`);
    }

    const file = point.files.find(f => f.path === filePath);
    
    if (!file) {
      return null;
    }

    return { ...file };
  }

  /**
   * Delete a restore point
   */
  deleteRestorePoint(pointId: string): void {
    const index = this.restorePoints.findIndex(p => p.id === pointId);
    
    if (index !== -1) {
      this.restorePoints.splice(index, 1);
      this.saveToStorage();
    }
  }

  /**
   * Get the maximum number of restore points
   */
  getMaxRestorePoints(): number {
    return this.maxRestorePoints;
  }

  /**
   * Set the maximum number of restore points
   */
  setMaxRestorePoints(max: number): void {
    this.maxRestorePoints = Math.max(1, max);
    this.pruneOldPoints();
    this.saveToStorage();
  }

  /**
   * Prune old restore points beyond the maximum
   */
  pruneOldPoints(): void {
    if (this.restorePoints.length > this.maxRestorePoints) {
      this.restorePoints = this.restorePoints.slice(0, this.maxRestorePoints);
    }
  }

  /**
   * Clear all restore points
   */
  clearAll(): void {
    this.restorePoints = [];
    this.saveToStorage();
  }

  /**
   * Get a restore point by ID
   */
  getRestorePoint(pointId: string): RestorePoint | undefined {
    return this.restorePoints.find(p => p.id === pointId);
  }

  /**
   * Check if a restore point exists
   */
  hasRestorePoint(pointId: string): boolean {
    return this.restorePoints.some(p => p.id === pointId);
  }

  /**
   * Get the most recent restore point
   */
  getMostRecent(): RestorePoint | undefined {
    return this.restorePoints[0];
  }

  /**
   * Get files from a restore point
   */
  getFiles(pointId: string): { path: string; content: string }[] | undefined {
    const point = this.restorePoints.find(p => p.id === pointId);
    return point?.files.map(f => ({ ...f }));
  }

  /**
   * Export all restore points for backup
   */
  exportRestorePoints(): string {
    return JSON.stringify(this.restorePoints, null, 2);
  }

  /**
   * Import restore points from backup
   */
  importRestorePoints(json: string): void {
    try {
      const imported = JSON.parse(json);
      if (Array.isArray(imported)) {
        this.restorePoints = imported.map((point: RestorePoint) => ({
          ...point,
          timestamp: new Date(point.timestamp),
        }));
        this.pruneOldPoints();
        this.saveToStorage();
      }
    } catch (error) {
      throw new Error('Invalid restore points data');
    }
  }
}

/**
 * Singleton instance of RollbackService
 */
let rollbackServiceInstance: RollbackService | null = null;

/**
 * Get the singleton instance of RollbackService
 */
export function getRollbackService(): RollbackService {
  if (!rollbackServiceInstance) {
    rollbackServiceInstance = new RollbackService();
  }
  return rollbackServiceInstance;
}

/**
 * Create a new restore point (convenience function)
 */
export async function createRestorePoint(
  label: string,
  files: { path: string; content: string }[],
  metadata: RestorePoint['metadata']
): Promise<RestorePoint> {
  return getRollbackService().createRestorePoint(label, files, metadata);
}

/**
 * Rollback to a restore point (convenience function)
 */
export async function rollbackTo(
  pointId: string
): Promise<{ path: string; content: string }[]> {
  return getRollbackService().rollbackTo(pointId);
}

/**
 * Get all restore points (convenience function)
 */
export function getRestorePoints(): RestorePoint[] {
  return getRollbackService().getRestorePoints();
}

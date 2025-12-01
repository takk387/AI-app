/**
 * Type definitions for the Enhanced Review System
 * 
 * Provides comprehensive types for:
 * - Side-by-side diff comparison
 * - Inline commenting
 * - Hunk-level approval
 * - Change categorization
 * - Impact analysis
 * - Staged rollback
 * - Review queue management
 */

// ============================================================================
// CHANGE CATEGORIES
// ============================================================================

/**
 * Categories for code modifications
 */
export type ChangeCategory =
  | 'structure'       // File/folder changes
  | 'styling'         // CSS/Tailwind changes
  | 'logic'           // JavaScript/TypeScript logic
  | 'content'         // Text/copy changes
  | 'configuration'   // Config file changes
  | 'dependencies';   // Package changes

/**
 * Risk level assessment for changes
 */
export type RiskLevel = 'low' | 'medium' | 'high';

/**
 * Status of a hunk or change during review
 */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

// ============================================================================
// LINE AND DIFF TYPES
// ============================================================================

/**
 * Comment on a specific line of code
 */
export interface LineComment {
  id: string;
  lineNumber: number;
  content: string;
  author: string;
  timestamp: string;
  resolved: boolean;
  needsAttention?: boolean;
}

/**
 * Single line in a diff
 */
export interface DiffLine {
  number: number;
  originalNumber?: number;
  modifiedNumber?: number;
  content: string;
  type: 'unchanged' | 'added' | 'removed';
  comments: LineComment[];
}

/**
 * A hunk (group of related changes) in a diff
 */
export interface DiffHunk {
  id: string;
  startLine: number;
  endLine: number;
  originalStartLine?: number;
  originalEndLine?: number;
  type: 'addition' | 'deletion' | 'modification';
  category: ChangeCategory;
  status: ApprovalStatus;
  lines: DiffLine[];
  summary: string;
}

// ============================================================================
// FILE CHANGE TYPES
// ============================================================================

/**
 * Represents changes to a single file
 */
export interface FileChange {
  path: string;
  originalContent?: string;
  modifiedContent?: string;
  hunks: DiffHunk[];
  riskLevel: RiskLevel;
  category: ChangeCategory;
  action: 'create' | 'modify' | 'delete';
}

// ============================================================================
// IMPACT ANALYSIS TYPES
// ============================================================================

/**
 * Analysis of potential impact from changes
 */
export interface ImpactAnalysis {
  filesAffected: string[];
  componentsAffected: string[];
  breakingChanges: string[];
  suggestedTests: string[];
  overallRisk: RiskLevel;
  dependencies: string[];
}

// ============================================================================
// RESTORE POINT TYPES
// ============================================================================

/**
 * A snapshot of files at a point in time for rollback
 */
export interface RestorePoint {
  id: string;
  label: string;
  timestamp: Date;
  files: { path: string; content: string }[];
  metadata: {
    changeDescription: string;
    filesChanged: number;
    approvedHunks?: number;
    rejectedHunks?: number;
  };
}

// ============================================================================
// COMPONENT PROPS INTERFACES
// ============================================================================

/**
 * Props for the EnhancedDiffViewer component
 */
export interface EnhancedDiffViewerProps {
  original: string;
  modified: string;
  fileName: string;
  language: string;
  hunks: DiffHunk[];
  onHunkApprove: (hunkId: string) => void;
  onHunkReject: (hunkId: string) => void;
  onAddComment: (lineNumber: number, comment: string) => void;
  showLineNumbers?: boolean;
  contextLines?: number;
}

/**
 * Props for the HunkApprovalCard component
 */
export interface HunkApprovalCardProps {
  hunk: DiffHunk;
  onApprove: () => void;
  onReject: () => void;
  onReset: () => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

/**
 * Props for the ReviewSidebar component
 */
export interface ReviewSidebarProps {
  changes: FileChange[];
  selectedFilePath: string | null;
  onSelectFile: (path: string) => void;
  categoryFilter: ChangeCategory | 'all';
  onCategoryFilterChange: (category: ChangeCategory | 'all') => void;
  statusFilter: ApprovalStatus | 'all';
  onStatusFilterChange: (status: ApprovalStatus | 'all') => void;
}

/**
 * Props for the ReviewPanel component
 */
export interface ReviewPanelProps {
  changes: FileChange[];
  onApproveAll: () => void;
  onRejectAll: () => void;
  onApplyApproved: () => void;
  onRollback: () => void;
  impactAnalysis: ImpactAnalysis;
}

/**
 * Props for the ImpactAnalysisPanel component
 */
export interface ImpactAnalysisPanelProps {
  analysis: ImpactAnalysis;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

/**
 * Props for the CommentThread component
 */
export interface CommentThreadProps {
  comments: LineComment[];
  lineNumber: number;
  onAddComment: (content: string) => void;
  onResolveComment: (commentId: string) => void;
  onDeleteComment: (commentId: string) => void;
  onMarkNeedsAttention: (commentId: string, needsAttention: boolean) => void;
}

/**
 * Props for the RollbackHistory component
 */
export interface RollbackHistoryProps {
  restorePoints: RestorePoint[];
  onRollbackTo: (pointId: string) => void;
  onRollbackFile: (pointId: string, filePath: string) => void;
  onDeletePoint: (pointId: string) => void;
  maxRestorePoints?: number;
}

/**
 * Props for the ReviewSummary component
 */
export interface ReviewSummaryProps {
  changes: FileChange[];
  totalHunks: number;
  approvedHunks: number;
  rejectedHunks: number;
  pendingHunks: number;
  impactAnalysis: ImpactAnalysis;
  onApplyApproved: () => void;
}

// ============================================================================
// REVIEW STATE TYPES
// ============================================================================

/**
 * State for the review process
 */
export interface ReviewState {
  changes: FileChange[];
  selectedFilePath: string | null;
  categoryFilter: ChangeCategory | 'all';
  statusFilter: ApprovalStatus | 'all';
  restorePoints: RestorePoint[];
  impactAnalysis: ImpactAnalysis | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Actions for the review state reducer
 */
export type ReviewAction =
  | { type: 'SET_CHANGES'; payload: FileChange[] }
  | { type: 'SELECT_FILE'; payload: string | null }
  | { type: 'SET_CATEGORY_FILTER'; payload: ChangeCategory | 'all' }
  | { type: 'SET_STATUS_FILTER'; payload: ApprovalStatus | 'all' }
  | { type: 'APPROVE_HUNK'; payload: { filePath: string; hunkId: string } }
  | { type: 'REJECT_HUNK'; payload: { filePath: string; hunkId: string } }
  | { type: 'RESET_HUNK'; payload: { filePath: string; hunkId: string } }
  | { type: 'APPROVE_ALL' }
  | { type: 'REJECT_ALL' }
  | { type: 'ADD_COMMENT'; payload: { filePath: string; hunkId: string; lineNumber: number; comment: LineComment } }
  | { type: 'RESOLVE_COMMENT'; payload: { filePath: string; hunkId: string; lineNumber: number; commentId: string } }
  | { type: 'ADD_RESTORE_POINT'; payload: RestorePoint }
  | { type: 'DELETE_RESTORE_POINT'; payload: string }
  | { type: 'SET_IMPACT_ANALYSIS'; payload: ImpactAnalysis | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

/**
 * Interface for the Rollback Service
 */
export interface IRollbackService {
  createRestorePoint(label: string, files: { path: string; content: string }[], metadata: RestorePoint['metadata']): Promise<RestorePoint>;
  getRestorePoints(): RestorePoint[];
  rollbackTo(pointId: string): Promise<{ path: string; content: string }[]>;
  rollbackFile(pointId: string, filePath: string): Promise<{ path: string; content: string } | null>;
  deleteRestorePoint(pointId: string): void;
  getMaxRestorePoints(): number;
  setMaxRestorePoints(max: number): void;
  pruneOldPoints(): void;
}

/**
 * Interface for the Impact Analyzer Service
 */
export interface IImpactAnalyzer {
  analyzeChanges(changes: FileChange[]): Promise<ImpactAnalysis>;
  categorizeChange(content: string, filePath: string): ChangeCategory;
  assessRisk(change: FileChange): RiskLevel;
  findAffectedComponents(changes: FileChange[]): string[];
  detectBreakingChanges(changes: FileChange[]): string[];
  suggestTests(changes: FileChange[]): string[];
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Statistics about the current review session
 */
export interface ReviewStatistics {
  totalFiles: number;
  totalHunks: number;
  approvedHunks: number;
  rejectedHunks: number;
  pendingHunks: number;
  totalComments: number;
  unresolvedComments: number;
  byCategory: Record<ChangeCategory, number>;
  byRiskLevel: Record<RiskLevel, number>;
}

/**
 * Configuration options for the review system
 */
export interface ReviewConfig {
  maxRestorePoints: number;
  autoExpandHunks: boolean;
  showLineNumbers: boolean;
  contextLines: number;
  enableComments: boolean;
  requireApprovalForHighRisk: boolean;
}

/**
 * Default configuration for the review system
 */
export const DEFAULT_REVIEW_CONFIG: Readonly<ReviewConfig> = Object.freeze({
  maxRestorePoints: 10,
  autoExpandHunks: true,
  showLineNumbers: true,
  contextLines: 3,
  enableComments: true,
  requireApprovalForHighRisk: true,
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get display name for a change category
 */
export function getCategoryDisplayName(category: ChangeCategory): string {
  const names: Record<ChangeCategory, string> = {
    structure: 'Structure',
    styling: 'Styling',
    logic: 'Logic',
    content: 'Content',
    configuration: 'Configuration',
    dependencies: 'Dependencies',
  };
  return names[category];
}

/**
 * Get icon for a change category
 */
export function getCategoryIcon(category: ChangeCategory): string {
  const icons: Record<ChangeCategory, string> = {
    structure: '📁',
    styling: '🎨',
    logic: '⚙️',
    content: '📝',
    configuration: '⚡',
    dependencies: '📦',
  };
  return icons[category];
}

/**
 * Get color class for risk level
 */
export function getRiskLevelColor(risk: RiskLevel): string {
  const colors: Record<RiskLevel, string> = {
    low: 'text-green-400',
    medium: 'text-yellow-400',
    high: 'text-red-400',
  };
  return colors[risk];
}

/**
 * Get background color class for risk level
 */
export function getRiskLevelBgColor(risk: RiskLevel): string {
  const colors: Record<RiskLevel, string> = {
    low: 'bg-green-500/20 border-green-500/30',
    medium: 'bg-yellow-500/20 border-yellow-500/30',
    high: 'bg-red-500/20 border-red-500/30',
  };
  return colors[risk];
}

/**
 * Get color class for approval status
 */
export function getStatusColor(status: ApprovalStatus): string {
  const colors: Record<ApprovalStatus, string> = {
    pending: 'text-slate-400',
    approved: 'text-green-400',
    rejected: 'text-red-400',
  };
  return colors[status];
}

/**
 * Get background color class for approval status
 */
export function getStatusBgColor(status: ApprovalStatus): string {
  const colors: Record<ApprovalStatus, string> = {
    pending: 'bg-slate-500/20 border-slate-500/30',
    approved: 'bg-green-500/20 border-green-500/30',
    rejected: 'bg-red-500/20 border-red-500/30',
  };
  return colors[status];
}

/**
 * Calculate review statistics from changes
 */
export function calculateReviewStatistics(changes: FileChange[]): ReviewStatistics {
  let totalHunks = 0;
  let approvedHunks = 0;
  let rejectedHunks = 0;
  let pendingHunks = 0;
  let totalComments = 0;
  let unresolvedComments = 0;
  
  const byCategory: Record<ChangeCategory, number> = {
    structure: 0,
    styling: 0,
    logic: 0,
    content: 0,
    configuration: 0,
    dependencies: 0,
  };
  
  const byRiskLevel: Record<RiskLevel, number> = {
    low: 0,
    medium: 0,
    high: 0,
  };

  for (const change of changes) {
    byCategory[change.category]++;
    byRiskLevel[change.riskLevel]++;
    
    for (const hunk of change.hunks) {
      totalHunks++;
      if (hunk.status === 'approved') approvedHunks++;
      else if (hunk.status === 'rejected') rejectedHunks++;
      else pendingHunks++;
      
      for (const line of hunk.lines) {
        totalComments += line.comments.length;
        unresolvedComments += line.comments.filter(c => !c.resolved).length;
      }
    }
  }

  return {
    totalFiles: changes.length,
    totalHunks,
    approvedHunks,
    rejectedHunks,
    pendingHunks,
    totalComments,
    unresolvedComments,
    byCategory,
    byRiskLevel,
  };
}

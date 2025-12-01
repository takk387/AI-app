/**
 * useReview Hook - State management for the Enhanced Review System
 * 
 * Provides:
 * - Review state management
 * - Hunk approval/rejection
 * - Comment management
 * - Filtering and statistics
 * - Integration with RollbackService and ImpactAnalyzer
 */

import { useReducer, useCallback, useEffect, useMemo } from 'react';
import type {
  ReviewState,
  ReviewAction,
  FileChange,
  ChangeCategory,
  ApprovalStatus,
  LineComment,
  RestorePoint,
  ImpactAnalysis,
  ReviewStatistics,
  DiffHunk,
} from '@/types/review';
import { calculateReviewStatistics } from '@/types/review';
import { getRollbackService } from '@/services/RollbackService';
import { getImpactAnalyzer } from '@/services/ImpactAnalyzer';

/**
 * Initial state for the review system
 */
const initialState: ReviewState = {
  changes: [],
  selectedFilePath: null,
  categoryFilter: 'all',
  statusFilter: 'all',
  restorePoints: [],
  impactAnalysis: null,
  isLoading: false,
  error: null,
};

/**
 * Reducer for review state
 */
function reviewReducer(state: ReviewState, action: ReviewAction): ReviewState {
  switch (action.type) {
    case 'SET_CHANGES':
      return {
        ...state,
        changes: action.payload,
        selectedFilePath: action.payload.length > 0 ? action.payload[0].path : null,
      };

    case 'SELECT_FILE':
      return {
        ...state,
        selectedFilePath: action.payload,
      };

    case 'SET_CATEGORY_FILTER':
      return {
        ...state,
        categoryFilter: action.payload,
      };

    case 'SET_STATUS_FILTER':
      return {
        ...state,
        statusFilter: action.payload,
      };

    case 'APPROVE_HUNK': {
      const { filePath, hunkId } = action.payload;
      return {
        ...state,
        changes: state.changes.map(change =>
          change.path === filePath
            ? {
                ...change,
                hunks: change.hunks.map(hunk =>
                  hunk.id === hunkId
                    ? { ...hunk, status: 'approved' as ApprovalStatus }
                    : hunk
                ),
              }
            : change
        ),
      };
    }

    case 'REJECT_HUNK': {
      const { filePath, hunkId } = action.payload;
      return {
        ...state,
        changes: state.changes.map(change =>
          change.path === filePath
            ? {
                ...change,
                hunks: change.hunks.map(hunk =>
                  hunk.id === hunkId
                    ? { ...hunk, status: 'rejected' as ApprovalStatus }
                    : hunk
                ),
              }
            : change
        ),
      };
    }

    case 'RESET_HUNK': {
      const { filePath, hunkId } = action.payload;
      return {
        ...state,
        changes: state.changes.map(change =>
          change.path === filePath
            ? {
                ...change,
                hunks: change.hunks.map(hunk =>
                  hunk.id === hunkId
                    ? { ...hunk, status: 'pending' as ApprovalStatus }
                    : hunk
                ),
              }
            : change
        ),
      };
    }

    case 'APPROVE_ALL':
      return {
        ...state,
        changes: state.changes.map(change => ({
          ...change,
          hunks: change.hunks.map(hunk => ({
            ...hunk,
            status: 'approved' as ApprovalStatus,
          })),
        })),
      };

    case 'REJECT_ALL':
      return {
        ...state,
        changes: state.changes.map(change => ({
          ...change,
          hunks: change.hunks.map(hunk => ({
            ...hunk,
            status: 'rejected' as ApprovalStatus,
          })),
        })),
      };

    case 'ADD_COMMENT': {
      const { filePath, hunkId, lineNumber, comment } = action.payload;
      return {
        ...state,
        changes: state.changes.map(change =>
          change.path === filePath
            ? {
                ...change,
                hunks: change.hunks.map(hunk =>
                  hunk.id === hunkId
                    ? {
                        ...hunk,
                        lines: hunk.lines.map(line =>
                          line.number === lineNumber
                            ? { ...line, comments: [...line.comments, comment] }
                            : line
                        ),
                      }
                    : hunk
                ),
              }
            : change
        ),
      };
    }

    case 'RESOLVE_COMMENT': {
      const { filePath, hunkId, lineNumber, commentId } = action.payload;
      return {
        ...state,
        changes: state.changes.map(change =>
          change.path === filePath
            ? {
                ...change,
                hunks: change.hunks.map(hunk =>
                  hunk.id === hunkId
                    ? {
                        ...hunk,
                        lines: hunk.lines.map(line =>
                          line.number === lineNumber
                            ? {
                                ...line,
                                comments: line.comments.map(c =>
                                  c.id === commentId ? { ...c, resolved: true } : c
                                ),
                              }
                            : line
                        ),
                      }
                    : hunk
                ),
              }
            : change
        ),
      };
    }

    case 'ADD_RESTORE_POINT':
      return {
        ...state,
        restorePoints: [action.payload, ...state.restorePoints],
      };

    case 'DELETE_RESTORE_POINT':
      return {
        ...state,
        restorePoints: state.restorePoints.filter(p => p.id !== action.payload),
      };

    case 'SET_IMPACT_ANALYSIS':
      return {
        ...state,
        impactAnalysis: action.payload,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };

    default:
      return state;
  }
}

/**
 * Hook return type
 */
export interface UseReviewReturn {
  // State
  state: ReviewState;
  statistics: ReviewStatistics;
  filteredChanges: FileChange[];
  selectedChange: FileChange | null;
  
  // Actions
  setChanges: (changes: FileChange[]) => void;
  selectFile: (path: string | null) => void;
  setCategoryFilter: (category: ChangeCategory | 'all') => void;
  setStatusFilter: (status: ApprovalStatus | 'all') => void;
  
  // Hunk actions
  approveHunk: (filePath: string, hunkId: string) => void;
  rejectHunk: (filePath: string, hunkId: string) => void;
  resetHunk: (filePath: string, hunkId: string) => void;
  approveAll: () => void;
  rejectAll: () => void;
  
  // Comment actions
  addComment: (filePath: string, hunkId: string, lineNumber: number, content: string) => void;
  resolveComment: (filePath: string, hunkId: string, lineNumber: number, commentId: string) => void;
  
  // Restore point actions
  createRestorePoint: (label: string) => Promise<RestorePoint>;
  rollbackTo: (pointId: string) => Promise<{ path: string; content: string }[]>;
  deleteRestorePoint: (pointId: string) => void;
  
  // Analysis
  analyzeImpact: () => Promise<void>;
  
  // Apply changes
  getApprovedChanges: () => FileChange[];
  getApprovedHunks: () => { filePath: string; hunks: DiffHunk[] }[];
}

/**
 * useReview Hook
 */
export function useReview(): UseReviewReturn {
  const [state, dispatch] = useReducer(reviewReducer, initialState);

  // Load restore points on mount
  useEffect(() => {
    const rollbackService = getRollbackService();
    const points = rollbackService.getRestorePoints();
    points.forEach(point => {
      dispatch({ type: 'ADD_RESTORE_POINT', payload: point });
    });
  }, []);

  // Calculate statistics
  const statistics = useMemo(
    () => calculateReviewStatistics(state.changes),
    [state.changes]
  );

  // Filter changes based on current filters
  const filteredChanges = useMemo(() => {
    return state.changes.filter(change => {
      // Category filter
      if (state.categoryFilter !== 'all' && change.category !== state.categoryFilter) {
        return false;
      }
      
      // Status filter - check if any hunk matches
      if (state.statusFilter !== 'all') {
        const hasMatchingHunk = change.hunks.some(
          hunk => hunk.status === state.statusFilter
        );
        if (!hasMatchingHunk) return false;
      }
      
      return true;
    });
  }, [state.changes, state.categoryFilter, state.statusFilter]);

  // Get selected change
  const selectedChange = useMemo(
    () => state.changes.find(c => c.path === state.selectedFilePath) || null,
    [state.changes, state.selectedFilePath]
  );

  // Actions
  const setChanges = useCallback((changes: FileChange[]) => {
    dispatch({ type: 'SET_CHANGES', payload: changes });
  }, []);

  const selectFile = useCallback((path: string | null) => {
    dispatch({ type: 'SELECT_FILE', payload: path });
  }, []);

  const setCategoryFilter = useCallback((category: ChangeCategory | 'all') => {
    dispatch({ type: 'SET_CATEGORY_FILTER', payload: category });
  }, []);

  const setStatusFilter = useCallback((status: ApprovalStatus | 'all') => {
    dispatch({ type: 'SET_STATUS_FILTER', payload: status });
  }, []);

  const approveHunk = useCallback((filePath: string, hunkId: string) => {
    dispatch({ type: 'APPROVE_HUNK', payload: { filePath, hunkId } });
  }, []);

  const rejectHunk = useCallback((filePath: string, hunkId: string) => {
    dispatch({ type: 'REJECT_HUNK', payload: { filePath, hunkId } });
  }, []);

  const resetHunk = useCallback((filePath: string, hunkId: string) => {
    dispatch({ type: 'RESET_HUNK', payload: { filePath, hunkId } });
  }, []);

  const approveAll = useCallback(() => {
    dispatch({ type: 'APPROVE_ALL' });
  }, []);

  const rejectAll = useCallback(() => {
    dispatch({ type: 'REJECT_ALL' });
  }, []);

  // Generate unique ID using crypto.randomUUID if available
  const generateCommentId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `comment_${crypto.randomUUID()}`;
    }
    return `comment_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  };

  const addComment = useCallback(
    (filePath: string, hunkId: string, lineNumber: number, content: string) => {
      const comment: LineComment = {
        id: generateCommentId(),
        lineNumber,
        content,
        author: 'User',
        timestamp: new Date().toISOString(),
        resolved: false,
      };
      dispatch({ type: 'ADD_COMMENT', payload: { filePath, hunkId, lineNumber, comment } });
    },
    []
  );

  const resolveComment = useCallback(
    (filePath: string, hunkId: string, lineNumber: number, commentId: string) => {
      dispatch({ type: 'RESOLVE_COMMENT', payload: { filePath, hunkId, lineNumber, commentId } });
    },
    []
  );

  const createRestorePoint = useCallback(
    async (label: string): Promise<RestorePoint> => {
      const rollbackService = getRollbackService();
      
      // Collect current files from changes
      const files = state.changes
        .filter(c => c.originalContent)
        .map(c => ({
          path: c.path,
          content: c.originalContent!,
        }));

      const approvedCount = state.changes.reduce(
        (sum, c) => sum + c.hunks.filter(h => h.status === 'approved').length,
        0
      );
      const rejectedCount = state.changes.reduce(
        (sum, c) => sum + c.hunks.filter(h => h.status === 'rejected').length,
        0
      );

      const point = await rollbackService.createRestorePoint(label, files, {
        changeDescription: label,
        filesChanged: files.length,
        approvedHunks: approvedCount,
        rejectedHunks: rejectedCount,
      });

      dispatch({ type: 'ADD_RESTORE_POINT', payload: point });
      return point;
    },
    [state.changes]
  );

  const rollbackTo = useCallback(
    async (pointId: string): Promise<{ path: string; content: string }[]> => {
      const rollbackService = getRollbackService();
      return rollbackService.rollbackTo(pointId);
    },
    []
  );

  const deleteRestorePoint = useCallback((pointId: string) => {
    const rollbackService = getRollbackService();
    rollbackService.deleteRestorePoint(pointId);
    dispatch({ type: 'DELETE_RESTORE_POINT', payload: pointId });
  }, []);

  const analyzeImpact = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const analyzer = getImpactAnalyzer();
      const analysis = await analyzer.analyzeChanges(state.changes);
      dispatch({ type: 'SET_IMPACT_ANALYSIS', payload: analysis });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to analyze impact',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.changes]);

  const getApprovedChanges = useCallback((): FileChange[] => {
    return state.changes
      .map(change => ({
        ...change,
        hunks: change.hunks.filter(h => h.status === 'approved'),
      }))
      .filter(change => change.hunks.length > 0);
  }, [state.changes]);

  const getApprovedHunks = useCallback((): { filePath: string; hunks: DiffHunk[] }[] => {
    return state.changes
      .map(change => ({
        filePath: change.path,
        hunks: change.hunks.filter(h => h.status === 'approved'),
      }))
      .filter(item => item.hunks.length > 0);
  }, [state.changes]);

  return {
    state,
    statistics,
    filteredChanges,
    selectedChange,
    setChanges,
    selectFile,
    setCategoryFilter,
    setStatusFilter,
    approveHunk,
    rejectHunk,
    resetHunk,
    approveAll,
    rejectAll,
    addComment,
    resolveComment,
    createRestorePoint,
    rollbackTo,
    deleteRestorePoint,
    analyzeImpact,
    getApprovedChanges,
    getApprovedHunks,
  };
}

export default useReview;

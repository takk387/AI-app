/**
 * Comprehensive Unit Tests for useVersionControl Hook
 *
 * Tests undo/redo functionality, version management, and state tracking.
 * Uses a lightweight testing approach that tests the hook logic directly.
 *
 * Target: 90%+ coverage for this critical hook
 */

import { renderHook, act } from '@testing-library/react';
import { useVersionControl } from '../useVersionControl';
import type { GeneratedComponent, AppVersion } from '@/types/aiBuilderTypes';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a mock GeneratedComponent for testing
 */
function createMockComponent(overrides?: Partial<GeneratedComponent>): GeneratedComponent {
  return {
    id: 'test-component-123',
    name: 'Test App',
    code: '<div>Test Code</div>',
    description: 'Test description',
    timestamp: new Date().toISOString(),
    isFavorite: false,
    conversationHistory: [],
    versions: [],
    ...overrides,
  };
}

/**
 * Create a mock AppVersion for testing
 */
function createMockVersion(overrides?: Partial<AppVersion>): AppVersion {
  return {
    id: `version-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    versionNumber: 1,
    code: '<div>Version Code</div>',
    description: 'Version description',
    timestamp: new Date().toISOString(),
    changeType: 'MINOR_CHANGE',
    ...overrides,
  };
}

// ============================================================================
// Test Suites
// ============================================================================

describe('useVersionControl', () => {
  let mockComponent: GeneratedComponent;
  let mockOnComponentUpdate: jest.Mock;

  beforeEach(() => {
    mockComponent = createMockComponent();
    mockOnComponentUpdate = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Initial State Tests
  // ==========================================================================

  describe('Initial State', () => {
    it('should initialize with empty undo and redo stacks', () => {
      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: mockComponent,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      expect(result.current.undoStack).toEqual([]);
      expect(result.current.redoStack).toEqual([]);
    });

    it('should have canUndo and canRedo as false initially', () => {
      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: mockComponent,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });

    it('should work with null currentComponent', () => {
      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: null,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      expect(result.current.undoStack).toEqual([]);
      expect(result.current.canUndo).toBe(false);
    });
  });

  // ==========================================================================
  // Undo Stack Tests
  // ==========================================================================

  describe('pushToUndoStack()', () => {
    it('should add version to undo stack', () => {
      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: mockComponent,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      const version = createMockVersion({ versionNumber: 1 });

      act(() => {
        result.current.pushToUndoStack(version);
      });

      expect(result.current.undoStack).toHaveLength(1);
      expect(result.current.undoStack[0]).toEqual(version);
      expect(result.current.canUndo).toBe(true);
    });

    it('should maintain stack order (LIFO)', () => {
      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: mockComponent,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      const version1 = createMockVersion({ versionNumber: 1, code: 'code1' });
      const version2 = createMockVersion({ versionNumber: 2, code: 'code2' });
      const version3 = createMockVersion({ versionNumber: 3, code: 'code3' });

      act(() => {
        result.current.pushToUndoStack(version1);
        result.current.pushToUndoStack(version2);
        result.current.pushToUndoStack(version3);
      });

      expect(result.current.undoStack).toHaveLength(3);
      expect(result.current.undoStack[0].code).toBe('code1');
      expect(result.current.undoStack[2].code).toBe('code3');
    });
  });

  // ==========================================================================
  // Undo Tests
  // ==========================================================================

  describe('undo()', () => {
    it('should restore previous version and update component', () => {
      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: mockComponent,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      const previousVersion = createMockVersion({
        versionNumber: 1,
        code: '<div>Previous Code</div>',
        description: 'Previous state',
      });

      act(() => {
        result.current.pushToUndoStack(previousVersion);
      });

      act(() => {
        result.current.undo();
      });

      expect(mockOnComponentUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          code: '<div>Previous Code</div>',
          description: 'Previous state',
        })
      );
    });

    it('should move current state to redo stack', () => {
      const componentWithCode = createMockComponent({
        code: '<div>Current Code</div>',
      });

      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: componentWithCode,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      const previousVersion = createMockVersion({
        code: '<div>Previous Code</div>',
      });

      act(() => {
        result.current.pushToUndoStack(previousVersion);
      });

      act(() => {
        result.current.undo();
      });

      expect(result.current.redoStack).toHaveLength(1);
      expect(result.current.redoStack[0].code).toBe('<div>Current Code</div>');
      expect(result.current.canRedo).toBe(true);
    });

    it('should remove version from undo stack after undo', () => {
      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: mockComponent,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      const version = createMockVersion();

      act(() => {
        result.current.pushToUndoStack(version);
      });

      expect(result.current.undoStack).toHaveLength(1);

      act(() => {
        result.current.undo();
      });

      expect(result.current.undoStack).toHaveLength(0);
      expect(result.current.canUndo).toBe(false);
    });

    it('should do nothing if undo stack is empty', () => {
      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: mockComponent,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      act(() => {
        result.current.undo();
      });

      expect(mockOnComponentUpdate).not.toHaveBeenCalled();
    });

    it('should do nothing if currentComponent is null', () => {
      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: null,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      act(() => {
        result.current.pushToUndoStack(createMockVersion());
      });

      act(() => {
        result.current.undo();
      });

      expect(mockOnComponentUpdate).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Redo Tests
  // ==========================================================================

  describe('redo()', () => {
    it('should restore next version from redo stack', () => {
      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: mockComponent,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      // First push and undo to populate redo stack
      const originalVersion = createMockVersion({
        code: '<div>Original</div>',
      });

      act(() => {
        result.current.pushToUndoStack(originalVersion);
      });

      act(() => {
        result.current.undo();
      });

      // Clear mock calls from undo
      mockOnComponentUpdate.mockClear();

      act(() => {
        result.current.redo();
      });

      expect(mockOnComponentUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          code: expect.any(String),
        })
      );
    });

    it('should move current state to undo stack on redo', () => {
      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: mockComponent,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      const version = createMockVersion();

      act(() => {
        result.current.pushToUndoStack(version);
      });

      act(() => {
        result.current.undo();
      });

      const undoStackLengthBeforeRedo = result.current.undoStack.length;

      act(() => {
        result.current.redo();
      });

      expect(result.current.undoStack.length).toBe(undoStackLengthBeforeRedo + 1);
    });

    it('should do nothing if redo stack is empty', () => {
      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: mockComponent,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      act(() => {
        result.current.redo();
      });

      expect(mockOnComponentUpdate).not.toHaveBeenCalled();
    });

    it('should do nothing if currentComponent is null', () => {
      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: null,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      // Manually set redo stack
      act(() => {
        result.current.setRedoStack([createMockVersion()]);
      });

      act(() => {
        result.current.redo();
      });

      expect(mockOnComponentUpdate).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Clear Redo Stack Tests
  // ==========================================================================

  describe('clearRedoStack()', () => {
    it('should clear all items from redo stack', () => {
      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: mockComponent,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      // Populate redo stack via undo
      act(() => {
        result.current.pushToUndoStack(createMockVersion());
      });

      act(() => {
        result.current.undo();
      });

      expect(result.current.redoStack.length).toBeGreaterThan(0);

      act(() => {
        result.current.clearRedoStack();
      });

      expect(result.current.redoStack).toEqual([]);
      expect(result.current.canRedo).toBe(false);
    });
  });

  // ==========================================================================
  // Save Version Tests
  // ==========================================================================

  describe('saveVersion()', () => {
    it('should create new version with correct version number', () => {
      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: mockComponent,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      const updatedComponent = act(() => {
        return result.current.saveVersion(
          mockComponent,
          'NEW_APP',
          'Initial version'
        );
      });

      expect(updatedComponent.versions).toHaveLength(1);
      expect(updatedComponent.versions[0].versionNumber).toBe(1);
      expect(updatedComponent.versions[0].description).toBe('Initial version');
      expect(updatedComponent.versions[0].changeType).toBe('NEW_APP');
    });

    it('should increment version number for subsequent saves', () => {
      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: mockComponent,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      let component = mockComponent;

      act(() => {
        component = result.current.saveVersion(component, 'NEW_APP', 'v1');
      });

      act(() => {
        component = result.current.saveVersion(component, 'MAJOR_CHANGE', 'v2');
      });

      act(() => {
        component = result.current.saveVersion(component, 'MINOR_CHANGE', 'v3');
      });

      expect(component.versions).toHaveLength(3);
      expect(component.versions[0].versionNumber).toBe(1);
      expect(component.versions[1].versionNumber).toBe(2);
      expect(component.versions[2].versionNumber).toBe(3);
    });

    it('should preserve existing versions when saving new one', () => {
      const existingVersions: AppVersion[] = [
        createMockVersion({ versionNumber: 1, description: 'Existing v1' }),
      ];

      const componentWithVersions = createMockComponent({
        versions: existingVersions,
      });

      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: componentWithVersions,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      const updatedComponent = act(() => {
        return result.current.saveVersion(
          componentWithVersions,
          'MINOR_CHANGE',
          'New version'
        );
      });

      expect(updatedComponent.versions).toHaveLength(2);
      expect(updatedComponent.versions[0].description).toBe('Existing v1');
      expect(updatedComponent.versions[1].description).toBe('New version');
    });

    it('should generate unique version IDs', () => {
      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: mockComponent,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      let component = mockComponent;

      act(() => {
        component = result.current.saveVersion(component, 'NEW_APP', 'v1');
      });

      act(() => {
        component = result.current.saveVersion(component, 'MINOR_CHANGE', 'v2');
      });

      const id1 = component.versions[0].id;
      const id2 = component.versions[1].id;

      expect(id1).not.toBe(id2);
      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
    });

    it('should save current code in version', () => {
      const componentWithCode = createMockComponent({
        code: '<div>Specific Code To Save</div>',
      });

      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: componentWithCode,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      const updatedComponent = act(() => {
        return result.current.saveVersion(
          componentWithCode,
          'NEW_APP',
          'Save test'
        );
      });

      expect(updatedComponent.versions[0].code).toBe('<div>Specific Code To Save</div>');
    });
  });

  // ==========================================================================
  // Revert to Version Tests
  // ==========================================================================

  describe('revertToVersion()', () => {
    it('should revert component to specified version', () => {
      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: mockComponent,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      const targetVersion = createMockVersion({
        versionNumber: 5,
        code: '<div>Target Version Code</div>',
      });

      act(() => {
        result.current.revertToVersion(targetVersion);
      });

      expect(mockOnComponentUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          code: '<div>Target Version Code</div>',
          description: 'Reverted to version 5',
        })
      );
    });

    it('should save current state to undo stack before reverting', () => {
      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: mockComponent,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      const initialUndoLength = result.current.undoStack.length;

      act(() => {
        result.current.revertToVersion(createMockVersion());
      });

      expect(result.current.undoStack.length).toBe(initialUndoLength + 1);
    });

    it('should clear redo stack after reverting', () => {
      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: mockComponent,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      // First populate redo stack
      act(() => {
        result.current.setRedoStack([createMockVersion()]);
      });

      expect(result.current.redoStack.length).toBeGreaterThan(0);

      act(() => {
        result.current.revertToVersion(createMockVersion());
      });

      expect(result.current.redoStack).toEqual([]);
    });

    it('should do nothing if currentComponent is null', () => {
      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: null,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      act(() => {
        result.current.revertToVersion(createMockVersion());
      });

      expect(mockOnComponentUpdate).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Compare Versions Tests
  // ==========================================================================

  describe('compareVersions()', () => {
    it('should return both versions for comparison', () => {
      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: mockComponent,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      const v1 = createMockVersion({ versionNumber: 1, code: 'code1' });
      const v2 = createMockVersion({ versionNumber: 2, code: 'code2' });

      const comparison = result.current.compareVersions(v1, v2);

      expect(comparison.v1).toEqual(v1);
      expect(comparison.v2).toEqual(v2);
    });

    it('should work with identical versions', () => {
      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: mockComponent,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      const version = createMockVersion();

      const comparison = result.current.compareVersions(version, version);

      expect(comparison.v1).toEqual(comparison.v2);
    });
  });

  // ==========================================================================
  // Fork From Version Tests
  // ==========================================================================

  describe('forkFromVersion()', () => {
    it('should create new component with forked code', () => {
      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: mockComponent,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      const sourceComponent = createMockComponent({
        name: 'Original App',
        code: '<div>Original Code</div>',
        description: 'Original description',
      });

      const forkedComponent = result.current.forkFromVersion(sourceComponent);

      expect(forkedComponent.name).toBe('Original App - Fork');
      expect(forkedComponent.code).toBe('<div>Original Code</div>');
      expect(forkedComponent.description).toContain('(forked)');
    });

    it('should create unique ID for forked component', () => {
      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: mockComponent,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      const sourceComponent = createMockComponent({ id: 'original-id' });

      const forkedComponent = result.current.forkFromVersion(sourceComponent);

      expect(forkedComponent.id).not.toBe('original-id');
      expect(forkedComponent.id).toBeTruthy();
    });

    it('should fork from specific version if provided', () => {
      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: mockComponent,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      const sourceComponent = createMockComponent({
        name: 'App',
        code: '<div>Current Code</div>',
      });

      const oldVersion = createMockVersion({
        versionNumber: 3,
        code: '<div>Old Version Code</div>',
      });

      const forkedComponent = result.current.forkFromVersion(
        sourceComponent,
        oldVersion
      );

      expect(forkedComponent.code).toBe('<div>Old Version Code</div>');
      expect(forkedComponent.description).toContain('forked from v3');
    });

    it('should initialize forked component with single version', () => {
      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: mockComponent,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      const sourceComponent = createMockComponent({
        versions: [
          createMockVersion({ versionNumber: 1 }),
          createMockVersion({ versionNumber: 2 }),
          createMockVersion({ versionNumber: 3 }),
        ],
      });

      const forkedComponent = result.current.forkFromVersion(sourceComponent);

      expect(forkedComponent.versions).toHaveLength(1);
      expect(forkedComponent.versions[0].versionNumber).toBe(1);
      expect(forkedComponent.versions[0].changeType).toBe('NEW_APP');
    });

    it('should reset favorite status on fork', () => {
      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: mockComponent,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      const sourceComponent = createMockComponent({ isFavorite: true });

      const forkedComponent = result.current.forkFromVersion(sourceComponent);

      expect(forkedComponent.isFavorite).toBe(false);
    });

    it('should reset conversation history on fork', () => {
      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: mockComponent,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      const sourceComponent = createMockComponent({
        conversationHistory: [
          { role: 'user' as const, content: 'test message' },
        ],
      });

      const forkedComponent = result.current.forkFromVersion(sourceComponent);

      expect(forkedComponent.conversationHistory).toEqual([]);
    });
  });

  // ==========================================================================
  // Direct Stack Manipulation Tests
  // ==========================================================================

  describe('setUndoStack() and setRedoStack()', () => {
    it('should allow direct setting of undo stack', () => {
      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: mockComponent,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      const versions = [
        createMockVersion({ versionNumber: 1 }),
        createMockVersion({ versionNumber: 2 }),
      ];

      act(() => {
        result.current.setUndoStack(versions);
      });

      expect(result.current.undoStack).toEqual(versions);
      expect(result.current.canUndo).toBe(true);
    });

    it('should allow direct setting of redo stack', () => {
      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: mockComponent,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      const versions = [createMockVersion()];

      act(() => {
        result.current.setRedoStack(versions);
      });

      expect(result.current.redoStack).toEqual(versions);
      expect(result.current.canRedo).toBe(true);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle rapid undo/redo operations', () => {
      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: mockComponent,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      // Push multiple versions
      act(() => {
        result.current.pushToUndoStack(createMockVersion({ code: 'v1' }));
        result.current.pushToUndoStack(createMockVersion({ code: 'v2' }));
        result.current.pushToUndoStack(createMockVersion({ code: 'v3' }));
      });

      // Rapid undo operations
      act(() => {
        result.current.undo();
        result.current.undo();
        result.current.undo();
      });

      expect(result.current.undoStack).toHaveLength(0);
      expect(result.current.redoStack.length).toBeGreaterThan(0);
    });

    it('should handle version with empty code', () => {
      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: mockComponent,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      const emptyVersion = createMockVersion({ code: '' });

      act(() => {
        result.current.pushToUndoStack(emptyVersion);
      });

      act(() => {
        result.current.undo();
      });

      expect(mockOnComponentUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ code: '' })
      );
    });

    it('should handle component with null versions array', () => {
      const componentWithNullVersions = {
        ...mockComponent,
        versions: undefined,
      } as unknown as GeneratedComponent;

      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: componentWithNullVersions,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      const updatedComponent = act(() => {
        return result.current.saveVersion(
          componentWithNullVersions,
          'NEW_APP',
          'First version'
        );
      });

      expect(updatedComponent.versions).toHaveLength(1);
    });

    it('should update timestamp when reverting', () => {
      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: mockComponent,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      const oldTimestamp = '2020-01-01T00:00:00.000Z';
      const version = createMockVersion({ timestamp: oldTimestamp });

      act(() => {
        result.current.revertToVersion(version);
      });

      const updateCall = mockOnComponentUpdate.mock.calls[0][0];
      expect(updateCall.timestamp).not.toBe(oldTimestamp);
    });
  });

  // ==========================================================================
  // Integration-like Tests
  // ==========================================================================

  describe('Workflow Integration', () => {
    it('should support full edit -> undo -> redo cycle', () => {
      const { result, rerender } = renderHook(
        ({ component }) =>
          useVersionControl({
            currentComponent: component,
            onComponentUpdate: mockOnComponentUpdate,
          }),
        { initialProps: { component: mockComponent } }
      );

      // Simulate making changes
      const v1 = createMockVersion({ code: 'state1' });
      const v2 = createMockVersion({ code: 'state2' });

      act(() => {
        result.current.pushToUndoStack(v1);
      });

      act(() => {
        result.current.pushToUndoStack(v2);
      });

      // Undo
      act(() => {
        result.current.undo();
      });

      expect(result.current.canRedo).toBe(true);

      // Redo
      mockOnComponentUpdate.mockClear();
      act(() => {
        result.current.redo();
      });

      expect(mockOnComponentUpdate).toHaveBeenCalled();
    });

    it('should clear redo stack when new change is made after undo', () => {
      const { result } = renderHook(() =>
        useVersionControl({
          currentComponent: mockComponent,
          onComponentUpdate: mockOnComponentUpdate,
        })
      );

      // Push initial version
      act(() => {
        result.current.pushToUndoStack(createMockVersion({ code: 'v1' }));
      });

      // Undo to populate redo stack
      act(() => {
        result.current.undo();
      });

      expect(result.current.canRedo).toBe(true);

      // Make new change (clear redo)
      act(() => {
        result.current.clearRedoStack();
        result.current.pushToUndoStack(createMockVersion({ code: 'new' }));
      });

      expect(result.current.canRedo).toBe(false);
    });
  });
});

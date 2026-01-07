# Parallel Phase Scheduler - Future Implementation Plan

> **Status**: Design complete, implementation deferred
> **Reason**: Risk of undermining build quality outweighs speed benefits at this time
> **Expected Benefit**: 30-40% faster builds for complex apps (10+ phases)

---

## Overview

A Parallel Phase Scheduler that runs independent phases concurrently by leveraging the existing `DynamicPhase.dependencies[]` array to identify phases that can execute in parallel.

## Key Questions Answered

### 1. How Does It Know Which Phases Are Independent?

**Answer**: Dependencies already exist in `DynamicPhase.dependencies: number[]`

- Calculated in `DynamicPhaseGenerator.ts:1461-1515`
- Two phases are independent if neither is in the other's dependencies AND all their dependencies are complete
- Algorithm: Topological sort with level-based grouping

### 2. How Is Complete Context Ensured?

**Answer**: Isolated context snapshots

- Each parallel phase gets a **deep clone** of accumulated state
- No shared mutable state during parallel execution
- Results merged after all parallel phases complete

### 3. Efficiency Improvements

- Rate limiting to avoid API throttling
- Pre-execution conflict detection (not runtime resolution)
- Pre-computed execution plan visualization
- Shared context compression for parallel phases

---

## Implementation Plan

### Files to Create

| File                                     | Purpose                   |
| ---------------------------------------- | ------------------------- |
| `src/types/parallelExecution.ts`         | Type definitions          |
| `src/services/ParallelPhaseScheduler.ts` | Main orchestrator         |
| `src/services/ParallelContextManager.ts` | Isolated context creation |
| `src/services/ParallelResultMerger.ts`   | Merge parallel outputs    |
| `src/utils/parallelGroupCalculator.ts`   | Compute execution groups  |

### Files to Modify

| File                                    | Changes                                                                       |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| `src/services/DynamicPhaseGenerator.ts` | Add `predictPhaseFiles()` method to populate `plannedFiles[]` during planning |
| `src/services/PhaseExecutionManager.ts` | Add `enableParallelExecution()`, `executeParallelGroup()`                     |
| `src/hooks/useDynamicBuildPhases.ts`    | Add parallel state and `executeNextGroup()`                                   |
| `src/types/dynamicPhases.ts`            | Add `plannedFiles: string[]` to DynamicPhase interface                        |

---

## Phase File Prediction

Add `plannedFiles` to DynamicPhase during planning:

```typescript
// In src/types/dynamicPhases.ts - add to DynamicPhase interface
interface DynamicPhase {
  // ... existing fields ...
  plannedFiles: string[];  // Files this phase will create/modify
}

// In src/services/DynamicPhaseGenerator.ts
private predictPhaseFiles(phase: DynamicPhase): string[] {
  const files: string[] = [];

  // Domain-based predictions
  switch (phase.domain) {
    case 'setup':
      files.push('src/App.tsx', 'src/index.css', 'package.json');
      break;
    case 'database':
      files.push('prisma/schema.prisma', 'src/lib/db.ts');
      break;
    case 'auth':
      files.push('src/auth/AuthContext.tsx', 'src/auth/useAuth.ts');
      break;
    // ... more domains
  }

  // Feature-based predictions
  for (const feature of phase.features) {
    const featureName = this.toKebabCase(feature);
    files.push(`src/components/${featureName}.tsx`);

    if (feature.toLowerCase().includes('form')) {
      files.push(`src/hooks/use${this.toPascalCase(feature)}.ts`);
    }
  }

  return files;
}

// Called during phase plan generation
for (const phase of phases) {
  phase.plannedFiles = this.predictPhaseFiles(phase);
}
```

This enables pre-execution conflict detection.

---

## Type Definitions

```typescript
// src/types/parallelExecution.ts

export interface ParallelExecutionConfig {
  enabled: boolean;
  maxConcurrency: number; // Default: 3
  rateLimitDelayMs: number; // Default: 100
  // No conflict strategy needed - conflicts detected pre-execution
}

export interface ParallelExecutionGroup {
  level: number;
  phases: number[]; // Phase numbers in this group
  dependsOnLevels: number[];
}

export interface IsolatedPhaseContext {
  phaseNumber: number;
  snapshotVersion: number;
  baseFiles: Array<{ path: string; content: string }>;
  baseFeatures: string[];
  generatedFiles: Array<{ path: string; content: string }>;
  implementedFeatures: string[];
  status: 'pending' | 'executing' | 'completed' | 'failed';
  error?: string;
}

export interface MergedGroupResult {
  success: boolean;
  mergedFiles: Array<{ path: string; content: string; sources: number[] }>;
  conflicts: FileConflict[];
  mergedFeatures: string[];
  errors: Array<{ phaseNumber: number; error: string }>;
}

// FileConflict only used for pre-execution detection
export interface FileConflict {
  path: string;
  phases: number[]; // Phase numbers that want to modify this file
}
```

---

## Algorithm: Compute Parallel Groups

```typescript
// src/utils/parallelGroupCalculator.ts

function computeParallelGroups(phases: DynamicPhase[]): ParallelExecutionGroup[] {
  // Kahn's algorithm with level tracking
  const inDegree = new Map<number, number>();
  const dependents = new Map<number, number[]>();

  // Initialize
  for (const phase of phases) {
    inDegree.set(phase.number, phase.dependencies.length);
    for (const dep of phase.dependencies) {
      const deps = dependents.get(dep) || [];
      deps.push(phase.number);
      dependents.set(dep, deps);
    }
  }

  // Find phases with no dependencies
  const groups: ParallelExecutionGroup[] = [];
  let ready = phases.filter((p) => p.dependencies.length === 0).map((p) => p.number);
  let level = 0;

  while (ready.length > 0) {
    groups.push({
      level,
      phases: [...ready],
      dependsOnLevels: level > 0 ? [level - 1] : [],
    });

    const nextReady: number[] = [];
    for (const phaseNum of ready) {
      for (const dependent of dependents.get(phaseNum) || []) {
        const newDegree = (inDegree.get(dependent) || 1) - 1;
        inDegree.set(dependent, newDegree);
        if (newDegree === 0) {
          nextReady.push(dependent);
        }
      }
    }

    ready = nextReady;
    level++;
  }

  return groups;
}
```

---

## Context Isolation Strategy

```typescript
// src/services/ParallelContextManager.ts

class ParallelContextManager {
  createIsolatedContexts(
    phases: DynamicPhase[],
    baseFiles: Array<{ path: string; content: string }>,
    baseFeatures: string[]
  ): Map<number, IsolatedPhaseContext> {
    const contexts = new Map();
    const snapshotVersion = Date.now();

    for (const phase of phases) {
      // DEEP CLONE to prevent cross-contamination
      contexts.set(phase.number, {
        phaseNumber: phase.number,
        snapshotVersion,
        baseFiles: JSON.parse(JSON.stringify(baseFiles)),
        baseFeatures: [...baseFeatures],
        generatedFiles: [],
        implementedFeatures: [],
        status: 'pending',
      });
    }

    return contexts;
  }
}
```

---

## Result Merging Strategy

Since conflicts are detected pre-execution, merging is straightforward:

```typescript
// src/services/ParallelResultMerger.ts

class ParallelResultMerger {
  merge(contexts: IsolatedPhaseContext[]): MergedGroupResult {
    const completed = contexts.filter((c) => c.status === 'completed');
    const failed = contexts.filter((c) => c.status === 'failed');

    // Simple merge - no conflicts expected (pre-validated)
    const mergedFiles = completed.flatMap((ctx) =>
      ctx.generatedFiles.map((file) => ({
        path: file.path,
        content: file.content,
        sources: [ctx.phaseNumber],
      }))
    );

    const mergedFeatures = [...new Set(completed.flatMap((c) => c.implementedFeatures))];

    return {
      success: failed.length === 0,
      mergedFiles,
      conflicts: [], // Always empty - conflicts prevented by pre-validation
      mergedFeatures,
      errors: failed.map((c) => ({ phaseNumber: c.phaseNumber, error: c.error || 'Unknown' })),
    };
  }
}
```

---

## Integration Points

### PhaseExecutionManager.ts

Add methods:

- `enableParallelExecution(config)` - Enable parallel mode
- `getParallelExecutionGroups()` - Return computed groups
- `executeParallelGroup(level)` - Execute all phases in a group

### useDynamicBuildPhases.ts

Add state and actions:

- `parallelGroups: ParallelExecutionGroup[]`
- `isParallelEnabled: boolean`
- `currentGroupLevel: number`
- `enableParallelExecution(config)`
- `executeNextGroup()`

---

## Execution Flow

```
User enables parallel mode
    ↓
computeParallelGroups(plan.phases)
    ↓
Show execution plan to user:
  Level 0: [Setup] (1 phase)
  Level 1: [Database] (1 phase)
  Level 2: [Auth, Product Catalog] (2 parallel)
  Level 3: [User Profiles, Admin] (2 parallel)
  Level 4: [Polish] (1 phase)
    ↓
User starts build
    ↓
For each level:
  1. Create isolated contexts for all phases in level
  2. Execute all phases in parallel (rate limited)
  3. Wait for all to complete
  4. Merge results
  5. Handle conflicts
  6. Update accumulated state
  7. Proceed to next level
```

---

## Rate Limiting

```typescript
const RATE_LIMITS = {
  maxConcurrentRequests: 3,
  minDelayBetweenMs: 100,
  requestsPerMinute: 50,
};

// Stagger parallel API calls
for (let i = 0; i < contexts.length; i++) {
  setTimeout(() => executePhase(contexts[i]), i * RATE_LIMITS.minDelayBetweenMs);
}
```

---

## Pre-Execution Conflict Detection

**Key insight**: Independent phases should NEVER generate the same file. File overlap indicates a dependency calculation bug.

**Before executing parallel group:**

```typescript
function validateParallelGroup(phases: DynamicPhase[]): {
  valid: boolean;
  conflicts: Array<{ file: string; phases: number[] }>;
} {
  const fileToPhases = new Map<string, number[]>();

  for (const phase of phases) {
    for (const plannedFile of phase.plannedFiles || []) {
      const existing = fileToPhases.get(plannedFile) || [];
      existing.push(phase.number);
      fileToPhases.set(plannedFile, existing);
    }
  }

  const conflicts = [];
  for (const [file, phaseNums] of fileToPhases) {
    if (phaseNums.length > 1) {
      conflicts.push({ file, phases: phaseNums });
    }
  }

  return { valid: conflicts.length === 0, conflicts };
}
```

**If conflicts detected:**

1. Show warning: "Phase 3 and Phase 5 both plan to modify `src/App.tsx`"
2. Auto-fix: Add dependency between them so they run sequentially
3. Re-compute parallel groups with updated dependencies

---

## Error Handling

**If one parallel phase fails:** Rollback entire group (default)

- Discard all results from the group
- Report which phase failed and why
- User can retry the entire group or fall back to sequential

---

## Verification Plan

1. **Unit Tests**
   - `parallelGroupCalculator.test.ts` - Verify correct grouping
   - `ParallelResultMerger.test.ts` - Verify conflict resolution

2. **Integration Test**
   - Create 6-phase plan with parallel opportunities
   - Enable parallel mode
   - Verify execution order respects dependencies
   - Verify merged output is correct

3. **Manual Testing**
   - Build a complex app (10+ phases) with parallel mode
   - Verify build time reduction
   - Check for file conflicts and proper resolution

---

## Design Principles

1. **Opt-in only** - Default behavior unchanged
2. **Non-breaking** - All existing code paths preserved
3. **Safety net** - Sequential fallback if parallel fails
4. **Tracked metrics** - Parallel execution stats in completion event

---

## When to Consider Implementation

Consider implementing this when:

- Build times for complex apps become a user complaint
- Retry rate is low (< 10%) indicating stable generation
- Competitive differentiation requires faster builds
- Existing sequential build quality is consistently high

---

_Design completed: January 2026_

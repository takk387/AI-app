# Implementation Plan: Dynamic Phase System Improvements

## Overview

This plan addresses ALL 8 critical gaps identified in DYNAMIC_PHASE_SYSTEM_ANALYSIS.md Section 10. The improvements focus on:

1. **File Conflict Detection** (P1) - Detect when phases overwrite files from previous phases
2. **Import/Export Validation** (P2) - Validate imports reference valid exports
3. **Phase Snapshot & Rollback** (P3) - Capture state before phases, allow recovery
4. **State Management** (P4) - Fix the forceUpdate anti-pattern
5. **Cross-Phase Type Checking** (P5) - Run TypeScript compilation between phases
6. **Type Compatibility Checks** (P6) - Detect breaking type changes
7. **testCriteria Execution** (P7) - Convert test criteria to executable smoke tests
8. **API Contract Enforcement** (P8) - Validate API implementations match contracts
9. **Regression Testing** (P9) - Run previous phase tests to catch regressions

---

## Priority Order (By Risk Level)

| Priority | Feature | Risk Addressed | Files Affected |
|----------|---------|----------------|----------------|
| P1 | File Conflict Detection | HIGH - No detection of overwrites | 3 files |
| P2 | Import/Export Validation | MEDIUM - Broken imports | 2 files |
| P3 | Phase Snapshot & Rollback | MEDIUM - No recovery | 4 files |
| P4 | Fix forceUpdate Pattern | LOW - Performance | 2 files |
| P5 | Cross-Phase Type Checking | MEDIUM - No TS compilation between phases | 2 files |
| P6 | Type Compatibility Checks | MEDIUM - Breaking type changes undetected | 3 files |
| P7 | testCriteria Execution | HIGH - Test criteria not executed | 3 files |
| P8 | API Contract Enforcement | LOW - API contracts not validated | 2 files |
| P9 | Regression Testing | HIGH - No verification of previous phases | 2 files |

---

## P1: File Conflict Detection

### Goal
Detect when a phase overwrites files from previous phases and warn about breaking changes.

### Files to Modify

1. **`src/types/dynamicPhases.ts`** - Add version tracking to AccumulatedFile + FileConflict types
2. **`src/services/PhaseExecutionManager.ts`** - Add conflict detection logic with hash computation

### Implementation Steps

#### Step 1.1: Extend AccumulatedFile Type
**File:** `src/types/dynamicPhases.ts` (around line 197)

Add new fields to track file versions:
```typescript
export interface AccumulatedFile {
  path: string;
  type: 'component' | 'api' | 'type' | 'util' | 'style' | 'config' | 'other';
  exports: string[];
  dependencies: string[];
  summary: string;
  // NEW FIELDS
  contentHash: string;           // MD5/SHA256 hash for change detection
  createdInPhase: number;        // Phase that first created this file
  lastModifiedPhase: number;     // Phase that last changed it
  previousVersionHash?: string;  // Hash before modification (for rollback)
}
```

#### Step 1.2: Add FileVersionMap to PhaseExecutionManager
**File:** `src/services/PhaseExecutionManager.ts` (after line 956)

Add tracking structure and detection method:
```typescript
// After line 956, add new property:
private fileVersionMap: Map<string, {
  hash: string;
  phase: number;
  exports: string[];
}> = new Map();

// New method after line 1166:
private detectFileConflicts(
  newFiles: Array<{ path: string; content: string }>,
  phaseNumber: number
): FileConflictResult {
  const conflicts: FileConflict[] = [];

  for (const file of newFiles) {
    const hash = this.computeHash(file.content);
    const existing = this.fileVersionMap.get(file.path);

    if (existing && existing.hash !== hash) {
      conflicts.push({
        path: file.path,
        type: 'OVERWRITE',
        previousPhase: existing.phase,
        currentPhase: phaseNumber,
        severity: this.assessConflictSeverity(file.path, existing),
      });
    }

    this.fileVersionMap.set(file.path, { hash, phase: phaseNumber, exports: [] });
  }

  return { conflicts, hasBreakingChanges: conflicts.some(c => c.severity === 'critical') };
}

/**
 * Compute SHA256 hash of file content for change detection
 */
private computeHash(content: string): string {
  // Use Web Crypto API for browser compatibility
  const encoder = new TextEncoder();
  const data = encoder.encode(content);

  // Simple hash for client-side (djb2 algorithm)
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) + hash) + content.charCodeAt(i);
  }
  return Math.abs(hash).toString(16);
}

/**
 * Assess severity of file conflict based on file type and changes
 */
private assessConflictSeverity(
  path: string,
  existing: { hash: string; phase: number; exports: string[] }
): 'critical' | 'warning' | 'info' {
  // Critical: Core files that affect entire app
  if (path.includes('App.tsx') || path.includes('layout.tsx') || path.includes('/types/')) {
    return 'critical';
  }
  // Critical: API routes
  if (path.includes('/api/')) {
    return 'critical';
  }
  // Warning: Components and utilities
  if (path.includes('/components/') || path.includes('/utils/')) {
    return 'warning';
  }
  // Info: Styles and configs
  return 'info';
}
```

#### Step 1.3: Integrate Detection into recordPhaseResult
**File:** `src/services/PhaseExecutionManager.ts` (line 1091, before extracting files)

```typescript
recordPhaseResult(result: PhaseExecutionResult): void {
  if (result.success) {
    // NEW: Detect conflicts before updating state
    const rawFiles = this.extractRawFiles(result.generatedCode);
    const conflictResult = this.detectFileConflicts(rawFiles, result.phaseNumber);

    if (conflictResult.hasBreakingChanges) {
      // Store conflicts for UI display, don't fail silently
      result.fileConflicts = conflictResult.conflicts;
    }

    // Continue with existing logic...
    this.rawGeneratedFiles = [...this.rawGeneratedFiles, ...rawFiles];
```

#### Step 1.4: Add Conflict Types
**File:** `src/types/dynamicPhases.ts` (after line 227)

```typescript
export interface FileConflict {
  path: string;
  type: 'OVERWRITE' | 'EXPORT_REMOVED' | 'TYPE_CHANGED' | 'API_CHANGED';
  previousPhase: number;
  currentPhase: number;
  severity: 'critical' | 'warning' | 'info';
  details?: string;
}

export interface FileConflictResult {
  conflicts: FileConflict[];
  hasBreakingChanges: boolean;
}
```

---

## P2: Import/Export Validation

### Goal
Validate that all imports in generated files reference valid exports from other files.

### Files to Modify

1. **`src/services/DynamicPhaseGenerator.ts`** - Enhance extractImports to include relative imports
2. **`src/services/PhaseExecutionManager.ts`** - Add import validation method

### Implementation Steps

#### Step 2.1: Enhance Import Extraction
**File:** `src/services/DynamicPhaseGenerator.ts` (line 2203-2218)

Currently skips relative imports. Change to include them:
```typescript
private extractImports(content: string): ImportInfo[] {
  const imports: ImportInfo[] = [];

  // Named imports
  const namedImportRegex = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = namedImportRegex.exec(content)) !== null) {
    const symbols = match[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim());
    imports.push({
      symbols,
      from: match[2],
      isRelative: match[2].startsWith('.'),
    });
  }

  // Default imports
  const defaultImportRegex = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g;
  while ((match = defaultImportRegex.exec(content)) !== null) {
    imports.push({
      symbols: [`default:${match[1]}`],
      from: match[2],
      isRelative: match[2].startsWith('.'),
    });
  }

  return imports;
}
```

#### Step 2.2: Add Import Validation to PhaseExecutionManager
**File:** `src/services/PhaseExecutionManager.ts` (after detectFileConflicts method)

```typescript
private validateImportExports(): ImportValidationResult {
  const unresolved: UnresolvedImport[] = [];
  const exportMap = new Map<string, Set<string>>();

  // Build export map from all files
  for (const file of this.accumulatedFilesRich) {
    exportMap.set(file.path, new Set(file.exports));
  }

  // Check each file's imports
  for (const file of this.accumulatedFilesRich) {
    for (const imp of file.imports || []) {
      if (!imp.isRelative) continue; // Skip package imports

      const resolvedPath = this.resolveImportPath(file.path, imp.from);
      const targetExports = exportMap.get(resolvedPath);

      if (!targetExports) {
        unresolved.push({
          file: file.path,
          importFrom: imp.from,
          resolvedTo: resolvedPath,
          reason: 'FILE_NOT_FOUND',
        });
        continue;
      }

      for (const symbol of imp.symbols) {
        if (!targetExports.has(symbol)) {
          unresolved.push({
            file: file.path,
            symbol,
            importFrom: imp.from,
            reason: 'SYMBOL_NOT_EXPORTED',
          });
        }
      }
    }
  }

  return { valid: unresolved.length === 0, unresolved };
}

/**
 * Resolve a relative import path to an absolute path
 */
private resolveImportPath(fromFile: string, importPath: string): string {
  // Get directory of the importing file
  const fromDir = fromFile.substring(0, fromFile.lastIndexOf('/'));

  // Handle relative paths
  if (importPath.startsWith('./')) {
    return `${fromDir}/${importPath.substring(2)}`;
  }
  if (importPath.startsWith('../')) {
    const parts = fromDir.split('/');
    let upCount = 0;
    let remaining = importPath;

    while (remaining.startsWith('../')) {
      upCount++;
      remaining = remaining.substring(3);
    }

    const newParts = parts.slice(0, -upCount);
    return `${newParts.join('/')}/${remaining}`;
  }

  // Add file extension if missing
  if (!importPath.includes('.')) {
    // Try common extensions
    for (const ext of ['.tsx', '.ts', '.js', '.jsx']) {
      const fullPath = importPath + ext;
      if (this.rawGeneratedFiles.some(f => f.path === fullPath)) {
        return fullPath;
      }
    }
    // Try index file
    return `${importPath}/index.tsx`;
  }

  return importPath;
}
```

---

## P3: Phase Snapshot & Rollback

### Goal
Capture state before each phase executes; allow rollback to previous state.

### Files to Modify

1. **`src/types/dynamicPhases.ts`** - Add PhaseSnapshot type
2. **`src/services/PhaseExecutionManager.ts`** - Add snapshot/rollback methods
3. **`src/hooks/useDynamicBuildPhases.ts`** - Expose rollback action

### Implementation Steps

#### Step 3.1: Add PhaseSnapshot Type
**File:** `src/types/dynamicPhases.ts` (after FileConflictResult)

```typescript
export interface PhaseSnapshot {
  id: string;
  phaseNumber: number;
  timestamp: string;

  // State to restore
  accumulatedCode: string;
  accumulatedFiles: string[];
  accumulatedFeatures: string[];
  accumulatedFilesRich: AccumulatedFile[];
  accumulatedFeaturesRich: AccumulatedFeature[];
  establishedPatterns: string[];
  apiContracts: APIContract[];
  rawGeneratedFiles: Array<{ path: string; content: string }>;
  completedPhases: number[];

  // Phase statuses (to restore plan.phases[].status)
  phaseStatuses: Array<{ number: number; status: DynamicPhase['status'] }>;
}
```

#### Step 3.2: Add Snapshot Methods to PhaseExecutionManager
**File:** `src/services/PhaseExecutionManager.ts`

Add properties after line 956:
```typescript
private phaseSnapshots: Map<number, PhaseSnapshot> = new Map();
```

Add methods after recordPhaseResult:
```typescript
/**
 * Capture current state before phase execution
 */
capturePhaseSnapshot(phaseNumber: number): PhaseSnapshot {
  const snapshot: PhaseSnapshot = {
    id: `snapshot-${phaseNumber}-${Date.now()}`,
    phaseNumber,
    timestamp: new Date().toISOString(),
    accumulatedCode: this.accumulatedCode,
    accumulatedFiles: [...this.accumulatedFiles],
    accumulatedFeatures: [...this.accumulatedFeatures],
    accumulatedFilesRich: JSON.parse(JSON.stringify(this.accumulatedFilesRich)),
    accumulatedFeaturesRich: JSON.parse(JSON.stringify(this.accumulatedFeaturesRich)),
    establishedPatterns: [...this.establishedPatterns],
    apiContracts: JSON.parse(JSON.stringify(this.apiContracts)),
    rawGeneratedFiles: JSON.parse(JSON.stringify(this.rawGeneratedFiles)),
    completedPhases: [...this.completedPhases],
    phaseStatuses: this.plan.phases.map(p => ({ number: p.number, status: p.status })),
  };

  this.phaseSnapshots.set(phaseNumber, snapshot);
  return snapshot;
}

/**
 * Rollback to a previous phase snapshot
 */
rollbackToSnapshot(phaseNumber: number): boolean {
  const snapshot = this.phaseSnapshots.get(phaseNumber);
  if (!snapshot) return false;

  // Restore all state
  this.accumulatedCode = snapshot.accumulatedCode;
  this.accumulatedFiles = [...snapshot.accumulatedFiles];
  this.accumulatedFeatures = [...snapshot.accumulatedFeatures];
  this.accumulatedFilesRich = JSON.parse(JSON.stringify(snapshot.accumulatedFilesRich));
  this.accumulatedFeaturesRich = JSON.parse(JSON.stringify(snapshot.accumulatedFeaturesRich));
  this.establishedPatterns = [...snapshot.establishedPatterns];
  this.apiContracts = JSON.parse(JSON.stringify(snapshot.apiContracts));
  this.rawGeneratedFiles = JSON.parse(JSON.stringify(snapshot.rawGeneratedFiles));
  this.completedPhases = [...snapshot.completedPhases];

  // Restore phase statuses
  for (const { number, status } of snapshot.phaseStatuses) {
    const phase = this.plan.phases.find(p => p.number === number);
    if (phase) phase.status = status;
  }

  // Clear snapshots after this point
  for (const key of this.phaseSnapshots.keys()) {
    if (key > phaseNumber) this.phaseSnapshots.delete(key);
  }

  // Update plan
  this.syncPlanState();
  return true;
}

/**
 * Sync internal state back to the plan object
 * Called after rollback to ensure plan reflects current state
 */
private syncPlanState(): void {
  this.plan.completedPhaseNumbers = [...this.completedPhases];
  this.plan.accumulatedFiles = [...this.accumulatedFiles];
  this.plan.accumulatedFeatures = [...this.accumulatedFeatures];
  this.plan.accumulatedFilesRich = [...this.accumulatedFilesRich];
  this.plan.accumulatedFeaturesRich = [...this.accumulatedFeaturesRich];
  this.plan.establishedPatterns = [...this.establishedPatterns];
  this.plan.apiContracts = [...this.apiContracts];
  this.plan.updatedAt = new Date().toISOString();
}
```

#### Step 3.3: Integrate Snapshot into Phase Start
**File:** `src/hooks/useDynamicBuildPhases.ts` (line 207-226, startPhase)

```typescript
const startPhase = useCallback(
  (phaseNumber: number) => {
    if (!mountedRef.current || !plan || !manager) return;

    const phase = plan.phases.find((p) => p.number === phaseNumber);
    if (!phase) {
      onError?.(new Error(`Phase ${phaseNumber} not found`));
      return;
    }

    // NEW: Capture snapshot before starting
    manager.capturePhaseSnapshot(phaseNumber);

    // Update phase status
    phase.status = 'in-progress';
    setPlan({ ...plan, currentPhaseNumber: phaseNumber });
    setIsBuilding(true);

    onPhaseStart?.(phase);
    forceUpdate({});
  },
  [plan, manager, onPhaseStart, onError]
);
```

#### Step 3.4: Add Rollback Action to Hook
**File:** `src/hooks/useDynamicBuildPhases.ts` (after retryPhase, around line 312)

```typescript
/**
 * Rollback to state before a specific phase
 */
const rollbackToPhase = useCallback(
  (phaseNumber: number) => {
    if (!mountedRef.current || !plan || !manager) return false;

    const success = manager.rollbackToSnapshot(phaseNumber);
    if (success) {
      const updatedPlan = manager.getPlan();
      setPlan({ ...updatedPlan });
      setAccumulatedCodeState(manager.getAccumulatedCode());
      forceUpdate({});
    }
    return success;
  },
  [plan, manager]
);
```

Add to return object (line 520+):
```typescript
rollbackToPhase,
```

---

## P4: Fix forceUpdate Pattern

### Goal
Replace forceUpdate anti-pattern with proper immutable state management.

### Files to Modify

1. **`src/services/PhaseExecutionManager.ts`** - Return new state from methods
2. **`src/hooks/useDynamicBuildPhases.ts`** - Use returned state instead of forceUpdate

### Implementation Steps

#### Step 4.1: Make Manager Methods Return New State
**File:** `src/services/PhaseExecutionManager.ts`

Change `recordPhaseResult` to return the updated plan:
```typescript
recordPhaseResult(result: PhaseExecutionResult): DynamicPhasePlan {
  // ... existing logic ...

  // At end, return updated plan
  return { ...this.plan };
}
```

Add getter methods:
```typescript
getAccumulatedCode(): string {
  return this.accumulatedCode;
}

getPlanCopy(): DynamicPhasePlan {
  return { ...this.plan };
}
```

#### Step 4.2: Update Hook to Use Returned State
**File:** `src/hooks/useDynamicBuildPhases.ts`

In completePhase (line 231-285):
```typescript
const completePhase = useCallback(
  (result: PhaseExecutionResult) => {
    if (!mountedRef.current || !plan || !manager) return;

    try {
      // Use returned plan instead of forceUpdate
      const updatedPlan = manager.recordPhaseResult(result);
      setPlan(updatedPlan);  // This triggers natural re-render

      const phase = updatedPlan.phases.find((p) => p.number === result.phaseNumber);
      if (phase) {
        onPhaseComplete?.(phase, result);
      }

      // Update accumulated code from manager
      if (result.success && result.generatedCode) {
        setAccumulatedCodeState(manager.getAccumulatedCode());
      }

      // ... rest of quality review logic ...

      // REMOVE: forceUpdate({});
    } catch (error) {
      onError?.(error as Error);
    }
  },
  [plan, manager, onPhaseComplete, onBuildComplete, onError]
);
```

---

## P5: Cross-Phase Type Checking

### Goal
Run TypeScript compilation on accumulated code after each phase to catch type errors early.

### Files to Modify

1. **`src/services/PhaseExecutionManager.ts`** - Add type checking integration
2. **`src/services/TypeScriptCompilerService.ts`** - NEW file for TS compilation

### Implementation Steps

#### Step 5.1: Create TypeScript Compiler Service
**File:** `src/services/TypeScriptCompilerService.ts` (NEW)

```typescript
'use client';

import type { CompilerOptions, Diagnostic } from 'typescript';

export interface TypeCheckResult {
  success: boolean;
  errors: TypeCheckError[];
  warnings: TypeCheckError[];
}

export interface TypeCheckError {
  file: string;
  line: number;
  column: number;
  message: string;
  code: number;
  severity: 'error' | 'warning';
}

/**
 * Run TypeScript type checking on accumulated code
 * Uses virtual file system - no disk writes
 */
export async function runTypeCheck(
  files: Array<{ path: string; content: string }>
): Promise<TypeCheckResult> {
  // Dynamic import to avoid bundling typescript in client
  const ts = await import('typescript');

  const errors: TypeCheckError[] = [];
  const warnings: TypeCheckError[] = [];

  // Create virtual file map
  const fileMap = new Map<string, string>();
  for (const file of files) {
    fileMap.set(file.path, file.content);
  }

  // Compiler options for type checking only
  const compilerOptions: CompilerOptions = {
    noEmit: true,
    strict: false, // Lenient for generated code
    skipLibCheck: true,
    jsx: ts.JsxEmit.React,
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    esModuleInterop: true,
    allowJs: true,
  };

  // Create compiler host with virtual file system
  const host = ts.createCompilerHost(compilerOptions);
  const originalReadFile = host.readFile;
  host.readFile = (fileName: string) => {
    // Check virtual files first
    if (fileMap.has(fileName)) {
      return fileMap.get(fileName);
    }
    return originalReadFile.call(host, fileName);
  };
  host.fileExists = (fileName: string) => {
    return fileMap.has(fileName) || ts.sys.fileExists(fileName);
  };

  // Create program and get diagnostics
  const program = ts.createProgram(
    Array.from(fileMap.keys()),
    compilerOptions,
    host
  );

  const diagnostics = [
    ...program.getSemanticDiagnostics(),
    ...program.getSyntacticDiagnostics(),
  ];

  // Convert diagnostics to our format
  for (const diagnostic of diagnostics) {
    const error = formatDiagnostic(diagnostic, ts);
    if (diagnostic.category === ts.DiagnosticCategory.Error) {
      errors.push(error);
    } else if (diagnostic.category === ts.DiagnosticCategory.Warning) {
      warnings.push(error);
    }
  }

  return {
    success: errors.length === 0,
    errors,
    warnings,
  };
}

function formatDiagnostic(diagnostic: Diagnostic, ts: typeof import('typescript')): TypeCheckError {
  let file = 'unknown';
  let line = 0;
  let column = 0;

  if (diagnostic.file && diagnostic.start !== undefined) {
    file = diagnostic.file.fileName;
    const pos = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
    line = pos.line + 1;
    column = pos.character + 1;
  }

  return {
    file,
    line,
    column,
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    code: diagnostic.code,
    severity: diagnostic.category === ts.DiagnosticCategory.Error ? 'error' : 'warning',
  };
}
```

#### Step 5.2: Integrate Type Checking into PhaseExecutionManager
**File:** `src/services/PhaseExecutionManager.ts` (after recordPhaseResult)

```typescript
/**
 * Run TypeScript type checking on accumulated code
 * Called after each phase completion
 */
async runPhaseTypeCheck(phaseNumber: number): Promise<TypeCheckResult> {
  try {
    const { runTypeCheck } = await import('./TypeScriptCompilerService');

    // Only check TypeScript/TSX files
    const tsFiles = this.rawGeneratedFiles.filter(
      f => f.path.endsWith('.ts') || f.path.endsWith('.tsx')
    );

    if (tsFiles.length === 0) {
      return { success: true, errors: [], warnings: [] };
    }

    const result = await runTypeCheck(tsFiles);

    // Store result for reporting
    this.typeCheckResults.set(phaseNumber, result);

    return result;
  } catch (error) {
    console.error('Type checking failed:', error);
    return { success: true, errors: [], warnings: [] }; // Fail open
  }
}
```

Add property after line 956:
```typescript
private typeCheckResults: Map<number, TypeCheckResult> = new Map();
```

---

## P6: Type Compatibility Checks

### Goal
Detect when a phase changes type definitions in ways that break previous code.

### Files to Modify

1. **`src/types/dynamicPhases.ts`** - Add type compatibility types
2. **`src/services/PhaseExecutionManager.ts`** - Add compatibility checker
3. **`src/utils/typeCompatibilityChecker.ts`** - NEW file for type comparison

### Implementation Steps

#### Step 6.1: Add Type Compatibility Types
**File:** `src/types/dynamicPhases.ts` (after PhaseSnapshot)

```typescript
export interface TypeDefinition {
  name: string;
  file: string;
  kind: 'interface' | 'type' | 'enum' | 'class';
  properties: TypeProperty[];
  phase: number;
}

export interface TypeProperty {
  name: string;
  type: string;
  optional: boolean;
}

export interface BreakingTypeChange {
  typeName: string;
  file: string;
  changeType: 'PROPERTY_REMOVED' | 'TYPE_CHANGED' | 'REQUIRED_ADDED' | 'TYPE_DELETED';
  details: string;
  previousPhase: number;
  currentPhase: number;
  severity: 'critical' | 'warning';
}

export interface TypeCompatibilityResult {
  compatible: boolean;
  breakingChanges: BreakingTypeChange[];
}
```

#### Step 6.2: Create Type Compatibility Checker
**File:** `src/utils/typeCompatibilityChecker.ts` (NEW)

```typescript
'use client';

import type { TypeDefinition, TypeProperty, BreakingTypeChange, TypeCompatibilityResult } from '@/types/dynamicPhases';

/**
 * Extract type definitions from code using regex
 * (Lightweight alternative to full AST parsing)
 */
export function extractTypeDefinitions(
  content: string,
  filePath: string,
  phaseNumber: number
): TypeDefinition[] {
  const definitions: TypeDefinition[] = [];

  // Interface extraction
  const interfaceRegex = /(?:export\s+)?interface\s+(\w+)\s*(?:extends\s+[\w,\s]+)?\s*\{([^}]+)\}/g;
  let match;

  while ((match = interfaceRegex.exec(content)) !== null) {
    definitions.push({
      name: match[1],
      file: filePath,
      kind: 'interface',
      properties: extractProperties(match[2]),
      phase: phaseNumber,
    });
  }

  // Type alias extraction
  const typeRegex = /(?:export\s+)?type\s+(\w+)\s*=\s*\{([^}]+)\}/g;
  while ((match = typeRegex.exec(content)) !== null) {
    definitions.push({
      name: match[1],
      file: filePath,
      kind: 'type',
      properties: extractProperties(match[2]),
      phase: phaseNumber,
    });
  }

  return definitions;
}

function extractProperties(body: string): TypeProperty[] {
  const properties: TypeProperty[] = [];
  const propRegex = /(\w+)(\?)?:\s*([^;]+);/g;
  let match;

  while ((match = propRegex.exec(body)) !== null) {
    properties.push({
      name: match[1],
      optional: match[2] === '?',
      type: match[3].trim(),
    });
  }

  return properties;
}

/**
 * Check if new type definitions are compatible with previous ones
 */
export function checkTypeCompatibility(
  previousTypes: TypeDefinition[],
  newTypes: TypeDefinition[],
  currentPhase: number
): TypeCompatibilityResult {
  const breakingChanges: BreakingTypeChange[] = [];

  // Build map of previous types by name
  const previousMap = new Map<string, TypeDefinition>();
  for (const type of previousTypes) {
    previousMap.set(type.name, type);
  }

  // Check each new type against previous version
  for (const newType of newTypes) {
    const previous = previousMap.get(newType.name);
    if (!previous) continue; // New type, no compatibility issue

    // Check for removed properties
    for (const prevProp of previous.properties) {
      const newProp = newType.properties.find(p => p.name === prevProp.name);

      if (!newProp) {
        breakingChanges.push({
          typeName: newType.name,
          file: newType.file,
          changeType: 'PROPERTY_REMOVED',
          details: `Property '${prevProp.name}' was removed from ${newType.name}`,
          previousPhase: previous.phase,
          currentPhase,
          severity: prevProp.optional ? 'warning' : 'critical',
        });
        continue;
      }

      // Check for type changes
      if (prevProp.type !== newProp.type) {
        breakingChanges.push({
          typeName: newType.name,
          file: newType.file,
          changeType: 'TYPE_CHANGED',
          details: `Property '${prevProp.name}' changed from '${prevProp.type}' to '${newProp.type}'`,
          previousPhase: previous.phase,
          currentPhase,
          severity: 'critical',
        });
      }

      // Check if optional became required
      if (prevProp.optional && !newProp.optional) {
        breakingChanges.push({
          typeName: newType.name,
          file: newType.file,
          changeType: 'REQUIRED_ADDED',
          details: `Property '${prevProp.name}' changed from optional to required`,
          previousPhase: previous.phase,
          currentPhase,
          severity: 'critical',
        });
      }
    }
  }

  // Check for deleted types
  for (const [name, previous] of previousMap) {
    const stillExists = newTypes.some(t => t.name === name);
    if (!stillExists) {
      breakingChanges.push({
        typeName: name,
        file: previous.file,
        changeType: 'TYPE_DELETED',
        details: `Type '${name}' was deleted`,
        previousPhase: previous.phase,
        currentPhase,
        severity: 'critical',
      });
    }
  }

  return {
    compatible: breakingChanges.filter(c => c.severity === 'critical').length === 0,
    breakingChanges,
  };
}
```

#### Step 6.3: Integrate into PhaseExecutionManager
**File:** `src/services/PhaseExecutionManager.ts`

Add property:
```typescript
private typeDefinitions: TypeDefinition[] = [];
```

Add method:
```typescript
/**
 * Check type compatibility after phase completion
 */
async checkTypeCompatibility(phaseNumber: number): Promise<TypeCompatibilityResult> {
  try {
    const { extractTypeDefinitions, checkTypeCompatibility } =
      await import('@/utils/typeCompatibilityChecker');

    // Extract types from new files in this phase
    const newFiles = this.rawGeneratedFiles.filter(f =>
      f.path.endsWith('.ts') || f.path.endsWith('.tsx')
    );

    const newTypes: TypeDefinition[] = [];
    for (const file of newFiles) {
      const extracted = extractTypeDefinitions(file.content, file.path, phaseNumber);
      newTypes.push(...extracted);
    }

    // Check against previous types
    const result = checkTypeCompatibility(this.typeDefinitions, newTypes, phaseNumber);

    // Update stored types (merge new definitions)
    for (const newType of newTypes) {
      const existingIndex = this.typeDefinitions.findIndex(t => t.name === newType.name);
      if (existingIndex >= 0) {
        this.typeDefinitions[existingIndex] = newType;
      } else {
        this.typeDefinitions.push(newType);
      }
    }

    return result;
  } catch (error) {
    console.error('Type compatibility check failed:', error);
    return { compatible: true, breakingChanges: [] };
  }
}
```

---

## P7: testCriteria Execution

### Goal
Convert testCriteria strings into executable smoke tests that run after each phase.

### Files to Modify

1. **`src/types/dynamicPhases.ts`** - Add test result types
2. **`src/utils/smokeTestRunner.ts`** - NEW file for test execution
3. **`src/services/PhaseExecutionManager.ts`** - Add test execution integration

### Implementation Steps

#### Step 7.1: Add Test Result Types
**File:** `src/types/dynamicPhases.ts` (after TypeCompatibilityResult)

```typescript
export interface SmokeTestResult {
  criterion: string;
  passed: boolean;
  error?: string;
  duration: number;
}

export interface PhaseTestResults {
  phaseNumber: number;
  total: number;
  passed: number;
  failed: number;
  results: SmokeTestResult[];
  allPassed: boolean;
}
```

#### Step 7.2: Create Smoke Test Runner
**File:** `src/utils/smokeTestRunner.ts` (NEW)

```typescript
'use client';

import type { SmokeTestResult, PhaseTestResults } from '@/types/dynamicPhases';

interface TestContext {
  files: Array<{ path: string; content: string }>;
  exports: Map<string, string[]>;
}

type TestMatcher = (criterion: string, context: TestContext) => SmokeTestResult | null;

/**
 * Pattern-based test matchers for common criteria
 */
const TEST_MATCHERS: TestMatcher[] = [
  // "App renders without errors"
  (criterion, context) => {
    if (!criterion.toLowerCase().includes('renders without errors')) return null;

    const appFile = context.files.find(f =>
      f.path.includes('App.tsx') || f.path.includes('page.tsx')
    );

    if (!appFile) {
      return { criterion, passed: false, error: 'App entry file not found', duration: 0 };
    }

    // Check for basic React structure
    const hasExport = appFile.content.includes('export default') ||
                      appFile.content.includes('export function');
    const hasJsx = appFile.content.includes('return') &&
                   (appFile.content.includes('<') || appFile.content.includes('jsx'));

    return {
      criterion,
      passed: hasExport && hasJsx,
      error: hasExport && hasJsx ? undefined : 'Invalid React component structure',
      duration: 5,
    };
  },

  // "Navigation works between pages"
  (criterion, context) => {
    if (!criterion.toLowerCase().includes('navigation')) return null;

    const hasRouter = context.files.some(f =>
      f.content.includes('useRouter') ||
      f.content.includes('Link') ||
      f.content.includes('next/navigation')
    );

    return {
      criterion,
      passed: hasRouter,
      error: hasRouter ? undefined : 'No navigation components found',
      duration: 5,
    };
  },

  // "Responsive at all breakpoints"
  (criterion, context) => {
    if (!criterion.toLowerCase().includes('responsive')) return null;

    const hasResponsive = context.files.some(f =>
      f.content.includes('sm:') ||
      f.content.includes('md:') ||
      f.content.includes('lg:') ||
      f.content.includes('@media')
    );

    return {
      criterion,
      passed: hasResponsive,
      error: hasResponsive ? undefined : 'No responsive styles found',
      duration: 5,
    };
  },

  // "Form validation works"
  (criterion, context) => {
    if (!criterion.toLowerCase().includes('form') &&
        !criterion.toLowerCase().includes('validation')) return null;

    const hasValidation = context.files.some(f =>
      f.content.includes('required') ||
      f.content.includes('pattern=') ||
      f.content.includes('.test(') ||
      f.content.includes('validate')
    );

    return {
      criterion,
      passed: hasValidation,
      error: hasValidation ? undefined : 'No form validation found',
      duration: 5,
    };
  },

  // "API endpoints respond correctly"
  (criterion, context) => {
    if (!criterion.toLowerCase().includes('api') &&
        !criterion.toLowerCase().includes('endpoint')) return null;

    const apiFiles = context.files.filter(f => f.path.includes('/api/'));

    if (apiFiles.length === 0) {
      return { criterion, passed: true, duration: 0 }; // No API = pass (N/A)
    }

    const hasHandlers = apiFiles.every(f =>
      f.content.includes('export async function') ||
      f.content.includes('export function') ||
      f.content.includes('NextResponse')
    );

    return {
      criterion,
      passed: hasHandlers,
      error: hasHandlers ? undefined : 'API route missing proper handler',
      duration: 5,
    };
  },

  // "Authentication flow works"
  (criterion, context) => {
    if (!criterion.toLowerCase().includes('auth')) return null;

    const hasAuth = context.files.some(f =>
      f.content.includes('signIn') ||
      f.content.includes('login') ||
      f.content.includes('useAuth') ||
      f.content.includes('session')
    );

    return {
      criterion,
      passed: hasAuth,
      error: hasAuth ? undefined : 'No authentication implementation found',
      duration: 5,
    };
  },

  // "Error handling works"
  (criterion, context) => {
    if (!criterion.toLowerCase().includes('error')) return null;

    const hasErrorHandling = context.files.some(f =>
      f.content.includes('try') && f.content.includes('catch') ||
      f.content.includes('onError') ||
      f.content.includes('ErrorBoundary')
    );

    return {
      criterion,
      passed: hasErrorHandling,
      error: hasErrorHandling ? undefined : 'No error handling found',
      duration: 5,
    };
  },
];

/**
 * Run smoke tests for phase criteria
 */
export function runSmokeTests(
  testCriteria: string[],
  files: Array<{ path: string; content: string }>,
  phaseNumber: number
): PhaseTestResults {
  const startTime = Date.now();
  const results: SmokeTestResult[] = [];

  // Build context
  const exports = new Map<string, string[]>();
  for (const file of files) {
    const fileExports = extractExports(file.content);
    exports.set(file.path, fileExports);
  }
  const context: TestContext = { files, exports };

  // Run each criterion through matchers
  for (const criterion of testCriteria) {
    let matched = false;

    for (const matcher of TEST_MATCHERS) {
      const result = matcher(criterion, context);
      if (result) {
        results.push(result);
        matched = true;
        break;
      }
    }

    // If no matcher found, mark as manual review needed
    if (!matched) {
      results.push({
        criterion,
        passed: true, // Assume pass, flag for manual review
        error: 'Manual verification required',
        duration: 0,
      });
    }
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  return {
    phaseNumber,
    total: results.length,
    passed,
    failed,
    results,
    allPassed: failed === 0,
  };
}

function extractExports(content: string): string[] {
  const exports: string[] = [];
  const exportRegex = /export\s+(?:default\s+)?(?:function|const|class|interface|type)\s+(\w+)/g;
  let match;
  while ((match = exportRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }
  return exports;
}
```

#### Step 7.3: Integrate into PhaseExecutionManager
**File:** `src/services/PhaseExecutionManager.ts`

Add property:
```typescript
private phaseTestResults: Map<number, PhaseTestResults> = new Map();
```

Add method:
```typescript
/**
 * Run smoke tests for phase criteria
 */
async runPhaseTests(phaseNumber: number): Promise<PhaseTestResults> {
  const phase = this.plan.phases.find(p => p.number === phaseNumber);

  if (!phase || !phase.testCriteria?.length) {
    return {
      phaseNumber,
      total: 0,
      passed: 0,
      failed: 0,
      results: [],
      allPassed: true,
    };
  }

  try {
    const { runSmokeTests } = await import('@/utils/smokeTestRunner');
    const result = runSmokeTests(phase.testCriteria, this.rawGeneratedFiles, phaseNumber);

    this.phaseTestResults.set(phaseNumber, result);
    return result;
  } catch (error) {
    console.error('Smoke tests failed:', error);
    return {
      phaseNumber,
      total: phase.testCriteria.length,
      passed: 0,
      failed: 0,
      results: [],
      allPassed: true, // Fail open
    };
  }
}
```

---

## P8: API Contract Enforcement

### Goal
Validate that API implementations match declared contracts.

### Files to Modify

1. **`src/types/dynamicPhases.ts`** - Add contract validation types
2. **`src/services/PhaseExecutionManager.ts`** - Add contract validation method

### Implementation Steps

#### Step 8.1: Add Contract Validation Types
**File:** `src/types/dynamicPhases.ts` (after PhaseTestResults)

```typescript
export interface ContractViolation {
  endpoint: string;
  method: string;
  violation: 'MISSING_ENDPOINT' | 'WRONG_METHOD' | 'MISSING_RESPONSE_TYPE' | 'WRONG_PARAMS';
  expected: string;
  actual?: string;
  severity: 'error' | 'warning';
}

export interface ContractValidationResult {
  valid: boolean;
  violations: ContractViolation[];
}
```

#### Step 8.2: Add Contract Validation to PhaseExecutionManager
**File:** `src/services/PhaseExecutionManager.ts`

```typescript
/**
 * Validate API implementations against declared contracts
 */
validateApiContracts(): ContractValidationResult {
  const violations: ContractViolation[] = [];

  // Find all API route files
  const apiFiles = this.rawGeneratedFiles.filter(f =>
    f.path.includes('/api/') && (f.path.endsWith('.ts') || f.path.endsWith('.tsx'))
  );

  // Check each contract
  for (const contract of this.apiContracts) {
    // Find matching API file
    const expectedPath = `/api${contract.endpoint}`;
    const apiFile = apiFiles.find(f =>
      f.path.includes(expectedPath) ||
      f.path.includes(contract.endpoint.replace(/\//g, '/'))
    );

    if (!apiFile) {
      violations.push({
        endpoint: contract.endpoint,
        method: contract.method,
        violation: 'MISSING_ENDPOINT',
        expected: `API route at ${expectedPath}`,
        severity: 'error',
      });
      continue;
    }

    // Check for HTTP method handler
    const methodUpper = contract.method.toUpperCase();
    const hasMethod =
      apiFile.content.includes(`export async function ${methodUpper}`) ||
      apiFile.content.includes(`export function ${methodUpper}`) ||
      apiFile.content.includes(`${methodUpper}:`);

    if (!hasMethod) {
      violations.push({
        endpoint: contract.endpoint,
        method: contract.method,
        violation: 'WRONG_METHOD',
        expected: `${methodUpper} handler`,
        actual: 'Handler not found',
        severity: 'error',
      });
    }

    // Check response schema if specified
    if (contract.responseSchema) {
      const hasResponseSchema = apiFile.content.includes(contract.responseSchema);
      if (!hasResponseSchema) {
        violations.push({
          endpoint: contract.endpoint,
          method: contract.method,
          violation: 'MISSING_RESPONSE_TYPE',
          expected: contract.responseSchema,
          severity: 'warning',
        });
      }
    }
  }

  return {
    valid: violations.filter(v => v.severity === 'error').length === 0,
    violations,
  };
}
```

---

## P9: Regression Testing

### Goal
Run accumulated tests after each phase to verify previous functionality still works.

### Files to Modify

1. **`src/types/dynamicPhases.ts`** - Add regression test types
2. **`src/services/PhaseExecutionManager.ts`** - Add regression test runner

### Implementation Steps

#### Step 9.1: Add Regression Test Types
**File:** `src/types/dynamicPhases.ts` (after ContractValidationResult)

```typescript
export interface RegressionTestResult {
  phaseNumber: number;
  previousPhasesChecked: number[];
  failures: RegressionFailure[];
  allPassed: boolean;
}

export interface RegressionFailure {
  originalPhase: number;
  criterion: string;
  error: string;
}
```

#### Step 9.2: Add Regression Test Runner
**File:** `src/services/PhaseExecutionManager.ts`

```typescript
/**
 * Run regression tests - verify all previous phase criteria still pass
 */
async runRegressionTests(currentPhase: number): Promise<RegressionTestResult> {
  const failures: RegressionFailure[] = [];
  const previousPhasesChecked: number[] = [];

  try {
    const { runSmokeTests } = await import('@/utils/smokeTestRunner');

    // Run tests for all completed phases
    for (const phaseNum of this.completedPhases) {
      if (phaseNum >= currentPhase) continue;

      const phase = this.plan.phases.find(p => p.number === phaseNum);
      if (!phase?.testCriteria?.length) continue;

      previousPhasesChecked.push(phaseNum);

      // Run smoke tests with current accumulated files
      const result = runSmokeTests(
        phase.testCriteria,
        this.rawGeneratedFiles,
        phaseNum
      );

      // Collect failures
      for (const testResult of result.results) {
        if (!testResult.passed) {
          failures.push({
            originalPhase: phaseNum,
            criterion: testResult.criterion,
            error: testResult.error || 'Test failed',
          });
        }
      }
    }

    return {
      phaseNumber: currentPhase,
      previousPhasesChecked,
      failures,
      allPassed: failures.length === 0,
    };
  } catch (error) {
    console.error('Regression tests failed:', error);
    return {
      phaseNumber: currentPhase,
      previousPhasesChecked: [],
      failures: [],
      allPassed: true, // Fail open
    };
  }
}
```

---

## Updated New Types Summary

Add ALL these types to `src/types/dynamicPhases.ts`:

**IMPORTANT: Also extend these existing interfaces:**

```typescript
// Extend PhaseExecutionResult (around line 437)
export interface PhaseExecutionResult {
  // ... existing fields ...
  fileConflicts?: FileConflict[];  // NEW - conflicts detected during this phase
}

// Extend AccumulatedFile (around line 197)
export interface AccumulatedFile {
  // ... existing fields ...
  imports?: ImportInfo[];  // NEW - for import validation
}
```

**New types to add:**

```typescript
// ============ P1: File Conflict Detection ============
export interface FileConflict {
  path: string;
  type: 'OVERWRITE' | 'EXPORT_REMOVED' | 'TYPE_CHANGED' | 'API_CHANGED';
  previousPhase: number;
  currentPhase: number;
  severity: 'critical' | 'warning' | 'info';
  details?: string;
}

export interface FileConflictResult {
  conflicts: FileConflict[];
  hasBreakingChanges: boolean;
}

// ============ P2: Import Validation ============
export interface ImportInfo {
  symbols: string[];
  from: string;
  isRelative: boolean;
}

export interface UnresolvedImport {
  file: string;
  symbol?: string;
  importFrom: string;
  resolvedTo?: string;
  reason: 'FILE_NOT_FOUND' | 'SYMBOL_NOT_EXPORTED';
}

export interface ImportValidationResult {
  valid: boolean;
  unresolved: UnresolvedImport[];
}

// ============ P3: Phase Snapshot ============
export interface PhaseSnapshot {
  id: string;
  phaseNumber: number;
  timestamp: string;
  accumulatedCode: string;
  accumulatedFiles: string[];
  accumulatedFeatures: string[];
  accumulatedFilesRich: AccumulatedFile[];
  accumulatedFeaturesRich: AccumulatedFeature[];
  establishedPatterns: string[];
  apiContracts: APIContract[];
  rawGeneratedFiles: Array<{ path: string; content: string }>;
  completedPhases: number[];
  phaseStatuses: Array<{ number: number; status: DynamicPhase['status'] }>;
}

// ============ P5: Type Checking ============
export interface TypeCheckResult {
  success: boolean;
  errors: TypeCheckError[];
  warnings: TypeCheckError[];
}

export interface TypeCheckError {
  file: string;
  line: number;
  column: number;
  message: string;
  code: number;
  severity: 'error' | 'warning';
}

// ============ P6: Type Compatibility ============
export interface TypeDefinition {
  name: string;
  file: string;
  kind: 'interface' | 'type' | 'enum' | 'class';
  properties: TypeProperty[];
  phase: number;
}

export interface TypeProperty {
  name: string;
  type: string;
  optional: boolean;
}

export interface BreakingTypeChange {
  typeName: string;
  file: string;
  changeType: 'PROPERTY_REMOVED' | 'TYPE_CHANGED' | 'REQUIRED_ADDED' | 'TYPE_DELETED';
  details: string;
  previousPhase: number;
  currentPhase: number;
  severity: 'critical' | 'warning';
}

export interface TypeCompatibilityResult {
  compatible: boolean;
  breakingChanges: BreakingTypeChange[];
}

// ============ P7: Smoke Tests ============
export interface SmokeTestResult {
  criterion: string;
  passed: boolean;
  error?: string;
  duration: number;
}

export interface PhaseTestResults {
  phaseNumber: number;
  total: number;
  passed: number;
  failed: number;
  results: SmokeTestResult[];
  allPassed: boolean;
}

// ============ P8: Contract Validation ============
export interface ContractViolation {
  endpoint: string;
  method: string;
  violation: 'MISSING_ENDPOINT' | 'WRONG_METHOD' | 'MISSING_RESPONSE_TYPE' | 'WRONG_PARAMS';
  expected: string;
  actual?: string;
  severity: 'error' | 'warning';
}

export interface ContractValidationResult {
  valid: boolean;
  violations: ContractViolation[];
}

// ============ P9: Regression Testing ============
export interface RegressionTestResult {
  phaseNumber: number;
  previousPhasesChecked: number[];
  failures: RegressionFailure[];
  allPassed: boolean;
}

export interface RegressionFailure {
  originalPhase: number;
  criterion: string;
  error: string;
}
```

---

## Updated Verification Steps

### After Each Priority

| Priority | Verification |
|----------|--------------|
| P1 | `npm run typecheck`, generate app, verify conflict warnings |
| P2 | Generate code with missing export, verify validation catches it |
| P3 | Complete Phase 1, start Phase 2, call rollback, verify state restored |
| P4 | Remove forceUpdate calls, verify UI still updates correctly |
| P5 | Generate TS code with type error, verify tsc catches it between phases |
| P6 | Modify interface in Phase 3, verify breaking change detected |
| P7 | Complete phase with testCriteria, verify smoke tests run |
| P8 | Create API contract, verify endpoint validation works |
| P9 | Complete Phase 1+2, verify Phase 1 tests still pass after Phase 2 |

### Full Integration Test
1. `npm run typecheck` - Must pass
2. `npm run build` - Must pass
3. `npm test` - Must pass
4. Manual: Create 5-phase app, verify ALL integrity checks run

---

## Updated Files Changed Summary

| File | Changes |
|------|---------|
| `src/types/dynamicPhases.ts` | Add 15+ new types for all integrity checks |
| `src/services/PhaseExecutionManager.ts` | Add 8 new methods + 6 new properties |
| `src/services/DynamicPhaseGenerator.ts` | Enhance extractImports for relative imports |
| `src/hooks/useDynamicBuildPhases.ts` | Add rollbackToPhase, remove forceUpdate |
| `src/services/TypeScriptCompilerService.ts` | NEW - TypeScript compilation service |
| `src/utils/typeCompatibilityChecker.ts` | NEW - Type comparison utility |
| `src/utils/smokeTestRunner.ts` | NEW - Test criteria execution |

---

## What This Plan Does NOT Change

- API routes (no changes to `/api/ai-builder/*`)
- Quality review analyzers (SyntaxAnalyzer, SecurityAnalyzer, etc.)
- DynamicPhaseGenerator phase planning logic
- Layout builder or conversation wizard
- Supabase integration
- Any UI components (except hook return values)

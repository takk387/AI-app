/**
 * Phase Integrity System (P1-P9)
 *
 * Comprehensive integrity checks run between and after phases:
 * - P1: File conflict detection
 * - P2: Import/export validation
 * - P3: Phase snapshot & rollback
 * - P5: Cross-phase TypeScript type checking
 * - P6: Type compatibility checks
 * - P7: Smoke test execution
 * - P8: API contract enforcement
 * - P9: Regression testing
 * - P16: Architecture verification
 */

import type {
  DynamicPhasePlan,
  AccumulatedFile,
  AccumulatedFeature,
  APIContract,
  FileConflict,
  FileConflictResult,
  ImportValidationResult,
  UnresolvedImport,
  PhaseSnapshot,
  TypeCheckResult,
  TypeDefinition,
  TypeCompatibilityResult,
  PhaseTestResults,
  ContractValidationResult,
  RegressionTestResult,
} from '@/types/dynamicPhases';

// ============================================================================
// STATE INTERFACE
// ============================================================================

/**
 * State container passed from PhaseExecutionManager to integrity functions.
 * Holds references to the mutable state that integrity checks read and write.
 */
export interface PhaseIntegrityState {
  plan: DynamicPhasePlan;
  accumulatedCode: string;
  accumulatedFiles: string[];
  accumulatedFeatures: string[];
  accumulatedFilesRich: AccumulatedFile[];
  accumulatedFeaturesRich: AccumulatedFeature[];
  establishedPatterns: string[];
  apiContracts: APIContract[];
  rawGeneratedFiles: Array<{ path: string; content: string }>;
  completedPhases: number[];
  fileVersionMap: Map<string, { hash: string; phase: number; exports: string[] }>;
  phaseSnapshots: Map<number, PhaseSnapshot>;
  typeCheckResults: Map<number, TypeCheckResult>;
  typeDefinitions: TypeDefinition[];
  phaseTestResults: Map<number, PhaseTestResults>;
}

// ============================================================================
// P1: FILE CONFLICT DETECTION
// ============================================================================

/**
 * Detect file conflicts when new files are generated.
 * Warns when phases overwrite files from previous phases.
 */
export function detectFileConflicts(
  state: PhaseIntegrityState,
  newFiles: Array<{ path: string; content: string }>,
  phaseNumber: number
): FileConflictResult {
  const conflicts: FileConflict[] = [];

  for (const file of newFiles) {
    const hash = computeHash(file.content);
    const existing = state.fileVersionMap.get(file.path);

    if (existing && existing.hash !== hash) {
      conflicts.push({
        path: file.path,
        type: 'OVERWRITE',
        previousPhase: existing.phase,
        currentPhase: phaseNumber,
        severity: assessConflictSeverity(file.path, existing),
      });
    }

    state.fileVersionMap.set(file.path, { hash, phase: phaseNumber, exports: [] });
  }

  return { conflicts, hasBreakingChanges: conflicts.some((c) => c.severity === 'critical') };
}

/**
 * Compute a hash of file content for change detection (djb2 algorithm)
 */
export function computeHash(content: string): string {
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = (hash << 5) + hash + content.charCodeAt(i);
  }
  return Math.abs(hash).toString(16);
}

/**
 * Assess severity of file conflict based on file type
 */
function assessConflictSeverity(
  path: string,
  _existing: { hash: string; phase: number; exports: string[] }
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

// ============================================================================
// P2: IMPORT/EXPORT VALIDATION
// ============================================================================

/**
 * Validate that all imports reference valid exports
 */
export function validateImportExports(state: PhaseIntegrityState): ImportValidationResult {
  const unresolved: UnresolvedImport[] = [];
  const exportMap = new Map<string, Set<string>>();

  // Build export map from all files
  for (const file of state.accumulatedFilesRich) {
    exportMap.set(file.path, new Set(file.exports));
  }

  // Check each file's imports
  for (const file of state.accumulatedFilesRich) {
    for (const imp of file.imports || []) {
      if (!imp.isRelative) continue; // Skip package imports

      const resolvedPath = resolveImportPath(state, file.path, imp.from);
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
function resolveImportPath(
  state: PhaseIntegrityState,
  fromFile: string,
  importPath: string
): string {
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
      if (state.rawGeneratedFiles.some((f) => f.path === fullPath)) {
        return fullPath;
      }
    }
    // Try index file
    return `${importPath}/index.tsx`;
  }

  return importPath;
}

// ============================================================================
// P3: PHASE SNAPSHOT & ROLLBACK
// ============================================================================

/**
 * Capture current state before phase execution
 */
export function capturePhaseSnapshot(
  state: PhaseIntegrityState,
  phaseNumber: number
): PhaseSnapshot {
  const snapshot: PhaseSnapshot = {
    id: `snapshot-${phaseNumber}-${Date.now()}`,
    phaseNumber,
    timestamp: new Date().toISOString(),
    accumulatedCode: state.accumulatedCode,
    accumulatedFiles: [...state.accumulatedFiles],
    accumulatedFeatures: [...state.accumulatedFeatures],
    accumulatedFilesRich: JSON.parse(JSON.stringify(state.accumulatedFilesRich)),
    accumulatedFeaturesRich: JSON.parse(JSON.stringify(state.accumulatedFeaturesRich)),
    establishedPatterns: [...state.establishedPatterns],
    apiContracts: JSON.parse(JSON.stringify(state.apiContracts)),
    rawGeneratedFiles: JSON.parse(JSON.stringify(state.rawGeneratedFiles)),
    completedPhases: [...state.completedPhases],
    phaseStatuses: state.plan.phases.map((p) => ({ number: p.number, status: p.status })),
  };

  state.phaseSnapshots.set(phaseNumber, snapshot);
  return snapshot;
}

/**
 * Rollback to a previous phase snapshot
 */
export function rollbackToSnapshot(state: PhaseIntegrityState, phaseNumber: number): boolean {
  const snapshot = state.phaseSnapshots.get(phaseNumber);
  if (!snapshot) return false;

  // Restore all state
  state.accumulatedCode = snapshot.accumulatedCode;
  state.accumulatedFiles = [...snapshot.accumulatedFiles];
  state.accumulatedFeatures = [...snapshot.accumulatedFeatures];
  state.accumulatedFilesRich = JSON.parse(JSON.stringify(snapshot.accumulatedFilesRich));
  state.accumulatedFeaturesRich = JSON.parse(JSON.stringify(snapshot.accumulatedFeaturesRich));
  state.establishedPatterns = [...snapshot.establishedPatterns];
  state.apiContracts = JSON.parse(JSON.stringify(snapshot.apiContracts));
  state.rawGeneratedFiles = JSON.parse(JSON.stringify(snapshot.rawGeneratedFiles));
  state.completedPhases = [...snapshot.completedPhases];

  // Restore phase statuses
  for (const { number, status } of snapshot.phaseStatuses) {
    const phase = state.plan.phases.find((p) => p.number === number);
    if (phase) phase.status = status;
  }

  // Clear snapshots after this point
  for (const key of state.phaseSnapshots.keys()) {
    if (key > phaseNumber) state.phaseSnapshots.delete(key);
  }

  // Update plan
  syncPlanState(state);
  return true;
}

/**
 * Sync internal state back to the plan object
 */
export function syncPlanState(state: PhaseIntegrityState): void {
  state.plan.completedPhaseNumbers = [...state.completedPhases];
  state.plan.accumulatedFiles = [...state.accumulatedFiles];
  state.plan.accumulatedFeatures = [...state.accumulatedFeatures];
  state.plan.accumulatedFilesRich = [...state.accumulatedFilesRich];
  state.plan.accumulatedFeaturesRich = [...state.accumulatedFeaturesRich];
  state.plan.establishedPatterns = [...state.establishedPatterns];
  state.plan.apiContracts = [...state.apiContracts];
  state.plan.updatedAt = new Date().toISOString();
}

/**
 * Get snapshot for a specific phase
 */
export function getPhaseSnapshot(
  state: PhaseIntegrityState,
  phaseNumber: number
): PhaseSnapshot | null {
  return state.phaseSnapshots.get(phaseNumber) || null;
}

// ============================================================================
// P5: CROSS-PHASE TYPE CHECKING
// ============================================================================

/**
 * Run TypeScript type checking on accumulated code.
 * Called after each phase completion.
 */
export async function runPhaseTypeCheck(
  state: PhaseIntegrityState,
  phaseNumber: number
): Promise<TypeCheckResult> {
  try {
    const { runTypeCheck } = await import('../TypeScriptCompilerService');

    // Only check TypeScript/TSX files
    const tsFiles = state.rawGeneratedFiles.filter(
      (f) => f.path.endsWith('.ts') || f.path.endsWith('.tsx')
    );

    if (tsFiles.length === 0) {
      return { success: true, errors: [], warnings: [] };
    }

    const result = await runTypeCheck(tsFiles);

    // Store result for reporting
    state.typeCheckResults.set(phaseNumber, result);

    return result;
  } catch (err) {
    console.error('Type checking failed:', err);
    return {
      success: false, // Fix 15: Fail closed
      errors: [
        {
          file: 'system',
          line: 0,
          column: 0,
          message: `Type checking failed: ${err}`,
          code: 500,
          severity: 'error',
        },
      ],
      warnings: [],
    };
  }
}

/**
 * Get type check result for a specific phase
 */
export function getTypeCheckResult(
  state: PhaseIntegrityState,
  phaseNumber: number
): TypeCheckResult | null {
  return state.typeCheckResults.get(phaseNumber) || null;
}

// ============================================================================
// P6: TYPE COMPATIBILITY CHECKS
// ============================================================================

/**
 * Check type compatibility after phase completion
 */
export async function checkTypeCompatibility(
  state: PhaseIntegrityState,
  phaseNumber: number
): Promise<TypeCompatibilityResult> {
  try {
    const { extractTypeDefinitions, checkTypeCompatibility: checkCompat } =
      await import('@/utils/typeCompatibilityChecker');

    // Extract types from new files in this phase
    const newFiles = state.rawGeneratedFiles.filter(
      (f) => f.path.endsWith('.ts') || f.path.endsWith('.tsx')
    );

    const newTypes: TypeDefinition[] = [];
    for (const file of newFiles) {
      const extracted = extractTypeDefinitions(file.content, file.path, phaseNumber);
      newTypes.push(...extracted);
    }

    // Check against previous types
    const result = checkCompat(state.typeDefinitions, newTypes, phaseNumber);

    // Update stored types (merge new definitions)
    for (const newType of newTypes) {
      const existingIndex = state.typeDefinitions.findIndex((t) => t.name === newType.name);
      if (existingIndex >= 0) {
        state.typeDefinitions[existingIndex] = newType;
      } else {
        state.typeDefinitions.push(newType);
      }
    }

    return result;
  } catch (err) {
    console.error('Type compatibility check failed:', err);
    return {
      compatible: false,
      breakingChanges: [
        {
          typeName: 'System Error',
          file: 'unknown',
          changeType: 'TYPE_DELETED',
          details: `Type compatibility check failed: ${err}`,
          previousPhase: 0,
          currentPhase: phaseNumber,
          severity: 'critical',
        },
      ],
    };
  }
}

// ============================================================================
// P7: TEST CRITERIA EXECUTION
// ============================================================================

/**
 * Run smoke tests for phase criteria
 */
export async function runPhaseTests(
  state: PhaseIntegrityState,
  phaseNumber: number
): Promise<PhaseTestResults> {
  const phase = state.plan.phases.find((p) => p.number === phaseNumber);

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
    const result = runSmokeTests(phase.testCriteria, state.rawGeneratedFiles, phaseNumber);

    state.phaseTestResults.set(phaseNumber, result);
    return result;
  } catch (err) {
    console.error('Smoke tests failed:', err);
    return {
      phaseNumber,
      total: phase.testCriteria.length,
      passed: 0,
      failed: 0,
      results: [],
      allPassed: false, // Fix 15: Fail closed
    };
  }
}

/**
 * Get smoke test results for a specific phase
 */
export function getPhaseTestResults(
  state: PhaseIntegrityState,
  phaseNumber: number
): PhaseTestResults | null {
  return state.phaseTestResults.get(phaseNumber) || null;
}

// ============================================================================
// P8: API CONTRACT ENFORCEMENT
// ============================================================================

/**
 * Validate API implementations against declared contracts
 */
export function validateApiContracts(state: PhaseIntegrityState): ContractValidationResult {
  const violations: import('@/types/dynamicPhases').ContractViolation[] = [];

  // Find all API route files
  const apiFiles = state.rawGeneratedFiles.filter(
    (f) => f.path.includes('/api/') && (f.path.endsWith('.ts') || f.path.endsWith('.tsx'))
  );

  // Check each contract
  for (const contract of state.apiContracts) {
    // Find matching API file
    const expectedPath = `/api${contract.endpoint}`;
    const apiFile = apiFiles.find(
      (f) => f.path.includes(expectedPath) || f.path.includes(contract.endpoint.replace(/\//g, '/'))
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
    valid: violations.filter((v) => v.severity === 'error').length === 0,
    violations,
  };
}

// ============================================================================
// P16: ARCHITECTURE VERIFICATION
// ============================================================================

/**
 * Verify that the generated code matches the architecture specification
 */
export async function verifyArchitectureImplementation(
  state: PhaseIntegrityState
): Promise<{ verified: boolean; issues: string[] }> {
  if (!state.plan.architectureSpec) {
    return { verified: true, issues: [] };
  }

  const issues: string[] = [];
  const spec = state.plan.architectureSpec;

  // 1. Verify API routes exist
  if (spec.api?.routes) {
    for (const route of spec.api.routes) {
      // Strip leading slashes for matching
      const normalizedPath = route.path.replace(/^\//, '');
      const routeFile = state.rawGeneratedFiles.find(
        (f) =>
          f.path.includes(`api/${normalizedPath}`) || f.path.includes(`app/api/${normalizedPath}`)
      );

      if (!routeFile) {
        issues.push(`Missing API route: ${route.method} ${route.path}`);
      } else {
        // Check for HTTP method export
        const methodUpper = route.method.toUpperCase();
        if (
          !routeFile.content.includes(`export async function ${methodUpper}`) &&
          !routeFile.content.includes(`export function ${methodUpper}`)
        ) {
          issues.push(`API route ${route.path} missing ${methodUpper} handler`);
        }
      }
    }
  }

  // 2. Verify Prisma schema matches
  if (spec.database?.tables) {
    const schemaFile = state.rawGeneratedFiles.find((f) => f.path.endsWith('schema.prisma'));
    if (schemaFile) {
      for (const table of spec.database.tables) {
        if (!schemaFile.content.includes(`model ${table.name}`)) {
          issues.push(`Missing database model: ${table.name}`);
        }
      }
    } else if (spec.database.tables.length > 0) {
      issues.push('Missing schema.prisma file despite database tables being defined');
    }
  }

  // 3. Verify auth is applied (if required)
  if (spec.auth?.strategy) {
    const apiFiles = state.rawGeneratedFiles.filter(
      (f) => f.path.includes('/api/') && !f.path.includes('auth') && !f.path.includes('public')
    );
    for (const file of apiFiles) {
      if (
        !file.content.includes('requireAuth') &&
        !file.content.includes('getServerSession') &&
        !file.content.includes('auth()')
      ) {
        issues.push(`API route ${file.path} may be missing authentication`);
      }
    }
  }

  return {
    verified: issues.length === 0,
    issues,
  };
}

// ============================================================================
// P9: REGRESSION TESTING
// ============================================================================

/**
 * Run regression tests - verify all previous phase criteria still pass
 */
export async function runRegressionTests(
  state: PhaseIntegrityState,
  currentPhase: number
): Promise<RegressionTestResult> {
  const failures: import('@/types/dynamicPhases').RegressionFailure[] = [];
  const previousPhasesChecked: number[] = [];

  try {
    const { runSmokeTests } = await import('@/utils/smokeTestRunner');

    // Run tests for all completed phases
    for (const phaseNum of state.completedPhases) {
      if (phaseNum >= currentPhase) continue;

      const phase = state.plan.phases.find((p) => p.number === phaseNum);
      if (!phase?.testCriteria?.length) continue;

      previousPhasesChecked.push(phaseNum);

      // Run smoke tests with current accumulated files
      const result = runSmokeTests(phase.testCriteria, state.rawGeneratedFiles, phaseNum);

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
  } catch (err) {
    console.error('Regression tests failed:', err);
    return {
      phaseNumber: currentPhase,
      previousPhasesChecked: [],
      failures: [],
      allPassed: false, // Fix 15: Fail closed
    };
  }
}

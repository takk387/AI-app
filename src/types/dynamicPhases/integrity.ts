/**
 * Dynamic Phase Generation System - Phase Integrity System (P1-P9)
 *
 * Types for file conflict detection, import validation, snapshots,
 * type checking, type compatibility, smoke tests, contract validation,
 * and regression testing.
 */

import type { AccumulatedFile, AccumulatedFeature, APIContract, DynamicPhase } from './structures';

// ============================================================================
// PHASE INTEGRITY SYSTEM (P1-P9)
// ============================================================================

// ============ P1: File Conflict Detection ============

/**
 * Represents a file conflict detected between phases
 */
export interface FileConflict {
  path: string;
  type: 'OVERWRITE' | 'EXPORT_REMOVED' | 'TYPE_CHANGED' | 'API_CHANGED';
  previousPhase: number;
  currentPhase: number;
  severity: 'critical' | 'warning' | 'info';
  details?: string;
}

/**
 * Result of file conflict detection
 */
export interface FileConflictResult {
  conflicts: FileConflict[];
  hasBreakingChanges: boolean;
}

// ============ P2: Import Validation ============

/**
 * Parsed import information for validation
 */
export interface ImportInfo {
  symbols: string[];
  from: string;
  isRelative: boolean;
}

/**
 * Unresolved import that couldn't be validated
 */
export interface UnresolvedImport {
  file: string;
  symbol?: string;
  importFrom: string;
  resolvedTo?: string;
  reason: 'FILE_NOT_FOUND' | 'SYMBOL_NOT_EXPORTED';
}

/**
 * Result of import/export validation
 */
export interface ImportValidationResult {
  valid: boolean;
  unresolved: UnresolvedImport[];
}

// ============ P3: Phase Snapshot ============

/**
 * Snapshot of phase state for rollback capability
 */
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

/**
 * Result of TypeScript type checking
 */
export interface TypeCheckResult {
  success: boolean;
  errors: TypeCheckError[];
  warnings: TypeCheckError[];
}

/**
 * Individual type check error/warning
 */
export interface TypeCheckError {
  file: string;
  line: number;
  column: number;
  message: string;
  code: number;
  severity: 'error' | 'warning';
}

// ============ P6: Type Compatibility ============

/**
 * Extracted type definition from code
 */
export interface TypeDefinition {
  name: string;
  file: string;
  kind: 'interface' | 'type' | 'enum' | 'class';
  properties: TypeProperty[];
  phase: number;
}

/**
 * Property within a type definition
 */
export interface TypeProperty {
  name: string;
  type: string;
  optional: boolean;
}

/**
 * Breaking change detected in type definitions
 */
export interface BreakingTypeChange {
  typeName: string;
  file: string;
  changeType: 'PROPERTY_REMOVED' | 'TYPE_CHANGED' | 'REQUIRED_ADDED' | 'TYPE_DELETED';
  details: string;
  previousPhase: number;
  currentPhase: number;
  severity: 'critical' | 'warning';
}

/**
 * Result of type compatibility check
 */
export interface TypeCompatibilityResult {
  compatible: boolean;
  breakingChanges: BreakingTypeChange[];
}

// ============ P7: Smoke Tests ============

/**
 * Result of a single smoke test criterion
 */
export interface SmokeTestResult {
  criterion: string;
  passed: boolean;
  error?: string;
  duration: number;
}

/**
 * Results of all smoke tests for a phase
 */
export interface PhaseTestResults {
  phaseNumber: number;
  total: number;
  passed: number;
  failed: number;
  results: SmokeTestResult[];
  allPassed: boolean;
}

// ============ P8: Contract Validation ============

/**
 * API contract violation detected
 */
export interface ContractViolation {
  endpoint: string;
  method: string;
  violation: 'MISSING_ENDPOINT' | 'WRONG_METHOD' | 'MISSING_RESPONSE_TYPE' | 'WRONG_PARAMS';
  expected: string;
  actual?: string;
  severity: 'error' | 'warning';
}

/**
 * Result of API contract validation
 */
export interface ContractValidationResult {
  valid: boolean;
  violations: ContractViolation[];
}

// ============ P9: Regression Testing ============

/**
 * Result of regression testing across phases
 */
export interface RegressionTestResult {
  phaseNumber: number;
  previousPhasesChecked: number[];
  failures: RegressionFailure[];
  allPassed: boolean;
}

/**
 * Individual regression failure
 */
export interface RegressionFailure {
  originalPhase: number;
  criterion: string;
  error: string;
}

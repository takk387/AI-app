'use client';

/**
 * Type Compatibility Checker
 *
 * Detects breaking changes in type definitions between phases.
 * Uses regex-based extraction (lightweight alternative to full AST parsing).
 *
 * Part of P6: Type Compatibility Checks
 */

import type {
  TypeDefinition,
  TypeProperty,
  BreakingTypeChange,
  TypeCompatibilityResult,
} from '@/types/dynamicPhases';

// Re-export types for convenience
export type { TypeDefinition, TypeProperty, BreakingTypeChange, TypeCompatibilityResult };

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

  // Interface extraction (handles extends)
  const interfaceRegex =
    /(?:export\s+)?interface\s+(\w+)\s*(?:extends\s+[\w,\s]+)?\s*\{([^}]+)\}/g;
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

  // Type alias extraction (object types only)
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

  // Enum extraction
  const enumRegex = /(?:export\s+)?enum\s+(\w+)\s*\{([^}]+)\}/g;
  while ((match = enumRegex.exec(content)) !== null) {
    definitions.push({
      name: match[1],
      file: filePath,
      kind: 'enum',
      properties: extractEnumMembers(match[2]),
      phase: phaseNumber,
    });
  }

  return definitions;
}

/**
 * Extract properties from an interface/type body
 */
function extractProperties(body: string): TypeProperty[] {
  const properties: TypeProperty[] = [];
  // Match property definitions: name?: type;
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
 * Extract enum members as properties
 */
function extractEnumMembers(body: string): TypeProperty[] {
  const members: TypeProperty[] = [];
  // Match enum members: Name = 'value' or Name = 0 or just Name
  const memberRegex = /(\w+)\s*(?:=\s*(['"]?\w+['"]?|\d+))?/g;
  let match;

  while ((match = memberRegex.exec(body)) !== null) {
    if (match[1] && match[1] !== '') {
      members.push({
        name: match[1],
        optional: false,
        type: match[2] || 'auto',
      });
    }
  }

  return members;
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
      const newProp = newType.properties.find((p) => p.name === prevProp.name);

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
        // Allow widening (adding union types)
        const isWidening =
          newProp.type.includes(prevProp.type) || newProp.type.includes('|');
        breakingChanges.push({
          typeName: newType.name,
          file: newType.file,
          changeType: 'TYPE_CHANGED',
          details: `Property '${prevProp.name}' changed from '${prevProp.type}' to '${newProp.type}'`,
          previousPhase: previous.phase,
          currentPhase,
          severity: isWidening ? 'warning' : 'critical',
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
    const stillExists = newTypes.some((t) => t.name === name);
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
    compatible: breakingChanges.filter((c) => c.severity === 'critical').length === 0,
    breakingChanges,
  };
}

/**
 * Generate a human-readable report of breaking changes
 */
export function formatBreakingChangesReport(result: TypeCompatibilityResult): string {
  if (result.compatible && result.breakingChanges.length === 0) {
    return 'No breaking changes detected.';
  }

  const critical = result.breakingChanges.filter((c) => c.severity === 'critical');
  const warnings = result.breakingChanges.filter((c) => c.severity === 'warning');

  let report = '';

  if (critical.length > 0) {
    report += `## Critical Breaking Changes (${critical.length})\n\n`;
    for (const change of critical) {
      report += `- **${change.typeName}** (${change.file})\n`;
      report += `  ${change.details}\n`;
      report += `  Changed from Phase ${change.previousPhase} to Phase ${change.currentPhase}\n\n`;
    }
  }

  if (warnings.length > 0) {
    report += `## Warnings (${warnings.length})\n\n`;
    for (const change of warnings) {
      report += `- **${change.typeName}** (${change.file})\n`;
      report += `  ${change.details}\n\n`;
    }
  }

  return report;
}

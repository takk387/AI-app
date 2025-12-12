---
paths:
  - src/utils/**
---

# Utilities Domain

## Overview

Utility functions are stateless, pure functions. They don't access stores, make API calls, or have side effects.

## Key Utility Files

### astModifier.ts (61KB - Largest Utility)

**Location:** `src/utils/astModifier.ts`

Handles AST-based code modifications:

```typescript
// Rename a function/component
function renameSymbol(code: string, oldName: string, newName: string): ModifyResult;

// Add import statement
function addImport(code: string, importSpec: ImportSpec): ModifyResult;

// Remove unused imports
function removeUnusedImports(code: string): ModifyResult;

// Modify function body
function modifyFunction(
  code: string,
  functionName: string,
  modifications: FunctionMods
): ModifyResult;

// Insert code at position
function insertAt(
  code: string,
  position: 'start' | 'end' | 'before' | 'after',
  anchor: string,
  newCode: string
): ModifyResult;
```

**Why AST over string manipulation:**

- Preserves formatting
- Handles edge cases (strings, comments)
- Accurate symbol resolution
- Enables rollback via inverse operations

### codeValidator.ts

**Location:** `src/utils/codeValidator.ts`

Validates generated code before applying:

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  fixable: boolean;
}

// Validate TypeScript/TSX syntax
function validateSyntax(code: string, filename: string): ValidationResult;

// Validate imports resolve
function validateImports(code: string, availableFiles: string[]): ValidationResult;

// Validate types match (basic check)
function validateTypes(code: string): ValidationResult;

// Auto-fix common issues
function autoFix(code: string, errors: ValidationError[]): FixResult;
```

**Auto-fixable Issues:**

- Missing semicolons
- Incorrect import paths
- Unused variable prefixes (`_unused`)
- Missing React import (for JSX)

### designPatterns.ts

**Location:** `src/utils/designPatterns.ts`

Design pattern utilities for generated components:

```typescript
// Apply design tokens to component
function applyDesignTokens(code: string, tokens: DesignTokens): string;

// Generate Tailwind classes from design
function generateTailwindClasses(design: LayoutDesign): ClassMap;

// Convert CSS to Tailwind
function cssToTailwind(css: string): TailwindConfig;
```

### fileUtils.ts

**Location:** `src/utils/fileUtils.ts`

File path and naming utilities:

```typescript
// Generate component file path
function getComponentPath(name: string): string;

// Normalize import path
function normalizeImport(from: string, to: string): string;

// Check if path is within project
function isProjectPath(path: string): boolean;
```

## Utility Patterns

### Pure Functions

All utilities should be pure:

```typescript
// Good - pure function
function formatCode(code: string, options: FormatOptions): string {
  return prettier.format(code, options);
}

// Bad - side effect
function formatCode(code: string): string {
  console.log('Formatting...'); // Side effect!
  return prettier.format(code);
}
```

### Error Handling

Return result objects instead of throwing:

```typescript
// Good - result object
interface ModifyResult {
  success: boolean;
  code?: string;
  error?: string;
}

function modifyCode(code: string): ModifyResult {
  try {
    const result = doModification(code);
    return { success: true, code: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Bad - throws
function modifyCode(code: string): string {
  return doModification(code); // Throws on error
}
```

### Type Safety

Always type inputs and outputs:

```typescript
// Good - fully typed
function extractExports(code: string): Export[] {
  // ...
}

// Bad - any types
function extractExports(code: any): any {
  // ...
}
```

### Testing

Utilities are easy to test - no mocks needed:

```typescript
describe('formatCode', () => {
  it('should format TypeScript', () => {
    const input = 'const x=1';
    const output = formatCode(input, { parser: 'typescript' });
    expect(output).toBe('const x = 1;\n');
  });
});
```

## Critical Dependencies

- `astModifier.ts` ← Used by PhaseExecutionManager for code generation
- `codeValidator.ts` ← Validates all generated code before preview
- Tree-sitter ← AST parsing engine (mocked in tests)

## Common Modifications

### Adding a New Utility

1. Create function in appropriate file
2. Export from file
3. Add tests in `__tests__/` or `tests/`
4. Update this doc if significant

### Modifying astModifier.ts

This file is complex. Before changes:

1. Read the full file to understand patterns
2. Check all usages: `grep -r "astModifier" src/`
3. Run existing tests: `npm run test:services`
4. Add tests for new functionality

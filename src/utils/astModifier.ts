import Parser from 'tree-sitter';
import { CodeParser } from './treeSitterParser';
import type {
  Modification,
  ImportSpec,
  WrapperSpec,
  StateVariableSpec,
  ModifyClassNameSpec,
  InsertJSXSpec,
  UseEffectSpec,
  UseRefSpec,
  UseMemoSpec,
  UseCallbackSpec,
  UseReducerSpec,
  ModifyPropSpec,
  FunctionSpec,
  ConditionalWrapSpec,
  ReplaceFunctionBodySpec,
  DeleteElementSpec,
  MergeImportsSpec,
  ModificationResult,
  ASTModifierOptions,
  NodePosition,
} from './astModifierTypes';

// Extracted sub-modules
import {
  extractExistingImports,
  generateImportCode,
  buildImportInsertionMod,
  buildImportUpdateMod,
  findImportsForSource,
  buildCombineImportsMods,
  buildDeduplicateImportsMods,
} from './astModifierImports';
import {
  buildStateVariableMod,
  buildUseEffectMod,
  buildRefMod,
  buildMemoMod,
  buildCallbackMod,
  buildReducerMods,
  buildFunctionMod,
} from './astModifierHooks';
import {
  buildWrapElementMods,
  buildModifyClassNameMods,
  buildInsertJSXMods,
  buildModifyPropMods,
  buildConditionalMods,
  buildReplaceFunctionBodyMod,
  buildDeleteElementMods,
} from './astModifierJsx';
import { findFunction, findElementToDelete } from './astModifierSearch';

/**
 * AST Modifier - Makes surgical modifications to code using Tree-sitter
 *
 * Features:
 * - Precise position-based modifications
 * - Import deduplication
 * - Validation after modifications
 * - Preserves formatting where possible
 *
 * @version 2.0.0 — Refactored: logic extracted to astModifierImports, astModifierHooks, astModifierJsx, astModifierSearch
 */
export class ASTModifier {
  private parser: CodeParser;
  private originalCode: string;
  private tree: Parser.Tree | null = null;
  private modifications: Modification[] = [];
  private imports: Map<string, ImportSpec> = new Map();
  private scheduledImportUpdates: Set<string> = new Set();
  private options: Required<ASTModifierOptions>;

  constructor(code: string, options: ASTModifierOptions = {}) {
    this.originalCode = code;
    this.parser = new CodeParser('typescript');
    this.options = {
      preserveFormatting: true,
      validateAfter: true,
      indentation: '  ',
      ...options,
    };
  }

  /**
   * Initialize the modifier by parsing the code
   */
  async initialize(): Promise<void> {
    this.tree = await this.parser.parse(this.originalCode);
    if (!this.tree) {
      throw new Error('Failed to parse code');
    }

    // Extract existing imports
    extractExistingImports(this.parser, this.tree, this.imports);
  }

  // ───────────────────────────── Import Operations ─────────────────────────────

  /**
   * Add an import (deduplicated)
   */
  addImport(spec: ImportSpec): this {
    const existing = this.imports.get(spec.source);

    if (existing) {
      // Merge with existing import
      let hasChanges = false;

      if (spec.defaultImport && !existing.defaultImport) {
        existing.defaultImport = spec.defaultImport;
        hasChanges = true;
      }
      if (spec.namespaceImport && !existing.namespaceImport) {
        existing.namespaceImport = spec.namespaceImport;
        hasChanges = true;
      }
      if (spec.namedImports) {
        if (!existing.namedImports) {
          existing.namedImports = [];
        }
        // Add new named imports, avoiding duplicates
        // Use Sets for O(1) lookups instead of O(n) array searches
        const existingNamesSet = new Set(
          existing.namedImports.map((imp) => {
            const match = imp.match(/^(\w+)(?:\s+as\s+\w+)?$/);
            return match ? match[1] : imp;
          })
        );
        const existingImportsSet = new Set(existing.namedImports);

        for (const namedImport of spec.namedImports) {
          // Extract name from potential "name as alias" format
          const match = namedImport.match(/^(\w+)(?:\s+as\s+\w+)?$/);
          const importName = match ? match[1] : namedImport;

          // Only add if not already present (O(1) Set lookups)
          if (!existingNamesSet.has(importName) && !existingImportsSet.has(namedImport)) {
            existing.namedImports.push(namedImport);
            existingNamesSet.add(importName);
            existingImportsSet.add(namedImport);
            hasChanges = true;
          }
        }
      }

      // Only schedule update if there were actual changes
      if (hasChanges && !this.scheduledImportUpdates.has(spec.source)) {
        const mod = buildImportUpdateMod(this.parser, this.tree, spec.source, this.imports);
        if (mod) this.modifications.push(mod);
        this.scheduledImportUpdates.add(spec.source);
      }
    } else {
      // New import - add at the top
      this.imports.set(spec.source, spec);
      const mod = buildImportInsertionMod(this.parser, this.tree, this.originalCode, spec);
      if (mod) this.modifications.push(mod);
    }

    return this;
  }

  /**
   * Merge imports from the same source
   */
  mergeImports(spec: MergeImportsSpec): this {
    if (!this.tree) return this;

    const sourceImports = findImportsForSource(this.parser, this.tree, spec.source);
    if (sourceImports.length <= 1) {
      // Nothing to merge
      return this;
    }

    let mods: Modification[] = [];
    switch (spec.strategy) {
      case 'combine':
        mods = buildCombineImportsMods(this.parser, sourceImports, this.originalCode, spec.source);
        break;
      case 'deduplicate':
        mods = buildDeduplicateImportsMods(sourceImports, this.originalCode, spec.source);
        break;
      case 'organize':
        // For now, just combine them in a logical order
        mods = buildCombineImportsMods(this.parser, sourceImports, this.originalCode, spec.source);
        break;
    }
    this.modifications.push(...mods);

    return this;
  }

  // ────────────────────────────── JSX Operations ───────────────────────────────

  /**
   * Wrap a JSX element in another component
   */
  wrapElement(elementNode: Parser.SyntaxNode, wrapper: WrapperSpec): this {
    if (!this.tree) return this;

    // Add import if specified
    if (wrapper.import) {
      this.addImport(wrapper.import);
    }

    const mods = buildWrapElementMods(this.originalCode, elementNode, wrapper, this.options);
    this.modifications.push(...mods);

    return this;
  }

  /**
   * Modify className attribute of a JSX element
   */
  modifyClassName(elementNode: Parser.SyntaxNode, spec: ModifyClassNameSpec): this {
    if (!this.tree) return this;

    const mods = buildModifyClassNameMods(this.originalCode, elementNode, spec);
    this.modifications.push(...mods);

    return this;
  }

  /**
   * Insert JSX at a specific position relative to an element
   */
  insertJSX(elementNode: Parser.SyntaxNode, spec: InsertJSXSpec): this {
    if (!this.tree) return this;

    const mods = buildInsertJSXMods(this.originalCode, elementNode, spec, this.options);
    this.modifications.push(...mods);

    return this;
  }

  /**
   * Modify a prop on a JSX element
   */
  modifyProp(elementNode: Parser.SyntaxNode, spec: ModifyPropSpec): this {
    if (!this.tree) return this;

    const mods = buildModifyPropMods(this.originalCode, elementNode, spec);
    this.modifications.push(...mods);

    return this;
  }

  /**
   * Wrap existing return statement in conditional
   */
  wrapInConditional(spec: ConditionalWrapSpec): this {
    if (!this.tree) return this;

    const mods = buildConditionalMods(
      this.parser,
      this.tree,
      this.originalCode,
      spec,
      this.options
    );
    this.modifications.push(...mods);

    return this;
  }

  /**
   * Replace the body of an existing function
   */
  replaceFunctionBody(spec: ReplaceFunctionBodySpec): this {
    if (!this.tree) return this;

    // Find the function to modify
    const functionNode = findFunction(this.tree, spec.functionName);
    if (!functionNode) {
      console.warn(`Could not find function: ${spec.functionName}`);
      return this;
    }

    const mod = buildReplaceFunctionBodyMod(this.originalCode, functionNode, spec, this.options);
    if (mod) this.modifications.push(mod);

    return this;
  }

  /**
   * Delete a JSX element or other code element
   */
  deleteElement(spec: DeleteElementSpec): this {
    if (!this.tree) return this;

    // Find the element to delete
    const element = findElementToDelete(this.tree, spec);
    if (!element) {
      console.warn(`Could not find element to delete: ${spec.elementType}`);
      return this;
    }

    const mods = buildDeleteElementMods(this.originalCode, element, spec);
    this.modifications.push(...mods);

    return this;
  }

  // ────────────────────────── Hook / Function Operations ───────────────────────

  /**
   * Add a state variable (useState)
   */
  addStateVariable(spec: StateVariableSpec): this {
    if (!this.tree) return this;

    // Ensure useState is imported
    this.addImport({
      source: 'react',
      namedImports: ['useState'],
    });

    const mod = buildStateVariableMod(
      this.parser,
      this.tree,
      this.originalCode,
      spec,
      this.options
    );
    if (mod) this.modifications.push(mod);

    return this;
  }

  /**
   * Add a useEffect hook
   */
  addUseEffect(spec: UseEffectSpec): this {
    if (!this.tree) return this;

    // Ensure useEffect is imported
    this.addImport({
      source: 'react',
      namedImports: ['useEffect'],
    });

    const mod = buildUseEffectMod(this.parser, this.tree, this.originalCode, spec, this.options);
    if (mod) this.modifications.push(mod);

    return this;
  }

  /**
   * Add a useRef hook
   */
  addRef(spec: UseRefSpec): this {
    if (!this.tree) return this;

    // Ensure useRef is imported
    this.addImport({
      source: 'react',
      namedImports: ['useRef'],
    });

    const mod = buildRefMod(this.parser, this.tree, this.originalCode, spec, this.options);
    if (mod) this.modifications.push(mod);

    return this;
  }

  /**
   * Add a useMemo hook
   */
  addMemo(spec: UseMemoSpec): this {
    if (!this.tree) return this;

    // Ensure useMemo is imported
    this.addImport({
      source: 'react',
      namedImports: ['useMemo'],
    });

    const mod = buildMemoMod(this.parser, this.tree, this.originalCode, spec, this.options);
    if (mod) this.modifications.push(mod);

    return this;
  }

  /**
   * Add a useCallback hook
   */
  addCallback(spec: UseCallbackSpec): this {
    if (!this.tree) return this;

    // Ensure useCallback is imported
    this.addImport({
      source: 'react',
      namedImports: ['useCallback'],
    });

    const mod = buildCallbackMod(this.parser, this.tree, this.originalCode, spec, this.options);
    if (mod) this.modifications.push(mod);

    return this;
  }

  /**
   * Add a useReducer hook
   */
  addReducer(spec: UseReducerSpec): this {
    if (!this.tree) return this;

    // Ensure useReducer is imported
    this.addImport({
      source: 'react',
      namedImports: ['useReducer'],
    });

    const mods = buildReducerMods(this.parser, this.tree, this.originalCode, spec, this.options);
    this.modifications.push(...mods);

    return this;
  }

  /**
   * Add a function to the component
   */
  addFunction(spec: FunctionSpec): this {
    if (!this.tree) return this;

    const mod = buildFunctionMod(this.parser, this.tree, this.originalCode, spec, this.options);
    if (mod) this.modifications.push(mod);

    return this;
  }

  // ──────────────────────────── Code Generation ────────────────────────────────

  /**
   * Get position info for a node
   */
  getNodePosition(node: Parser.SyntaxNode): NodePosition {
    return {
      start: node.startIndex,
      end: node.endIndex,
      line: node.startPosition.row + 1,
      column: node.startPosition.column + 1,
    };
  }

  /**
   * Apply all modifications and generate new code
   *
   * Position tracking strategy:
   * - Sort by position descending (higher positions first)
   * - This way, modifications at lower positions aren't affected by higher ones
   * - For same-position modifications, track cumulative offset to adjust positions
   */
  async generate(): Promise<ModificationResult> {
    try {
      // Sort modifications: POSITION FIRST (reverse), then priority, then type
      // This ensures we apply from end to start, avoiding position shifts
      const sortedMods = [...this.modifications].sort((a, b) => {
        // First by position (later first, so we can apply without position shifts)
        if (b.start !== a.start) {
          return b.start - a.start;
        }

        // Then by priority (higher first) as tiebreaker for same position
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }

        // Finally: stable sort by type to ensure consistent ordering
        // Prefer: insert < replace < delete
        const typeOrder = { insert: 0, replace: 1, delete: 2 };
        return typeOrder[a.type] - typeOrder[b.type];
      });

      // Apply modifications with position offset tracking
      // Track offsets for modifications at each position to handle same-position mods
      let modifiedCode = this.originalCode;

      // Track cumulative offset for each original start position
      // Key: original start position, Value: cumulative offset from previous same-position mods
      const samePositionOffsets: Map<number, number> = new Map();

      // Also track all applied modifications to detect and handle overlapping ranges
      const appliedRanges: Array<{ start: number; end: number; offset: number }> = [];

      for (const mod of sortedMods) {
        // Calculate adjusted positions
        // 1. Check for same-position modifications (most common case)
        let adjustedStart = mod.start;
        let adjustedEnd = mod.end;

        // Apply offset from previous same-position modifications
        const samePositionOffset = samePositionOffsets.get(mod.start) || 0;
        adjustedStart += samePositionOffset;
        adjustedEnd += samePositionOffset;

        // 2. Check for overlapping modifications (edge case - log warning)
        for (const applied of appliedRanges) {
          // If this modification's original range overlaps with a previously applied one
          if (mod.start < applied.end && mod.end > applied.start) {
            console.warn(
              `[ASTModifier] Overlapping modifications detected: ` +
                `current [${mod.start}-${mod.end}] overlaps with applied [${applied.start}-${applied.end}]. ` +
                `Results may be unexpected. Description: ${mod.description || 'none'}`
            );
          }
        }

        // Create adjusted modification
        const adjustedMod: Modification = {
          ...mod,
          start: adjustedStart,
          end: adjustedEnd,
        };

        // Calculate the offset this modification creates
        let offsetDelta = 0;
        switch (mod.type) {
          case 'insert':
            offsetDelta = mod.newCode.length;
            break;
          case 'replace':
            offsetDelta = mod.newCode.length - (mod.end - mod.start);
            break;
          case 'delete':
            offsetDelta = -(mod.end - mod.start);
            break;
        }

        // Update offset for this position (for subsequent same-position mods)
        samePositionOffsets.set(mod.start, samePositionOffset + offsetDelta);

        // Track this modification's range for overlap detection
        // Limit array size to prevent O(n²) growth - keep last 100 ranges
        // (overlap detection is for debugging, nearby mods are most relevant)
        if (appliedRanges.length >= 100) {
          appliedRanges.shift();
        }
        appliedRanges.push({
          start: mod.start,
          end: mod.end,
          offset: offsetDelta,
        });

        modifiedCode = this.applyModification(modifiedCode, adjustedMod);
      }

      // Validate if requested
      if (this.options.validateAfter) {
        const validationResult = await this.validate(modifiedCode);
        if (!validationResult.success) {
          return validationResult;
        }
      }

      return {
        success: true,
        code: modifiedCode,
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Apply a single modification to code
   */
  private applyModification(code: string, mod: Modification): string {
    // Validate positions
    if (mod.start < 0 || mod.start > code.length) {
      throw new Error(
        `Invalid modification start position ${mod.start} (code length: ${code.length}). ` +
          `Description: ${mod.description || 'none'}`
      );
    }

    if (mod.end < 0 || mod.end > code.length) {
      throw new Error(
        `Invalid modification end position ${mod.end} (code length: ${code.length}). ` +
          `Description: ${mod.description || 'none'}`
      );
    }

    if (mod.end < mod.start) {
      throw new Error(
        `Invalid modification: end position (${mod.end}) is before start position (${mod.start}). ` +
          `Description: ${mod.description || 'none'}`
      );
    }

    switch (mod.type) {
      case 'insert':
        return code.substring(0, mod.start) + mod.newCode + code.substring(mod.start);

      case 'replace':
        return code.substring(0, mod.start) + mod.newCode + code.substring(mod.end);

      case 'delete':
        return code.substring(0, mod.start) + code.substring(mod.end);

      default:
        return code;
    }
  }

  /**
   * Validate the modified code
   */
  private async validate(code: string): Promise<ModificationResult> {
    try {
      const tree = await this.parser.parse(code);

      if (!tree) {
        return {
          success: false,
          errors: ['Failed to parse modified code'],
        };
      }

      if (this.parser.hasErrors(tree)) {
        const errors = this.parser.getErrors(tree);
        return {
          success: false,
          errors: errors.map((e) => `Syntax error at ${e.line}:${e.column}: ${e.text}`),
        };
      }

      return {
        success: true,
        code,
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Validation error'],
      };
    }
  }

  // ──────────────────────────── Accessors / Reset ──────────────────────────────

  /**
   * Get the current tree (useful for finding elements)
   */
  getTree(): Parser.Tree | null {
    return this.tree;
  }

  /**
   * Get the parser (useful for finding elements)
   */
  getParser(): CodeParser {
    return this.parser;
  }

  /**
   * Reset all modifications
   */
  reset(): void {
    this.modifications = [];
    this.imports.clear();
    this.scheduledImportUpdates.clear();
    this.tree = null;
    extractExistingImports(this.parser, this.tree, this.imports);
  }
}

/**
 * Convenience function to modify code
 */
export async function modifyCode(
  code: string,
  modifications: (modifier: ASTModifier) => void | Promise<void>,
  options?: ASTModifierOptions
): Promise<ModificationResult> {
  const modifier = new ASTModifier(code, options);
  await modifier.initialize();
  await modifications(modifier);
  return await modifier.generate();
}

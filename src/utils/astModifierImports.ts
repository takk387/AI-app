import type Parser from 'tree-sitter';
import type { CodeParser } from './treeSitterParser';
import type { ImportSpec, Modification } from './astModifierTypes';

/**
 * AST Modifier - Import Management Operations
 *
 * Pure utility functions for managing imports in the AST.
 * Extracted from ASTModifier class.
 */

/**
 * Extract existing imports from the code and populate an imports Map
 */
export function extractExistingImports(
  parser: CodeParser,
  tree: Parser.Tree | null,
  imports: Map<string, ImportSpec>
): void {
  if (!tree) return;

  const importNodes = parser.findImports(tree);
  for (const importNode of importNodes) {
    const importInfo = parser.getImportInfo(importNode);

    if (importInfo) {
      // Build ImportSpec from existing import
      const spec: ImportSpec = {
        source: importInfo.source,
      };

      for (const imp of importInfo.imports) {
        if (imp.isDefault) {
          spec.defaultImport = imp.name;
        } else if (imp.isNamespace) {
          spec.namespaceImport = imp.alias || imp.name;
        } else {
          if (!spec.namedImports) spec.namedImports = [];
          spec.namedImports.push(imp.alias ? `${imp.name} as ${imp.alias}` : imp.name);
        }
      }

      imports.set(importInfo.source, spec);
    } else {
      // Side-effect import: import 'styles.css';
      // Extract source from the node text
      const importText = importNode.text;
      const match = importText.match(/import\s+['"]([^'"]+)['"]/);
      if (match) {
        const source = match[1];
        // Track side-effect import with empty spec
        imports.set(source, { source });
      }
    }
  }
}

/**
 * Generate import code from spec
 */
export function generateImportCode(spec: ImportSpec): string {
  // Validate: Cannot combine default and namespace imports
  if (spec.defaultImport && spec.namespaceImport) {
    throw new Error(
      `Invalid import spec for '${spec.source}': Cannot combine default and namespace imports. ` +
        `Use either defaultImport OR namespaceImport, not both.`
    );
  }

  const parts: string[] = [];

  if (spec.defaultImport) {
    parts.push(spec.defaultImport);
  }

  if (spec.namespaceImport) {
    parts.push(`* as ${spec.namespaceImport}`);
  }

  if (spec.namedImports && spec.namedImports.length > 0) {
    parts.push(`{ ${spec.namedImports.join(', ')} }`);
  }

  if (parts.length === 0) {
    // Side-effect import: import 'module';
    return `import '${spec.source}';`;
  }

  const importClause = parts.join(', ');
  return `import ${importClause} from '${spec.source}';`;
}

/**
 * Schedule insertion of a new import — returns a Modification
 */
export function buildImportInsertionMod(
  parser: CodeParser,
  tree: Parser.Tree | null,
  originalCode: string,
  spec: ImportSpec
): Modification | null {
  if (!tree) return null;

  const importCode = generateImportCode(spec);

  // Find insertion point (after existing imports or at start)
  const existingImports = parser.findImports(tree);
  let insertPosition = 0;
  let needsNewline = false;

  if (existingImports.length > 0) {
    // Insert after last import
    const lastImport = existingImports[existingImports.length - 1];
    insertPosition = lastImport.endIndex;

    // Check if there's already a newline after the last import
    needsNewline = originalCode[insertPosition] !== '\n';
  }

  // Build the code to insert with proper newlines
  const newCode = needsNewline ? '\n' + importCode + '\n' : importCode + '\n';

  return {
    type: 'insert',
    start: insertPosition,
    end: insertPosition,
    newCode,
    priority: 1000, // High priority for imports
    description: `Add import from ${spec.source}`,
  };
}

/**
 * Schedule update of an existing import — returns a Modification
 */
export function buildImportUpdateMod(
  parser: CodeParser,
  tree: Parser.Tree | null,
  source: string,
  imports: Map<string, ImportSpec>
): Modification | null {
  if (!tree) return null;

  const importNodes = parser.findImports(tree);
  for (const importNode of importNodes) {
    const info = parser.getImportInfo(importNode);
    if (info && info.source === source) {
      const spec = imports.get(source);
      if (spec) {
        const newImportCode = generateImportCode(spec);

        return {
          type: 'replace',
          start: importNode.startIndex,
          end: importNode.endIndex,
          newCode: newImportCode,
          priority: 1000,
          description: `Update import from ${source}`,
        };
      }
      break;
    }
  }
  return null;
}

/**
 * Find all imports for a specific source
 */
export function findImportsForSource(
  parser: CodeParser,
  tree: Parser.Tree | null,
  source: string
): Parser.SyntaxNode[] {
  if (!tree) return [];

  const imports: Parser.SyntaxNode[] = [];
  const importNodes = parser.findImports(tree);

  for (const importNode of importNodes) {
    const importInfo = parser.getImportInfo(importNode);
    if (importInfo && importInfo.source === source) {
      imports.push(importNode);
    }
  }

  return imports;
}

/**
 * Combine multiple imports into one — returns Modifications
 */
export function buildCombineImportsMods(
  parser: CodeParser,
  importNodes: Parser.SyntaxNode[],
  originalCode: string,
  source: string
): Modification[] {
  if (importNodes.length <= 1) return [];

  const mods: Modification[] = [];

  // Collect all import parts
  let defaultImport: string | undefined;
  let namespaceImport: string | undefined;
  const namedImports: string[] = [];

  for (const importNode of importNodes) {
    const importInfo = parser.getImportInfo(importNode);
    if (importInfo) {
      for (const imp of importInfo.imports) {
        if (imp.isDefault && !defaultImport) {
          defaultImport = imp.name;
        } else if (imp.isNamespace && !namespaceImport) {
          namespaceImport = imp.alias || imp.name;
        } else if (!imp.isDefault && !imp.isNamespace) {
          const importName = imp.alias ? `${imp.name} as ${imp.alias}` : imp.name;
          if (!namedImports.includes(importName)) {
            namedImports.push(importName);
          }
        }
      }
    }
  }

  // Generate combined import
  const combinedSpec: ImportSpec = { source };
  if (defaultImport) combinedSpec.defaultImport = defaultImport;
  if (namespaceImport) combinedSpec.namespaceImport = namespaceImport;
  if (namedImports.length > 0) combinedSpec.namedImports = namedImports;

  const combinedImport = generateImportCode(combinedSpec);

  // Replace first import with combined version
  mods.push({
    type: 'replace',
    start: importNodes[0].startIndex,
    end: importNodes[0].endIndex,
    newCode: combinedImport,
    priority: 1000,
    description: `Combine imports from ${source}`,
  });

  // Delete the rest
  for (let i = 1; i < importNodes.length; i++) {
    const importNode = importNodes[i];
    const deleteStart = importNode.startIndex;
    let deleteEnd = importNode.endIndex;

    // Include trailing newline
    if (deleteEnd < originalCode.length && originalCode[deleteEnd] === '\n') {
      deleteEnd++;
    }

    mods.push({
      type: 'delete',
      start: deleteStart,
      end: deleteEnd,
      newCode: '',
      priority: 999,
      description: `Remove duplicate import from ${source}`,
    });
  }

  return mods;
}

/**
 * Deduplicate imports (remove exact duplicates) — returns Modifications
 */
export function buildDeduplicateImportsMods(
  importNodes: Parser.SyntaxNode[],
  originalCode: string,
  source: string
): Modification[] {
  const mods: Modification[] = [];
  const seen = new Set<string>();

  for (const importNode of importNodes) {
    const importText = importNode.text.trim();

    if (seen.has(importText)) {
      // This is a duplicate, delete it
      const deleteStart = importNode.startIndex;
      let deleteEnd = importNode.endIndex;

      // Include trailing newline
      if (deleteEnd < originalCode.length && originalCode[deleteEnd] === '\n') {
        deleteEnd++;
      }

      mods.push({
        type: 'delete',
        start: deleteStart,
        end: deleteEnd,
        newCode: '',
        priority: 999,
        description: `Remove duplicate import from ${source}`,
      });
    } else {
      seen.add(importText);
    }
  }

  return mods;
}

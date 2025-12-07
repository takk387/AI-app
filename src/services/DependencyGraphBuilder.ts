/**
 * DependencyGraphBuilder - Builds and manages file dependency graphs
 * Tracks import/export relationships for intelligent context selection
 */

import {
  DependencyGraph,
  DependencyEdge,
  FileNode,
  FileAnalysis,
  GraphStats,
} from '../types/codeContext';

// ============================================================================
// DEPENDENCY GRAPH BUILDER CLASS
// ============================================================================

export class DependencyGraphBuilder {
  private files: Map<string, FileNode> = new Map();
  private edges: DependencyEdge[] = [];
  private pathAliases: Map<string, string> = new Map();

  constructor(aliases?: Record<string, string>) {
    if (aliases) {
      for (const [alias, path] of Object.entries(aliases)) {
        this.pathAliases.set(alias, path);
      }
    }
  }

  // ==========================================================================
  // GRAPH BUILDING
  // ==========================================================================

  /**
   * Build a complete dependency graph from file analyses
   */
  buildGraph(analyses: FileAnalysis[]): DependencyGraph {
    this.files.clear();
    this.edges = [];

    // First pass: add all files as nodes
    for (const analysis of analyses) {
      this.files.set(analysis.path, {
        path: analysis.path,
        analysis,
        depth: Infinity,
        inDegree: 0,
        outDegree: 0,
      });
    }

    // Second pass: build edges
    for (const analysis of analyses) {
      for (const imp of analysis.imports) {
        if (imp.isExternal) continue;

        const resolvedPath = this.resolveImportPath(imp.source, analysis.path);
        if (!resolvedPath) continue;

        // Find the target file
        const targetPath = this.findMatchingFile(resolvedPath);
        if (!targetPath || !this.files.has(targetPath)) continue;

        // Create edge
        const edge: DependencyEdge = {
          from: analysis.path,
          to: targetPath,
          importType: imp.isTypeOnly ? 'type-only' : 'direct',
          symbols: imp.imports.map((i) => i.alias ?? i.name),
        };

        this.edges.push(edge);

        // Update degrees
        const fromNode = this.files.get(analysis.path);
        const toNode = this.files.get(targetPath);
        if (fromNode) fromNode.outDegree++;
        if (toNode) toNode.inDegree++;

        // Update dependents in target analysis
        if (toNode && !toNode.analysis.dependents.includes(analysis.path)) {
          toNode.analysis.dependents.push(analysis.path);
        }
      }
    }

    // Calculate depths and find roots/leaves
    const roots = this.findRoots();
    const leaves = this.findLeaves();
    this.calculateDepths(roots);

    // Detect cycles
    const cycles = this.detectCycles();

    // Calculate stats
    const stats = this.calculateStats();

    return {
      files: this.files,
      edges: this.edges,
      roots,
      leaves,
      cycles,
      stats,
    };
  }

  /**
   * Update graph incrementally when files change
   */
  updateGraph(graph: DependencyGraph, changedAnalyses: FileAnalysis[]): DependencyGraph {
    this.files = new Map(graph.files);
    this.edges = [...graph.edges];

    for (const analysis of changedAnalyses) {
      // Remove old edges from this file
      this.edges = this.edges.filter((e) => e.from !== analysis.path);

      // Update the node
      const existingNode = this.files.get(analysis.path);
      if (existingNode) {
        existingNode.analysis = analysis;
        existingNode.outDegree = 0;
      } else {
        this.files.set(analysis.path, {
          path: analysis.path,
          analysis,
          depth: Infinity,
          inDegree: 0,
          outDegree: 0,
        });
      }

      // Add new edges
      for (const imp of analysis.imports) {
        if (imp.isExternal) continue;

        const resolvedPath = this.resolveImportPath(imp.source, analysis.path);
        if (!resolvedPath) continue;

        const targetPath = this.findMatchingFile(resolvedPath);
        if (!targetPath || !this.files.has(targetPath)) continue;

        const edge: DependencyEdge = {
          from: analysis.path,
          to: targetPath,
          importType: imp.isTypeOnly ? 'type-only' : 'direct',
          symbols: imp.imports.map((i) => i.alias ?? i.name),
        };

        this.edges.push(edge);

        const fromNode = this.files.get(analysis.path);
        const toNode = this.files.get(targetPath);
        if (fromNode) fromNode.outDegree++;
        if (toNode) toNode.inDegree++;
      }
    }

    // Recalculate inDegrees
    for (const node of this.files.values()) {
      node.inDegree = this.edges.filter((e) => e.to === node.path).length;
    }

    // Recalculate depths
    const roots = this.findRoots();
    const leaves = this.findLeaves();
    this.calculateDepths(roots);

    return {
      files: this.files,
      edges: this.edges,
      roots,
      leaves,
      cycles: this.detectCycles(),
      stats: this.calculateStats(),
    };
  }

  // ==========================================================================
  // GRAPH QUERIES
  // ==========================================================================

  /**
   * Get all files that the given file depends on (imports)
   */
  getDependencies(graph: DependencyGraph, filePath: string): string[] {
    return graph.edges.filter((e) => e.from === filePath).map((e) => e.to);
  }

  /**
   * Get all files that depend on the given file (import it)
   */
  getDependents(graph: DependencyGraph, filePath: string): string[] {
    return graph.edges.filter((e) => e.to === filePath).map((e) => e.from);
  }

  /**
   * Get transitive dependencies (all files this depends on, recursively)
   */
  getTransitiveDependencies(
    graph: DependencyGraph,
    filePath: string,
    maxDepth: number = 10
  ): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const traverse = (path: string, depth: number) => {
      if (depth >= maxDepth || visited.has(path)) return;
      visited.add(path);

      const deps = this.getDependencies(graph, path);
      for (const dep of deps) {
        if (!visited.has(dep)) {
          result.push(dep);
          traverse(dep, depth + 1);
        }
      }
    };

    traverse(filePath, 0);
    return result;
  }

  /**
   * Get transitive dependents (all files that depend on this, recursively)
   */
  getTransitiveDependents(
    graph: DependencyGraph,
    filePath: string,
    maxDepth: number = 10
  ): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const traverse = (path: string, depth: number) => {
      if (depth >= maxDepth || visited.has(path)) return;
      visited.add(path);

      const deps = this.getDependents(graph, path);
      for (const dep of deps) {
        if (!visited.has(dep)) {
          result.push(dep);
          traverse(dep, depth + 1);
        }
      }
    };

    traverse(filePath, 0);
    return result;
  }

  /**
   * Find the shortest path between two files
   */
  findPath(graph: DependencyGraph, fromPath: string, toPath: string): string[] | null {
    if (fromPath === toPath) return [fromPath];

    const visited = new Set<string>();
    const queue: Array<{ path: string; route: string[] }> = [{ path: fromPath, route: [fromPath] }];

    while (queue.length > 0) {
      const { path, route } = queue.shift()!;

      if (visited.has(path)) continue;
      visited.add(path);

      const deps = this.getDependencies(graph, path);
      for (const dep of deps) {
        const newRoute = [...route, dep];
        if (dep === toPath) {
          return newRoute;
        }
        if (!visited.has(dep)) {
          queue.push({ path: dep, route: newRoute });
        }
      }
    }

    return null;
  }

  /**
   * Find files that share dependencies with the given file
   */
  findRelatedFiles(graph: DependencyGraph, filePath: string): string[] {
    const deps = new Set(this.getDependencies(graph, filePath));
    const related = new Set<string>();

    for (const [path, node] of graph.files) {
      if (path === filePath) continue;

      const otherDeps = this.getDependencies(graph, path);
      const sharedDeps = otherDeps.filter((d) => deps.has(d));

      if (sharedDeps.length > 0) {
        related.add(path);
      }
    }

    return Array.from(related);
  }

  /**
   * Find files that export a specific symbol
   */
  findFileExporting(graph: DependencyGraph, symbol: string): string | null {
    for (const [path, node] of graph.files) {
      if (node.analysis.exports.some((e) => e.name === symbol)) {
        return path;
      }
    }
    return null;
  }

  /**
   * Get files by type
   */
  getFilesByType(graph: DependencyGraph, types: string[]): string[] {
    const result: string[] = [];
    for (const [path, node] of graph.files) {
      if (types.includes(node.analysis.type)) {
        result.push(path);
      }
    }
    return result;
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  private findRoots(): string[] {
    const roots: string[] = [];

    for (const [path, node] of this.files) {
      // Pages and layouts are roots
      if (
        node.analysis.type === 'page' ||
        node.analysis.type === 'layout' ||
        path.includes('page.') ||
        path.includes('layout.')
      ) {
        roots.push(path);
        continue;
      }

      // Files with no dependents that aren't tests
      if (node.inDegree === 0 && node.analysis.type !== 'test') {
        roots.push(path);
      }
    }

    return roots;
  }

  private findLeaves(): string[] {
    const leaves: string[] = [];

    for (const [path, node] of this.files) {
      if (node.outDegree === 0 && node.analysis.type !== 'test') {
        leaves.push(path);
      }
    }

    return leaves;
  }

  private calculateDepths(roots: string[]): void {
    // Reset depths
    for (const node of this.files.values()) {
      node.depth = Infinity;
    }

    // BFS from roots
    const queue: Array<{ path: string; depth: number }> = roots.map((r) => ({
      path: r,
      depth: 0,
    }));

    while (queue.length > 0) {
      const { path, depth } = queue.shift()!;
      const node = this.files.get(path);

      if (!node || node.depth <= depth) continue;
      node.depth = depth;

      // Add dependencies to queue
      const deps = this.edges.filter((e) => e.from === path).map((e) => e.to);
      for (const dep of deps) {
        queue.push({ path: dep, depth: depth + 1 });
      }
    }
  }

  private detectCycles(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const inStack = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string) => {
      if (inStack.has(node)) {
        // Found a cycle - extract it
        const cycleStart = path.indexOf(node);
        if (cycleStart !== -1) {
          cycles.push(path.slice(cycleStart));
        }
        return;
      }

      if (visited.has(node)) return;

      visited.add(node);
      inStack.add(node);
      path.push(node);

      const deps = this.edges.filter((e) => e.from === node).map((e) => e.to);
      for (const dep of deps) {
        dfs(dep);
      }

      path.pop();
      inStack.delete(node);
    };

    for (const nodePath of this.files.keys()) {
      if (!visited.has(nodePath)) {
        dfs(nodePath);
      }
    }

    return cycles;
  }

  private calculateStats(): GraphStats {
    const totalFiles = this.files.size;
    const totalEdges = this.edges.length;

    let maxDepth = 0;
    let totalInDegree = 0;
    let totalOutDegree = 0;

    for (const node of this.files.values()) {
      if (node.depth !== Infinity && node.depth > maxDepth) {
        maxDepth = node.depth;
      }
      totalInDegree += node.inDegree;
      totalOutDegree += node.outDegree;
    }

    return {
      totalFiles,
      totalEdges,
      maxDepth,
      avgInDegree: totalFiles > 0 ? totalInDegree / totalFiles : 0,
      avgOutDegree: totalFiles > 0 ? totalOutDegree / totalFiles : 0,
      circularDependencies: this.detectCycles().length,
    };
  }

  private resolveImportPath(importPath: string, fromPath: string): string | null {
    // Handle path aliases
    for (const [alias, replacement] of this.pathAliases) {
      if (importPath.startsWith(alias)) {
        importPath = importPath.replace(alias, replacement);
        break;
      }
    }

    // Relative imports
    if (importPath.startsWith('.')) {
      const fromDir = fromPath.substring(0, fromPath.lastIndexOf('/'));
      return this.normalizePath(this.joinPaths(fromDir, importPath));
    }

    // Absolute imports from src
    if (importPath.startsWith('@/') || importPath.startsWith('~/')) {
      return importPath.substring(2);
    }

    return importPath;
  }

  private findMatchingFile(basePath: string): string | null {
    // Try exact match first
    if (this.files.has(basePath)) {
      return basePath;
    }

    // Try common extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js'];
    for (const ext of extensions) {
      const fullPath = basePath + ext;
      if (this.files.has(fullPath)) {
        return fullPath;
      }

      // Also try with normalized path
      const normalized = this.normalizePath(fullPath);
      if (this.files.has(normalized)) {
        return normalized;
      }
    }

    // Try partial matches (for paths like 'components/Button')
    for (const filePath of this.files.keys()) {
      if (
        filePath.includes(basePath) ||
        filePath.endsWith(basePath + '.ts') ||
        filePath.endsWith(basePath + '.tsx')
      ) {
        return filePath;
      }
    }

    return null;
  }

  private normalizePath(path: string): string {
    // Handle ../ and ./
    const parts = path.split('/');
    const result: string[] = [];

    for (const part of parts) {
      if (part === '..') {
        result.pop();
      } else if (part !== '.' && part !== '') {
        result.push(part);
      }
    }

    return result.join('/');
  }

  private joinPaths(base: string, relative: string): string {
    if (relative.startsWith('/')) {
      return relative;
    }
    return base + '/' + relative;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let builderInstance: DependencyGraphBuilder | null = null;

export function getDependencyGraphBuilder(
  aliases?: Record<string, string>
): DependencyGraphBuilder {
  if (!builderInstance || aliases) {
    builderInstance = new DependencyGraphBuilder(aliases);
  }
  return builderInstance;
}

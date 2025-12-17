/**
 * CodeContextService - Main orchestration service for the Code Context API
 * Coordinates parsing, caching, dependency tracking, and context selection
 */

import { hashSync } from '../utils/hashUtils';
import {
  CodeContextState,
  FileContent,
  FileAnalysis,
  DependencyGraph,
  ContextSelectionRequest,
  CodeContextSnapshot,
  SelectedFile,
  DependencyHint,
  OmittedSummary,
  FileType,
  CodeParserConfig,
} from '../types/codeContext';
import { CodeParser, getCodeParser } from './CodeParser';
import { DependencyGraphBuilder, getDependencyGraphBuilder } from './DependencyGraphBuilder';
import { ContextSelector, getContextSelector } from './ContextSelector';
import { ContextCache, getContextCache } from './ContextCache';

// ============================================================================
// CODE CONTEXT SERVICE CLASS
// ============================================================================

export class CodeContextService {
  private state: CodeContextState;
  private parser: CodeParser;
  private graphBuilder: DependencyGraphBuilder;
  private selector: ContextSelector;
  private cache: ContextCache;

  constructor(
    appId: string,
    appName: string = 'Untitled App',
    appType: 'FRONTEND_ONLY' | 'FULL_STACK' = 'FRONTEND_ONLY',
    parserConfig?: Partial<CodeParserConfig>
  ) {
    this.parser = getCodeParser(parserConfig);
    this.graphBuilder = getDependencyGraphBuilder({ '@/': 'src/', '~/': 'src/' });
    this.selector = getContextSelector();
    this.cache = getContextCache();

    this.state = {
      appId,
      appName,
      appType,
      files: new Map(),
      analysis: new Map(),
      dependencyGraph: {
        files: new Map(),
        edges: [],
        roots: [],
        leaves: [],
        cycles: [],
        stats: {
          totalFiles: 0,
          totalEdges: 0,
          maxDepth: 0,
          avgInDegree: 0,
          avgOutDegree: 0,
          circularDependencies: 0,
        },
      },
      version: 0,
      lastFullAnalysis: 0,
      dirtyFiles: new Set(),
      phasesSeen: [],
      filesByPhase: new Map(),
    };
  }

  // ==========================================================================
  // CONTEXT MANAGEMENT
  // ==========================================================================

  /**
   * Update context with new or changed files
   */
  async updateContext(
    files: Array<{ path: string; content: string }>,
    options?: { incremental?: boolean; phaseNumber?: number }
  ): Promise<void> {
    const incremental = options?.incremental ?? true;
    const changedFiles: FileAnalysis[] = [];

    for (const file of files) {
      const hash = this.hashContent(file.content);
      const existing = this.state.files.get(file.path);

      // Skip unchanged files in incremental mode
      if (incremental && existing?.hash === hash) {
        continue;
      }

      // Update file content
      const fileContent: FileContent = {
        path: file.path,
        content: file.content,
        hash,
        tokenCount: 0, // Will be set by parser
        lastModified: Date.now(),
      };

      // Check cache for analysis
      const cachedAnalysis = this.cache.getAnalysis(file.path, hash);
      let analysis: FileAnalysis;

      if (cachedAnalysis) {
        analysis = cachedAnalysis;
      } else {
        // Parse and analyze the file
        try {
          analysis = this.parser.analyzeFile(file.path, file.content);
          this.cache.setAnalysis(file.path, analysis);
        } catch (error) {
          console.warn(`Failed to analyze ${file.path}:`, error);
          continue;
        }
      }

      fileContent.tokenCount = analysis.tokenCount;
      this.state.files.set(file.path, fileContent);
      this.state.analysis.set(file.path, analysis);
      changedFiles.push(analysis);

      // Track phase
      if (options?.phaseNumber !== undefined) {
        if (!this.state.phasesSeen.includes(options.phaseNumber)) {
          this.state.phasesSeen.push(options.phaseNumber);
        }
        const phaseFiles = this.state.filesByPhase.get(options.phaseNumber) ?? [];
        if (!phaseFiles.includes(file.path)) {
          phaseFiles.push(file.path);
          this.state.filesByPhase.set(options.phaseNumber, phaseFiles);
        }
      }
    }

    // Rebuild dependency graph if files changed
    if (changedFiles.length > 0) {
      const allAnalyses = Array.from(this.state.analysis.values());
      this.state.dependencyGraph = this.graphBuilder.buildGraph(allAnalyses);
      this.state.version++;
      this.state.lastFullAnalysis = Date.now();

      // Smart invalidation - only clear snapshots that contain changed files
      const changedPaths = changedFiles.map((f) => f.path);
      this.cache.invalidateSnapshotsForFiles(changedPaths);
    }
  }

  /**
   * Remove files from context
   */
  removeFiles(paths: string[]): void {
    for (const path of paths) {
      this.state.files.delete(path);
      this.state.analysis.delete(path);
    }

    // Rebuild dependency graph
    const allAnalyses = Array.from(this.state.analysis.values());
    this.state.dependencyGraph = this.graphBuilder.buildGraph(allAnalyses);
    this.state.version++;

    // Smart invalidation - only clear snapshots that contain removed files
    this.cache.invalidateSnapshotsForFiles(paths);
  }

  // ==========================================================================
  // CONTEXT SELECTION
  // ==========================================================================

  /**
   * Get optimized context for any request
   */
  async getContextForRequest(request: ContextSelectionRequest): Promise<CodeContextSnapshot> {
    // Check cache
    const cacheKey = this.cache.getSnapshotCacheKey(request, this.state.version);
    const cached = this.cache.getSnapshot(cacheKey);
    if (cached) {
      return cached;
    }

    // Select context
    const result = this.selector.select(this.state, request);

    // Build snapshot
    const snapshot = this.buildSnapshot(result.files);

    // Cache result
    this.cache.setSnapshot(cacheKey, snapshot);

    return snapshot;
  }

  /**
   * Get context for a build phase
   */
  async getPhaseContext(
    phaseNumber: number,
    features: string[],
    maxTokens: number = 32000
  ): Promise<CodeContextSnapshot> {
    // Get files from previous phases
    const previousPhaseFiles: string[] = [];
    for (const [phase, files] of this.state.filesByPhase) {
      if (phase < phaseNumber) {
        previousPhaseFiles.push(...files);
      }
    }

    // Infer dependencies from features
    const dependencies = this.inferDependencies(features);

    return this.getContextForRequest({
      intent: {
        type: 'new-phase',
        features,
        dependencies,
      },
      maxTokens,
      phaseNumber,
      previousPhaseFiles,
    });
  }

  /**
   * Get context for a modification request
   */
  async getModificationContext(
    targetFile: string,
    changeDescription: string,
    maxTokens: number = 32000
  ): Promise<CodeContextSnapshot> {
    return this.getContextForRequest({
      intent: {
        type: 'modification',
        targetFile,
        changeDescription,
      },
      maxTokens,
      focusFiles: [targetFile],
    });
  }

  /**
   * Get minimal context (types only)
   */
  getMinimalContext(maxTokens: number = 8000): CodeContextSnapshot {
    const typeFiles = this.getFilesByType(['type-definition']);
    const selected: SelectedFile[] = [];
    let usedTokens = 0;

    for (const path of typeFiles) {
      const analysis = this.state.analysis.get(path);
      const content = this.state.files.get(path);
      if (!analysis || !content) continue;

      const typesContent = this.selector.getRepresentationContent(
        content.content,
        analysis,
        'types-only'
      );
      const tokens = analysis.types.reduce((sum, t) => sum + t.tokenCount, 0);

      if (usedTokens + tokens <= maxTokens) {
        selected.push({
          path,
          content: typesContent,
          representation: 'types-only',
          tokenCount: tokens,
          priority: 0.85,
          reason: 'Type definitions',
        });
        usedTokens += tokens;
      }
    }

    return this.buildSnapshot(selected);
  }

  // ==========================================================================
  // GRAPH QUERIES
  // ==========================================================================

  /**
   * Get all dependencies of a file
   */
  getDependencies(filePath: string): string[] {
    return this.graphBuilder.getDependencies(this.state.dependencyGraph, filePath);
  }

  /**
   * Get all files that depend on a file
   */
  getDependents(filePath: string): string[] {
    return this.graphBuilder.getDependents(this.state.dependencyGraph, filePath);
  }

  /**
   * Get transitive dependencies
   */
  getTransitiveDependencies(filePath: string, maxDepth?: number): string[] {
    return this.graphBuilder.getTransitiveDependencies(
      this.state.dependencyGraph,
      filePath,
      maxDepth
    );
  }

  /**
   * Get analysis for a specific file
   */
  getFileAnalysis(filePath: string): FileAnalysis | undefined {
    return this.state.analysis.get(filePath);
  }

  /**
   * Get files by type
   */
  getFilesByType(types: FileType[]): string[] {
    return this.graphBuilder.getFilesByType(this.state.dependencyGraph, types);
  }

  /**
   * Find file that exports a symbol
   */
  findFileExporting(symbol: string): string | null {
    return this.graphBuilder.findFileExporting(this.state.dependencyGraph, symbol);
  }

  /**
   * Find related files (share dependencies)
   */
  findRelatedFiles(filePath: string): string[] {
    return this.graphBuilder.findRelatedFiles(this.state.dependencyGraph, filePath);
  }

  // ==========================================================================
  // STATE ACCESS
  // ==========================================================================

  /**
   * Get the current context state
   */
  getState(): CodeContextState {
    return this.state;
  }

  /**
   * Get the dependency graph
   */
  getDependencyGraph(): DependencyGraph {
    return this.state.dependencyGraph;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  private buildSnapshot(selectedFiles: SelectedFile[]): CodeContextSnapshot {
    // Build omitted summary
    const includedPaths = new Set(selectedFiles.map((f) => f.path));
    const omittedSummary: OmittedSummary = {
      fileCount: 0,
      totalTokens: 0,
      categories: {} as Record<FileType, number>,
    };

    for (const [path, analysis] of this.state.analysis) {
      if (!includedPaths.has(path)) {
        omittedSummary.fileCount++;
        omittedSummary.totalTokens += analysis.tokenCount;
        omittedSummary.categories[analysis.type] =
          (omittedSummary.categories[analysis.type] ?? 0) + 1;
      }
    }

    // Build dependency hints
    const dependencyHints: DependencyHint[] = [];
    for (const file of selectedFiles) {
      const analysis = this.state.analysis.get(file.path);
      if (!analysis) continue;

      const imports = analysis.imports
        .filter((i) => !i.isExternal)
        .map((i) => ({
          from: i.resolvedPath ?? i.source,
          symbols: i.imports.map((s) => s.alias ?? s.name),
        }));

      if (imports.length > 0 || analysis.dependents.length > 0) {
        dependencyHints.push({
          file: file.path,
          imports,
          usedBy: analysis.dependents.slice(0, 5), // Limit to 5
        });
      }
    }

    return {
      appId: this.state.appId,
      appName: this.state.appName,
      version: this.state.version,
      context: selectedFiles,
      omittedSummary,
      dependencyHints,
    };
  }

  private inferDependencies(features: string[]): string[] {
    const dependencies: string[] = [];
    const featureText = features.join(' ').toLowerCase();

    // Infer based on feature keywords
    if (featureText.includes('auth') || featureText.includes('login')) {
      const authFiles = this.getFilesByType(['context-provider']).filter((f) =>
        f.toLowerCase().includes('auth')
      );
      dependencies.push(...authFiles);
    }

    if (featureText.includes('api') || featureText.includes('fetch')) {
      const apiFiles = this.getFilesByType(['api-route']);
      dependencies.push(...apiFiles);
    }

    if (featureText.includes('database') || featureText.includes('db')) {
      const dbFiles = Array.from(this.state.analysis.entries())
        .filter(([path]) => path.includes('db') || path.includes('database'))
        .map(([path]) => path);
      dependencies.push(...dbFiles);
    }

    // Always include type definitions
    const typeFiles = this.getFilesByType(['type-definition']);
    dependencies.push(...typeFiles);

    return [...new Set(dependencies)];
  }

  private hashContent(content: string): string {
    return hashSync(content);
  }
}

// ============================================================================
// SERVICE FACTORY
// ============================================================================

const serviceInstances = new Map<string, CodeContextService>();

/**
 * Get or create a CodeContextService for an app
 */
export function getCodeContextService(
  appId: string,
  appName?: string,
  appType?: 'FRONTEND_ONLY' | 'FULL_STACK'
): CodeContextService {
  let service = serviceInstances.get(appId);

  if (!service) {
    service = new CodeContextService(appId, appName, appType);
    serviceInstances.set(appId, service);
  }

  return service;
}

/**
 * Clear a specific service instance
 */
export function clearCodeContextService(appId: string): void {
  const service = serviceInstances.get(appId);
  if (service) {
    service.clearCache();
    serviceInstances.delete(appId);
  }
}

/**
 * Clear all service instances
 */
export function clearAllCodeContextServices(): void {
  for (const service of serviceInstances.values()) {
    service.clearCache();
  }
  serviceInstances.clear();
}

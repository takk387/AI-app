/**
 * ContextSelector - Intelligent context selection for AI requests
 * Selects the most relevant files based on intent, budget, and dependencies
 */

import {
  FileAnalysis,
  ContextSelectionRequest,
  ContextSelectionResult,
  SelectedFile,
  ExcludedFile,
  FileRepresentation,
  ContextSelectorConfig,
  DEFAULT_CONTEXT_SELECTOR_CONFIG,
  CodeContextState,
} from '../types/codeContext';
import { countTokens } from '../utils/tokenizer';

// ============================================================================
// CONTEXT SELECTOR CLASS
// ============================================================================

export class ContextSelector {
  private config: ContextSelectorConfig;

  constructor(config?: Partial<ContextSelectorConfig>) {
    this.config = { ...DEFAULT_CONTEXT_SELECTOR_CONFIG, ...config };
  }

  // ==========================================================================
  // MAIN SELECTION METHOD
  // ==========================================================================

  /**
   * Select files for context based on request intent and budget
   */
  select(state: CodeContextState, request: ContextSelectionRequest): ContextSelectionResult {
    const budget = request.maxTokens - (request.reservedTokens ?? 0);
    const selected: SelectedFile[] = [];
    const excluded: ExcludedFile[] = [];
    const reasons = new Map<string, string>();
    const warnings: string[] = [];

    // Step 1: Identify must-include files
    const mustInclude = this.getMustIncludeFiles(state, request);

    // Step 2: Score all files for relevance
    const scored = this.scoreFiles(state, request);

    // Step 3: Select by priority until budget exhausted
    let usedTokens = 0;

    // First pass: must-include files
    for (const path of mustInclude) {
      const analysis = state.analysis.get(path);
      const content = state.files.get(path);
      if (!analysis || !content) continue;

      const representation = this.chooseRepresentation(analysis, budget - usedTokens);
      const fileContent = this.getRepresentationContent(content.content, analysis, representation);
      const tokens = countTokens(fileContent);

      if (usedTokens + tokens <= budget) {
        selected.push({
          path,
          content: fileContent,
          representation,
          tokenCount: tokens,
          priority: 1,
          reason: 'Required for modification target or explicit focus',
        });
        usedTokens += tokens;
        reasons.set(path, 'must-include');
      } else {
        // Try with smaller representation
        const minRep = this.getMinimalRepresentation(analysis);
        const minContent = this.getRepresentationContent(content.content, analysis, minRep);
        const minTokens = countTokens(minContent);

        if (usedTokens + minTokens <= budget) {
          selected.push({
            path,
            content: minContent,
            representation: minRep,
            tokenCount: minTokens,
            priority: 1,
            reason: 'Required (reduced representation)',
          });
          usedTokens += minTokens;
          reasons.set(path, 'must-include-reduced');
        } else {
          excluded.push({ path, reason: 'Budget exceeded even at minimum representation' });
          warnings.push(`Critical file ${path} could not be included due to budget`);
        }
      }
    }

    // Second pass: scored files by priority
    const sortedScored = scored.sort((a, b) => b.score - a.score);

    for (const { path, score, reason } of sortedScored) {
      if (mustInclude.has(path)) continue;
      if (request.excludeFiles?.includes(path)) {
        excluded.push({ path, reason: 'Explicitly excluded' });
        continue;
      }

      const analysis = state.analysis.get(path);
      const content = state.files.get(path);
      if (!analysis || !content) continue;

      // Skip low-relevance files
      if (score < 0.3) {
        excluded.push({ path, reason: `Low relevance score: ${score.toFixed(2)}` });
        continue;
      }

      const representation = this.chooseRepresentation(analysis, budget - usedTokens);
      const fileContent = this.getRepresentationContent(content.content, analysis, representation);
      const tokens = countTokens(fileContent);

      if (usedTokens + tokens <= budget) {
        selected.push({
          path,
          content: fileContent,
          representation,
          tokenCount: tokens,
          priority: score,
          reason,
        });
        usedTokens += tokens;
        reasons.set(path, reason);
      } else if (score >= 0.6) {
        // Try smaller representation for high-priority files
        const minRep = this.getMinimalRepresentation(analysis);
        const minContent = this.getRepresentationContent(content.content, analysis, minRep);
        const minTokens = countTokens(minContent);

        if (usedTokens + minTokens <= budget) {
          selected.push({
            path,
            content: minContent,
            representation: minRep,
            tokenCount: minTokens,
            priority: score,
            reason: reason + ' (reduced)',
          });
          usedTokens += minTokens;
          reasons.set(path, reason + ' (reduced)');
        } else {
          excluded.push({ path, reason: 'Budget exceeded' });
        }
      } else {
        excluded.push({ path, reason: 'Budget exceeded' });
      }
    }

    return {
      files: selected.sort((a, b) => b.priority - a.priority),
      totalTokens: usedTokens,
      strategy: this.describeStrategy(request.intent),
      selectionReason: reasons,
      excluded,
      warnings,
    };
  }

  // ==========================================================================
  // FILE SCORING
  // ==========================================================================

  /**
   * Score all files based on relevance to the request
   */
  private scoreFiles(
    state: CodeContextState,
    request: ContextSelectionRequest
  ): Array<{ path: string; score: number; reason: string }> {
    const scores: Array<{ path: string; score: number; reason: string }> = [];

    for (const [path, analysis] of state.analysis) {
      let score = analysis.importanceScore;
      let reason = 'Base importance';

      switch (request.intent.type) {
        case 'modification': {
          const modResult = this.scoreForModification(
            path,
            analysis,
            request.intent.targetFile,
            request.intent.changeDescription,
            state
          );
          score = modResult.score;
          reason = modResult.reason;
          break;
        }

        case 'new-phase': {
          const phaseResult = this.scoreForNewPhase(
            path,
            analysis,
            request.intent.features,
            request.intent.dependencies,
            request.previousPhaseFiles ?? [],
            state
          );
          score = phaseResult.score;
          reason = phaseResult.reason;
          break;
        }

        case 'cross-reference': {
          const refResult = this.scoreForCrossReference(
            path,
            analysis,
            request.intent.fromFile,
            request.intent.symbol
          );
          score = refResult.score;
          reason = refResult.reason;
          break;
        }

        case 'type-check': {
          if (analysis.type === 'type-definition') {
            score = 0.9;
            reason = 'Type definition for type checking';
          } else if (analysis.types.length > 0) {
            score = 0.7;
            reason = 'Contains type definitions';
          }
          break;
        }

        case 'full-context': {
          // Use base importance scores
          reason = `${analysis.type} file`;
          break;
        }
      }

      scores.push({ path, score, reason });
    }

    return scores;
  }

  private scoreForModification(
    path: string,
    analysis: FileAnalysis,
    targetFile: string,
    changeDescription: string,
    state: CodeContextState
  ): { score: number; reason: string } {
    let score = analysis.importanceScore;
    let reason = 'Base importance';

    // Target file gets highest priority
    if (path === targetFile) {
      return { score: 1, reason: 'Modification target' };
    }

    // Files that the target imports
    const targetAnalysis = state.analysis.get(targetFile);
    if (targetAnalysis?.dependencies.includes(path)) {
      score += 0.35;
      reason = 'Imported by modification target';
    }

    // Files that import the target
    if (analysis.dependencies.includes(targetFile)) {
      score += 0.25;
      reason = 'Imports modification target';
    }

    // Type definitions used by target
    if (analysis.type === 'type-definition' && targetAnalysis) {
      const targetImportsTypes = targetAnalysis.imports.some(
        (i) => i.isTypeOnly || i.imports.some((s) => this.isTypeName(s.name))
      );
      if (targetImportsTypes) {
        score += 0.3;
        reason = 'Type definitions for target';
      }
    }

    // Keyword matching in change description
    const keywords = this.extractKeywords(changeDescription);
    const matchCount = this.countKeywordMatches(analysis, keywords);
    if (matchCount > 0) {
      score += Math.min(0.2, matchCount * 0.05);
      reason = `Matches ${matchCount} keywords from change description`;
    }

    return { score: Math.min(1, score), reason };
  }

  private scoreForNewPhase(
    path: string,
    analysis: FileAnalysis,
    features: string[],
    dependencies: string[],
    previousPhaseFiles: string[],
    state: CodeContextState
  ): { score: number; reason: string } {
    let score = analysis.importanceScore;
    let reason = 'Base importance';

    // Previous phase files are important for continuity
    if (previousPhaseFiles.includes(path)) {
      score += 0.2;
      reason = 'From previous phase';
    }

    // Type definitions are always valuable
    if (analysis.type === 'type-definition') {
      score += this.config.typePriorityBoost;
      reason = 'Type definitions';
    }

    // API routes for established contracts
    if (analysis.type === 'api-route') {
      score += this.config.apiRoutePriorityBoost;
      reason = 'API contract';
    }

    // Hooks for reuse
    if (analysis.type === 'hook') {
      score += this.config.hookPriorityBoost;
      reason = 'Reusable hook';
    }

    // Context providers
    if (analysis.type === 'context-provider') {
      score += this.config.contextProviderBoost;
      reason = 'Context provider';
    }

    // Feature relevance
    const featureRelevance = this.calculateFeatureRelevance(analysis, features);
    if (featureRelevance > 0) {
      score += featureRelevance * 0.3;
      reason = 'Relevant to phase features';
    }

    // Dependency relevance
    if (dependencies.includes(path)) {
      score += 0.25;
      reason = 'Phase dependency';
    }

    return { score: Math.min(1, score), reason };
  }

  private scoreForCrossReference(
    path: string,
    analysis: FileAnalysis,
    fromFile: string,
    symbol: string
  ): { score: number; reason: string } {
    // File exports the symbol
    if (analysis.exports.some((e) => e.name === symbol)) {
      return { score: 1, reason: `Exports ${symbol}` };
    }

    // File is the source file
    if (path === fromFile) {
      return { score: 0.8, reason: 'Source file' };
    }

    // File contains the symbol in types
    if (analysis.types.some((t) => t.name === symbol || t.definition.includes(symbol))) {
      return { score: 0.9, reason: `Type definition for ${symbol}` };
    }

    return { score: analysis.importanceScore, reason: 'Base importance' };
  }

  // ==========================================================================
  // FILE REPRESENTATION
  // ==========================================================================

  /**
   * Choose the best representation for a file given remaining budget
   */
  private chooseRepresentation(
    analysis: FileAnalysis,
    remainingBudget: number
  ): FileRepresentation {
    // If file is small enough, include full
    if (analysis.tokenCount <= remainingBudget * 0.2) {
      return 'full';
    }

    // Type files: prefer types-only
    if (analysis.type === 'type-definition') {
      const typesTokens = analysis.types.reduce((sum, t) => sum + t.tokenCount, 0);
      if (typesTokens <= remainingBudget * 0.3) {
        return 'types-only';
      }
      return 'signature';
    }

    // Components/hooks: prefer signatures
    if (analysis.type === 'component' || analysis.type === 'hook') {
      return 'signature';
    }

    // API routes: prefer signature for contracts
    if (analysis.type === 'api-route') {
      return 'signature';
    }

    // Default to summary for large files
    if (analysis.tokenCount > remainingBudget * 0.3) {
      return 'summary';
    }

    return 'full';
  }

  /**
   * Get the minimal representation for a file
   */
  private getMinimalRepresentation(analysis: FileAnalysis): FileRepresentation {
    if (analysis.type === 'type-definition') {
      return 'types-only';
    }
    return 'summary';
  }

  /**
   * Get file content in the specified representation
   */
  getRepresentationContent(
    content: string,
    analysis: FileAnalysis,
    representation: FileRepresentation
  ): string {
    switch (representation) {
      case 'full':
        return content;

      case 'summary':
        return this.generateSummaryContent(analysis);

      case 'signature':
        return this.generateSignatureContent(analysis);

      case 'types-only':
        return this.generateTypesOnlyContent(analysis);

      default:
        return content;
    }
  }

  private generateSummaryContent(analysis: FileAnalysis): string {
    const lines: string[] = [`// File: ${analysis.path}`, `// Type: ${analysis.type}`];

    if (analysis.exports.length > 0) {
      lines.push(`// Exports: ${analysis.exports.map((e) => e.name).join(', ')}`);
    }

    if (analysis.components.length > 0) {
      lines.push(`// Components: ${analysis.components.map((c) => c.name).join(', ')}`);
    }

    if (analysis.hooks.length > 0) {
      lines.push(`// Hooks: ${analysis.hooks.map((h) => h.name).join(', ')}`);
    }

    if (analysis.types.length > 0) {
      lines.push(`// Types: ${analysis.types.map((t) => t.name).join(', ')}`);
    }

    if (analysis.apiEndpoints.length > 0) {
      lines.push(
        `// API Endpoints: ${analysis.apiEndpoints.map((e) => `${e.method} ${e.path}`).join(', ')}`
      );
    }

    lines.push(`// Summary: ${analysis.summary}`);

    return lines.join('\n');
  }

  private generateSignatureContent(analysis: FileAnalysis): string {
    const lines: string[] = [`// File: ${analysis.path}`];

    // Add type definitions
    for (const type of analysis.types) {
      lines.push(type.definition);
    }

    // Add export signatures
    for (const exp of analysis.exports) {
      if (exp.typeSignature) {
        lines.push(`export ${exp.typeSignature}`);
      } else if (exp.signature) {
        const keyword = exp.isAsync ? 'async function' : 'function';
        const defaultMod = exp.isDefault ? 'default ' : '';
        lines.push(`export ${defaultMod}${keyword} ${exp.name}${exp.signature};`);
      } else if (exp.kind !== 'type' && exp.kind !== 'interface') {
        lines.push(`export ${exp.kind === 'default' ? 'default' : `const ${exp.name}`};`);
      }
    }

    // Add component signatures
    for (const comp of analysis.components) {
      const propsStr =
        comp.props.length > 0
          ? `{ ${comp.props.map((p) => `${p.name}${p.required ? '' : '?'}: ${p.type}`).join(', ')} }`
          : '{}';
      lines.push(`// Component: ${comp.name}(props: ${propsStr})`);
      if (comp.hooks.length > 0) {
        lines.push(`//   Uses: ${comp.hooks.join(', ')}`);
      }
    }

    // Add hook signatures
    for (const hook of analysis.hooks) {
      lines.push(
        `// Hook: ${hook.name}(${hook.parameters.join(', ')})${hook.returnType ? `: ${hook.returnType}` : ''}`
      );
    }

    // Add API endpoint signatures
    for (const endpoint of analysis.apiEndpoints) {
      lines.push(`// API: ${endpoint.method} ${endpoint.path}`);
      if (endpoint.requestType) lines.push(`//   Request: ${endpoint.requestType}`);
      if (endpoint.responseType) lines.push(`//   Response: ${endpoint.responseType}`);
    }

    return lines.join('\n');
  }

  private generateTypesOnlyContent(analysis: FileAnalysis): string {
    const lines: string[] = [`// File: ${analysis.path} (types only)`];

    for (const type of analysis.types) {
      lines.push(type.definition);
      lines.push('');
    }

    // Also include type exports
    for (const exp of analysis.exports) {
      if ((exp.kind === 'type' || exp.kind === 'interface') && exp.typeSignature) {
        if (!analysis.types.some((t) => t.name === exp.name)) {
          lines.push(exp.typeSignature);
          lines.push('');
        }
      }
    }

    return lines.join('\n');
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Get files that must be included
   */
  private getMustIncludeFiles(
    state: CodeContextState,
    request: ContextSelectionRequest
  ): Set<string> {
    const mustInclude = new Set<string>();

    // Focus files
    if (request.focusFiles) {
      for (const path of request.focusFiles) {
        if (state.files.has(path)) {
          mustInclude.add(path);
        }
      }
    }

    // Modification target and its direct dependencies
    if (request.intent.type === 'modification') {
      const target = request.intent.targetFile;
      if (state.files.has(target)) {
        mustInclude.add(target);
      }

      // Add direct dependencies of target
      const targetAnalysis = state.analysis.get(target);
      if (targetAnalysis) {
        for (const dep of targetAnalysis.dependencies.slice(0, 5)) {
          if (state.files.has(dep)) {
            mustInclude.add(dep);
          }
        }
      }
    }

    return mustInclude;
  }

  private calculateFeatureRelevance(analysis: FileAnalysis, features: string[]): number {
    if (features.length === 0) return 0;

    const fileText = [
      analysis.path,
      analysis.summary,
      ...analysis.exports.map((e) => e.name),
      ...analysis.components.map((c) => c.name),
      ...analysis.hooks.map((h) => h.name),
      ...analysis.types.map((t) => t.name),
    ]
      .join(' ')
      .toLowerCase();

    let matches = 0;
    for (const feature of features) {
      const keywords = feature.toLowerCase().split(/\s+/);
      for (const keyword of keywords) {
        if (keyword.length > 2 && fileText.includes(keyword)) {
          matches++;
        }
      }
    }

    return Math.min(1, matches / (features.length * 2));
  }

  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 2)
      .slice(0, 20);
  }

  private countKeywordMatches(analysis: FileAnalysis, keywords: string[]): number {
    const fileText = [
      analysis.path,
      analysis.summary,
      ...analysis.exports.map((e) => e.name),
      ...analysis.components.map((c) => c.name),
    ]
      .join(' ')
      .toLowerCase();

    return keywords.filter((k) => fileText.includes(k)).length;
  }

  private isTypeName(name: string): boolean {
    // Type names typically start with uppercase
    return /^[A-Z]/.test(name);
  }

  private describeStrategy(intent: ContextSelectionRequest['intent']): string {
    switch (intent.type) {
      case 'modification':
        return `Modification-focused: target=${intent.targetFile}`;
      case 'new-phase':
        return `Phase-focused: features=${intent.features.join(', ')}`;
      case 'cross-reference':
        return `Cross-reference: symbol=${intent.symbol}`;
      case 'type-check':
        return 'Type-check: prioritizing type definitions';
      case 'full-context':
        return 'Full context: importance-based selection';
      default:
        return 'Unknown strategy';
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let selectorInstance: ContextSelector | null = null;

export function getContextSelector(config?: Partial<ContextSelectorConfig>): ContextSelector {
  if (!selectorInstance || config) {
    selectorInstance = new ContextSelector(config);
  }
  return selectorInstance;
}

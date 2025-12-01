/**
 * ImpactAnalyzer - Analyzes the impact of code changes
 * 
 * Features:
 * - Categorize changes by type (styling, logic, etc.)
 * - Assess risk level of changes
 * - Identify affected components
 * - Detect potential breaking changes
 * - Suggest testing areas
 */

import type {
  FileChange,
  ImpactAnalysis,
  ChangeCategory,
  RiskLevel,
  IImpactAnalyzer,
  DiffHunk,
} from '@/types/review';

/**
 * Pattern matchers for different change categories
 */
const CATEGORY_PATTERNS: Record<ChangeCategory, RegExp[]> = {
  structure: [
    /\.(tsx?|jsx?)$/,
    /export\s+(default\s+)?(function|class|const)/,
    /import\s+.*from/,
  ],
  styling: [
    /\.css$/,
    /\.scss$/,
    /\.less$/,
    /tailwind/i,
    /className/,
    /style\s*=/,
    /styled\./,
  ],
  logic: [
    /function\s+\w+/,
    /const\s+\w+\s*=/,
    /if\s*\(/,
    /for\s*\(/,
    /while\s*\(/,
    /switch\s*\(/,
    /async\s+/,
    /await\s+/,
    /\.then\(/,
    /\.catch\(/,
  ],
  content: [
    /['"`][^'"`]{10,}['"`]/,
    /<[^>]+>[^<]+<\/[^>]+>/,
    /\.(md|txt|json)$/,
  ],
  configuration: [
    /\.config\.(ts|js|mjs)$/,
    /\.env/,
    /tsconfig\.json$/,
    /next\.config/,
    /tailwind\.config/,
    /eslint/,
  ],
  dependencies: [
    /package\.json$/,
    /package-lock\.json$/,
    /yarn\.lock$/,
    /pnpm-lock\.yaml$/,
    /npm install/,
    /require\(/,
  ],
};

/**
 * Keywords that indicate potential breaking changes
 */
const BREAKING_CHANGE_PATTERNS = [
  /export\s+default/,
  /export\s+\{/,
  /interface\s+\w+/,
  /type\s+\w+\s*=/,
  /props\s*:/,
  /\.propTypes/,
  /api\//,
  /route\./,
  /middleware/,
];

/**
 * Keywords that indicate high-risk changes
 */
const HIGH_RISK_PATTERNS = [
  /delete\s+/,
  /DROP\s+TABLE/i,
  /rm\s+-rf/,
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /authentication/i,
  /authorization/i,
  /\.env/,
];

/**
 * Keywords that indicate medium-risk changes
 */
const MEDIUM_RISK_PATTERNS = [
  /database/i,
  /query/i,
  /fetch\(/,
  /axios/,
  /mutation/i,
  /useEffect/,
  /useState/,
  /async\s+/,
];

/**
 * ImpactAnalyzer implementation
 */
export class ImpactAnalyzer implements IImpactAnalyzer {
  /**
   * Analyze changes and produce an impact analysis
   */
  async analyzeChanges(changes: FileChange[]): Promise<ImpactAnalysis> {
    const filesAffected = changes.map(c => c.path);
    const componentsAffected = this.findAffectedComponents(changes);
    const breakingChanges = this.detectBreakingChanges(changes);
    const suggestedTests = this.suggestTests(changes);
    const dependencies = this.findDependencies(changes);
    const overallRisk = this.calculateOverallRisk(changes);

    return {
      filesAffected,
      componentsAffected,
      breakingChanges,
      suggestedTests,
      overallRisk,
      dependencies,
    };
  }

  /**
   * Categorize a change based on content and file path
   */
  categorizeChange(content: string, filePath: string): ChangeCategory {
    const combinedContent = `${filePath}\n${content}`;
    
    // Check each category's patterns
    const scores: Record<ChangeCategory, number> = {
      structure: 0,
      styling: 0,
      logic: 0,
      content: 0,
      configuration: 0,
      dependencies: 0,
    };

    for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(combinedContent)) {
          scores[category as ChangeCategory]++;
        }
      }
    }

    // Find the category with the highest score
    let maxCategory: ChangeCategory = 'logic';
    let maxScore = 0;

    for (const [category, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        maxCategory = category as ChangeCategory;
      }
    }

    // Special case: config files
    if (filePath.includes('.config.') || filePath.includes('.env')) {
      return 'configuration';
    }

    // Special case: package.json
    if (filePath.includes('package.json')) {
      return 'dependencies';
    }

    // Special case: CSS files
    if (filePath.match(/\.(css|scss|less)$/)) {
      return 'styling';
    }

    return maxCategory;
  }

  /**
   * Assess the risk level of a change
   */
  assessRisk(change: FileChange): RiskLevel {
    const content = change.modifiedContent || '';
    const originalContent = change.originalContent || '';
    const combinedContent = `${content}\n${originalContent}`;

    // Check for high-risk patterns
    for (const pattern of HIGH_RISK_PATTERNS) {
      if (pattern.test(combinedContent)) {
        return 'high';
      }
    }

    // Check for medium-risk patterns
    for (const pattern of MEDIUM_RISK_PATTERNS) {
      if (pattern.test(combinedContent)) {
        return 'medium';
      }
    }

    // Check file path for risk indicators
    if (change.path.includes('api/') || change.path.includes('middleware')) {
      return 'medium';
    }

    // Deletion is higher risk
    if (change.action === 'delete') {
      return 'medium';
    }

    // Large changes are riskier
    const totalLines = change.hunks.reduce((sum, hunk) => sum + hunk.lines.length, 0);
    if (totalLines > 100) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Find components that may be affected by changes
   */
  findAffectedComponents(changes: FileChange[]): string[] {
    const components: Set<string> = new Set();

    for (const change of changes) {
      // Extract component names from file paths
      const componentMatch = change.path.match(/components\/([^\/]+)/);
      if (componentMatch) {
        components.add(componentMatch[1]);
      }

      // Extract component names from imports
      const content = change.modifiedContent || '';
      const importMatches = content.matchAll(/import\s+.*from\s+['"]([^'"]+)['"]/g);
      for (const match of importMatches) {
        const importPath = match[1];
        const componentName = importPath.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '');
        if (componentName) {
          components.add(componentName);
        }
      }

      // Extract component names from exports
      const exportMatches = content.matchAll(/export\s+(default\s+)?(function|class|const)\s+(\w+)/g);
      for (const match of exportMatches) {
        components.add(match[3]);
      }
    }

    return Array.from(components);
  }

  /**
   * Detect potential breaking changes
   */
  detectBreakingChanges(changes: FileChange[]): string[] {
    const breakingChanges: string[] = [];

    for (const change of changes) {
      const content = change.modifiedContent || '';
      const originalContent = change.originalContent || '';

      // Check for removed exports
      const originalExports: string[] = originalContent.match(/export\s+(default\s+)?(function|class|const)\s+(\w+)/g) || [];
      const newExports: string[] = content.match(/export\s+(default\s+)?(function|class|const)\s+(\w+)/g) || [];

      for (const exp of originalExports) {
        if (!newExports.includes(exp)) {
          breakingChanges.push(`Removed export in ${change.path}: ${exp.substring(0, 50)}`);
        }
      }

      // Check for modified interfaces/types
      const originalTypes: string[] = originalContent.match(/(?:interface|type)\s+(\w+)/g) || [];
      const newTypes: string[] = content.match(/(?:interface|type)\s+(\w+)/g) || [];

      for (const type of originalTypes) {
        if (!newTypes.includes(type)) {
          breakingChanges.push(`Modified or removed type in ${change.path}: ${type}`);
        }
      }

      // Check for breaking patterns in changes
      for (const pattern of BREAKING_CHANGE_PATTERNS) {
        if (pattern.test(originalContent) && !pattern.test(content)) {
          const matchResult = originalContent.match(pattern);
          if (matchResult) {
            breakingChanges.push(`Potentially removed: ${matchResult[0].substring(0, 40)} in ${change.path}`);
          }
        }
      }

      // Deleted files are breaking changes
      if (change.action === 'delete') {
        breakingChanges.push(`Deleted file: ${change.path}`);
      }
    }

    return breakingChanges;
  }

  /**
   * Suggest tests based on changes
   */
  suggestTests(changes: FileChange[]): string[] {
    const suggestions: Set<string> = new Set();

    for (const change of changes) {
      const path = change.path;
      const content = change.modifiedContent || '';

      // Component tests
      if (path.includes('components/')) {
        suggestions.add(`Unit test: Test the affected component renders correctly`);
        suggestions.add(`Integration test: Test component interactions`);
      }

      // API route tests
      if (path.includes('api/')) {
        suggestions.add(`API test: Test endpoint responses and error handling`);
        suggestions.add(`Integration test: Test API with database/services`);
      }

      // Hook tests
      if (content.includes('use') && content.includes('useState')) {
        suggestions.add(`Hook test: Test custom hook state management`);
      }

      // Utility tests
      if (path.includes('utils/') || path.includes('lib/')) {
        suggestions.add(`Unit test: Test utility functions with edge cases`);
      }

      // Configuration changes
      if (change.category === 'configuration') {
        suggestions.add(`Build test: Verify build completes successfully`);
        suggestions.add(`Environment test: Test with different environments`);
      }

      // Dependency changes
      if (change.category === 'dependencies') {
        suggestions.add(`Dependency test: Run full test suite after install`);
        suggestions.add(`Compatibility test: Check for peer dependency issues`);
      }

      // Styling changes
      if (change.category === 'styling') {
        suggestions.add(`Visual test: Verify UI renders correctly`);
        suggestions.add(`Responsive test: Test on different screen sizes`);
      }
    }

    return Array.from(suggestions);
  }

  /**
   * Find dependencies that may be affected
   */
  private findDependencies(changes: FileChange[]): string[] {
    const dependencies: Set<string> = new Set();

    for (const change of changes) {
      const content = change.modifiedContent || '';

      // Extract imports
      const importMatches = content.matchAll(/import\s+.*from\s+['"]([^'"]+)['"]/g);
      for (const match of importMatches) {
        const dep = match[1];
        // Only include external dependencies (not relative imports)
        if (!dep.startsWith('.') && !dep.startsWith('@/')) {
          dependencies.add(dep.split('/')[0]);
        }
      }

      // Extract requires
      const requireMatches = content.matchAll(/require\(['"]([^'"]+)['"]\)/g);
      for (const match of requireMatches) {
        const dep = match[1];
        if (!dep.startsWith('.')) {
          dependencies.add(dep.split('/')[0]);
        }
      }
    }

    return Array.from(dependencies);
  }

  /**
   * Calculate overall risk level from all changes
   */
  private calculateOverallRisk(changes: FileChange[]): RiskLevel {
    let hasHigh = false;
    let hasMedium = false;

    for (const change of changes) {
      const risk = this.assessRisk(change);
      if (risk === 'high') hasHigh = true;
      if (risk === 'medium') hasMedium = true;
    }

    if (hasHigh) return 'high';
    if (hasMedium) return 'medium';
    return 'low';
  }

  /**
   * Parse hunks from a unified diff string
   */
  parseHunksFromDiff(diffContent: string, filePath: string): DiffHunk[] {
    const hunks: DiffHunk[] = [];
    const lines = diffContent.split('\n');
    
    let currentHunk: DiffHunk | null = null;
    let lineNumber = 0;
    let hunkId = 0;

    for (const line of lines) {
      // Detect hunk header
      const hunkMatch = line.match(/^@@\s+-(\d+),?\d*\s+\+(\d+),?\d*\s+@@/);
      
      if (hunkMatch) {
        // Save previous hunk
        if (currentHunk) {
          hunks.push(currentHunk);
        }

        const startLine = parseInt(hunkMatch[2], 10);
        lineNumber = startLine;
        hunkId++;

        currentHunk = {
          id: `${filePath}-hunk-${hunkId}`,
          startLine,
          endLine: startLine,
          type: 'modification',
          category: this.categorizeChange(line, filePath),
          status: 'pending',
          lines: [],
          summary: '',
        };
        continue;
      }

      if (!currentHunk) continue;

      // Parse diff lines
      if (line.startsWith('+') && !line.startsWith('+++')) {
        currentHunk.lines.push({
          number: lineNumber,
          modifiedNumber: lineNumber,
          content: line.substring(1),
          type: 'added',
          comments: [],
        });
        currentHunk.type = currentHunk.type === 'deletion' ? 'modification' : 'addition';
        lineNumber++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        currentHunk.lines.push({
          number: lineNumber,
          originalNumber: lineNumber,
          content: line.substring(1),
          type: 'removed',
          comments: [],
        });
        currentHunk.type = currentHunk.type === 'addition' ? 'modification' : 'deletion';
      } else if (!line.startsWith('\\')) {
        currentHunk.lines.push({
          number: lineNumber,
          originalNumber: lineNumber,
          modifiedNumber: lineNumber,
          content: line.startsWith(' ') ? line.substring(1) : line,
          type: 'unchanged',
          comments: [],
        });
        lineNumber++;
      }

      currentHunk.endLine = lineNumber;
    }

    // Save last hunk
    if (currentHunk) {
      hunks.push(currentHunk);
    }

    // Generate summaries for each hunk
    for (const hunk of hunks) {
      const addedCount = hunk.lines.filter(l => l.type === 'added').length;
      const removedCount = hunk.lines.filter(l => l.type === 'removed').length;
      
      if (addedCount > 0 && removedCount > 0) {
        hunk.summary = `Modified ${addedCount + removedCount} lines`;
      } else if (addedCount > 0) {
        hunk.summary = `Added ${addedCount} lines`;
      } else if (removedCount > 0) {
        hunk.summary = `Removed ${removedCount} lines`;
      } else {
        hunk.summary = 'Context only';
      }
    }

    return hunks;
  }
}

/**
 * Singleton instance of ImpactAnalyzer
 */
let impactAnalyzerInstance: ImpactAnalyzer | null = null;

/**
 * Get the singleton instance of ImpactAnalyzer
 */
export function getImpactAnalyzer(): ImpactAnalyzer {
  if (!impactAnalyzerInstance) {
    impactAnalyzerInstance = new ImpactAnalyzer();
  }
  return impactAnalyzerInstance;
}

/**
 * Analyze changes (convenience function)
 */
export async function analyzeChanges(changes: FileChange[]): Promise<ImpactAnalysis> {
  return getImpactAnalyzer().analyzeChanges(changes);
}

/**
 * Categorize a change (convenience function)
 */
export function categorizeChange(content: string, filePath: string): ChangeCategory {
  return getImpactAnalyzer().categorizeChange(content, filePath);
}

/**
 * Assess risk level (convenience function)
 */
export function assessRisk(change: FileChange): RiskLevel {
  return getImpactAnalyzer().assessRisk(change);
}

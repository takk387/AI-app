/**
 * File type classification, importance scoring, and summary generation
 */

import {
  FileType,
  ExportInfo,
  ComponentInfo,
  HookInfo,
  TypeInfo,
  APIEndpointInfo,
  FILE_TYPE_IMPORTANCE,
} from '../../types/codeContext';

export function classifyFileType(
  path: string,
  exports: ExportInfo[],
  components: ComponentInfo[],
  apiEndpoints: APIEndpointInfo[],
  hooks: HookInfo[]
): FileType {
  const normalizedPath = path.replace(/\\/g, '/').toLowerCase();

  // Test files
  if (
    normalizedPath.includes('.test.') ||
    normalizedPath.includes('.spec.') ||
    normalizedPath.includes('/__tests__/')
  ) {
    return 'test';
  }

  // API routes
  if (apiEndpoints.length > 0) {
    return 'api-route';
  }

  // Type definitions
  if (
    normalizedPath.includes('/types/') ||
    normalizedPath.endsWith('.d.ts') ||
    exports.every((e) => e.kind === 'type' || e.kind === 'interface')
  ) {
    return 'type-definition';
  }

  // Hooks
  if (hooks.length > 0 || normalizedPath.includes('/hooks/')) {
    return 'hook';
  }

  // Context providers
  if (
    normalizedPath.includes('/context') ||
    normalizedPath.includes('provider') ||
    exports.some((e) => e.name.includes('Provider') || e.name.includes('Context'))
  ) {
    return 'context-provider';
  }

  // Pages
  if (
    normalizedPath.includes('/pages/') ||
    (normalizedPath.includes('/app/') && normalizedPath.includes('page.'))
  ) {
    return 'page';
  }

  // Layouts
  if (normalizedPath.includes('layout.')) {
    return 'layout';
  }

  // Components
  if (components.length > 0 || normalizedPath.includes('/components/')) {
    return 'component';
  }

  // Utilities
  if (
    normalizedPath.includes('/utils/') ||
    normalizedPath.includes('/lib/') ||
    normalizedPath.includes('/helpers/')
  ) {
    return 'utility';
  }

  // Styles
  if (
    normalizedPath.endsWith('.css') ||
    normalizedPath.endsWith('.scss') ||
    normalizedPath.includes('styles')
  ) {
    return 'style';
  }

  // Config
  if (
    normalizedPath.includes('config') ||
    normalizedPath.includes('.config.') ||
    normalizedPath.endsWith('rc.ts') ||
    normalizedPath.endsWith('rc.js')
  ) {
    return 'config';
  }

  return 'other';
}

export function calculateImportance(
  path: string,
  fileType: FileType,
  exports: ExportInfo[],
  components: ComponentInfo[],
  types: TypeInfo[]
): number {
  let score = FILE_TYPE_IMPORTANCE[fileType] ?? 0.4;

  // Boost for many exports (more reusable)
  if (exports.length > 5) {
    score += 0.1;
  }

  // Boost for types (highly reusable)
  if (types.length > 3) {
    score += 0.1;
  }

  // Boost for context providers
  if (exports.some((e) => e.name.includes('Provider') || e.name.includes('Context'))) {
    score += 0.15;
  }

  // Boost for index files (re-export hubs)
  if (path.includes('index.')) {
    score += 0.1;
  }

  // Reduce for large component files (likely less reusable)
  if (components.length > 3) {
    score -= 0.05;
  }

  return Math.max(0, Math.min(1, score));
}

export function generateSummary(
  path: string,
  exports: ExportInfo[],
  components: ComponentInfo[],
  types: TypeInfo[],
  apiEndpoints: APIEndpointInfo[],
  hooks: HookInfo[]
): string {
  const parts: string[] = [];
  const fileName = path.split(/[/\\]/).pop() ?? path;

  if (components.length > 0) {
    const names = components.map((c) => c.name).slice(0, 3);
    parts.push(`Components: ${names.join(', ')}${components.length > 3 ? '...' : ''}`);
  }

  if (types.length > 0) {
    const names = types.map((t) => t.name).slice(0, 3);
    parts.push(`Types: ${names.join(', ')}${types.length > 3 ? '...' : ''}`);
  }

  if (apiEndpoints.length > 0) {
    const endpoints = apiEndpoints.map((e) => `${e.method} ${e.path}`).slice(0, 2);
    parts.push(`API: ${endpoints.join(', ')}${apiEndpoints.length > 2 ? '...' : ''}`);
  }

  if (hooks.length > 0) {
    const names = hooks.map((h) => h.name).slice(0, 3);
    parts.push(`Hooks: ${names.join(', ')}${hooks.length > 3 ? '...' : ''}`);
  }

  // Add remaining exports not covered above
  const coveredNames = new Set([
    ...components.map((c) => c.name),
    ...types.map((t) => t.name),
    ...hooks.map((h) => h.name),
  ]);

  const otherExports = exports
    .filter((e) => !coveredNames.has(e.name) && e.name !== 'default')
    .slice(0, 3);

  if (otherExports.length > 0) {
    parts.push(`Exports: ${otherExports.map((e) => e.name).join(', ')}`);
  }

  return parts.length > 0 ? parts.join(' | ') : fileName;
}

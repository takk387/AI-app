/**
 * LayoutBackendAnalyzer Service
 *
 * Stage 1 of the Dual AI Planning pipeline.
 * Extracts backend requirements from the user's frontend LayoutManifest.
 *
 * IMPORTANT: The actual LayoutManifest uses a tree structure (root: UISpecNode
 * with recursive children), NOT a flat components[] array. This service
 * traverses the UISpecNode tree recursively.
 *
 * Pure synchronous — no AI calls needed.
 */

import type { LayoutManifest, UISpecNode } from '@/types/schema';
import type {
  FrontendBackendNeeds,
  InferredDataModel,
  InferredAPIEndpoint,
} from '@/types/dualPlanning';

// ============================================================================
// DETECTION KEYWORD MAPS
// ============================================================================

const AUTH_KEYWORDS = [
  'login',
  'signup',
  'register',
  'auth',
  'sign-in',
  'sign-up',
  'password',
  'forgot-password',
];
const SEARCH_KEYWORDS = ['search', 'filter', 'find', 'query', 'lookup'];
const REALTIME_KEYWORDS = [
  'chat',
  'message',
  'notification',
  'live',
  'real-time',
  'realtime',
  'stream',
  'feed',
];
const UPLOAD_KEYWORDS = ['upload', 'file', 'image-upload', 'attachment', 'drop-zone', 'dropzone'];
const PAGINATION_KEYWORDS = ['pagination', 'paginator', 'page-nav', 'load-more', 'infinite-scroll'];

const DATA_DISPLAY_TYPES = ['list', 'container']; // UISpecNode types that may display data
const DATA_DISPLAY_SEMANTIC_KEYWORDS = [
  'table',
  'list',
  'grid',
  'card',
  'chart',
  'dashboard',
  'data',
  'feed',
];

const FORM_SEMANTIC_KEYWORDS = ['form', 'editor', 'create', 'edit', 'new', 'add', 'compose'];
const INTERACTIVE_TYPES: string[] = ['button', 'input'];
const INTERACTIVE_SEMANTIC_KEYWORDS = [
  'select',
  'checkbox',
  'radio',
  'toggle',
  'switch',
  'slider',
  'dropdown',
];

// ============================================================================
// SERVICE CLASS
// ============================================================================

class LayoutBackendAnalyzerService {
  /**
   * Extract backend requirements from a LayoutManifest.
   * Traverses the UISpecNode tree recursively.
   */
  extractBackendNeeds(manifest: LayoutManifest): FrontendBackendNeeds {
    const allNodes = this.flattenTree(manifest.root);

    // Also include definition nodes (reusable components)
    if (manifest.definitions) {
      for (const defNode of Object.values(manifest.definitions)) {
        allNodes.push(...this.flattenTree(defNode));
      }
    }

    const dataModels: InferredDataModel[] = [];
    const apiEndpoints: InferredAPIEndpoint[] = [];
    const globalState: string[] = [];
    const localState: string[] = [];

    let authRequired = false;
    let realtimeNeeded = false;
    let fileUploads = false;
    let searchNeeded = false;
    let paginationNeeded = false;
    let cachingNeeded = false;

    const seenModels = new Set<string>();

    for (const node of allNodes) {
      const semantic = node.semanticTag?.toLowerCase() ?? '';
      const nodeType = node.type?.toLowerCase() ?? '';
      const text = node.attributes?.text?.toLowerCase() ?? '';
      const actionId = node.attributes?.actionId?.toLowerCase() ?? '';
      const combined = `${semantic} ${nodeType} ${text} ${actionId}`;

      // --- Auth detection ---
      if (this.matchesKeywords(combined, AUTH_KEYWORDS)) {
        authRequired = true;
        if (!seenModels.has('User')) {
          seenModels.add('User');
          dataModels.push({
            name: 'User',
            fields: ['id', 'email', 'password', 'name', 'avatar', 'createdAt'],
            relationships: [],
            inferredFrom: node.semanticTag || node.id,
          });
          apiEndpoints.push(
            {
              method: 'POST',
              path: '/api/auth/login',
              purpose: 'User authentication',
              triggeredBy: node.id,
            },
            {
              method: 'POST',
              path: '/api/auth/register',
              purpose: 'User registration',
              triggeredBy: node.id,
            },
            {
              method: 'POST',
              path: '/api/auth/logout',
              purpose: 'User logout',
              triggeredBy: node.id,
            }
          );
        }
      }

      // --- Data display detection ---
      if (this.isDataDisplayNode(node)) {
        const modelName = this.inferModelName(node);
        if (modelName && !seenModels.has(modelName)) {
          seenModels.add(modelName);
          dataModels.push({
            name: modelName,
            fields: this.inferFields(node, allNodes),
            relationships: [],
            inferredFrom: node.semanticTag || node.id,
          });
          apiEndpoints.push({
            method: 'GET',
            path: `/api/${modelName.toLowerCase()}s`,
            purpose: `Fetch ${modelName} data`,
            triggeredBy: node.id,
          });
        }
      }

      // --- Form / CRUD detection ---
      if (this.isFormNode(node)) {
        const modelName = this.inferModelName(node);
        if (modelName) {
          const basePath = `/api/${modelName.toLowerCase()}s`;
          const alreadyHasPost = apiEndpoints.some(
            (e) => e.method === 'POST' && e.path === basePath
          );
          if (!alreadyHasPost) {
            apiEndpoints.push(
              {
                method: 'POST',
                path: basePath,
                purpose: `Create ${modelName}`,
                triggeredBy: node.id,
              },
              {
                method: 'PUT',
                path: `${basePath}/:id`,
                purpose: `Update ${modelName}`,
                triggeredBy: node.id,
              },
              {
                method: 'DELETE',
                path: `${basePath}/:id`,
                purpose: `Delete ${modelName}`,
                triggeredBy: node.id,
              }
            );
          }
        }
      }

      // --- File upload detection ---
      if (this.matchesKeywords(combined, UPLOAD_KEYWORDS)) {
        fileUploads = true;
        const alreadyHasUpload = apiEndpoints.some((e) => e.path === '/api/upload');
        if (!alreadyHasUpload) {
          apiEndpoints.push({
            method: 'POST',
            path: '/api/upload',
            purpose: 'Handle file uploads',
            triggeredBy: node.id,
          });
        }
      }

      // --- Search detection ---
      if (this.matchesKeywords(combined, SEARCH_KEYWORDS)) {
        searchNeeded = true;
        const alreadyHasSearch = apiEndpoints.some((e) => e.path === '/api/search');
        if (!alreadyHasSearch) {
          apiEndpoints.push({
            method: 'GET',
            path: '/api/search',
            purpose: 'Search functionality',
            triggeredBy: node.id,
          });
        }
      }

      // --- Realtime detection ---
      if (this.matchesKeywords(combined, REALTIME_KEYWORDS)) {
        realtimeNeeded = true;
      }

      // --- Pagination detection ---
      if (this.matchesKeywords(combined, PAGINATION_KEYWORDS)) {
        paginationNeeded = true;
      }

      // --- State inference ---
      if (this.isInteractiveNode(node)) {
        const stateName = node.attributes?.name || node.semanticTag || node.id;
        if (stateName) {
          localState.push(stateName);
        }
      }
    }

    // Infer global state from detected features
    if (authRequired) globalState.push('currentUser', 'isAuthenticated');
    if (searchNeeded) globalState.push('searchQuery', 'searchResults');
    if (realtimeNeeded) globalState.push('notifications', 'liveData');

    // Caching is needed if there are multiple data models or high data volume
    if (dataModels.length >= 3 || paginationNeeded) {
      cachingNeeded = true;
    }

    // Also leverage detectedFeatures from the manifest itself
    if (manifest.detectedFeatures) {
      for (const feature of manifest.detectedFeatures) {
        const fl = feature.toLowerCase();
        if (this.matchesKeywords(fl, AUTH_KEYWORDS)) authRequired = true;
        if (this.matchesKeywords(fl, REALTIME_KEYWORDS)) realtimeNeeded = true;
        if (this.matchesKeywords(fl, SEARCH_KEYWORDS)) searchNeeded = true;
        if (this.matchesKeywords(fl, UPLOAD_KEYWORDS)) fileUploads = true;
      }
    }

    const stateComplexity = this.assessStateComplexity(allNodes, dataModels);
    const performance = this.assessPerformance(allNodes, dataModels, realtimeNeeded);

    return {
      dataModels,
      apiEndpoints,
      stateManagement: {
        globalState,
        localState: [...new Set(localState)],
        complexity: stateComplexity,
      },
      features: {
        authRequired,
        realtimeNeeded,
        fileUploads,
        searchNeeded,
        paginationNeeded,
        cachingNeeded,
      },
      performance,
    };
  }

  // ==========================================================================
  // TREE TRAVERSAL
  // ==========================================================================

  private flattenTree(node: UISpecNode): UISpecNode[] {
    const nodes: UISpecNode[] = [node];
    if (node.children) {
      for (const child of node.children) {
        nodes.push(...this.flattenTree(child));
      }
    }
    return nodes;
  }

  // ==========================================================================
  // DETECTION HELPERS
  // ==========================================================================

  private matchesKeywords(text: string, keywords: string[]): boolean {
    return keywords.some((kw) => text.includes(kw));
  }

  private isDataDisplayNode(node: UISpecNode): boolean {
    const semantic = node.semanticTag?.toLowerCase() ?? '';
    const isDisplayType = DATA_DISPLAY_TYPES.includes(node.type);
    const hasDisplaySemantic = DATA_DISPLAY_SEMANTIC_KEYWORDS.some((kw) => semantic.includes(kw));
    return isDisplayType && hasDisplaySemantic;
  }

  private isFormNode(node: UISpecNode): boolean {
    const semantic = node.semanticTag?.toLowerCase() ?? '';
    const actionId = node.attributes?.actionId?.toLowerCase() ?? '';
    return (
      FORM_SEMANTIC_KEYWORDS.some((kw) => semantic.includes(kw)) ||
      actionId.includes('submit') ||
      actionId.includes('create') ||
      actionId.includes('save')
    );
  }

  private isInteractiveNode(node: UISpecNode): boolean {
    const semantic = node.semanticTag?.toLowerCase() ?? '';
    return (
      INTERACTIVE_TYPES.includes(node.type) ||
      INTERACTIVE_SEMANTIC_KEYWORDS.some((kw) => semantic.includes(kw))
    );
  }

  // ==========================================================================
  // INFERENCE HELPERS
  // ==========================================================================

  private inferModelName(node: UISpecNode): string | null {
    const semantic = node.semanticTag || node.id || '';
    // Split on common delimiters: -, _, camelCase boundaries
    const words = semantic
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .split(/[-_]/)
      .map((w) => w.toLowerCase());

    // Filter out UI-related words to find the domain entity
    const uiWords = new Set([
      'table',
      'list',
      'grid',
      'card',
      'form',
      'display',
      'view',
      'panel',
      'modal',
      'dialog',
      'section',
      'container',
      'wrapper',
      'layout',
      'header',
      'footer',
      'sidebar',
      'nav',
      'menu',
      'btn',
      'button',
      'input',
      'field',
      'editor',
      'create',
      'edit',
      'new',
      'add',
      'compose',
      'submit',
      'chart',
      'dashboard',
      'feed',
      'item',
    ]);

    const entityWords = words.filter((w) => w.length > 1 && !uiWords.has(w));

    if (entityWords.length === 0) return null;

    // Capitalize first entity word
    const name = entityWords[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  private inferFields(node: UISpecNode, _allNodes: UISpecNode[]): string[] {
    const fields = new Set<string>(['id', 'createdAt', 'updatedAt']);

    // Look at children of this node for field hints
    if (node.children) {
      for (const child of node.children) {
        // Input fields with names
        if (child.attributes?.name) {
          fields.add(child.attributes.name);
        }
        // Text content that might be column headers or labels
        if (child.attributes?.text && child.type === 'text') {
          const label = child.attributes.text.toLowerCase().replace(/\s+/g, '_');
          if (label.length > 1 && label.length < 30) {
            fields.add(label);
          }
        }
        // Placeholder text as field hints
        if (child.attributes?.placeholder) {
          const placeholder = child.attributes.placeholder.toLowerCase().replace(/\s+/g, '_');
          if (placeholder.length > 1 && placeholder.length < 30) {
            fields.add(placeholder);
          }
        }
      }
    }

    return Array.from(fields);
  }

  // ==========================================================================
  // COMPLEXITY ASSESSMENT
  // ==========================================================================

  private assessStateComplexity(
    nodes: UISpecNode[],
    models: InferredDataModel[]
  ): 'simple' | 'moderate' | 'complex' {
    const interactiveCount = nodes.filter((n) => this.isInteractiveNode(n)).length;
    const modelCount = models.length;

    if (interactiveCount > 15 || modelCount > 5) return 'complex';
    if (interactiveCount > 7 || modelCount > 2) return 'moderate';
    return 'simple';
  }

  private assessPerformance(
    nodes: UISpecNode[],
    models: InferredDataModel[],
    realtimeNeeded: boolean
  ): FrontendBackendNeeds['performance'] {
    const hasLargeDataDisplay = nodes.some((n) => {
      const semantic = n.semanticTag?.toLowerCase() ?? '';
      return (
        semantic.includes('table') || semantic.includes('chart') || semantic.includes('dashboard')
      );
    });

    return {
      expectedDataVolume:
        hasLargeDataDisplay || models.length > 3 ? 'high' : models.length > 1 ? 'medium' : 'low',
      queryComplexity: hasLargeDataDisplay ? 'complex' : models.length > 2 ? 'moderate' : 'simple',
      concurrentUsers: realtimeNeeded ? 5000 : 1000,
    };
  }
}

// Singleton export
export const layoutBackendAnalyzer = new LayoutBackendAnalyzerService();
export { LayoutBackendAnalyzerService };

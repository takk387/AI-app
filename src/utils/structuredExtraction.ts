/**
 * Structured Extraction Utility
 *
 * Extracts structured app concept data from conversations.
 * Goes beyond regex-based extraction to capture rich details
 * about features, roles, workflows, and technical requirements.
 */

import type { ChatMessage } from '@/types/aiBuilderTypes';
import type { Feature, UserRole, Workflow, TechnicalRequirements } from '@/types/appConcept';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Extended feature specification with rich details
 */
export interface ExtractedFeature {
  name: string;
  description: string;
  userStories: string[];
  acceptanceCriteria: string[];
  technicalNotes: string[];
  uiRequirements: string[];
  dataRequirements: string[];
  priority: 'high' | 'medium' | 'low';
  dependencies: string[];
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
}

/**
 * Extended role with permissions and workflows
 */
export interface ExtractedRole {
  name: string;
  description: string;
  capabilities: string[];
  permissions: string[];
  restrictions: string[];
  workflows: string[];
}

/**
 * Extended workflow with steps and conditions
 */
export interface ExtractedWorkflow {
  name: string;
  description: string;
  triggerCondition: string;
  steps: WorkflowStep[];
  involvedRoles: string[];
  expectedOutcome: string;
}

export interface WorkflowStep {
  order: number;
  action: string;
  actor: string;
  conditions?: string[];
  alternatives?: string[];
}

/**
 * Technical specification extracted from conversation
 */
export interface ExtractedTechnicalSpec {
  category: 'auth' | 'database' | 'api' | 'realtime' | 'storage' | 'integration' | 'other';
  requirement: string;
  details: string[];
  constraints: string[];
}

/**
 * UI pattern or requirement
 */
export interface ExtractedUIPattern {
  component: string;
  description: string;
  interactions: string[];
  responsiveness: string[];
  accessibility: string[];
}

/**
 * Complete structured context extracted from conversation
 */
export interface StructuredAppContext {
  features: ExtractedFeature[];
  roles: ExtractedRole[];
  workflows: ExtractedWorkflow[];
  technicalSpecs: ExtractedTechnicalSpec[];
  uiPatterns: ExtractedUIPattern[];
  constraints: string[];
  decisions: string[];
  openQuestions: string[];
  extractionMetadata: {
    messagesAnalyzed: number;
    extractedAt: string;
    confidence: 'high' | 'medium' | 'low';
  };
}

// ============================================================================
// EXTRACTION PATTERNS
// ============================================================================

/**
 * Patterns to identify feature-related content
 */
const FEATURE_PATTERNS = {
  definition: [
    /(?:feature|functionality|capability):\s*(.+?)(?:\.|$)/gi,
    /(?:users? (?:can|should|will|need to))\s+(.+?)(?:\.|$)/gi,
    /(?:the app (?:should|will|must|needs to))\s+(.+?)(?:\.|$)/gi,
    /(?:implement|add|create|build)\s+(?:a|an|the)?\s*(.+?)(?:\s+feature|\s+functionality)?(?:\.|$)/gi,
  ],
  priority: [
    /(?:must.?have|essential|critical|high.?priority)/gi,
    /(?:should.?have|important|medium.?priority)/gi,
    /(?:nice.?to.?have|optional|low.?priority|future)/gi,
  ],
  complexity: [
    /(?:simple|basic|straightforward|easy)/gi,
    /(?:moderate|medium|standard)/gi,
    /(?:complex|advanced|sophisticated|challenging)/gi,
  ],
};

/**
 * Patterns to identify role-related content
 */
const ROLE_PATTERNS = {
  definition: [
    /(?:role|user type|user kind):\s*(.+?)(?:\.|$)/gi,
    /(?:admin(?:istrator)?s?|moderators?|users?|guests?|viewers?|editors?|managers?|owners?)/gi,
    /(?:there (?:are|will be))\s+(?:different\s+)?(?:types? of\s+)?(?:users?|roles?):\s*(.+?)(?:\.|$)/gi,
  ],
  capabilities: [
    /(?:can|able to|allowed to|permitted to)\s+(.+?)(?:\.|,|$)/gi,
    /(?:has|have) (?:access to|permission to)\s+(.+?)(?:\.|,|$)/gi,
  ],
  restrictions: [
    /(?:cannot|can't|unable to|not allowed to|restricted from)\s+(.+?)(?:\.|,|$)/gi,
    /(?:only\s+(?:admins?|managers?|owners?))\s+can\s+(.+?)(?:\.|,|$)/gi,
  ],
};

/**
 * Patterns to identify workflow-related content
 */
const WORKFLOW_PATTERNS = {
  definition: [
    /(?:workflow|process|flow|procedure):\s*(.+?)(?:\.|$)/gi,
    /(?:when|after|once)\s+(.+?),\s*(?:then|the system|it)\s+(.+?)(?:\.|$)/gi,
    /(?:step\s*\d+|first|then|next|finally|after that):\s*(.+?)(?:\.|$)/gi,
  ],
  sequence: [
    /(?:first|initially|to start),?\s*(.+?)(?:\.|,|$)/gi,
    /(?:then|next|after that|subsequently),?\s*(.+?)(?:\.|,|$)/gi,
    /(?:finally|lastly|at the end),?\s*(.+?)(?:\.|$)/gi,
  ],
};

/**
 * Patterns to identify technical requirements
 */
const TECHNICAL_PATTERNS = {
  auth: [
    /(?:authentication|login|sign.?in|sign.?up|oauth|sso|jwt|session)/gi,
    /(?:password|credentials|two.?factor|2fa|mfa)/gi,
  ],
  database: [
    /(?:database|db|sql|postgres|mysql|mongodb|supabase|firebase)/gi,
    /(?:store|persist|save|retrieve|query|table|collection)/gi,
  ],
  api: [
    /(?:api|endpoint|rest|graphql|webhook)/gi,
    /(?:third.?party|integration|external service)/gi,
  ],
  realtime: [
    /(?:real.?time|live|websocket|socket|push notification|instant)/gi,
    /(?:collaboration|sync|concurrent)/gi,
  ],
  storage: [
    /(?:file upload|image upload|attachment|s3|blob|storage)/gi,
    /(?:media|document|asset)/gi,
  ],
};

// ============================================================================
// EXTRACTION FUNCTIONS
// ============================================================================

/**
 * Extract features from conversation messages
 */
export function extractFeatures(messages: ChatMessage[]): ExtractedFeature[] {
  const features: Map<string, ExtractedFeature> = new Map();
  const content = messages.map((m) => m.content).join('\n\n');

  // Extract feature mentions
  for (const pattern of FEATURE_PATTERNS.definition) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const featureName = normalizeFeatureName(match[1]);
      if (featureName && featureName.length > 3 && featureName.length < 100) {
        if (!features.has(featureName.toLowerCase())) {
          features.set(featureName.toLowerCase(), {
            name: featureName,
            description: extractFeatureContext(content, match.index, 200),
            userStories: extractUserStories(content, featureName),
            acceptanceCriteria: extractAcceptanceCriteria(content, featureName),
            technicalNotes: extractTechnicalNotes(content, featureName),
            uiRequirements: extractUIRequirements(content, featureName),
            dataRequirements: extractDataRequirements(content, featureName),
            priority: detectPriority(content, featureName),
            dependencies: extractDependencies(content, featureName),
            estimatedComplexity: detectComplexity(content, featureName),
          });
        }
      }
    }
  }

  return Array.from(features.values());
}

/**
 * Extract roles from conversation messages
 */
export function extractRoles(messages: ChatMessage[]): ExtractedRole[] {
  const roles: Map<string, ExtractedRole> = new Map();
  const content = messages.map((m) => m.content).join('\n\n');

  // Look for explicit role definitions
  const rolePattern = /(?:roles?|user types?):\s*([^.]+)/gi;
  let match;
  while ((match = rolePattern.exec(content)) !== null) {
    const roleList = match[1].split(/[,;]|and/).map((r) => r.trim());
    for (const roleName of roleList) {
      if (roleName && roleName.length > 2 && roleName.length < 50) {
        const normalized = normalizeRoleName(roleName);
        if (!roles.has(normalized.toLowerCase())) {
          roles.set(normalized.toLowerCase(), {
            name: normalized,
            description: '',
            capabilities: extractRoleCapabilities(content, normalized),
            permissions: extractRolePermissions(content, normalized),
            restrictions: extractRoleRestrictions(content, normalized),
            workflows: extractRoleWorkflows(content, normalized),
          });
        }
      }
    }
  }

  // Look for common role keywords
  const commonRoles = ['admin', 'user', 'guest', 'moderator', 'editor', 'viewer', 'manager', 'owner'];
  for (const role of commonRoles) {
    const roleRegex = new RegExp(`\\b${role}s?\\b`, 'gi');
    if (roleRegex.test(content) && !roles.has(role)) {
      roles.set(role, {
        name: capitalizeFirst(role),
        description: '',
        capabilities: extractRoleCapabilities(content, role),
        permissions: extractRolePermissions(content, role),
        restrictions: extractRoleRestrictions(content, role),
        workflows: extractRoleWorkflows(content, role),
      });
    }
  }

  return Array.from(roles.values());
}

/**
 * Extract workflows from conversation messages
 */
export function extractWorkflows(messages: ChatMessage[]): ExtractedWorkflow[] {
  const workflows: ExtractedWorkflow[] = [];
  const content = messages.map((m) => m.content).join('\n\n');

  // Look for workflow patterns
  const workflowPattern = /(?:when|if|once)\s+([^,]+),\s*(?:then|the (?:system|app))\s+([^.]+)/gi;
  let match;
  while ((match = workflowPattern.exec(content)) !== null) {
    const trigger = match[1].trim();
    const action = match[2].trim();

    workflows.push({
      name: `${trigger.slice(0, 30)}...`,
      description: `When ${trigger}, then ${action}`,
      triggerCondition: trigger,
      steps: [
        { order: 1, action: trigger, actor: 'User' },
        { order: 2, action: action, actor: 'System' },
      ],
      involvedRoles: extractInvolvedRoles(content, trigger + ' ' + action),
      expectedOutcome: action,
    });
  }

  return workflows.slice(0, 20); // Limit to avoid overwhelming
}

/**
 * Extract technical specifications from conversation
 */
export function extractTechnicalSpecs(messages: ChatMessage[]): ExtractedTechnicalSpec[] {
  const specs: ExtractedTechnicalSpec[] = [];
  const content = messages.map((m) => m.content).join('\n\n');

  // Check each technical category
  const categories: Array<keyof typeof TECHNICAL_PATTERNS> = [
    'auth',
    'database',
    'api',
    'realtime',
    'storage',
  ];

  for (const category of categories) {
    const patterns = TECHNICAL_PATTERNS[category];
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        // Extract context around the match
        pattern.lastIndex = 0;
        const matches: string[] = [];
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const context = extractContext(content, match.index, 150);
          if (context && !matches.includes(context)) {
            matches.push(context);
          }
        }

        if (matches.length > 0) {
          specs.push({
            category,
            requirement: `${capitalizeFirst(category)} functionality required`,
            details: matches.slice(0, 5),
            constraints: extractConstraints(content, category),
          });
          break; // One spec per category
        }
      }
    }
  }

  return specs;
}

/**
 * Extract decisions made during conversation
 */
export function extractDecisions(messages: ChatMessage[]): string[] {
  const decisions: string[] = [];
  const content = messages.map((m) => m.content).join('\n\n');

  const decisionPatterns = [
    /(?:decided|agreed|confirmed|going with|chose|selected)\s+(?:to\s+)?(.{10,100}?)(?:\.|,|$)/gi,
    /(?:yes|okay|sounds good|perfect|let's do)\s*[,:]?\s*(.{10,80}?)(?:\.|$)/gi,
  ];

  for (const pattern of decisionPatterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const decision = match[1].trim();
      if (decision && !decisions.some((d) => d.includes(decision) || decision.includes(d))) {
        decisions.push(decision);
      }
    }
  }

  return decisions.slice(0, 15);
}

/**
 * Extract open questions that need clarification
 */
export function extractOpenQuestions(messages: ChatMessage[]): string[] {
  const questions: string[] = [];

  // Look at assistant messages for questions
  const assistantMessages = messages.filter((m) => m.role === 'assistant');

  for (const msg of assistantMessages.slice(-5)) {
    // Focus on recent messages
    const questionPattern = /([^.!]*\?)/g;
    let match;
    while ((match = questionPattern.exec(msg.content)) !== null) {
      const question = match[1].trim();
      if (question.length > 15 && question.length < 200) {
        questions.push(question);
      }
    }
  }

  return questions.slice(0, 10);
}

/**
 * Build complete structured context from messages
 */
export function buildStructuredContext(messages: ChatMessage[]): StructuredAppContext {
  const features = extractFeatures(messages);
  const roles = extractRoles(messages);
  const workflows = extractWorkflows(messages);
  const technicalSpecs = extractTechnicalSpecs(messages);
  const decisions = extractDecisions(messages);
  const openQuestions = extractOpenQuestions(messages);

  // Determine confidence based on extraction quality
  const totalExtractions = features.length + roles.length + workflows.length + technicalSpecs.length;
  const confidence: 'high' | 'medium' | 'low' =
    totalExtractions > 10 ? 'high' : totalExtractions > 5 ? 'medium' : 'low';

  return {
    features,
    roles,
    workflows,
    technicalSpecs,
    uiPatterns: [], // Would need more specific UI discussion analysis
    constraints: extractConstraints(messages.map((m) => m.content).join('\n'), ''),
    decisions,
    openQuestions,
    extractionMetadata: {
      messagesAnalyzed: messages.length,
      extractedAt: new Date().toISOString(),
      confidence,
    },
  };
}

/**
 * Convert structured context to a compact summary string
 */
export function structuredContextToSummary(context: StructuredAppContext): string {
  const parts: string[] = [];

  if (context.features.length > 0) {
    parts.push('=== Features ===');
    for (const feature of context.features.slice(0, 10)) {
      parts.push(`• ${feature.name} [${feature.priority}/${feature.estimatedComplexity}]`);
      if (feature.description) {
        parts.push(`  ${feature.description.slice(0, 100)}`);
      }
    }
  }

  if (context.roles.length > 0) {
    parts.push('\n=== User Roles ===');
    for (const role of context.roles) {
      parts.push(`• ${role.name}`);
      if (role.capabilities.length > 0) {
        parts.push(`  Can: ${role.capabilities.slice(0, 3).join(', ')}`);
      }
    }
  }

  if (context.technicalSpecs.length > 0) {
    parts.push('\n=== Technical Requirements ===');
    for (const spec of context.technicalSpecs) {
      parts.push(`• ${spec.category}: ${spec.requirement}`);
    }
  }

  if (context.decisions.length > 0) {
    parts.push('\n=== Decisions Made ===');
    for (const decision of context.decisions.slice(0, 5)) {
      parts.push(`• ${decision}`);
    }
  }

  if (context.openQuestions.length > 0) {
    parts.push('\n=== Open Questions ===');
    for (const question of context.openQuestions.slice(0, 3)) {
      parts.push(`• ${question}`);
    }
  }

  return parts.join('\n');
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function normalizeFeatureName(name: string): string {
  return name
    .replace(/^(a|an|the)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function normalizeRoleName(name: string): string {
  return capitalizeFirst(
    name
      .replace(/^(a|an|the)\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function extractContext(text: string, position: number, radius: number): string {
  const start = Math.max(0, position - radius);
  const end = Math.min(text.length, position + radius);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

function extractFeatureContext(text: string, position: number, radius: number): string {
  return extractContext(text, position, radius);
}

function extractUserStories(content: string, featureName: string): string[] {
  const stories: string[] = [];
  const pattern = new RegExp(
    `(?:as a|when|user (?:can|wants to|needs to))\\s+[^.]*${escapeRegex(featureName)}[^.]*`,
    'gi'
  );
  let match;
  while ((match = pattern.exec(content)) !== null) {
    stories.push(match[0].trim());
  }
  return stories.slice(0, 5);
}

function extractAcceptanceCriteria(content: string, featureName: string): string[] {
  const criteria: string[] = [];
  const pattern = new RegExp(`(?:should|must|needs to)\\s+[^.]*${escapeRegex(featureName)}[^.]*`, 'gi');
  let match;
  while ((match = pattern.exec(content)) !== null) {
    criteria.push(match[0].trim());
  }
  return criteria.slice(0, 5);
}

function extractTechnicalNotes(content: string, featureName: string): string[] {
  const notes: string[] = [];
  const techKeywords = ['api', 'database', 'backend', 'frontend', 'integration', 'endpoint'];
  for (const keyword of techKeywords) {
    const pattern = new RegExp(`${keyword}[^.]*${escapeRegex(featureName)}[^.]*`, 'gi');
    let match;
    while ((match = pattern.exec(content)) !== null) {
      notes.push(match[0].trim());
    }
  }
  return notes.slice(0, 5);
}

function extractUIRequirements(content: string, featureName: string): string[] {
  const requirements: string[] = [];
  const uiKeywords = ['button', 'form', 'modal', 'page', 'screen', 'component', 'display', 'show'];
  for (const keyword of uiKeywords) {
    const pattern = new RegExp(`${keyword}[^.]*${escapeRegex(featureName)}[^.]*`, 'gi');
    let match;
    while ((match = pattern.exec(content)) !== null) {
      requirements.push(match[0].trim());
    }
  }
  return requirements.slice(0, 5);
}

function extractDataRequirements(content: string, featureName: string): string[] {
  const requirements: string[] = [];
  const dataKeywords = ['store', 'save', 'data', 'field', 'table', 'record', 'model'];
  for (const keyword of dataKeywords) {
    const pattern = new RegExp(`${keyword}[^.]*${escapeRegex(featureName)}[^.]*`, 'gi');
    let match;
    while ((match = pattern.exec(content)) !== null) {
      requirements.push(match[0].trim());
    }
  }
  return requirements.slice(0, 5);
}

function detectPriority(content: string, featureName: string): 'high' | 'medium' | 'low' {
  const featureContext = content.toLowerCase();
  const featureLower = featureName.toLowerCase();

  // Check for priority indicators near the feature name
  const highPattern = new RegExp(`(must.?have|essential|critical|important|priority)[^.]*${escapeRegex(featureLower)}`, 'i');
  const lowPattern = new RegExp(`(nice.?to.?have|optional|later|future|maybe)[^.]*${escapeRegex(featureLower)}`, 'i');

  if (highPattern.test(featureContext)) return 'high';
  if (lowPattern.test(featureContext)) return 'low';
  return 'medium';
}

function detectComplexity(content: string, featureName: string): 'simple' | 'moderate' | 'complex' {
  const featureContext = content.toLowerCase();
  const featureLower = featureName.toLowerCase();

  const complexPattern = new RegExp(`(complex|advanced|sophisticated|integration|api|real.?time)[^.]*${escapeRegex(featureLower)}`, 'i');
  const simplePattern = new RegExp(`(simple|basic|straightforward|easy)[^.]*${escapeRegex(featureLower)}`, 'i');

  if (complexPattern.test(featureContext)) return 'complex';
  if (simplePattern.test(featureContext)) return 'simple';
  return 'moderate';
}

function extractDependencies(content: string, featureName: string): string[] {
  const dependencies: string[] = [];
  const pattern = new RegExp(`${escapeRegex(featureName)}[^.]*(?:requires|needs|depends on|after)\\s+([^.]+)`, 'gi');
  let match;
  while ((match = pattern.exec(content)) !== null) {
    dependencies.push(match[1].trim());
  }
  return dependencies.slice(0, 5);
}

function extractRoleCapabilities(content: string, roleName: string): string[] {
  const capabilities: string[] = [];
  const pattern = new RegExp(`${escapeRegex(roleName)}s?\\s+(?:can|able to|allowed to)\\s+([^.]+)`, 'gi');
  let match;
  while ((match = pattern.exec(content)) !== null) {
    capabilities.push(match[1].trim());
  }
  return capabilities.slice(0, 10);
}

function extractRolePermissions(content: string, roleName: string): string[] {
  const permissions: string[] = [];
  const pattern = new RegExp(`${escapeRegex(roleName)}s?\\s+(?:has|have)\\s+(?:access to|permission to)\\s+([^.]+)`, 'gi');
  let match;
  while ((match = pattern.exec(content)) !== null) {
    permissions.push(match[1].trim());
  }
  return permissions.slice(0, 10);
}

function extractRoleRestrictions(content: string, roleName: string): string[] {
  const restrictions: string[] = [];
  const pattern = new RegExp(`${escapeRegex(roleName)}s?\\s+(?:cannot|can't|not allowed to)\\s+([^.]+)`, 'gi');
  let match;
  while ((match = pattern.exec(content)) !== null) {
    restrictions.push(match[1].trim());
  }
  return restrictions.slice(0, 10);
}

function extractRoleWorkflows(content: string, roleName: string): string[] {
  const workflows: string[] = [];
  const pattern = new RegExp(`${escapeRegex(roleName)}s?\\s+(?:will|should|needs to)\\s+([^.]+)`, 'gi');
  let match;
  while ((match = pattern.exec(content)) !== null) {
    workflows.push(match[1].trim());
  }
  return workflows.slice(0, 10);
}

function extractInvolvedRoles(content: string, contextText: string): string[] {
  const roles: string[] = [];
  const commonRoles = ['admin', 'user', 'guest', 'moderator', 'editor', 'viewer', 'manager', 'owner'];

  for (const role of commonRoles) {
    if (new RegExp(`\\b${role}s?\\b`, 'i').test(contextText)) {
      roles.push(capitalizeFirst(role));
    }
  }

  return roles;
}

function extractConstraints(content: string, category: string): string[] {
  const constraints: string[] = [];
  const constraintPatterns = [
    /(?:must not|cannot|should not|don't|avoid)\s+([^.]+)/gi,
    /(?:limit|maximum|minimum|at least|at most)\s+([^.]+)/gi,
    /(?:only|exclusively|restricted to)\s+([^.]+)/gi,
  ];

  for (const pattern of constraintPatterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const constraint = match[1].trim();
      if (constraint.length > 5 && constraint.length < 100) {
        constraints.push(constraint);
      }
    }
  }

  return constraints.slice(0, 10);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

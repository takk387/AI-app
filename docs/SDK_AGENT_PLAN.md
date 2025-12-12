# SDK Agent Integration Plan

> For AI App Builder
> Status: Planning
> Priority: Enhancement (post-core features)

---

## Overview

This document outlines the plan for integrating Claude Agent SDK agents into the AI App Builder. The agents complement the existing sophisticated system at the **edges** without replacing core functionality.

---

## Agent Specifications

### 1. Build Agent (High Priority)

**Purpose:** Convert approved Sandpack preview into a real, runnable project

**Trigger:** User clicks "Build for Real" after approving Sandpack preview

**Input:**

- `GeneratedComponent` (validated code from existing pipeline)
- Output directory path
- Optional: deployment target

**Tools Required:**

- `Write` - Create project files
- `Bash` - Run npm install, npm build
- `Read` - Verify file contents

**Implementation:**

```typescript
// src/agents/SDKBuildAgent.ts
import { query } from '@anthropic-ai/claude-agent-sdk';
import type { GeneratedComponent } from '@/types/aiBuilderTypes';

export interface BuildResult {
  success: boolean;
  outputPath: string;
  filesCreated: string[];
  buildOutput: string;
  errors?: string[];
}

export async function buildRealProject(
  component: GeneratedComponent,
  outputPath: string,
  onProgress: (msg: string) => void
): Promise<BuildResult> {
  const appData = JSON.parse(component.code);
  const filesCreated: string[] = [];
  const errors: string[] = [];

  for await (const msg of query({
    prompt: `
      Create a production-ready project from this validated specification.

      ## Pre-validation Status
      The code has already been:
      - Validated by Tree-sitter AST analysis
      - Auto-fixed by AutoFixEngine
      - Quality reviewed by CodeReviewService (5 analyzers)
      - User-approved in Sandpack preview

      ## Project Details
      - Name: ${component.name}
      - Files: ${appData.files?.length || 0} files
      - Framework: Next.js 14+ with App Router

      ## Tasks
      1. Create project structure at ${outputPath}
      2. Write package.json with all dependencies
      3. Write all source files exactly as specified
      4. Run \`npm install\`
      5. Run \`npm run build\`
      6. If build errors occur, report them (do not attempt to fix - code is pre-validated)
      7. Report final status

      ## File Specifications
      ${
        appData.files
          ?.map(
            (f: { path: string; content: string }) =>
              `### ${f.path}\n\`\`\`\n${f.content.slice(0, 500)}${f.content.length > 500 ? '\n...(truncated)' : ''}\n\`\`\``
          )
          .join('\n\n') || 'No files provided'
      }
    `,
    options: {
      allowedTools: ['Write', 'Bash', 'Read'],
      cwd: outputPath,
      permissionMode: 'acceptEdits',
      maxTurns: 50,
    },
  })) {
    if (msg.type === 'assistant' && msg.message?.content) {
      for (const block of msg.message.content) {
        if ('text' in block) {
          onProgress(block.text);
        } else if ('name' in block) {
          const input = block.input as Record<string, unknown>;
          if (block.name === 'Write') {
            filesCreated.push(input.file_path as string);
          }
        }
      }
    } else if (msg.type === 'result' && msg.subtype === 'error') {
      errors.push(msg.error || 'Unknown error');
    }
  }

  return {
    success: errors.length === 0,
    outputPath,
    filesCreated,
    buildOutput: '', // Captured from Bash output
    errors: errors.length > 0 ? errors : undefined,
  };
}
```

**UI Integration:**

- Add "Build for Real" button to `PreviewPanel.tsx`
- Show progress modal with streaming output
- Display result with download/open options

---

### 2. Test Agent (High Priority)

**Purpose:** Generate and execute tests based on phase testCriteria

**Trigger:** After phase completion or on-demand via UI

**Input:**

- `PhaseExecutionResult` with testCriteria
- `AppConcept` with roles and workflows
- Generated code

**Tools Required:**

- `Read` - Read existing code
- `Write` - Create test files
- `Edit` - Modify existing tests
- `Bash` - Run npm test

**Implementation:**

```typescript
// src/agents/SDKTestAgent.ts
import { query } from '@anthropic-ai/claude-agent-sdk';
import type { PhaseExecutionResult } from '@/types/dynamicPhases';
import type { AppConcept } from '@/types/appConcept';

export interface TestResult {
  success: boolean;
  testsCreated: string[];
  testsPassed: number;
  testsFailed: number;
  coverage?: number;
  failureDetails?: string[];
}

export async function generateAndRunTests(
  phaseResult: PhaseExecutionResult,
  concept: AppConcept,
  projectPath: string,
  onProgress: (msg: string) => void
): Promise<TestResult> {
  const testsCreated: string[] = [];

  for await (const msg of query({
    prompt: `
      Generate and execute tests for Phase ${phaseResult.phaseNumber}: ${phaseResult.phaseName}

      ## Test Criteria (from phase plan)
      ${phaseResult.testCriteria?.map((t, i) => `${i + 1}. ${t}`).join('\n') || 'No specific criteria'}

      ## User Roles to Test
      ${concept.roles?.map((r) => `- ${r.name}: ${r.capabilities.join(', ')}`).join('\n') || 'No specific roles'}

      ## Workflows to Test
      ${concept.workflows?.map((w) => `- ${w.name}: ${w.steps.join(' → ')}`).join('\n') || 'No specific workflows'}

      ## Generated Files
      ${phaseResult.generatedFiles?.join('\n') || 'See existing code'}

      ## Tasks
      1. Read the generated code to understand implementation
      2. Create __tests__ directory if needed
      3. Write unit tests for utility functions
      4. Write component tests for React components (React Testing Library)
      5. Write integration tests for API routes
      6. Ensure tests cover the test criteria above
      7. Run \`npm test -- --coverage\`
      8. If tests fail, report failures (do not modify source code)
      9. Report coverage percentage

      ## Test Framework
      - Jest
      - @testing-library/react
      - Follow existing test patterns if present
    `,
    options: {
      allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob'],
      cwd: projectPath,
      permissionMode: 'acceptEdits',
      maxTurns: 40,
    },
  })) {
    if (msg.type === 'assistant' && msg.message?.content) {
      for (const block of msg.message.content) {
        if ('text' in block) {
          onProgress(block.text);
        } else if ('name' in block && block.name === 'Write') {
          const input = block.input as Record<string, unknown>;
          if ((input.file_path as string)?.includes('test')) {
            testsCreated.push(input.file_path as string);
          }
        }
      }
    }
  }

  return {
    success: true, // Parse from actual test output
    testsCreated,
    testsPassed: 0, // Parse from npm test output
    testsFailed: 0,
    coverage: undefined,
  };
}
```

**UI Integration:**

- Add "Generate Tests" button to PhasedBuildPanel
- Show test results in QualityReport modal
- Integrate with CodeReviewService pipeline

---

### 3. Design Verification Agent (Medium Priority)

**Purpose:** Verify generated code uses exact LayoutDesign tokens

**Trigger:** After phase completion or final build

**Input:**

- Generated code
- `LayoutDesign` with exact specifications

**Tools Required:**

- `Read` - Read generated files
- `Grep` - Search for patterns
- `Glob` - Find relevant files

**Implementation:**

```typescript
// src/agents/SDKDesignVerifier.ts
import { query } from '@anthropic-ai/claude-agent-sdk';
import type { LayoutDesign } from '@/types/layoutDesign';

export interface DesignVerificationResult {
  compliant: boolean;
  colorDeviations: Array<{ file: string; expected: string; found: string }>;
  typographyDeviations: Array<{ file: string; issue: string }>;
  spacingDeviations: Array<{ file: string; issue: string }>;
  recommendations: string[];
}

export async function verifyDesignFidelity(
  projectPath: string,
  layoutDesign: LayoutDesign,
  onProgress: (msg: string) => void
): Promise<DesignVerificationResult> {
  const { globalStyles, components } = layoutDesign;

  for await (const msg of query({
    prompt: `
      Verify this codebase implements the design system exactly.

      ## Color Specifications (EXACT hex values required)
      - Primary: ${globalStyles?.colors?.primary || 'not specified'}
      - Secondary: ${globalStyles?.colors?.secondary || 'not specified'}
      - Accent: ${globalStyles?.colors?.accent || 'not specified'}
      - Background: ${globalStyles?.colors?.background || 'not specified'}
      - Surface: ${globalStyles?.colors?.surface || 'not specified'}
      - Text: ${globalStyles?.colors?.text || 'not specified'}
      - Text Muted: ${globalStyles?.colors?.textMuted || 'not specified'}
      - Border: ${globalStyles?.colors?.border || 'not specified'}

      ## Typography Specifications
      - Font Family: ${globalStyles?.typography?.fontFamily || 'not specified'}
      - Heading Weight: ${globalStyles?.typography?.headingWeight || 'not specified'}
      - Body Weight: ${globalStyles?.typography?.bodyWeight || 'not specified'}
      - Heading Size: ${globalStyles?.typography?.headingSize || 'not specified'}
      - Body Size: ${globalStyles?.typography?.bodySize || 'not specified'}

      ## Effects Specifications
      - Border Radius: ${globalStyles?.effects?.borderRadius || 'not specified'}
      - Shadows: ${globalStyles?.effects?.shadows || 'not specified'}

      ## Component Specifications
      ${components?.header ? `- Header Height: ${components.header.height}` : ''}
      ${components?.card ? `- Card Style: ${components.card.style}` : ''}

      ## Tasks
      1. Find all .tsx and .css files in src/
      2. Search for color values (hex codes, Tailwind classes)
      3. Check if colors match the specification
      4. Search for font-family, font-weight declarations
      5. Check border-radius usage
      6. Report ANY deviations from the spec
      7. Provide specific file:line references for each deviation
      8. Suggest corrections

      ## Output Format
      Report findings as:
      - COMPLIANT: [description]
      - DEVIATION: [file:line] Expected [X], found [Y]
      - RECOMMENDATION: [suggestion]
    `,
    options: {
      allowedTools: ['Read', 'Grep', 'Glob'],
      cwd: projectPath,
      permissionMode: 'bypassPermissions',
      maxTurns: 30,
    },
  })) {
    if (msg.type === 'assistant' && msg.message?.content) {
      for (const block of msg.message.content) {
        if ('text' in block) {
          onProgress(block.text);
        }
      }
    }
  }

  return {
    compliant: true, // Parse from agent output
    colorDeviations: [],
    typographyDeviations: [],
    spacingDeviations: [],
    recommendations: [],
  };
}
```

**UI Integration:**

- Add to CodeReviewService pipeline
- Show in QualityReport modal
- Highlight deviations in code view

---

### 4. Deployment Agent (Medium Priority)

**Purpose:** Automate deployment to various platforms

**Trigger:** User clicks "Deploy" after successful build

**Input:**

- Project path
- Target platform (vercel, railway, netlify)
- Environment configuration

**Tools Required:**

- `Bash` - Run CLI commands
- `Read` - Read config files
- `Edit` - Modify config if needed

**Implementation:**

```typescript
// src/agents/SDKDeployAgent.ts
import { query } from '@anthropic-ai/claude-agent-sdk';

export type DeploymentPlatform = 'vercel' | 'railway' | 'netlify';

export interface DeploymentResult {
  success: boolean;
  platform: DeploymentPlatform;
  url?: string;
  buildLogs: string;
  errors?: string[];
}

export async function deployProject(
  projectPath: string,
  platform: DeploymentPlatform,
  onProgress: (msg: string) => void
): Promise<DeploymentResult> {
  const platformCommands = {
    vercel: 'npx vercel --prod --yes',
    railway: 'railway up',
    netlify: 'npx netlify deploy --prod',
  };

  for await (const msg of query({
    prompt: `
      Deploy this project to ${platform}.

      ## Pre-deployment Checks
      1. Verify the build succeeds: \`npm run build\`
      2. Run tests: \`npm test\` (continue even if some fail)
      3. Check for .env.example and warn about missing env vars

      ## Deployment
      4. Run: \`${platformCommands[platform]}\`
      5. Capture the deployment URL from output

      ## Post-deployment
      6. Verify the deployed URL is accessible (if possible)
      7. Report the final URL

      ## Error Handling
      - If build fails, report errors and stop
      - If deployment fails, attempt ONE retry
      - Report all errors clearly

      ## Output
      Provide:
      - Build status
      - Test status
      - Deployment URL (if successful)
      - Any warnings or errors
    `,
    options: {
      allowedTools: ['Bash', 'Read', 'Edit'],
      cwd: projectPath,
      permissionMode: 'acceptEdits',
      maxTurns: 30,
    },
  })) {
    if (msg.type === 'assistant' && msg.message?.content) {
      for (const block of msg.message.content) {
        if ('text' in block) {
          onProgress(block.text);
        }
      }
    }
  }

  return {
    success: true, // Parse from output
    platform,
    url: undefined, // Parse from deployment output
    buildLogs: '',
  };
}
```

**UI Integration:**

- Enhance DeploymentModal
- Add platform selection
- Show deployment progress with logs
- Display final URL with copy button

---

### 5. Sandpack Backend Agent (Future)

**Purpose:** Run actual API routes for Sandpack webhook integration

**Status:** Planned for when Sandpack webhooks are implemented

**Implementation:** TBD based on webhook architecture

---

## File Structure

```
src/
├── agents/
│   ├── index.ts              # Exports all agents
│   ├── SDKBuildAgent.ts
│   ├── SDKTestAgent.ts
│   ├── SDKDesignVerifier.ts
│   ├── SDKDeployAgent.ts
│   └── types.ts              # Shared agent types
├── hooks/
│   └── useSDKAgents.ts       # React hook for agent management
├── components/
│   └── modals/
│       └── AgentProgressModal.tsx  # Shared progress UI
└── config/
    └── agentConfig.ts        # Agent configuration
```

---

## Configuration

```typescript
// src/config/agentConfig.ts
export interface AgentConfig {
  enabled: boolean;
  permissionMode: 'default' | 'acceptEdits' | 'bypassPermissions';
  maxTurns: number;
  timeout?: number;
}

export const SDK_AGENT_CONFIG = {
  buildAgent: {
    enabled: true,
    permissionMode: 'acceptEdits' as const,
    maxTurns: 50,
    timeout: 300000, // 5 minutes
  },
  testAgent: {
    enabled: true,
    permissionMode: 'acceptEdits' as const,
    maxTurns: 40,
    timeout: 180000, // 3 minutes
  },
  designVerifier: {
    enabled: true,
    permissionMode: 'bypassPermissions' as const,
    maxTurns: 30,
    timeout: 120000, // 2 minutes
  },
  deployAgent: {
    enabled: true,
    permissionMode: 'acceptEdits' as const,
    maxTurns: 30,
    timeout: 300000, // 5 minutes
    supportedPlatforms: ['vercel', 'railway', 'netlify'] as const,
  },
};
```

---

## React Hook

```typescript
// src/hooks/useSDKAgents.ts
import { useState, useCallback } from 'react';
import { buildRealProject } from '@/agents/SDKBuildAgent';
import { generateAndRunTests } from '@/agents/SDKTestAgent';
import { verifyDesignFidelity } from '@/agents/SDKDesignVerifier';
import { deployProject } from '@/agents/SDKDeployAgent';
import type { GeneratedComponent } from '@/types/aiBuilderTypes';
import type { PhaseExecutionResult } from '@/types/dynamicPhases';
import type { AppConcept } from '@/types/appConcept';
import type { LayoutDesign } from '@/types/layoutDesign';

export function useSDKAgents() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);

  const addProgress = useCallback((msg: string) => {
    setProgress((prev) => [...prev, msg]);
  }, []);

  const runBuildAgent = useCallback(
    async (component: GeneratedComponent, outputPath: string) => {
      setIsRunning(true);
      setCurrentAgent('build');
      setProgress([]);

      try {
        const result = await buildRealProject(component, outputPath, addProgress);
        return result;
      } finally {
        setIsRunning(false);
        setCurrentAgent(null);
      }
    },
    [addProgress]
  );

  const runTestAgent = useCallback(
    async (phaseResult: PhaseExecutionResult, concept: AppConcept, projectPath: string) => {
      setIsRunning(true);
      setCurrentAgent('test');
      setProgress([]);

      try {
        const result = await generateAndRunTests(phaseResult, concept, projectPath, addProgress);
        return result;
      } finally {
        setIsRunning(false);
        setCurrentAgent(null);
      }
    },
    [addProgress]
  );

  const runDesignVerifier = useCallback(
    async (projectPath: string, layoutDesign: LayoutDesign) => {
      setIsRunning(true);
      setCurrentAgent('designVerify');
      setProgress([]);

      try {
        const result = await verifyDesignFidelity(projectPath, layoutDesign, addProgress);
        return result;
      } finally {
        setIsRunning(false);
        setCurrentAgent(null);
      }
    },
    [addProgress]
  );

  const runDeployAgent = useCallback(
    async (projectPath: string, platform: 'vercel' | 'railway' | 'netlify') => {
      setIsRunning(true);
      setCurrentAgent('deploy');
      setProgress([]);

      try {
        const result = await deployProject(projectPath, platform, addProgress);
        return result;
      } finally {
        setIsRunning(false);
        setCurrentAgent(null);
      }
    },
    [addProgress]
  );

  return {
    isRunning,
    progress,
    currentAgent,
    runBuildAgent,
    runTestAgent,
    runDesignVerifier,
    runDeployAgent,
    clearProgress: () => setProgress([]),
  };
}
```

---

## Implementation Phases

### Phase 1: Foundation

1. Create `src/agents/` directory structure
2. Implement `SDKBuildAgent.ts`
3. Create `useSDKAgents.ts` hook
4. Add `AgentProgressModal.tsx`
5. Integrate "Build for Real" button in PreviewPanel

### Phase 2: Testing

1. Implement `SDKTestAgent.ts`
2. Integrate with useDynamicBuildPhases
3. Add test results to QualityReport

### Phase 3: Quality

1. Implement `SDKDesignVerifier.ts`
2. Integrate with CodeReviewService
3. Add design compliance to reports

### Phase 4: Deployment

1. Implement `SDKDeployAgent.ts`
2. Enhance DeploymentModal
3. Add platform selection and progress

### Phase 5: Future

1. Sandpack webhook backend (when ready)
2. Additional specialized agents as needed

---

## Dependencies

```json
{
  "dependencies": {
    "@anthropic-ai/claude-agent-sdk": "^1.x.x"
  }
}
```

Already installed via `npm install @anthropic-ai/claude-agent-sdk`

---

## Notes

- All agents run client-side with user's API key
- Agents complement, don't replace, existing validation
- Permission modes are configurable per agent
- Progress streaming provides real-time feedback
- Error handling preserves existing code (no auto-fixes in agents)

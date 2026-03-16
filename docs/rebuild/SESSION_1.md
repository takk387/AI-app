# Session 1: BuilderProvider (Context Engine)

## Your Job

Build `src/contexts/BuilderContext.tsx` — the context provider that replaces `MainBuilderView.tsx`'s 21 hook calls and 85+ store destructures. Every UI component in the rebuild will consume this via `useBuilder()`. No UI in this session — provider only.

This is the hardest session. Take your time.

## Read These Files First

1. `src/hooks/useSendMessage.ts` — current message routing (PLAN/ACT split, you're unifying this)
2. `src/hooks/useSendMessageHandlers.ts` — build/modify/design trigger handlers
3. `src/hooks/useDynamicBuildPhases.ts` — phase execution state machine
4. `src/hooks/usePhaseExecution.ts` — tryStartPhase1, auto-advance
5. `src/prompts/builderExpertPrompt.ts` — current ACT mode system prompt
6. `src/store/useAppStore.ts` — just the type exports and selector patterns (don't read all 500 lines, just the interface)

## What BuilderContext.tsx Must Do

### 1. Call existing hooks internally

```typescript
// Inside BuilderProvider:
const dynamicPhases = useDynamicBuildPhases();
const versionControl = useVersionControl();
const databaseSync = useDatabaseSync();
const keyboardShortcuts = useKeyboardShortcuts();
const fileStorage = useFileStorage();
const messageSender = useMessageSender();
const builderHandlers = useBuilderHandlers();
const phaseExecution = usePhaseExecution();
const builderEffects = useBuilderEffects();
const streaming = useStreamingGeneration();
const projectDocs = useProjectDocumentation();
const appCrud = useAppCrud();
const branchMgmt = useBranchManagement();
const conceptSync = useConceptSync();
const conceptUpdates = useConceptUpdates();
const appBuilderSync = useAppBuilderSync();
```

### 2. Implement the context engine

The core innovation: `sendMessage()` detects intent and assembles ONLY relevant context.

```typescript
async function sendMessage(text: string) {
  // Add user message to chat
  addMessage({ role: 'user', content: text });
  setIsGenerating(true);

  // Detect intent
  const intent = detectIntent(text);

  // Assemble focused context for this intent
  const context = assembleContext(intent, text);

  // Route to handler
  switch (intent) {
    case 'BUILD':
      if (isPhaseReference(text)) {
        await dynamicPhases.executePhase(extractPhaseNumber(text));
      } else {
        await streaming.generate({ ...context, prompt: text });
      }
      break;
    case 'MODIFY':
      await handleModify(context, text);
      break;
    case 'DEBUG':
      await handleDebug(context, text);
      break;
    case 'CONCEPT':
      await handleConceptUpdate(text);
      break;
    default:
      await handleQuestion(context, text);
  }

  setIsGenerating(false);
}
```

### 3. Intent detection (keep it simple)

```typescript
function detectIntent(text: string): IntentType {
  const lower = text.toLowerCase();

  // Phase references
  if (/build phase \d|start phase \d|execute phase \d/i.test(lower)) return 'BUILD';
  if (/^(build|create|generate|make)\s/i.test(lower)) return 'BUILD';

  // Modify
  if (/^(change|fix|update|modify|replace|move|add .* to)\s/i.test(lower)) return 'MODIFY';

  // Debug
  if (
    consoleErrors.length > 0 &&
    /(error|broken|not working|crash|blank|white screen)/i.test(lower)
  )
    return 'DEBUG';
  if (/^(why is|debug|what's wrong|investigate)\s/i.test(lower)) return 'DEBUG';

  // Concept
  if (/^(add .* feature|rename|change the name|update the description)/i.test(lower))
    return 'CONCEPT';

  // Default: let the API classify it
  return 'QUESTION';
}
```

### 4. Context assembly (focused, not everything)

```typescript
function assembleContext(intent: IntentType, text: string) {
  // Always include: 5-line project summary
  const base = {
    projectSummary: buildProjectSummary(appConcept), // name, stack, description
  };

  switch (intent) {
    case 'BUILD':
      return {
        ...base,
        phaseContext: getCurrentPhaseContext(),
        designTokens: getDesignTokens(),
        layoutManifest: getRelevantLayout(text),
      };
    case 'MODIFY':
      return {
        ...base,
        currentFiles: getRelevantFiles(text), // only files related to the request
        designTokens: getDesignTokens(),
      };
    case 'DEBUG':
      return {
        ...base,
        currentFiles: getRelevantFiles(text),
        consoleErrors: consoleErrors,
      };
    case 'QUESTION':
      return {
        ...base,
        relevantPhase: findRelevantPhase(text),
        relevantFiles: getRelevantFiles(text),
      };
    case 'CONCEPT':
      return { ...base }; // minimal - just updating the store
    default:
      return base;
  }
}
```

### 5. Expose via useBuilder()

```typescript
export interface BuilderContextValue {
  // Chat
  messages: ChatMessage[];
  sendMessage: (text: string) => void;
  isGenerating: boolean;
  generationProgress: string;
  lastIntent: IntentType | null;

  // Phases
  phases: DynamicPhase[];
  currentPhase: DynamicPhase | null;
  phaseProgress: BuildProgress;
  isBuilding: boolean;
  isPaused: boolean;
  startBuilding: () => void;
  pauseBuild: () => void;
  resumeBuild: () => void;
  skipPhase: (n: number) => void;
  retryPhase: (n: number) => void;

  // Preview
  currentComponent: GeneratedComponent | null;
  activeTab: 'preview' | 'code';
  setActiveTab: (tab: 'preview' | 'code') => void;
  consoleErrors: ConsoleEntry[];

  // Version Control
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;

  // Concept
  appConcept: AppConcept | null;
  updateConcept: (path: string, value: unknown) => void;

  // Actions
  exportApp: () => void;
  downloadCode: () => void;
  deployApp: () => void;
  uploadImage: (file: File) => void;
  capturePreview: () => Promise<void>;

  // Modals
  openModal: (modal: ModalType) => void;
  closeModal: () => void;
  activeModal: ModalType | null;

  // Concept Drawer
  isConceptDrawerOpen: boolean;
  toggleConceptDrawer: () => void;

  // Debug
  debugLog: DebugEntry[];
}
```

### 6. Phase integrity checks

After each phase completes, call:

```typescript
// In the phase completion callback:
await phaseExecution.detectFileConflicts();
await phaseExecution.validateImportExports();
```

### 7. Debug tracking

After each API call:

```typescript
trackDebug({
  type: 'api_request',
  endpoint,
  intent,
  tokensUsed: response.tokensUsed,
  duration: Date.now() - startTime,
});
```

## Verify

Create a temporary test page that renders `<BuilderProvider>` with a child that calls `useBuilder()` and logs the return value. All fields should resolve without errors.

```bash
npm run typecheck
npm run lint
```

## Do NOT

- Create any UI components
- Modify existing hooks (wrap them, don't rewrite them)
- Modify existing services or API routes
- Touch `MainBuilderView.tsx`
- Add more than ~30 lines to the in-app AI system prompt

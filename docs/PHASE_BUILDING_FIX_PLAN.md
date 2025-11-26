# Phase Building Fix Plan

## 1. Overview

This document outlines the plan to fix the **phase building system** which currently has reliability issues causing it to fail silently and fall back to single-build mode.

### Solution Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE BUILDING FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User Request                                                   │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │ Complexity  │────▶│ Plan Phases │────▶│   Parse     │       │
│  │ Detection   │     │    API      │     │  Response   │       │
│  └─────────────┘     └─────────────┘     └─────────────┘       │
│                             │                   │               │
│                             │                   ▼               │
│                             │           ┌─────────────┐         │
│                             │           │   Retry?    │         │
│                             │           └─────────────┘         │
│                             │                   │               │
│                             ▼                   ▼               │
│                      ┌─────────────┐     ┌─────────────┐       │
│                      │  Estimate   │     │  Fallback   │       │
│                      │ Complexity  │     │   Parser    │       │
│                      └─────────────┘     └─────────────┘       │
│                             │                                   │
│                             ▼                                   │
│                      ┌─────────────┐                           │
│                      │ Auto-Split  │                           │
│                      │ if needed   │                           │
│                      └─────────────┘                           │
│                             │                                   │
│                             ▼                                   │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │  Phase 1    │────▶│  Phase 2    │────▶│  Phase N    │       │
│  │   Build     │     │   Build     │     │   Build     │       │
│  │ (foundation)│     │ (+ context) │     │ (+ context) │       │
│  └─────────────┘     └─────────────┘     └─────────────┘       │
│        │                   │                   │               │
│        ▼                   ▼                   ▼               │
│  ┌─────────────────────────────────────────────────────┐       │
│  │          Truncation Detection & Recovery            │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Current Issues

### Issue 1: Fragile Regex Parsing

**Location:** `/src/app/api/ai-builder/plan-phases/route.ts`

**Current Code:**
```typescript
const phaseMatches = responseText.matchAll(
  /===PHASE:(\d+)===\s*NAME:\s*(.+?)\s*DESCRIPTION:\s*(.+?)\s*FEATURES:\s*([\s\S]*?)(?===PHASE:|===END_PHASES===)/g
);
```

**Problem:** 
- Regex is extremely strict - any deviation causes complete failure
- Single-line matching for NAME/DESCRIPTION doesn't handle multi-line content
- No fallback if format is slightly different

### Issue 2: No Streaming API

**Current Code:**
```typescript
const completion = await anthropic.messages.create({...});
```

**Problem:**
- Blocks until entire response is ready
- Can timeout on complex planning requests
- No progress feedback to user

### Issue 3: Weak Error Handling & Retry

**Current Code:**
```typescript
if (phases.length === 0) {
  throw new Error('Failed to extract phases from response');
}
```

**Problem:**
- Generic error message doesn't help debugging
- No retry with correction prompt
- User sees cryptic error

### Issue 4: Poor Conversation Context

**Current Code:**
```typescript
conversationHistory.forEach((msg: any) => {
  if (msg.role === 'user' || msg.role === 'assistant') {
    messages.push({...});
  }
});
```

**Problem:**
- System messages filtered out (may contain important context)
- No limit on history size (could exceed context window)
- Important planning context may be lost

### Issue 5: Oversized Phases (No Size Management)

**Problem:**
- No pre-generation complexity estimation
- Phases can timeout (90s limit) or exceed token limit (16K)
- No auto-split for large phases
- No truncation detection or recovery

### Issue 6: Phase 2+ Lacks Context

**Problem:**
- Phase 2 doesn't know what Phase 1 created
- Each phase builds independently instead of incrementally
- Features may be duplicated or lost between phases

---

## 3. Backend Fixes

### Fix 3.1: Flexible Regex + Fallback Parsing

**New Approach:**
```typescript
// Primary regex (strict)
const strictPhaseRegex = /===PHASE:(\d+)===\s*NAME:\s*([^\n]+)\s*DESCRIPTION:\s*([^\n]+(?:\n(?!FEATURES:)[^\n]+)*)\s*FEATURES:\s*([\s\S]*?)(?===PHASE:|===END_PHASES===|$)/g;

// Fallback regex (more lenient)
const lenientPhaseRegex = /Phase\s*(\d+)[:\s]*([^\n]+)\n([\s\S]*?)(?=Phase\s*\d+|$)/gi;

// Try strict first, then fallback
let phases = extractWithRegex(responseText, strictPhaseRegex);
if (phases.length === 0) {
  console.log('Strict parsing failed, trying lenient parser...');
  phases = extractWithRegex(responseText, lenientPhaseRegex);
}

// Final fallback: Ask Claude to reformat
if (phases.length === 0) {
  phases = await reformatWithRetry(responseText, anthropic);
}
```

### Fix 3.2: Streaming API with Timeout

**New Code:**
```typescript
const stream = await anthropic.messages.stream({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 4096,
  temperature: 1,
  thinking: {
    type: 'enabled',
    budget_tokens: 10000
  },
  system: [...],
  messages: messages
});

let responseText = '';
const timeout = 60000; // 60 seconds for phase planning
const startTime = Date.now();

for await (const chunk of stream) {
  if (Date.now() - startTime > timeout) {
    throw new Error('Phase planning timeout - request too complex');
  }
  if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
    responseText += chunk.delta.text;
  }
}
```

### Fix 3.3: Phase Size Management

#### 3.3.1 Pre-Generation Complexity Estimation

```typescript
interface PhaseComplexity {
  level: 'small' | 'medium' | 'large' | 'too_large';
  estimatedTokens: number;
  shouldSplit: boolean;
}

function estimatePhaseComplexity(phase: Phase): PhaseComplexity {
  const featureCount = phase.features.length;
  
  // Complex features that typically require more code
  const complexFeaturePatterns = [
    'authentication', 'auth', 'login', 'signup',
    'database', 'backend', 'api',
    'payment', 'stripe', 'checkout',
    'real-time', 'websocket', 'chat',
    'file upload', 'image', 'storage'
  ];
  
  const complexFeatures = phase.features.filter(f => 
    complexFeaturePatterns.some(pattern => f.toLowerCase().includes(pattern))
  ).length;
  
  // Estimation heuristics
  const baseTokensPerFeature = 1500;
  const complexFeatureMultiplier = 2.5;
  
  const estimatedTokens = 
    (featureCount - complexFeatures) * baseTokensPerFeature +
    complexFeatures * baseTokensPerFeature * complexFeatureMultiplier;
  
  if (estimatedTokens > 14000 || featureCount > 5 || complexFeatures > 1) {
    return { level: 'too_large', estimatedTokens, shouldSplit: true };
  }
  if (estimatedTokens > 10000 || featureCount > 3 || complexFeatures > 0) {
    return { level: 'large', estimatedTokens, shouldSplit: false };
  }
  if (estimatedTokens > 5000 || featureCount > 2) {
    return { level: 'medium', estimatedTokens, shouldSplit: false };
  }
  return { level: 'small', estimatedTokens, shouldSplit: false };
}
```

#### 3.3.2 Auto-Split Large Phases

```typescript
function splitPhaseIfNeeded(phase: Phase): Phase[] {
  const complexity = estimatePhaseComplexity(phase);
  
  if (!complexity.shouldSplit) {
    return [phase];
  }
  
  console.log(`⚠️ Phase ${phase.number} is too large (${complexity.estimatedTokens} estimated tokens). Splitting...`);
  
  // Split features into two groups
  const midpoint = Math.ceil(phase.features.length / 2);
  const featuresA = phase.features.slice(0, midpoint);
  const featuresB = phase.features.slice(midpoint);
  
  return [
    {
      ...phase,
      name: `${phase.name} (Part A)`,
      description: `${phase.description} - Core functionality`,
      features: featuresA,
      status: 'pending'
    },
    {
      number: phase.number + 0.5,
      name: `${phase.name} (Part B)`,
      description: `${phase.description} - Additional features`,
      features: featuresB,
      status: 'pending'
    }
  ];
}
```

#### 3.3.3 Truncation Detection

```typescript
function detectTruncation(responseText: string, files: any[]): {
  isTruncated: boolean;
  reason: string;
  lastCompleteFile: string | null;
} {
  // Check 1: Missing end delimiter
  if (responseText.includes('===FILE:') && !responseText.includes('===END===')) {
    return {
      isTruncated: true,
      reason: 'Missing ===END=== delimiter',
      lastCompleteFile: findLastCompleteFile(files)
    };
  }
  
  // Check 2: Unbalanced braces in any file
  for (const file of files) {
    const openBraces = (file.content.match(/{/g) || []).length;
    const closeBraces = (file.content.match(/}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      return {
        isTruncated: true,
        reason: `Unbalanced braces in ${file.path} (${openBraces} open, ${closeBraces} close)`,
        lastCompleteFile: findLastCompleteFile(files.slice(0, -1))
      };
    }
  }
  
  // Check 3: Incomplete JSX
  for (const file of files) {
    if (file.path.endsWith('.tsx') || file.path.endsWith('.jsx')) {
      const openTags = (file.content.match(/<[A-Z][a-zA-Z]*(?:\s|>)/g) || []).length;
      const closeTags = (file.content.match(/<\/[A-Z][a-zA-Z]*>/g) || []).length;
      const selfClosing = (file.content.match(/<[A-Z][a-zA-Z]*[^>]*\/>/g) || []).length;
      
      if (openTags > closeTags + selfClosing + 2) {
        return {
          isTruncated: true,
          reason: `Incomplete JSX in ${file.path}`,
          lastCompleteFile: findLastCompleteFile(files.slice(0, -1))
        };
      }
    }
  }
  
  return { isTruncated: false, reason: '', lastCompleteFile: null };
}

function findLastCompleteFile(files: any[]): string | null {
  for (let i = files.length - 1; i >= 0; i--) {
    const file = files[i];
    const openBraces = (file.content.match(/{/g) || []).length;
    const closeBraces = (file.content.match(/}/g) || []).length;
    if (openBraces === closeBraces) {
      return file.path;
    }
  }
  return null;
}
```

#### 3.3.4 Graceful Recovery

```typescript
async function handleOversizedPhase(
  phase: Phase,
  error: 'timeout' | 'truncation' | 'token_limit',
  partialResponse?: string
): Promise<Phase[]> {
  console.log(`⚠️ Phase ${phase.number} failed due to ${error}. Attempting recovery...`);
  
  if (error === 'truncation' && partialResponse) {
    const truncationInfo = detectTruncation(partialResponse, []);
    
    if (truncationInfo.lastCompleteFile) {
      const completedFeatures = estimateCompletedFeatures(partialResponse, phase);
      const remainingFeatures = phase.features.filter(f => !completedFeatures.includes(f));
      
      return [{
        ...phase,
        features: remainingFeatures,
        name: `${phase.name} (Continued)`,
        status: 'pending'
      }];
    }
  }
  
  // Default: Split the phase and retry
  return splitPhaseIfNeeded(phase);
}
```

#### 3.3.5 Dynamic Token Budget

```typescript
const tokenBudgetByPhase = {
  // Phase 1 needs more tokens (building foundation)
  foundation: {
    max_tokens: 16384,
    thinking_budget: 16000,
    timeout: 120000  // 2 minutes
  },
  // Later phases need less (additive changes)
  additive: {
    max_tokens: 12000,
    thinking_budget: 10000,
    timeout: 60000   // 1 minute
  }
};

function getTokenBudget(phaseNumber: number) {
  return phaseNumber === 1 
    ? tokenBudgetByPhase.foundation 
    : tokenBudgetByPhase.additive;
}
```

### Fix 3.4: Retry Logic with Correction Prompts

```typescript
async function extractPhasesWithRetry(
  responseText: string,
  anthropic: Anthropic,
  maxRetries: number = 2
): Promise<Phase[]> {
  // Try primary parsing
  let phases = parsePhasesStrict(responseText);
  if (phases.length > 0) return phases;
  
  // Try lenient parsing
  phases = parsePhasesLenient(responseText);
  if (phases.length > 0) return phases;
  
  // Retry with correction prompt
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const correctionResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      temperature: 1,
      messages: [{
        role: 'user',
        content: `Your previous response couldn't be parsed. Please reformat it using EXACTLY this structure:

===TOTAL_PHASES===
[number]
===PHASE:1===
NAME: [name]
DESCRIPTION: [description]
FEATURES:
- [feature 1]
- [feature 2]
===PHASE:2===
...
===END_PHASES===

Original response to reformat:
${responseText.substring(0, 3000)}`
      }]
    });
    
    const reformatted = correctionResponse.content[0].type === 'text' 
      ? correctionResponse.content[0].text 
      : '';
    
    phases = parsePhasesStrict(reformatted);
    if (phases.length > 0) return phases;
  }
  
  throw new Error('Failed to extract phases after retries');
}
```

#### Phase-Specific Retry Prompts (add to retryLogic.ts)

```typescript
// New error category
export type PhaseErrorCategory = ErrorCategory | 'phase_extraction_error' | 'phase_too_large';

// Phase extraction correction prompt
function generatePhaseExtractionPrompt(context: RetryContext): string {
  return `
⚠️ PREVIOUS ATTEMPT FAILED - PHASE EXTRACTION ERROR

**Error**: ${context.previousError}

**Problem**: Your phase plan response could not be parsed.

**REQUIRED FORMAT** (follow EXACTLY):

===TOTAL_PHASES===
[number between 2 and 5]
===PHASE:1===
NAME: [5 words max]
DESCRIPTION: [One sentence, 20 words max]
FEATURES:
- [Feature 1]
- [Feature 2]
===PHASE:2===
NAME: [5 words max]
DESCRIPTION: [One sentence, 20 words max]
FEATURES:
- [Feature 1]
===END_PHASES===

**CRITICAL RULES**:
1. ✅ Start IMMEDIATELY with ===TOTAL_PHASES=== (no preamble)
2. ✅ Use EXACT delimiters shown above
3. ✅ Keep NAME short (5 words max)
4. ✅ Keep DESCRIPTION to ONE sentence
5. ✅ Features as bullet points with "-"
6. ✅ End with ===END_PHASES===

Now, please retry with the EXACT format above:`;
}

// Phase too large correction prompt
function generatePhaseTooLargePrompt(context: RetryContext): string {
  return `
⚠️ PREVIOUS ATTEMPT FAILED - PHASE TOO LARGE

**Error**: ${context.previousError}

**Problem**: The phase has too many features and will exceed token limits.

**SOLUTION**: Break this phase into smaller sub-phases.

**RULES FOR SPLITTING**:
1. ✅ Maximum 3-4 features per phase
2. ✅ Complex features (auth, database, payments) should be isolated
3. ✅ Each phase must produce working code
4. ✅ Phase 1 must be a functional foundation

**EXAMPLE SPLIT**:
Original: "Build e-commerce with auth, products, cart, checkout, payments"

Better:
- Phase 1: Basic product listing and display
- Phase 2: Shopping cart functionality  
- Phase 3: User authentication
- Phase 4: Checkout and payments

Now, please provide a phase plan with smaller, focused phases:`;
}
```

### Fix 3.5: Better Error Messages

```typescript
if (phases.length === 0) {
  const errorDetails = {
    responseLength: responseText.length,
    containsDelimiters: responseText.includes('===PHASE:'),
    containsEndMarker: responseText.includes('===END_PHASES==='),
    preview: responseText.substring(0, 500)
  };
  
  console.error('Phase extraction failed:', errorDetails);
  
  throw new Error(
    `Failed to parse phase plan. The AI response was ${responseText.length} characters but couldn't be parsed. ` +
    `Contains delimiters: ${errorDetails.containsDelimiters}. ` +
    `Please try again with a simpler request.`
  );
}
```

### Fix 3.6: Phase Continuation Logic (Context Chain)

```typescript
interface PhaseContext {
  phaseNumber: number;
  previousPhaseCode: string | null;  // JSON stringified app from previous phase
  allPhases: Phase[];                 // Full phase plan for reference
  completedPhases: number[];          // Which phases are done
  cumulativeFeatures: string[];       // All features implemented so far
}

function buildPhasePrompt(phase: Phase, context: PhaseContext): string {
  if (context.phaseNumber === 1) {
    // First phase: Build from scratch
    return `Build ${phase.name}: ${phase.description}
    
Features to implement:
${phase.features.map(f => `- ${f}`).join('\n')}

This is Phase 1 - create the foundation app with these features.`;
  }
  
  // Subsequent phases: Build on existing code
  const existingApp = JSON.parse(context.previousPhaseCode!);
  const existingFiles = existingApp.files.map((f: any) => f.path).join(', ');
  
  return `Continue building the app. This is Phase ${context.phaseNumber}.

EXISTING APP (from Phase ${context.phaseNumber - 1}):
- Files: ${existingFiles}
- Features already implemented: ${context.cumulativeFeatures.join(', ')}

YOUR TASK FOR THIS PHASE:
${phase.name}: ${phase.description}

NEW FEATURES TO ADD:
${phase.features.map(f => `- ${f}`).join('\n')}

CRITICAL INSTRUCTIONS:
1. DO NOT recreate existing files unless modifying them
2. PRESERVE all existing functionality
3. ADD the new features incrementally
4. Reference existing components/functions where appropriate

EXISTING CODE FOR REFERENCE:
${existingApp.files.slice(0, 3).map((f: any) => `
=== ${f.path} ===
${f.content.substring(0, 1000)}${f.content.length > 1000 ? '...(truncated)' : ''}
`).join('\n')}`;
}
```

### Fix 3.7: Enhanced System Prompt

```typescript
const systemPrompt = `You are an expert software architect creating a phased implementation plan.

## Your Task
Analyze the user's request and break it into buildable phases.

## CRITICAL FORMAT RULES
You MUST use this EXACT format. Do not deviate:

===TOTAL_PHASES===
[number between 2 and 5]
===PHASE:1===
NAME: [Short name, max 5 words]
DESCRIPTION: [One sentence, max 20 words]
FEATURES:
- [Feature 1]
- [Feature 2]
- [Feature 3]
===PHASE:2===
NAME: [Short name]
DESCRIPTION: [One sentence]
FEATURES:
- [Feature 1]
- [Feature 2]
===END_PHASES===

## Phase Guidelines
1. Phase 1 MUST be a working app (not a skeleton)
2. Each phase adds 2-4 features maximum
3. Each phase should be independently testable
4. Earlier phases provide foundation for later phases
5. Keep descriptions SHORT - one sentence max

## Example Output
===TOTAL_PHASES===
3
===PHASE:1===
NAME: Core Todo Functionality
DESCRIPTION: Basic todo list with add, complete, and delete features.
FEATURES:
- Add new todos with text input
- Mark todos as complete with checkbox
- Delete todos with remove button
- Display todo count
===PHASE:2===
NAME: Data Persistence
DESCRIPTION: Save todos to localStorage for persistence.
FEATURES:
- Save todos to localStorage on change
- Load todos from localStorage on startup
- Clear all completed todos button
===PHASE:3===
NAME: Enhanced UX
DESCRIPTION: Add filtering, sorting, and visual improvements.
FEATURES:
- Filter by: All, Active, Completed
- Sort by date or alphabetically
- Smooth animations for add/remove
- Dark mode toggle
===END_PHASES===

IMPORTANT: Start your response with ===TOTAL_PHASES=== - no introduction or explanation before it.`;
```

---

## 4. Frontend Fixes

### Fix 4.1: Replace Modal with Inline Phase Display

```typescript
const PhaseProgressCard = ({ phases, currentPhase, onBuildPhase }) => (
  <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl p-4 border border-purple-500/30">
    <h3 className="text-white font-bold mb-3 flex items-center gap-2">
      <span>🏗️</span> Build Plan ({phases.length} Phases)
    </h3>
    <div className="space-y-2">
      {phases.map((phase, idx) => (
        <div 
          key={idx}
          className={`p-3 rounded-lg border ${
            phase.status === 'complete' 
              ? 'bg-green-500/20 border-green-500/30' 
              : phase.status === 'building'
              ? 'bg-blue-500/20 border-blue-500/30 animate-pulse'
              : 'bg-white/5 border-white/10'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-white font-medium">
              Phase {phase.number}: {phase.name}
            </span>
            {phase.status === 'pending' && idx === currentPhase && (
              <button
                onClick={() => onBuildPhase(phase)}
                className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
              >
                Build
              </button>
            )}
            {phase.status === 'complete' && <span>✅</span>}
            {phase.status === 'building' && <span>⏳</span>}
          </div>
          <p className="text-sm text-slate-400 mt-1">{phase.description}</p>
        </div>
      ))}
    </div>
  </div>
);
```

### Fix 4.2: Pass Phase Context to Backend

```typescript
const buildPhaseWithContext = async (phase: Phase) => {
  const phaseContext: PhaseContext = {
    phaseNumber: phase.number,
    previousPhaseCode: currentComponent?.code || null,
    allPhases: newAppStagePlan?.phases || [],
    completedPhases: newAppStagePlan?.phases
      .filter(p => p.status === 'complete')
      .map(p => p.number) || [],
    cumulativeFeatures: newAppStagePlan?.phases
      .filter(p => p.status === 'complete')
      .flatMap(p => p.features) || []
  };
  
  const buildPrompt = buildPhasePrompt(phase, phaseContext);
  
  const response = await fetch('/api/ai-builder/full-app', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: buildPrompt,
      conversationHistory: chatMessages.slice(-20),
      isPhaseBuilding: true,
      phaseContext,
      currentAppState: phaseContext.previousPhaseCode 
        ? JSON.parse(phaseContext.previousPhaseCode) 
        : null
    })
  });
  
  // ... handle response
};
```

### Fix 4.3: Split/Recovery Notifications

```typescript
// Show when phase is auto-split
const showPhaseSplitNotification = (originalPhase: Phase, splitPhases: Phase[]) => {
  const notification: ChatMessage = {
    id: Date.now().toString(),
    role: 'system',
    content: `⚠️ **Phase ${originalPhase.number} Split**\n\nThe phase was too large, so I've split it into ${splitPhases.length} parts:\n${splitPhases.map(p => `- ${p.name}`).join('\n')}\n\nThis ensures each part generates complete, working code.`,
    timestamp: new Date().toISOString()
  };
  setChatMessages(prev => [...prev, notification]);
};

// Show truncation recovery progress
const showRecoveryProgress = (truncationReason: string, recovering: boolean) => {
  const notification: ChatMessage = {
    id: Date.now().toString(),
    role: 'system',
    content: recovering 
      ? `🔄 **Recovery in Progress**\n\nDetected: ${truncationReason}\n\nSalvaging completed files and retrying remaining features...`
      : `❌ **Generation Incomplete**\n\n${truncationReason}\n\nTrying a smaller approach...`,
    timestamp: new Date().toISOString()
  };
  setChatMessages(prev => [...prev, notification]);
};
```

---

## 5. Implementation Order

### Priority 1: Core Reliability (Do First)
These fixes unblock everything else:
1. ✅ Fix 3.1: Flexible Regex + Fallback Parsing
2. ✅ Fix 3.2: Streaming API with Timeout
3. ✅ Fix 3.5: Better Error Messages

### Priority 2: Size Management (Do Second)
Prevents failures before they happen:
4. ✅ Fix 3.3.1: Complexity Estimation
5. ✅ Fix 3.3.2: Auto-Split Large Phases
6. ✅ Fix 3.3.5: Dynamic Token Budget

### Priority 3: Recovery (Do Third)
Handles failures gracefully:
7. ✅ Fix 3.3.3: Truncation Detection
8. ✅ Fix 3.3.4: Graceful Recovery
9. ✅ Fix 3.4: Retry Logic with Correction Prompts

### Priority 4: Multi-Phase (Do Fourth)
Enables building complex apps across phases:
10. ✅ Fix 3.6: Phase Continuation Logic
11. ✅ Fix 4.2: Pass Phase Context to Backend

### Priority 5: UX Polish (Do Last)
Improves user experience:
12. ✅ Fix 3.7: Enhanced System Prompt
13. ✅ Fix 4.1: Replace Modal with Inline Display
14. ✅ Fix 4.3: Split/Recovery Notifications

---

## 6. Files to Modify

| File | Changes | Priority |
|------|---------|----------|
| `/src/app/api/ai-builder/plan-phases/route.ts` | Streaming, retry logic, better parsing, timeout | 1 |
| `/src/utils/retryLogic.ts` | Add phase-specific retry strategies | 2 |
| `/src/app/api/ai-builder/full-app/generation-logic.ts` | Truncation detection, token budget | 2 |
| `/src/components/AIBuilder.tsx` | Inline phase display, context passing, notifications | 3 |

---

## 7. Implementation Checklist

### Backend
- [x] Add flexible regex parsing with fallback
- [x] Switch to streaming API in plan-phases route
- [x] Add timeout handling (60s for phase planning, 120s for Phase 1)
- [x] Add phase complexity estimation
- [x] Add auto-split for large phases
- [x] Add truncation detection
- [x] Add graceful recovery from truncation
- [x] Implement retry logic with correction prompts
- [x] Add phase-specific retry strategies to retryLogic.ts
- [x] Add phase context chain for Phase 2+
- [x] Add detailed error messages with context
- [x] Update system prompt for clearer format requirements

### Frontend
- [x] Replace modal with inline phase display
- [x] Add phase progress indicator
- [ ] Simplify "start building" flow (one-click)
- [x] Pass phase context to backend
- [x] Show split notification when phase is auto-split
- [x] Show recovery progress on truncation
- [ ] Add better error messages for phase failures

### Testing
- [ ] Test with simple app requests (should skip phasing)
- [ ] Test with complex app requests (should trigger phasing)
- [ ] Test phase extraction with various Claude output formats
- [ ] Test retry logic when parsing fails
- [ ] Test user flow from request to Phase 1 complete
- [ ] Test oversized phase handling (>5 features)
- [ ] Test truncation recovery
- [ ] Test Phase 2+ context chain

---

## 8. Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Phase extraction success rate | ~60% | >95% |
| User completes phased build | ~30% | >70% |
| Average phases per complex app | N/A | 3-4 |
| Time to first working app | N/A | <60s |
| Recovery success rate | 0% | >80% |

---

## 9. Rollback Plan

If phase building continues to fail:

1. Disable automatic phase detection (let users manually choose)
2. Simplify to 2-phase builds only (Foundation + Features)
3. Fall back to single-build with larger token limits

---

## 10. Future Enhancements

1. **Parallel phase building** - Build independent phases simultaneously
2. **Phase templates** - Pre-defined phase structures for common app types
3. **Phase editing** - Let users modify phase plan before building
4. **Phase caching** - Cache successful phase plans for similar requests
5. **Partial response salvaging** - Save completed files from truncated response
6. **Progressive enhancement** - Start with minimal Phase 1, add features via modification endpoint

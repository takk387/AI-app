# Dynamic Phase Generation & Natural Conversation Wizard

## Integration Guide

This package adds two major features to your AI App Builder:

1. **Dynamic Phase Generation** - Generates 3-25+ phases based on app complexity
2. **Natural Conversation Wizard** - Uses real Claude AI responses instead of hardcoded templates

---

## Files to Add

Copy these files to your repository:

```
src/
├── types/
│   └── dynamicPhases.ts          # NEW - Dynamic phase type definitions
├── services/
│   ├── DynamicPhaseGenerator.ts  # NEW - Core phase generation algorithm
│   └── PhaseExecutionManager.ts  # NEW - Phase execution & context management
├── prompts/
│   └── wizardSystemPrompt.ts     # NEW - System prompt for natural conversation
├── components/
│   └── NaturalConversationWizard.tsx  # NEW - Real AI conversation wizard
└── app/api/wizard/
    ├── chat/
    │   └── route.ts              # NEW - AI-powered chat endpoint
    └── generate-phases/
          └── route.ts            # NEW - Phase generation endpoint
```

---

## Step-by-Step Integration

### Step 1: Copy Files

Copy all files from this package to your repository, preserving the directory structure.

### Step 2: Update vercel.json

Add the new API routes to your function configuration:

```json
{
  "functions": {
    "src/app/api/wizard/chat/route.ts": {
      "maxDuration": 60
    },
    "src/app/api/wizard/generate-phases/route.ts": {
      "maxDuration": 30
    }
  }
}
```

### Step 3: Add Export to Types Index

If you have a `src/types/index.ts`, add:

```typescript
export * from './dynamicPhases';
```

### Step 4: Update AIBuilder.tsx

Import the new wizard and add a toggle between wizards:

```tsx
// Add import at top of AIBuilder.tsx
import NaturalConversationWizard from '@/components/NaturalConversationWizard';
import type { DynamicPhasePlan } from '@/types/dynamicPhases';

// Add state for dynamic phase plan
const [dynamicPhasePlan, setDynamicPhasePlan] = useState<DynamicPhasePlan | null>(null);

// Add new wizard toggle state (optional - for A/B testing both wizards)
const [useNaturalWizard, setUseNaturalWizard] = useState(true);

// Update the wizard completion handler
const handleNaturalWizardComplete = useCallback((concept: AppConcept, phasePlan?: DynamicPhasePlan) => {
  setAppConcept(concept);
  setShowConversationalWizard(false);
  
  if (phasePlan) {
    setDynamicPhasePlan(phasePlan);
    
    // Convert to existing StagePlan format for compatibility
    const stagePlan: StagePlan = {
      totalPhases: phasePlan.totalPhases,
      currentPhase: 0,
      phases: phasePlan.phases.map(p => ({
        number: p.number,
        name: p.name,
        description: p.description,
        features: p.features,
        status: 'pending' as const
      }))
    };
    setNewAppStagePlan(stagePlan);
    
    // Show phase plan message
    const planMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: `🎯 **${phasePlan.totalPhases}-Phase Build Plan Created for "${concept.name}"**\n\n` +
        `**Complexity:** ${phasePlan.complexity}\n` +
        `**Estimated Time:** ${phasePlan.estimatedTotalTime}\n\n` +
        phasePlan.phases.map(p => 
          `**Phase ${p.number}: ${p.name}** (${p.estimatedTime})\n${p.description}`
        ).join('\n\n') +
        `\n\n💡 **Ready to start?** Switch to ACT mode and type "build phase 1"!`,
      timestamp: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, planMessage]);
  }
}, [setAppConcept, setChatMessages, setNewAppStagePlan]);

// Update the wizard render section
{showConversationalWizard && (
  useNaturalWizard ? (
    <NaturalConversationWizard
      onComplete={handleNaturalWizardComplete}
      onCancel={() => setShowConversationalWizard(false)}
    />
  ) : (
    <ConversationalAppWizard
      onComplete={handleConceptComplete}
      onCancel={() => setShowConversationalWizard(false)}
    />
  )
)}
```

### Step 5: Add PhaseExecutionManager for Context Chaining

Update your phase build logic to use context chaining:

```tsx
import { PhaseExecutionManager, buildPhaseExecutionPrompt } from '@/services/PhaseExecutionManager';

// When starting a phased build with dynamic phases
const startDynamicPhasedBuild = useCallback(async () => {
  if (!dynamicPhasePlan) return;
  
  const manager = new PhaseExecutionManager(dynamicPhasePlan);
  
  // Get context for first phase
  const context = manager.getExecutionContext(1);
  const prompt = buildPhaseExecutionPrompt(context);
  
  // Use this prompt for AI generation
  // The prompt includes all context about previous phases
}, [dynamicPhasePlan]);
```

---

## How It Works

### Dynamic Phase Generation

The `DynamicPhaseGenerator` analyzes your `AppConcept` and:

1. **Classifies features** by domain (auth, database, storage, etc.)
2. **Detects complex features** that need their own phase
3. **Groups related features** to minimize context switching
4. **Sizes phases** to fit within token limits (~8000 tokens max)
5. **Calculates dependencies** between phases
6. **Generates test criteria** for each phase

Example: A field service app with 15 features becomes 11 phases instead of being crammed into 5.

### Natural Conversation Wizard

The `NaturalConversationWizard` replaces hardcoded responses with real Claude API calls:

| Old Wizard | New Wizard |
|------------|------------|
| `simulateTyping()` delays | Real API latency |
| Template responses | Claude-generated responses |
| State machine navigation | Natural conversation flow |
| Regex input parsing | AI understands context |
| Button-driven | Conversation-driven |

---

## API Endpoints

### POST /api/wizard/chat

Sends a message to Claude for natural conversation.

**Request:**
```json
{
  "message": "I want to build a task management app",
  "conversationHistory": [...],
  "currentState": {...},
  "referenceImages": ["base64..."]
}
```

**Response:**
```json
{
  "message": "That sounds great! Let me ask a few questions...",
  "updatedState": {...},
  "suggestedActions": [...],
  "isConceptComplete": false,
  "tokensUsed": { "input": 500, "output": 200 }
}
```

### POST /api/wizard/generate-phases

Generates a dynamic phase plan from an AppConcept.

**Request:**
```json
{
  "concept": {
    "name": "Field Service App",
    "coreFeatures": [...],
    "technical": {...}
  }
}
```

**Response:**
```json
{
  "success": true,
  "plan": {
    "totalPhases": 11,
    "phases": [...],
    "complexity": "complex",
    "estimatedTotalTime": "45-60 min"
  },
  "analysisDetails": {...}
}
```

---

## Configuration

### Phase Generator Config

```typescript
import { DynamicPhaseGenerator } from '@/services/DynamicPhaseGenerator';

const generator = new DynamicPhaseGenerator({
  maxTokensPerPhase: 8000,    // Maximum tokens per phase
  maxFeaturesPerPhase: 4,      // Maximum features per phase
  minPhases: 2,                // Minimum phases to generate
  maxPhases: 30,               // Maximum phases to generate
});
```

### Always-Separate Domains

These domains always get their own phase:
- `auth` - Authentication
- `database` - Database setup
- `real-time` - WebSocket/live features
- `offline` - Offline support
- `integration` - External services (Stripe, Firebase)

---

## Testing

### Test Phase Generation

```typescript
import { generatePhasePlan } from '@/services/DynamicPhaseGenerator';

const result = generatePhasePlan({
  name: 'Test App',
  description: 'A test application',
  coreFeatures: [
    { id: '1', name: 'User Auth', description: 'Login system', priority: 'high' },
    { id: '2', name: 'Dashboard', description: 'Main dashboard', priority: 'high' },
  ],
  technical: { needsAuth: true, needsDatabase: true },
  // ... other fields
});

console.log(`Generated ${result.plan?.totalPhases} phases`);
console.log(`Complexity: ${result.plan?.complexity}`);
```

### Test Natural Wizard

1. Enable the natural wizard in AIBuilder
2. Start a conversation: "I want to build a blog platform"
3. Verify Claude asks clarifying questions
4. Complete the concept through conversation
5. Generate phases and verify count matches complexity

---

## Rollback Plan

If issues occur, you can switch back to the old wizard:

```tsx
const [useNaturalWizard, setUseNaturalWizard] = useState(false); // Change to false
```

Both wizards produce the same `AppConcept` output, so they're interchangeable.

---

## Questions?

The key insight is that phase generation should happen AFTER conversational concept design is complete. The user refines every detail through natural dialogue, then the system analyzes the final concept to generate the appropriate number of phases.

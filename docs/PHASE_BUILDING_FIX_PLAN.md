# Phase Building Fix Plan

## Overview

This document outlines the plan to fix the **phase building system** which currently has reliability issues causing it to fail silently and fall back to single-build mode.

---

## Current Issues

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

### Issue 3: Weak Error Handling

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

---

## Fix Plan

### Fix 1: More Flexible Regex + Fallback Parsing

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

### Fix 2: Switch to Streaming API

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
for await (const chunk of stream) {
  if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
    responseText += chunk.delta.text;
  }
}
```

### Fix 3: Retry Logic with Correction Prompt

**New Code:**
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

### Fix 4: Better Error Messages

**New Error Handling:**
```typescript
// Instead of generic error
if (phases.length === 0) {
  throw new Error('Failed to extract phases from response');
}

// Use detailed error with context
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

---

## Chat Prompt Improvements

### Current System Prompt Issues

The current prompt in `plan-phases/route.ts` is good but could be improved:

**Current:**
```typescript
const systemPrompt = `You are an expert software architect. Analyze the conversation and extract a clear, actionable phase plan...`
```

**Enhanced Prompt:**
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

## Frontend Improvements (AIBuilder.tsx)

### Issue: Phase Modal UX

**Current Flow:**
1. User types complex request
2. Modal appears asking "Build in Phases?"
3. User clicks "Build in Phases"
4. API called, phases extracted
5. Phases displayed in chat
6. User types "start" to begin

**Problem:** Too many steps, confusing flow

**Improved Flow:**
1. User types complex request
2. System detects complexity, shows inline message with phases
3. User sees "Build Phase 1?" button directly
4. One click starts building

### Code Changes for AIBuilder.tsx

**Add inline phase display instead of modal:**
```typescript
// Replace modal approach with inline phase cards
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

---

## Implementation Checklist

### Backend Fixes
- [ ] Add flexible regex parsing with fallback
- [ ] Switch to streaming API in plan-phases route
- [ ] Implement retry logic with correction prompts
- [ ] Add detailed error messages with context
- [ ] Update system prompt for clearer format requirements
- [ ] Add timeout handling (60s for phase planning)

### Frontend Fixes
- [ ] Replace modal with inline phase display
- [ ] Add phase progress indicator
- [ ] Simplify "start building" flow
- [ ] Add better error messages for phase failures
- [ ] Show phase details before building

### Testing
- [ ] Test with simple app requests (should skip phasing)
- [ ] Test with complex app requests (should trigger phasing)
- [ ] Test phase extraction with various Claude output formats
- [ ] Test retry logic when parsing fails
- [ ] Test user flow from request to Phase 1 complete

---

## Files to Modify

| File | Changes |
|------|---------|
| `/src/app/api/ai-builder/plan-phases/route.ts` | Streaming, retry logic, better parsing |
| `/src/components/AIBuilder.tsx` | Inline phase display, simplified flow |
| `/src/utils/retryLogic.ts` | Add phase-specific retry strategies |

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Phase extraction success rate | ~60% | >95% |
| User completes phased build | ~30% | >70% |
| Average phases per complex app | N/A | 3-4 |
| Time to first working app | N/A | <60s |

---

## Rollback Plan

If phase building continues to fail:

1. Disable automatic phase detection (let users manually choose)
2. Simplify to 2-phase builds only (Foundation + Features)
3. Fall back to single-build with larger token limits

---

## Future Enhancements

1. **Parallel phase building** - Build independent phases simultaneously
2. **Phase templates** - Pre-defined phase structures for common app types
3. **Phase editing** - Let users modify phase plan before building
4. **Phase caching** - Cache successful phase plans for similar requests

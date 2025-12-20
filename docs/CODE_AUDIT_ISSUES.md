# Code Audit Issues & Remediation Plan

> **Audit Date:** December 20, 2025
> **Auditor:** Claude Code
> **Codebase:** AI App Builder
> **Total Issues Found:** 89

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Critical Issues](#critical-issues)
3. [High Priority Issues](#high-priority-issues)
4. [Medium Priority Issues](#medium-priority-issues)
5. [Low Priority Issues](#low-priority-issues)
6. [Phased Remediation Plan](#phased-remediation-plan)

---

## Executive Summary

| Severity  | Count  | Estimated Effort  |
| --------- | ------ | ----------------- |
| Critical  | 17     | 40-60 hours       |
| High      | 28     | 60-80 hours       |
| Medium    | 28     | 40-60 hours       |
| Low       | 16     | 20-30 hours       |
| **Total** | **89** | **160-230 hours** |

### Risk Distribution by Category

| Category           | Critical | High | Medium | Low |
| ------------------ | -------- | ---- | ------ | --- |
| Security           | 8        | 4    | 3      | 0   |
| Memory/Performance | 5        | 8    | 8      | 4   |
| Type Safety        | 1        | 3    | 6      | 2   |
| Code Quality       | 1        | 5    | 6      | 8   |
| Error Handling     | 2        | 8    | 5      | 2   |

---

## Critical Issues

### CRIT-01: TypeScript Strict Mode Disabled

**Location:** `tsconfig.json:6`

**Current State:**

```json
"strict": false
```

**Description:**
TypeScript's strict mode is disabled, which turns off critical compile-time checks including:

- `strictNullChecks` - Variables can be null/undefined without explicit handling
- `strictFunctionTypes` - Function parameter types aren't checked correctly
- `strictBindCallApply` - bind/call/apply methods aren't type-checked
- `noImplicitAny` - Variables without types default to `any`
- `noImplicitThis` - `this` expressions with implied `any` type are allowed

**Why This Is a Problem:**
Without strict mode, TypeScript becomes a documentation tool rather than a safety net. Runtime errors that could be caught at compile time slip through, leading to production crashes from null/undefined access.

**The Fix:**
Enable strict mode in `tsconfig.json`:

```json
"strict": true
```

Then incrementally fix the resulting type errors file by file.

**Effect of Fix:**

- Compile-time detection of null/undefined bugs
- Better IDE autocomplete and refactoring support
- Self-documenting code through explicit types
- Reduced runtime errors in production

**Pros:**

- Catches 30-50% of common JavaScript bugs at compile time
- Improves code maintainability
- Better developer experience with IDE support
- Industry standard for production TypeScript

**Cons:**

- Significant initial effort to fix existing errors (estimated 500-1000 errors)
- May require refactoring some patterns
- Learning curve for developers unfamiliar with strict TypeScript
- Short-term velocity decrease during migration

---

### CRIT-02: Unrestricted CORS on API Routes

**Location:**

- `src/app/api/figma/import/route.ts:12-16`
- `src/app/api/ai-builder/review/route.ts:188-191`
- `src/app/api/figma/generate-code/route.ts`

**Current State:**

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
```

**Description:**
The wildcard `*` in `Access-Control-Allow-Origin` allows any website on the internet to make requests to these API endpoints. This completely bypasses the browser's same-origin policy protection.

**Why This Is a Problem:**
An attacker can create a malicious website that makes requests to your API on behalf of logged-in users. For example:

1. User logs into your app
2. User visits attacker's website
3. Attacker's JavaScript calls your `/api/figma/import` endpoint
4. Request includes user's cookies/credentials
5. Attacker imports malicious content into user's account

**The Fix:**
Replace wildcard with explicit allowed origins:

```typescript
const ALLOWED_ORIGINS = [
  'https://yourdomain.com',
  'https://app.yourdomain.com',
  process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null,
].filter(Boolean);

const corsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin || '')
    ? origin
    : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
});
```

**Effect of Fix:**

- Only your domains can make cross-origin requests
- CSRF attacks from third-party sites are blocked
- Credentials can be safely included in requests

**Pros:**

- Eliminates CSRF vulnerability
- Industry standard security practice
- Simple to implement
- No impact on legitimate users

**Cons:**

- Requires maintaining list of allowed origins
- May break legitimate third-party integrations
- Need to handle preview/staging environments
- Slightly more complex CORS handling code

---

### CRIT-03: No Rate Limiting on AI Routes

**Location:**

- `src/app/api/ai-builder/full-app-stream/route.ts`
- `src/app/api/ai-builder/full-app/route.ts`
- `src/app/api/ai-builder/modify/route.ts`
- `src/app/api/builder/chat/route.ts`
- `src/app/api/ai-builder/plan-phases/route.ts`

**Current State:**
No rate limiting exists on expensive AI generation endpoints. The `/api/images/generate` route has rate limiting, but AI routes do not.

**Description:**
Without rate limiting, there's no protection against:

- Automated abuse exhausting API quotas
- Individual users consuming excessive resources
- Denial of service through request flooding
- Cost attacks against Claude/OpenAI API budgets

**Why This Is a Problem:**
A single malicious user or bot can:

- Send thousands of AI generation requests
- Exhaust monthly API budget in minutes
- Cause legitimate users to be denied service
- Create significant unexpected cloud costs

**The Fix:**
Implement rate limiting middleware using the existing pattern from images/generate:

```typescript
// src/lib/rateLimit.ts
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

export function checkRateLimit(
  clientId: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(clientId);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(clientId, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, retryAfter: Math.ceil((record.resetTime - now) / 1000) };
  }

  record.count++;
  return { allowed: true };
}

// Use authenticated user ID, not X-Forwarded-For
export function getClientId(request: Request, userId?: string): string {
  return userId || request.headers.get('x-session-id') || 'anonymous';
}
```

**Effect of Fix:**

- Prevents API abuse and cost attacks
- Fair resource distribution among users
- Protection against accidental infinite loops
- Graceful degradation under load

**Pros:**

- Protects against abuse and DOS
- Controls API costs
- Improves reliability for all users
- Pattern already exists in codebase

**Cons:**

- May frustrate power users
- Requires tuning limits appropriately
- Adds latency for rate limit checks
- Need to handle rate limit responses in UI

---

### CRIT-04: Rate Limiting Bypass via X-Forwarded-For

**Location:** `src/app/api/images/generate/route.ts:219`

**Current State:**

```typescript
const clientId = request.headers.get('x-forwarded-for') || 'anonymous';
```

**Description:**
The `X-Forwarded-For` header is user-controlled. Anyone can set this header to any value, completely bypassing the rate limiting mechanism.

**Why This Is a Problem:**
An attacker can:

1. Set a different `X-Forwarded-For` value for each request
2. Appear as unlimited different "clients"
3. Completely bypass rate limiting
4. Exhaust API quota while appearing as many users

**The Fix:**
Use authenticated user IDs or server-side session tracking:

```typescript
// Option 1: Use authenticated user ID (preferred)
const session = await getServerSession(request);
const clientId = session?.user?.id || 'anonymous';

// Option 2: Use signed session token
const sessionToken = request.cookies.get('session-token')?.value;
const clientId = sessionToken ? verifyToken(sessionToken) : 'anonymous';

// Option 3: Use IP from trusted proxy only
const clientIp = process.env.TRUSTED_PROXY ? request.headers.get('x-real-ip') : request.ip;
```

**Effect of Fix:**

- Rate limiting actually works
- Each user gets fair quota
- Bypass attacks are blocked
- Anonymous users share a single limited pool

**Pros:**

- Eliminates rate limit bypass vulnerability
- Ties limits to actual user identity
- Works with authentication system
- More accurate usage tracking

**Cons:**

- Requires authentication integration
- Anonymous users heavily limited
- More complex implementation
- May need database for distributed deployments

---

### CRIT-05: Plaintext Password in Cookie

**Location:** `src/app/api/auth/login/route.ts:20-30`

**Current State:**

```typescript
if (password === SITE_PASSWORD) {
  response.cookies.set('site-auth', SITE_PASSWORD, {
    httpOnly: true,
    // ...
  });
}
```

**Description:**
The actual password is being stored in the cookie value. Additionally:

- String comparison is not constant-time (timing attack vulnerable)
- No rate limiting on login attempts (brute force vulnerable)
- No failed attempt logging for security monitoring

**Why This Is a Problem:**

1. **Password exposure**: If cookie is logged or leaked, password is compromised
2. **Timing attacks**: String comparison reveals password length
3. **Brute force**: No limit on login attempts
4. **No audit trail**: Cannot detect attack attempts

**The Fix:**
Use session tokens instead of storing password:

```typescript
import { randomBytes, timingSafeEqual } from 'crypto';

// Generate secure session token
function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

// Constant-time password comparison
function secureCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// Login handler
export async function POST(request: Request) {
  const { password } = await request.json();

  if (!secureCompare(password, process.env.SITE_PASSWORD!)) {
    // Add rate limiting and logging here
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const sessionToken = generateSessionToken();
  // Store token server-side (Redis, DB, etc.)
  await storeSession(sessionToken, { createdAt: Date.now() });

  const response = NextResponse.json({ success: true });
  response.cookies.set('session-token', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return response;
}
```

**Effect of Fix:**

- Password never stored in cookie
- Timing attacks prevented
- Sessions can be revoked server-side
- Proper security audit trail

**Pros:**

- Industry standard authentication pattern
- Password never leaves server
- Can implement session expiration
- Can revoke sessions without changing password

**Cons:**

- Requires server-side session storage
- More complex implementation
- Need to handle session cleanup
- Additional database/Redis dependency

---

### CRIT-06: Code Injection via Template Literals

**Location:** `src/app/api/deploy/vercel/route.ts:93-110`

**Current State:**

```typescript
'src/app/layout.tsx': `import './globals.css';
...
export const metadata: Metadata = {
  title: '${app.title}',
  description: '${app.description || 'Generated with AI App Builder'}',
};
```

**Description:**
User-provided `app.title` and `app.description` are interpolated directly into generated code without escaping. This allows injection of arbitrary JavaScript code.

**Why This Is a Problem:**
An attacker could set their app title to:

```
' + process.env.DATABASE_URL + '
```

The generated code would become:

```typescript
title: '' + process.env.DATABASE_URL + '',
```

This could leak environment variables or execute arbitrary code.

**The Fix:**
Escape user input before interpolation:

```typescript
function escapeForTemplate(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
    .replace(/\n/g, '\\n');
}

// Use escaped values
const safeTitle = escapeForTemplate(app.title);
const safeDescription = escapeForTemplate(app.description || 'Generated with AI App Builder');

'src/app/layout.tsx': `
export const metadata: Metadata = {
  title: '${safeTitle}',
  description: '${safeDescription}',
};
`
```

**Effect of Fix:**

- User input cannot break out of string context
- No code injection possible
- Safe deployment of user content

**Pros:**

- Eliminates injection vulnerability
- Simple to implement
- No user-facing changes
- Can be applied consistently

**Cons:**

- Special characters in titles may look escaped
- Need to apply everywhere user input is interpolated
- Must maintain escape function
- Could miss edge cases

---

### CRIT-07: Cache Memory Leak in ContextCache

**Location:** `src/services/ContextCache.ts:50-54`

**Current State:**

```typescript
this.maxSnapshotCacheSize = options?.maxSnapshotCacheSize ?? 200;
this.ttlMs = options?.ttlMs ?? 15 * 60 * 1000; // 15 minutes default
// maxSnapshotCacheSize is defined but never enforced
```

**Description:**
The `maxSnapshotCacheSize` limit is defined but never actually enforced. The cache grows unbounded during long sessions or multi-phase builds.

**Why This Is a Problem:**

- Memory usage grows continuously during app usage
- Long-running sessions eventually crash with OOM
- Server performance degrades as memory fills
- No cleanup mechanism for stale entries

**The Fix:**
Implement LRU eviction when cache exceeds limit:

```typescript
class ContextCache {
  private snapshotCache: Map<string, CacheEntry> = new Map();
  private readonly maxSize: number;
  private readonly ttlMs: number;

  set(key: string, value: CodeContextSnapshot): void {
    // Evict oldest entries if at capacity
    if (this.snapshotCache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.snapshotCache.set(key, {
      value,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
    });
  }

  get(key: string): CodeContextSnapshot | undefined {
    const entry = this.snapshotCache.get(key);
    if (!entry) return undefined;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.snapshotCache.delete(key);
      return undefined;
    }

    // Update last accessed for LRU
    entry.lastAccessed = Date.now();
    return entry.value;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.snapshotCache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.snapshotCache.delete(oldestKey);
    }
  }

  // Periodic cleanup of expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.snapshotCache) {
      if (now - entry.timestamp > this.ttlMs) {
        this.snapshotCache.delete(key);
      }
    }
  }
}
```

**Effect of Fix:**

- Memory usage stays bounded
- Old entries automatically evicted
- TTL actually enforced
- Predictable resource usage

**Pros:**

- Prevents memory leaks
- Improves long-session stability
- Predictable memory footprint
- Industry standard caching pattern

**Cons:**

- Cache misses increase when at capacity
- LRU overhead on every access
- May need to tune cache size
- Could evict still-useful entries

---

### CRIT-08: Missing Dependency in useLayoutBuilder Hook

**Location:** `src/hooks/useLayoutBuilder.ts:713-724`

**Current State:**

```typescript
const sendMessage = useCallback(async (content: string, images?: string[]) => {
  // Uses workflowState on line 567
  if (workflowState.currentStep) { ... }
}, [
  // workflowState is NOT in dependency array
  searchMemories,
  isMemoryEnabled,
  isMemoryInitialized,
  // ...other deps
]);
```

**Description:**
The `sendMessage` callback uses `workflowState` but doesn't include it in the dependency array. This creates a stale closure where `workflowState` is captured at the time the callback was created, not when it's called.

**Why This Is a Problem:**

- Multi-step workflows break because old workflow state is used
- User sees incorrect workflow step
- Actions may be taken on wrong workflow context
- Difficult to debug - code looks correct but behaves wrong

**The Fix:**
Add `workflowState` to the dependency array:

```typescript
const sendMessage = useCallback(async (content: string, images?: string[]) => {
  if (workflowState.currentStep) { ... }
}, [
  workflowState, // Add this
  searchMemories,
  isMemoryEnabled,
  isMemoryInitialized,
  // ...other deps
]);
```

Or, if `workflowState` changes frequently and you want to avoid recreation:

```typescript
const workflowStateRef = useRef(workflowState);
workflowStateRef.current = workflowState;

const sendMessage = useCallback(async (content: string, images?: string[]) => {
  if (workflowStateRef.current.currentStep) { ... }
}, [/* other stable deps */]);
```

**Effect of Fix:**

- Callback always uses current workflow state
- Multi-step workflows work correctly
- No stale closure bugs

**Pros:**

- Fixes actual bug in workflow behavior
- Simple one-line fix
- Follows React best practices
- ESLint would catch this if not disabled

**Cons:**

- Callback recreated when workflowState changes
- May cause child component re-renders
- Ref pattern adds complexity
- Need to verify all usages of sendMessage

---

### CRIT-09: Silent Failure in CodeContextService

**Location:** `src/services/CodeContextService.ts:120`

**Current State:**

```typescript
for (const file of files) {
  try {
    const analysis = await this.parser.analyzeFile(file);
    // ... use analysis
  } catch (error) {
    console.warn(`Failed to analyze ${file.path}:`, error);
    continue; // Silent skip
  }
}
```

**Description:**
When file analysis fails, the error is logged to console and the file is silently skipped. The caller has no way to know that the context is incomplete.

**Why This Is a Problem:**

- Context graph may be missing critical files
- Dependent code may be generated incorrectly
- No way to distinguish "file has no dependencies" from "file failed to parse"
- Issues are hidden until they cause downstream failures

**The Fix:**
Track failures and return them to caller:

```typescript
interface ContextResult {
  context: CodeContext;
  failures: Array<{ path: string; error: string }>;
  isComplete: boolean;
}

async updateContext(files: File[]): Promise<ContextResult> {
  const failures: Array<{ path: string; error: string }> = [];

  for (const file of files) {
    try {
      const analysis = await this.parser.analyzeFile(file);
      // ... use analysis
    } catch (error) {
      failures.push({
        path: file.path,
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue processing other files
    }
  }

  return {
    context: this.buildContext(),
    failures,
    isComplete: failures.length === 0,
  };
}
```

**Effect of Fix:**

- Caller knows which files failed
- Can decide whether to proceed or retry
- Better error reporting to user
- Debugging information preserved

**Pros:**

- Transparent failure handling
- Caller can make informed decisions
- Better user experience with error messages
- Easier debugging

**Cons:**

- Slightly more complex return type
- Caller must handle failure array
- May need UI changes to display failures
- More verbose code

---

### CRIT-10: Missing Error Propagation in PhaseExecutionManager

**Location:** `src/services/PhaseExecutionManager.ts:1242-1254`

**Current State:**

```typescript
async getOptimizedPhaseContext(phaseNumber: number, maxTokens: number = 16000): Promise<CodeContextSnapshot | null> {
  if (!this.codeContextService) { return null; }
  const phase = this.plan.phases.find((p) => p.number === phaseNumber);
  if (!phase) { return null; }
  // ... more processing that could fail and return null
}
```

**Description:**
The method returns `null` for multiple different conditions:

- No code context service initialized
- Phase not found
- Context extraction failed
- Token budget exceeded

The caller cannot distinguish between these cases.

**Why This Is a Problem:**

- "No context needed" looks the same as "context extraction failed"
- Builds may proceed with incomplete context
- Errors are silently swallowed
- Difficult to debug phase failures

**The Fix:**
Use a Result type to distinguish success, expected null, and errors:

```typescript
type ContextResult =
  | { status: 'success'; snapshot: CodeContextSnapshot }
  | { status: 'not-needed'; reason: string }
  | { status: 'error'; error: string; recoverable: boolean };

async getOptimizedPhaseContext(
  phaseNumber: number,
  maxTokens: number = 16000
): Promise<ContextResult> {
  if (!this.codeContextService) {
    return { status: 'not-needed', reason: 'Code context service not initialized' };
  }

  const phase = this.plan.phases.find((p) => p.number === phaseNumber);
  if (!phase) {
    return { status: 'error', error: `Phase ${phaseNumber} not found`, recoverable: false };
  }

  try {
    const snapshot = await this.extractContext(phase, maxTokens);
    return { status: 'success', snapshot };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      recoverable: true
    };
  }
}
```

**Effect of Fix:**

- Clear distinction between success, not-needed, and error
- Caller can handle each case appropriately
- Errors include context for debugging
- Recoverable flag helps with retry logic

**Pros:**

- Explicit error handling
- Better debugging information
- Type-safe result handling
- Supports different recovery strategies

**Cons:**

- More verbose return type
- All callers must be updated
- Pattern must be applied consistently
- Slightly more code

---

### CRIT-11: Unbounded Tree Cache in TreeSitterParser

**Location:** `src/utils/treeSitterParser.ts:48-51`

**Current State:**

```typescript
private treeCache: Map<string, TreeCacheEntry> = new Map();
private readonly maxCacheSize: number = 50;
private readonly cacheTTLMs: number = 5 * 60 * 1000;
// maxCacheSize and cacheTTLMs are defined but NEVER USED
```

**Description:**
The cache limits are defined as class properties but never enforced in any method. The cache grows without bound and entries never expire.

**Why This Is a Problem:**

- Each parsed file adds ~1-5MB to cache depending on AST size
- 100 files = 100-500MB of cached ASTs
- Long sessions accumulate gigabytes of cached data
- Eventually causes OOM crash or severe slowdown

**The Fix:**
Implement cache management:

```typescript
class TreeSitterParser {
  private treeCache: Map<string, TreeCacheEntry> = new Map();
  private readonly maxCacheSize: number = 50;
  private readonly cacheTTLMs: number = 5 * 60 * 1000;

  private enforceLimit(): void {
    if (this.treeCache.size <= this.maxCacheSize) return;

    // Remove oldest entries until under limit
    const entries = [...this.treeCache.entries()].sort(
      (a, b) => a[1].lastAccessed - b[1].lastAccessed
    );

    const toRemove = entries.slice(0, entries.length - this.maxCacheSize);
    for (const [key] of toRemove) {
      this.treeCache.delete(key);
    }
  }

  private isExpired(entry: TreeCacheEntry): boolean {
    return Date.now() - entry.timestamp > this.cacheTTLMs;
  }

  getTree(filePath: string, content: string): Tree {
    const cached = this.treeCache.get(filePath);

    if (cached && !this.isExpired(cached) && cached.contentHash === hash(content)) {
      cached.lastAccessed = Date.now();
      return cached.tree;
    }

    const tree = this.parser.parse(content);
    this.treeCache.set(filePath, {
      tree,
      contentHash: hash(content),
      timestamp: Date.now(),
      lastAccessed: Date.now(),
    });

    this.enforceLimit();
    return tree;
  }
}
```

**Effect of Fix:**

- Memory usage bounded to ~50 cached trees
- Old entries expire after 5 minutes
- Most recently used entries kept
- Predictable memory footprint

**Pros:**

- Prevents memory leaks
- Cache still improves performance
- Configurable limits
- Standard caching pattern

**Cons:**

- More cache misses under heavy load
- LRU tracking adds overhead
- May need to tune cache size
- Hash computation cost

---

### CRIT-12: SSE Streaming Memory Leak

**Location:** `src/app/api/ai-builder/full-app-stream/route.ts:41-73`

**Current State:**

```typescript
let writerClosed = false;

const writeEvent = async (event: StreamEvent) => {
  if (!writerClosed) {
    try {
      await writer.write(encoder.encode(formatSSE(event)));
    } catch {
      writerClosed = true;
      abortController.abort('Client disconnected');
    }
  }
};

// Background task with no timeout
(async () => {
  // Long-running AI generation...
})();
```

**Description:**
Several issues with the SSE implementation:

1. Background task has no timeout - runs forever if AI stalls
2. Client disconnect may not stop AI generation
3. No cleanup of resources when stream ends
4. Abort signal not guaranteed to stop ongoing work

**Why This Is a Problem:**

- AI calls that hang never timeout
- Disconnected clients leave orphaned processes
- Server resources accumulate over time
- Memory leaks from unfinished streams

**The Fix:**
Add proper timeout, cleanup, and abort handling:

```typescript
export async function POST(request: Request) {
  const abortController = new AbortController();
  const TIMEOUT_MS = 5 * 60 * 1000; // 5 minute timeout

  // Set hard timeout
  const timeoutId = setTimeout(() => {
    abortController.abort('Timeout exceeded');
  }, TIMEOUT_MS);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await generateWithStreaming(controller, abortController.signal);
      } catch (error) {
        if (error.name !== 'AbortError') {
          controller.enqueue(formatSSE({ type: 'error', message: error.message }));
        }
      } finally {
        clearTimeout(timeoutId);
        controller.close();
      }
    },
    cancel() {
      // Client disconnected
      clearTimeout(timeoutId);
      abortController.abort('Client disconnected');
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

async function generateWithStreaming(
  controller: ReadableStreamDefaultController,
  signal: AbortSignal
) {
  // Check abort signal periodically
  for await (const chunk of aiStream) {
    if (signal.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    controller.enqueue(formatSSE({ type: 'chunk', content: chunk }));
  }
}
```

**Effect of Fix:**

- Streams timeout after 5 minutes
- Client disconnects stop processing
- Resources cleaned up properly
- No orphaned background tasks

**Pros:**

- Prevents resource leaks
- Graceful timeout handling
- Client disconnect detection
- Proper cleanup on all exit paths

**Cons:**

- Legitimate long operations may timeout
- More complex stream handling
- Need to tune timeout value
- Error handling more verbose

---

### CRIT-13: Missing Event Listener Cleanup

**Location:** `src/components/NaturalConversationWizard.tsx:208-218`

**Current State:**

```typescript
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  document.addEventListener('keydown', handleEscape);
  // Missing cleanup!
}, [onCancel]);
```

**Description:**
Event listener is added to `document` but never removed. Each time the component mounts, a new listener is added.

**Why This Is a Problem:**

- Opening/closing wizard adds listeners that stack up
- Each press of Escape triggers multiple handlers
- Memory leak from accumulated listeners
- Performance degradation over time

**The Fix:**
Return cleanup function from useEffect:

```typescript
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  document.addEventListener('keydown', handleEscape);

  return () => {
    document.removeEventListener('keydown', handleEscape);
  };
}, [onCancel]);
```

**Effect of Fix:**

- Listener removed when component unmounts
- No listener accumulation
- Escape only triggers once
- No memory leak

**Pros:**

- Simple one-line fix
- Follows React best practices
- Eliminates memory leak
- Correct behavior guaranteed

**Cons:**

- None - this is purely a bug fix

---

### CRIT-14: MIME Type Validation Client-Side Only

**Location:** `src/services/StorageService.ts:55-79`

**Current State:**

```typescript
'user-uploads': {
  maxSize: 10 * 1024 * 1024,
  allowedTypes: ['image/jpeg', 'image/png', ...],
  allowedExtensions: ['jpg', 'jpeg', 'png', ...],
},
// Validation only checks what client reports
```

**Description:**
File type validation relies on:

1. MIME type reported by browser (easily spoofed)
2. File extension (easily changed)

The server never inspects actual file content.

**Why This Is a Problem:**

- Attacker can upload malicious files by lying about type
- Executable disguised as image
- XSS payloads in SVG files
- Server-side vulnerabilities from malicious files

**The Fix:**
Validate file content server-side using magic bytes:

```typescript
import { fileTypeFromBuffer } from 'file-type';

async function validateFileContent(buffer: Buffer, expectedTypes: string[]): Promise<boolean> {
  const detected = await fileTypeFromBuffer(buffer);

  if (!detected) {
    return false; // Unknown file type
  }

  return expectedTypes.includes(detected.mime);
}

// In upload handler
export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File;

  const buffer = Buffer.from(await file.arrayBuffer());

  // Check actual file content, not just what client claims
  const isValid = await validateFileContent(buffer, ALLOWED_TYPES);

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
  }

  // Proceed with upload...
}
```

**Effect of Fix:**

- File type verified by content inspection
- Spoofed MIME types detected
- Malicious files rejected
- Defense in depth achieved

**Pros:**

- Actual security vs. security theater
- Catches spoofed files
- Industry standard practice
- Works for all file types

**Cons:**

- Requires `file-type` package
- Slight upload latency increase
- Some rare valid files may fail
- Need to handle edge cases

---

### CRIT-15: Path Traversal Vulnerability

**Location:** `src/services/WebContainerService.ts:140-146`

**Current State:**

```typescript
let path = file.path;
if (path.startsWith('src/')) path = path.slice(4);
if (path.startsWith('./')) path = path.slice(2);
if (path.startsWith('/')) path = path.slice(1);
// No validation for ../ sequences
```

**Description:**
File paths are normalized but not validated for directory traversal attacks. A path like `../../../etc/passwd` could escape the intended directory.

**Why This Is a Problem:**

- Attacker-controlled paths could access any file
- Could read sensitive configuration files
- Could overwrite critical system files
- WebContainer isolation may not prevent all access

**The Fix:**
Validate paths after normalization:

```typescript
import path from 'path';

function sanitizePath(userPath: string, baseDir: string): string | null {
  // Normalize the path
  const normalized = path
    .normalize(userPath)
    .replace(/^(\.\.(\/|\\|$))+/, '') // Remove leading ../
    .replace(/^[/\\]+/, ''); // Remove leading slashes

  // Resolve to absolute path
  const resolved = path.resolve(baseDir, normalized);

  // Ensure result is within baseDir
  if (!resolved.startsWith(path.resolve(baseDir))) {
    return null; // Path escapes base directory
  }

  return resolved;
}

// Usage
const safePath = sanitizePath(file.path, '/app/workspace');
if (!safePath) {
  throw new Error('Invalid file path');
}
```

**Effect of Fix:**

- Path traversal attacks blocked
- Files confined to intended directory
- Clear error on invalid paths
- Defense in depth

**Pros:**

- Eliminates path traversal vulnerability
- Simple validation logic
- Works for all path inputs
- Industry standard approach

**Cons:**

- Legitimate relative paths may be rejected
- Need to handle Windows/Unix differences
- Must apply everywhere paths are used
- Slight performance overhead

---

### CRIT-16: No Request Size Limits

**Location:** Multiple API routes

**Current State:**

```typescript
const body = await request.json();
// No size check before parsing
```

**Description:**
API routes parse request body without checking size first. An attacker can send arbitrarily large payloads.

**Why This Is a Problem:**

- Memory exhaustion attack: send 1GB JSON payload
- Server parsing huge payloads blocks other requests
- Can crash server with OOM
- Amplification attack possible

**The Fix:**
Check content-length before parsing:

```typescript
const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: Request) {
  // Check content-length header
  const contentLength = parseInt(request.headers.get('content-length') || '0');

  if (contentLength > MAX_BODY_SIZE) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  // For streaming bodies, limit during read
  const reader = request.body?.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];

  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;

    size += value.length;
    if (size > MAX_BODY_SIZE) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }
    chunks.push(value);
  }

  const body = JSON.parse(Buffer.concat(chunks).toString());
  // Process body...
}
```

Or use middleware:

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const contentLength = parseInt(request.headers.get('content-length') || '0');

  if (contentLength > MAX_BODY_SIZE) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  return NextResponse.next();
}
```

**Effect of Fix:**

- Large payloads rejected early
- Memory exhaustion prevented
- Server stays responsive
- Clear error for legitimate large requests

**Pros:**

- Simple protection against DOS
- Early rejection saves resources
- Standard HTTP status code
- Can set different limits per route

**Cons:**

- Legitimate large requests rejected
- Need to tune limit per use case
- Content-length can be spoofed (stream check needed)
- More complex for streaming bodies

---

### CRIT-17: Unvalidated Image Base64 Data

**Location:** `src/app/api/ai-builder/full-app-stream/route.ts:272-301`

**Current State:**

```typescript
if (hasImage && image) {
  const imageMatch = image.match(/^data:(image\/[^;]+);base64,(.+)$/);
  if (imageMatch) {
    const mediaType = imageMatch[1] as 'image/jpeg' | ...;
    const base64Data = imageMatch[2];  // No size validation
    // Used directly
  }
}
```

**Description:**
Base64 image data is accepted without validating:

1. Size of the decoded image
2. Actual image validity
3. Image dimensions
4. Malicious content

**Why This Is a Problem:**

- Attacker can send 1GB base64 string
- Memory exhaustion during decode
- Invalid/malicious images may crash processors
- No protection against image bombs (e.g., 1x1 pixel that decompresses to 100GB)

**The Fix:**
Validate base64 data before use:

```typescript
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB decoded
const MAX_BASE64_LENGTH = Math.ceil((MAX_IMAGE_SIZE * 4) / 3); // Base64 encoding overhead

function validateBase64Image(dataUrl: string): { valid: boolean; error?: string } {
  const match = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);

  if (!match) {
    return { valid: false, error: 'Invalid data URL format' };
  }

  const [, mediaType, base64Data] = match;

  // Check allowed types
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(mediaType)) {
    return { valid: false, error: `Unsupported image type: ${mediaType}` };
  }

  // Check base64 length (proxy for decoded size)
  if (base64Data.length > MAX_BASE64_LENGTH) {
    return { valid: false, error: 'Image too large' };
  }

  // Validate base64 encoding
  try {
    const decoded = Buffer.from(base64Data, 'base64');
    if (decoded.length > MAX_IMAGE_SIZE) {
      return { valid: false, error: 'Decoded image too large' };
    }
  } catch {
    return { valid: false, error: 'Invalid base64 encoding' };
  }

  return { valid: true };
}
```

**Effect of Fix:**

- Rejects oversized images early
- Validates base64 encoding
- Restricts to safe image types
- Predictable memory usage

**Pros:**

- Prevents memory exhaustion
- Validates data before use
- Clear error messages
- Defense in depth

**Cons:**

- Legitimate large images rejected
- Validation adds latency
- Need to communicate limits to users
- May need to adjust limits

---

## High Priority Issues

### HIGH-01: Missing Shallow Comparison in usePanelActions

**Location:** `src/stores/useLayoutPanelStore.ts:185-193`

**Current State:**

```typescript
export const usePanelActions = () =>
  useLayoutPanelStore((s) => ({
    setPanel: s.setPanel,
    togglePanel: s.togglePanel,
    openPanel: s.openPanel,
    closePanel: s.closePanel,
    closeAllPanels: s.closeAllPanels,
    initTemplatePicker: s.initTemplatePicker,
  }));
```

**Description:**
This selector returns a new object on every render because there's no shallow comparison. Every component using this hook will re-render on any store change.

**The Fix:**

```typescript
import { useShallow } from 'zustand/react/shallow';

export const usePanelActions = () =>
  useLayoutPanelStore(
    useShallow((s) => ({
      setPanel: s.setPanel,
      togglePanel: s.togglePanel,
      openPanel: s.openPanel,
      closePanel: s.closePanel,
      closeAllPanels: s.closeAllPanels,
      initTemplatePicker: s.initTemplatePicker,
    }))
  );
```

**Pros:**

- Eliminates unnecessary re-renders
- Simple fix
- Follows Zustand best practices

**Cons:**

- None significant

---

### HIGH-02: Multiple useAppStore Subscriptions

**Location:** `src/hooks/useProjectDocumentation.ts:107-112`

**Current State:**

```typescript
const currentDocumentation = useAppStore((state) => state.currentDocumentation);
const isLoadingDocumentation = useAppStore((state) => state.isLoadingDocumentation);
const isSavingDocumentation = useAppStore((state) => state.isSavingDocumentation);
const setCurrentDocumentation = useAppStore((state) => state.setCurrentDocumentation);
const setIsLoadingDocumentation = useAppStore((state) => state.setIsLoadingDocumentation);
const setIsSavingDocumentation = useAppStore((state) => state.setIsSavingDocumentation);
```

**Description:**
Six separate store subscriptions instead of one. Each creates overhead and potential for inconsistent state.

**The Fix:**

```typescript
import { useShallow } from 'zustand/react/shallow';

const {
  currentDocumentation,
  isLoadingDocumentation,
  isSavingDocumentation,
  setCurrentDocumentation,
  setIsLoadingDocumentation,
  setIsSavingDocumentation,
} = useAppStore(
  useShallow((state) => ({
    currentDocumentation: state.currentDocumentation,
    isLoadingDocumentation: state.isLoadingDocumentation,
    isSavingDocumentation: state.isSavingDocumentation,
    setCurrentDocumentation: state.setCurrentDocumentation,
    setIsLoadingDocumentation: state.setIsLoadingDocumentation,
    setIsSavingDocumentation: state.setIsSavingDocumentation,
  }))
);
```

**Pros:**

- Single subscription instead of six
- Atomic state access
- Better performance

**Cons:**

- Slightly more verbose
- All values change together

---

### HIGH-03: N+1 Query Pattern in DependencyGraphBuilder

**Location:** `src/services/DependencyGraphBuilder.ts:54-86`

**Current State:**

```typescript
for (const analysis of analyses) {
  for (const imp of analysis.imports) {
    const targetPath = this.findMatchingFile(resolvedPath); // O(n)
    if (!this.files.has(targetPath)) continue; // Another Map lookup
    const fromNode = this.files.get(analysis.path); // Another Map lookup
  }
}
```

**Description:**
For n files with m imports each, this performs O(n\*m) operations with multiple Map lookups per iteration.

**The Fix:**

```typescript
// Pre-compute lookups
const fileSet = new Set(this.files.keys());
const nodeMap = new Map(analyses.map((a) => [a.path, this.files.get(a.path)]));

for (const analysis of analyses) {
  const fromNode = nodeMap.get(analysis.path);
  if (!fromNode) continue;

  for (const imp of analysis.imports) {
    if (!fileSet.has(imp.resolvedPath)) continue;
    // ... process edge
  }
}
```

**Pros:**

- O(1) lookups instead of O(n)
- Significant speedup for large codebases
- Same functionality

**Cons:**

- More memory for pre-computed structures
- Slightly more complex code

---

### HIGH-04: Interval Not Cleaned in useDesignAnalysis

**Location:** `src/hooks/useDesignAnalysis.ts:108-139`

**Description:**
`simulateProgress` creates intervals that may not be cleaned if component unmounts mid-progress.

**The Fix:**

```typescript
const intervalRef = useRef<NodeJS.Timeout | null>(null);

const simulateProgress = useCallback(() => {
  intervalRef.current = setInterval(() => {
    // ... progress logic
    if (complete) {
      clearInterval(intervalRef.current!);
      intervalRef.current = null;
    }
  }, 100);
}, []);

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };
}, []);
```

**Pros:**

- Prevents memory leak
- Clean component lifecycle

**Cons:**

- Additional ref tracking

---

### HIGH-05: Missing React.memo on High-Traffic Components

**Location:** `src/components/ChatPanel.tsx`, `src/components/PreviewPanel.tsx`

**Description:**
These components receive frequently-changing props but aren't memoized, causing re-renders of the entire component tree.

**The Fix:**

```typescript
// Before
export function ChatPanel({ messages, ...props }: ChatPanelProps) {
  // ...
}

// After
export const ChatPanel = React.memo(function ChatPanel({ messages, ...props }: ChatPanelProps) {
  // ...
});
```

**Pros:**

- Prevents unnecessary re-renders
- Simple to implement
- Significant performance improvement for message lists

**Cons:**

- Props comparison overhead
- Must ensure props are stable references

---

### HIGH-06 through HIGH-28

_Additional high-priority issues follow similar format. For brevity, see the summary table below:_

| ID      | Issue                          | Location                       | Fix Summary            |
| ------- | ------------------------------ | ------------------------------ | ---------------------- |
| HIGH-06 | Stale closures in useResizable | useResizable.ts:305-337        | Use refs or add deps   |
| HIGH-07 | Uncancelled interval           | useAnalysisProgress.ts:201-223 | Add cleanup effect     |
| HIGH-08 | AbortController not cleaned    | useCodeReview.ts:134-137       | Clean on unmount       |
| HIGH-09 | Race conditions in draft save  | useDraftPersistence.ts:161-187 | Debounce/batch saves   |
| HIGH-10 | Debug info in errors           | full-app/route.ts:358-363      | Remove in production   |
| HIGH-11 | OAuth error logging            | vercel/callback/route.ts       | Sanitize log output    |
| HIGH-12 | Missing auth on endpoints      | figma/\*, generate             | Add auth middleware    |
| HIGH-13 | O(n²) import deduplication     | astModifier.ts:138-152         | Use Set for lookups    |
| HIGH-14 | O(n²) overlap detection        | astModifier.ts:1800-1809       | Limit array growth     |
| HIGH-15 | Brittle regex validation       | codeValidator.ts:41-111        | Use AST parser         |
| HIGH-16 | Unhandled promises             | AIBuilder.tsx:459              | Await or track         |
| HIGH-17 | No accessibility attrs         | Multiple components            | Add aria-\* attributes |
| HIGH-18 | Console statements             | 93 files, 373 occurrences      | Use structured logging |
| HIGH-19 | Type casts without validation  | LayoutBuilderWizard.tsx        | Add runtime validation |
| HIGH-20 | WebContainer no cleanup        | WebContainerService.ts         | Add shutdown method    |
| HIGH-21 | Ref circular reference         | useDesignReplication.ts        | Clear ref on unmount   |
| HIGH-22 | No conversation history limit  | plan-phases/route.ts           | Token-based limiting   |
| HIGH-23 | Nested object validation       | figma/import/route.ts          | Add depth limits       |
| HIGH-24 | Screenshot path injection      | screenshot/route.ts            | Validate file paths    |
| HIGH-25 | Unsanitized DALL-E prompts     | images/generate/route.ts       | Filter harmful content |
| HIGH-26 | Large state object             | useAppStore.ts                 | Split into slices      |
| HIGH-27 | Set usage in Zustand           | useAppStore.ts:502             | Use arrays or Maps     |
| HIGH-28 | getState() during render       | AIBuilder.tsx:898              | Use selector instead   |

---

## Medium Priority Issues

### MED-01: Console Statements in Production

**Count:** 373 occurrences across 93 files

**Description:**
`console.log`, `console.warn`, and `console.error` calls throughout the codebase. While ESLint allows warn/error, these should use structured logging in production.

**The Fix:**
Create a logging service:

```typescript
// src/lib/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

class Logger {
  private isDev = process.env.NODE_ENV === 'development';

  private log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
    };

    if (this.isDev) {
      console[level](message, context);
    } else {
      // Send to logging service (DataDog, Sentry, etc.)
      this.sendToService(entry);
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    if (this.isDev) this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>) {
    this.log('error', message, context);
  }

  private sendToService(entry: LogEntry) {
    // Implement based on your logging service
  }
}

export const logger = new Logger();
```

**Pros:**

- Centralized logging control
- Production-appropriate behavior
- Structured data for analysis
- Easy to add monitoring

**Cons:**

- Significant refactoring effort
- Need to update all console calls
- External service dependency

---

### MED-02 through MED-28

_Medium priority issues covering:_

| Category       | Issues                                               |
| -------------- | ---------------------------------------------------- |
| Type Safety    | 6 issues - any types, missing validation             |
| Performance    | 8 issues - no virtualization, inefficient algorithms |
| Code Quality   | 6 issues - eslint-disable, magic numbers             |
| Error Handling | 5 issues - swallowed errors, missing boundaries      |
| Security       | 3 issues - input sanitization, headers               |

---

## Low Priority Issues

### LOW-01 through LOW-16

| ID     | Issue                   | Description                              |
| ------ | ----------------------- | ---------------------------------------- |
| LOW-01 | Magic numbers           | Hardcoded values without named constants |
| LOW-02 | Missing loading states  | No skeleton during async ops             |
| LOW-03 | Nested modal rendering  | Modals inline in LayoutBuilderWizard     |
| LOW-04 | Single error boundary   | Only root level                          |
| LOW-05 | Large component files   | AIBuilder 2047 lines                     |
| LOW-06 | Inconsistent imports    | Mix of relative and @ alias              |
| LOW-07 | Missing JSDoc           | Complex functions undocumented           |
| LOW-08 | Test coverage           | Only 3 test files                        |
| LOW-09 | Unused exports          | Dead code in utilities                   |
| LOW-10 | Inconsistent naming     | Mix of conventions                       |
| LOW-11 | Missing default exports | Some files only named                    |
| LOW-12 | CSS-in-JS patterns      | Inconsistent styling approach            |
| LOW-13 | Missing PropTypes       | For runtime type checking                |
| LOW-14 | No storybook            | Component documentation                  |
| LOW-15 | Bundle size             | No code splitting analysis               |
| LOW-16 | Accessibility audit     | Full WCAG compliance                     |

---

## Phased Remediation Plan

### Phase 1: Critical Security (Week 1-2)

**Goal:** Eliminate critical security vulnerabilities

**Priority Issues:**

1. CRIT-02: Fix CORS wildcards
2. CRIT-03: Add rate limiting to AI routes
3. CRIT-04: Fix rate limit bypass
4. CRIT-05: Fix password in cookie
5. CRIT-06: Fix code injection
6. CRIT-14: Add server-side MIME validation
7. CRIT-15: Fix path traversal
8. CRIT-16: Add request size limits
9. CRIT-17: Validate base64 images

**Estimated Effort:** 20-30 hours

**Deliverables:**

- [ ] CORS configuration with explicit origins
- [ ] Rate limiting middleware for AI routes
- [ ] Session token authentication
- [ ] Input sanitization utilities
- [ ] Request size middleware
- [ ] Security test suite

**Success Criteria:**

- No CRITICAL security issues in audit
- Rate limiting prevents >100 req/min per user
- All file uploads validated server-side

---

### Phase 2: Memory & Stability (Week 3-4)

**Goal:** Eliminate memory leaks and stability issues

**Priority Issues:**

1. CRIT-07: Implement cache eviction
2. CRIT-11: Enforce tree cache limits
3. CRIT-12: Fix SSE streaming leaks
4. CRIT-13: Add event listener cleanup
5. HIGH-04: Clean intervals on unmount
6. HIGH-06: Fix stale closures
7. HIGH-07: Clean up timers

**Estimated Effort:** 25-35 hours

**Deliverables:**

- [ ] LRU cache implementation
- [ ] Cleanup functions in all useEffects
- [ ] SSE timeout and cleanup
- [ ] Memory usage monitoring

**Success Criteria:**

- No memory growth over 24-hour test
- All intervals/listeners cleaned on unmount
- SSE streams timeout after 5 minutes

---

### Phase 3: Type Safety (Week 5-6)

**Goal:** Enable TypeScript strict mode

**Priority Issues:**

1. CRIT-01: Enable strict mode
2. Fix all resulting type errors (~500-1000 estimated)
3. Remove @ts-ignore comments
4. Add proper type guards

**Estimated Effort:** 40-60 hours

**Deliverables:**

- [ ] tsconfig.json with strict: true
- [ ] All type errors resolved
- [ ] Type guard utilities
- [ ] Updated coding standards

**Success Criteria:**

- `npm run typecheck` passes with strict mode
- <10 eslint-disable-next-line comments
- Zero @ts-ignore in new code

---

### Phase 4: Performance Optimization (Week 7-8)

**Goal:** Improve runtime performance

**Priority Issues:**

1. HIGH-01: Add shallow to selectors
2. HIGH-02: Consolidate store subscriptions
3. HIGH-03: Fix N+1 query patterns
4. HIGH-05: Add React.memo
5. HIGH-13: Optimize AST operations

**Estimated Effort:** 30-40 hours

**Deliverables:**

- [ ] Optimized Zustand selectors
- [ ] Memoized components
- [ ] Performance benchmarks
- [ ] Bundle analysis

**Success Criteria:**

- 50% reduction in unnecessary re-renders
- O(n) algorithms replace O(n²)
- Lighthouse performance score >80

---

### Phase 5: Error Handling & Observability (Week 9-10)

**Goal:** Proper error handling and monitoring

**Priority Issues:**

1. CRIT-09: Propagate context failures
2. CRIT-10: Use Result types
3. HIGH-10: Remove debug info from errors
4. MED-01: Implement structured logging

**Estimated Effort:** 25-35 hours

**Deliverables:**

- [ ] Error handling guidelines
- [ ] Logging service integration
- [ ] Error boundary components
- [ ] Monitoring dashboard

**Success Criteria:**

- All errors logged with context
- No sensitive data in error responses
- Error boundaries at subsystem level

---

### Phase 6: Code Quality & Testing (Week 11-12)

**Goal:** Improve maintainability and test coverage

**Priority Issues:**

1. LOW-05: Break apart large components
2. LOW-08: Add test coverage
3. LOW-07: Add documentation
4. Remaining medium/low issues

**Estimated Effort:** 30-40 hours

**Deliverables:**

- [ ] Component size <500 lines
- [ ] Test coverage >70%
- [ ] Updated documentation
- [ ] Code review guidelines

**Success Criteria:**

- All components <500 lines
- Test coverage >70%
- CI passes all checks

---

## Summary Timeline

```
Week 1-2:   Phase 1 - Critical Security
Week 3-4:   Phase 2 - Memory & Stability
Week 5-6:   Phase 3 - Type Safety
Week 7-8:   Phase 4 - Performance
Week 9-10:  Phase 5 - Error Handling
Week 11-12: Phase 6 - Code Quality
```

**Total Estimated Effort:** 170-240 hours (4-6 developer weeks)

---

## Appendix: Quick Reference

### Files Most Frequently Needing Changes

| File                     | Issue Count | Priority |
| ------------------------ | ----------- | -------- |
| AIBuilder.tsx            | 11          | High     |
| useLayoutBuilder.ts      | 8           | High     |
| full-app-stream/route.ts | 7           | Critical |
| astModifier.ts           | 6           | Medium   |
| useAppStore.ts           | 5           | High     |
| codeValidator.ts         | 5           | Medium   |
| ContextCache.ts          | 4           | Critical |
| PhaseExecutionManager.ts | 4           | Critical |

### New Files to Create

1. `src/lib/logger.ts` - Structured logging
2. `src/lib/rateLimit.ts` - Rate limiting utilities
3. `src/lib/validation.ts` - Input validation
4. `src/lib/security.ts` - Security utilities
5. `src/middleware/requestSize.ts` - Size limiting
6. `src/middleware/cors.ts` - CORS configuration

### Dependencies to Add

```json
{
  "file-type": "^18.0.0", // MIME type detection
  "ioredis": "^5.0.0", // Rate limit storage (optional)
  "pino": "^8.0.0" // Structured logging (optional)
}
```

# Comprehensive Layout Builder Fixes

## Overview

This document details all identified issues in the Layout Builder system and their fixes. The issues were discovered through systematic analysis of the rendering pipeline, API routes, and error logs.

---

## Critical Issues (7)

### 1. Nested `<p>` Hydration Error

**File:** `src/components/Engine.tsx:36`

**Error:** `<p> cannot be a descendant of <p>`

**Cause:** Engine maps `text` type to `<p>` tags. When AI generates nested text nodes (text inside text), invalid HTML is created since `<p>` cannot contain another `<p>`.

**Fix:** Change `text: 'p'` to `text: 'span'` in tagMap. Also add `span` to motionComponents map.

```typescript
// Before
const tagMap: Record<string, string> = {
  container: 'div',
  text: 'p',  // Problem: <p> cannot nest
  ...
};

// After
const tagMap: Record<string, string> = {
  container: 'div',
  text: 'span',  // Fixed: <span> can nest
  ...
};
```

---

### 2. Missing Image Fallback (404 Errors)

**File:** `src/components/Engine.tsx:54-64`

**Error:** `GET /assets/icon-microscope-pixel.png 404`

**Cause:** AI generates manifest with fake image paths that don't exist in the project.

**Fix:** Add `onError` handler to img elements with placeholder SVG fallback.

```typescript
const PLACEHOLDER_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect fill='%23f3f4f6' width='100' height='100'/%3E%3Ctext x='50' y='50' font-family='Arial' font-size='12' fill='%239ca3af' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E`;

// In void element rendering for img
if (Tag === 'img') {
  return (
    <MotionTag
      className={node.styles?.tailwindClasses ?? ''}
      style={selectionStyle}
      onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
        e.currentTarget.src = PLACEHOLDER_SVG;
      }}
      {...(node.attributes ?? {})}
    />
  );
}
```

---

### 3. Empty String Filter in lintTailwindClasses

**File:** `src/app/api/builder/vibe/route.ts:204-207`

**Issue:** Empty strings pass the regex test, producing `"   "` classes with multiple spaces.

**Fix:** Add `.filter(cls => cls.trim())` after the regex filter.

```typescript
// Before
const cleanClasses = node.styles.tailwindClasses
  .split(' ')
  .filter((cls) => validClassPattern.test(cls))
  .join(' ');

// After
const cleanClasses = node.styles.tailwindClasses
  .split(' ')
  .filter((cls) => cls.trim() && validClassPattern.test(cls))
  .join(' ');
```

---

### 4. Missing styles Null Check in lintTailwindClasses

**File:** `src/app/api/builder/vibe/route.ts:204`

**Issue:** `node.styles.tailwindClasses` crashes if `styles` is undefined.

**Fix:** Add guard clause at start of function.

```typescript
function lintTailwindClasses(node: UISpecNode): UISpecNode {
  // Add this guard
  if (!node.styles?.tailwindClasses) {
    return { ...node, styles: { ...node.styles, tailwindClasses: '' } };
  }
  // ... rest of function
}
```

---

### 5. Unsafe JSON.parse in repairJson

**File:** `src/app/api/builder/vibe/route.ts:199`

**Issue:** No try-catch around `JSON.parse` - crashes on malformed AI response.

**Fix:** Wrap in try-catch, return original input on failure.

```typescript
async function repairJson(model: any, brokenJson: string, error: string): Promise<any> {
  const prompt = `Fix this JSON structure based on the error: ${error}.\n\n${brokenJson.slice(0, 2000)}`;
  const result = await model.generateContent(prompt);
  try {
    return JSON.parse(result.response.text());
  } catch {
    console.error('Repair JSON parse failed');
    return JSON.parse(brokenJson); // Return original as fallback
  }
}
```

---

### 6. Unsafe JSON.parse in generatePhysicalMetaphor

**File:** `src/app/api/builder/vibe/route.ts:124`

**Issue:** No try-catch - crashes if AI doesn't return valid JSON.

**Fix:** Wrap in try-catch, return default metaphor on failure.

```typescript
async function generatePhysicalMetaphor(model: any, userPrompt: string): Promise<string> {
  // ... prompt code ...
  const result = await model.generateContent(prompt);
  try {
    return JSON.parse(result.response.text()).metaphor || 'Clean minimal matte paper';
  } catch {
    console.error('Metaphor JSON parse failed');
    return 'Clean minimal matte paper';
  }
}
```

---

### 7. Unsafe JSON.parse in synthesizeStyles

**File:** `src/app/api/builder/vibe/route.ts:164`

**Issue:** No try-catch - crashes if AI doesn't return valid JSON.

**Fix:** Wrap in try-catch, return original manifest on failure.

```typescript
async function synthesizeStyles(model: any, manifest: LayoutManifest, metaphor: string): Promise<LayoutManifest> {
  // ... prompt code ...
  const result = await model.generateContent([{ text: prompt }, { text: JSON.stringify(manifest) }]);
  try {
    return JSON.parse(result.response.text());
  } catch {
    console.error('Synthesize styles JSON parse failed');
    return manifest; // Return original manifest as fallback
  }
}
```

---

## High Priority Issues (3)

### 8. Missing Error Boundary in Engine

**File:** `src/components/Engine.tsx`

**Issue:** Render errors crash the entire app instead of showing fallback.

**Fix:** Wrap Engine in an ErrorBoundary component.

```typescript
class EngineErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-red-500 bg-red-50 rounded border border-red-200">
          Failed to render layout. Please try regenerating.
        </div>
      );
    }
    return this.props.children;
  }
}

// Usage in LayoutPreview
export const LayoutPreview: React.FC<LayoutPreviewProps> = (props) => {
  return (
    <EngineErrorBoundary>
      <Engine ... />
    </EngineErrorBoundary>
  );
};
```

---

### 9. Missing parsed.definitions Null Check

**File:** `src/app/api/builder/vibe/route.ts:173`

**Issue:** `Object.entries(parsed.definitions)` crashes if definitions is undefined.

**Fix:** Add `parsed.definitions ?? {}` fallback.

```typescript
// Before
Object.entries(parsed.definitions).forEach(([key, node]) => {
  cleanDefs[key] = lintTailwindClasses(node as UISpecNode);
});

// After
Object.entries(parsed.definitions ?? {}).forEach(([key, node]) => {
  cleanDefs[key] = lintTailwindClasses(node as UISpecNode);
});
```

---

### 10. Permissive Tailwind Class Pattern

**File:** `src/app/api/builder/vibe/route.ts:203`

**Issue:** Current pattern `/^[a-z0-9\-:[\]/#.%]+$/i` allows potentially dangerous characters like `#` and `.` which could cause issues.

**Fix:** Use stricter pattern that matches actual Tailwind class structure.

```typescript
// Before
const validClassPattern = /^[a-z0-9\-:[\]/#.%]+$/i;

// After - stricter pattern
const validClassPattern = /^[a-z][a-z0-9-]*(?::[a-z][a-z0-9-]*)*(?:\/[0-9]+)?(?:\[[^\]]+\])?$/i;
```

---

## Medium Priority Issues (7)

### 11. LayoutPreview Missing Null Checks

**File:** `src/components/Engine.tsx:103-107`

**Issue:** No null check for `manifest.designSystem.colors` or `fonts`.

**Fix:** Add optional chaining and defaults.

```typescript
const cssVariables: Record<string, string> = {};
const colors = manifest.designSystem?.colors ?? {};
Object.entries(colors).forEach(([key, value]) => {
  cssVariables[`--${key}`] = value;
});
const fonts = manifest.designSystem?.fonts ?? { heading: 'sans-serif', body: 'sans-serif' };
cssVariables['--font-heading'] = fonts.heading;
cssVariables['--font-body'] = fonts.body;
```

---

### 12. No Sanitization After synthesizeStyles

**File:** `src/app/api/builder/vibe/route.ts:55`

**Issue:** Styled manifest goes directly to validateAndFix without sanitization for void elements.

**Fix:** Apply sanitizeManifest before validation.

```typescript
import { sanitizeManifest } from '@/utils/manifestSanitizer';

// In applyVibe action
const styledManifest = await synthesizeStyles(model, manifest, generatedMetaphor);
const { manifest: sanitizedManifest } = sanitizeManifest(styledManifest);
const validatedManifest = await validateAndFix(model, sanitizedManifest);
```

---

### 13. Duplicate Definitions Handling

**File:** `src/app/api/builder/vibe/route.ts:172-175`

**Issue:** If same key appears twice, later overwrites earlier silently.

**Fix:** Log warning when duplicate keys detected.

```typescript
const cleanDefs: Record<string, UISpecNode> = {};
Object.entries(parsed.definitions ?? {}).forEach(([key, node]) => {
  if (cleanDefs[key]) {
    console.warn(`Duplicate definition key: ${key}`);
  }
  cleanDefs[key] = lintTailwindClasses(node as UISpecNode);
});
```

---

### 14. Missing refineElement Validation

**File:** `src/app/api/builder/vibe/route.ts:88-94`

**Issue:** `updatedNode` from AI is not validated against schema.

**Fix:** Add basic schema validation or sanitization.

```typescript
const result = await model.generateContent(refinePrompt);
let updatedNode;
try {
  updatedNode = JSON.parse(result.response.text());
} catch {
  return NextResponse.json({ error: 'AI returned invalid JSON for refined element' }, { status: 500 });
}

// Validate required fields exist
if (!updatedNode.id || !updatedNode.type || !updatedNode.styles) {
  return NextResponse.json({ error: 'AI returned incomplete node structure' }, { status: 500 });
}

const lintedNode = lintTailwindClasses(updatedNode);
```

---

### 15. No Timeout on AI Calls

**File:** `src/app/api/builder/vibe/route.ts`

**Issue:** AI calls can hang indefinitely.

**Fix:** Add AbortController with timeout (lower priority - Vercel has maxDuration).

```typescript
// Note: Vercel serverless already has maxDuration = 60
// For additional safety, could add per-call timeout:
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30000);
try {
  const result = await model.generateContent(prompt, { signal: controller.signal });
  // ...
} finally {
  clearTimeout(timeout);
}
```

---

### 16. Missing Content-Type Validation

**File:** `src/app/api/builder/vibe/route.ts:35`

**Issue:** Assumes JSON body without checking Content-Type header.

**Fix:** Validate Content-Type is application/json.

```typescript
export async function POST(request: Request) {
  const contentType = request.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    return NextResponse.json(
      { error: 'Content-Type must be application/json' },
      { status: 415 }
    );
  }
  // ... rest of handler
}
```

---

### 17. generatePhysicalMetaphor Prompt Injection

**File:** `src/app/api/builder/vibe/route.ts:111-121`

**Issue:** User prompt is interpolated directly into AI prompt without sanitization.

**Fix:** Basic input sanitization.

```typescript
function sanitizeUserInput(input: string): string {
  // Remove potential prompt injection patterns
  return input
    .replace(/```/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .slice(0, 1000); // Limit length
}

async function generatePhysicalMetaphor(model: any, userPrompt: string): Promise<string> {
  const sanitizedPrompt = sanitizeUserInput(userPrompt);
  const prompt = `
    TASK: Convert this UI request into a "Physical Material Metaphor".
    USER REQUEST: "${sanitizedPrompt}"
    // ...
  `;
}
```

---

## Low Priority Issues (3)

### 18. Hardcoded Model Names

**Files:** Both route.ts files

**Issue:** `gemini-3-flash-preview` and `gemini-3-pro-preview` hardcoded.

**Fix:** Move to environment variables or config.

```typescript
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
const model = genAI.getGenerativeModel({ model: GEMINI_MODEL, ... });
```

---

### 19. No Rate Limiting

**Files:** Both route.ts files

**Issue:** No protection against API abuse.

**Fix:** Add rate limiting middleware (can use Vercel's built-in or custom).

---

### 20. Inconsistent Error Response Format

**Files:** Both route.ts files

**Issue:** Some errors return `{ error: string }`, others include `rawResponse`.

**Fix:** Standardize error response format.

```typescript
interface ErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}

// Use consistently
return NextResponse.json({ error: 'Message', code: 'ERROR_CODE' }, { status: 500 });
```

---

## Implementation Order

1. **Immediate (Blocks rendering):**
   - Issue 1: Nested `<p>` tags
   - Issue 2: Missing image fallback
   - Issues 4-7: Unsafe JSON.parse calls

2. **High Priority (Improves stability):**
   - Issue 3: Empty string filter
   - Issue 8: Error boundary
   - Issue 9: Definitions null check
   - Issue 11: LayoutPreview null checks
   - Issue 12: Sanitization after synthesizeStyles

3. **Medium Priority (Improves robustness):**
   - Issues 10, 13-17

4. **Low Priority (Nice to have):**
   - Issues 18-20

---

## Verification Checklist

After implementing fixes:

- [ ] Run `npm run typecheck` - passes
- [ ] Run `npm run lint` - passes
- [ ] Run `npm run dev` - server starts
- [ ] Navigate to `/app/design`
- [ ] Upload reference image
- [ ] Generate layout
- [ ] No hydration errors in console
- [ ] No 404 errors for images (placeholder shows instead)
- [ ] Layout renders in canvas
- [ ] Server logs show no JSON parse crashes
- [ ] Safe mode fallback works if validation fails 3x

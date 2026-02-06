---
paths:
  - src/app/api/**
  - src/middleware.ts
---

# API Routes Domain

## Route Structure

All routes in `src/app/api/` follow Next.js 15 App Router patterns.

### AI Builder Routes (Core)

| Route                             | Method | Purpose                  |
| --------------------------------- | ------ | ------------------------ |
| `/api/ai-builder/full-app`        | POST   | Generate complete app    |
| `/api/ai-builder/full-app-stream` | POST   | Streaming app generation |
| `/api/ai-builder/modify`          | POST   | Modify existing app      |
| `/api/ai-builder/apply-diff`      | POST   | Apply code diff          |
| `/api/ai-builder/plan-phases`     | POST   | Generate phase plan      |
| `/api/ai-builder/review`          | POST   | Code quality review      |

### Chat Routes

| Route                       | Method | Purpose                         |
| --------------------------- | ------ | ------------------------------- |
| `/api/builder/chat`         | POST   | Planning conversation           |
| `/api/layout/chat`          | POST   | Layout builder AI (with vision) |
| `/api/layout/video-analyze` | POST   | Video analysis                  |

### Dual AI Planning Routes

| Route                        | Method | Purpose                               |
| ---------------------------- | ------ | ------------------------------------- |
| `/api/planning/start`        | POST   | Initiates dual AI planning session    |
| `/api/planning/stream`       | GET    | SSE stream for pipeline stage updates |
| `/api/planning/intelligence` | POST   | Intelligence gathering endpoint       |

### AI Proxy Routes

| Route             | Method | Purpose                          |
| ----------------- | ------ | -------------------------------- |
| `/api/ai/claude`  | POST   | Claude AI proxy route            |
| `/api/ai/gemini`  | POST   | Gemini AI proxy route            |
| `/api/web-search` | POST   | Live web search for intelligence |

### Wizard Routes

| Route                         | Method | Purpose                              |
| ----------------------------- | ------ | ------------------------------------ |
| `/api/wizard/generate-phases` | POST   | Generate dynamic phases from concept |

### Utility Routes

| Route                  | Method | Purpose            |
| ---------------------- | ------ | ------------------ |
| `/api/generate`        | POST   | Generic generation |
| `/api/images/generate` | POST   | Image generation   |
| `/api/screenshot`      | POST   | Screenshot capture |
| `/api/health`          | GET    | Health check       |

## SSE Streaming Pattern

Most AI routes use Server-Sent Events for streaming:

```typescript
// Route handler pattern
export async function POST(request: Request) {
  const body = await request.json();

  // Validate with Zod
  const validated = schema.parse(body);

  // Create SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Send progress updates
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // AI generation with streaming
        for await (const chunk of generateWithStreaming(validated)) {
          send({ type: 'chunk', content: chunk });
        }
        send({ type: 'done' });
      } catch (error) {
        send({ type: 'error', message: error.message });
      } finally {
        controller.close();
      }
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
```

## Auth Middleware

**Location:** `src/middleware.ts`

Protects routes using Supabase session:

```typescript
// Routes requiring auth
const protectedPaths = ['/api/ai-builder', '/api/builder', '/api/layout'];

// Middleware checks session and redirects if needed
```

## Error Handling Convention

```typescript
// Standard error response
return NextResponse.json(
  {
    error: 'Error message',
    code: 'ERROR_CODE', // Optional
    details: {}, // Optional debug info
  },
  { status: 400 } // 400, 401, 403, 500
);
```

## Request Validation

All routes use Zod for validation:

```typescript
import { z } from 'zod';

const RequestSchema = z.object({
  appConcept: AppConceptSchema,
  options: z
    .object({
      streaming: z.boolean().default(true),
    })
    .optional(),
});

// In handler
const body = RequestSchema.parse(await request.json());
```

## Rate Limiting

Image generation routes have built-in rate limiting:

- DALL-E: 5 requests per minute
- Screenshots: 10 requests per minute

## Critical Dependencies

- `middleware.ts` ← All protected routes depend on this
- Supabase client ← Auth session management
- Anthropic SDK ← Claude API calls (code generation + architecture planning)
- Google GenAI SDK ← Gemini API calls (vision, layout, architecture planning)
- OpenAI SDK ← Embeddings/proxy only
- `planningSessionStore.ts` ← In-memory session store for planning pipeline (TTL-based)

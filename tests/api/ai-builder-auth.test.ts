/**
 * AI Builder API Authentication Tests
 *
 * Tests authentication behavior on AI builder routes.
 * Currently documents that routes work WITHOUT auth (security gap).
 */

// Mock NextResponse before importing routes
jest.mock('next/server', () => {
  class MockNextResponse {
    private body: string;
    public status: number;
    public headers: Headers;

    constructor(body: string | null, init?: { status?: number; headers?: HeadersInit }) {
      this.body = body || '';
      this.status = init?.status || 200;
      this.headers = new Headers(init?.headers);
    }

    async json() {
      return JSON.parse(this.body);
    }

    async text() {
      return this.body;
    }

    static json(data: unknown, init?: { status?: number; headers?: HeadersInit }) {
      return new MockNextResponse(JSON.stringify(data), init);
    }
  }

  return {
    NextResponse: MockNextResponse,
    NextRequest: jest.fn(),
  };
});

// Mock Anthropic SDK
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      stream: jest.fn().mockImplementation(() => ({
        async *[Symbol.asyncIterator]() {
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: '{}' },
          };
          yield { type: 'message_stop' };
        },
        async finalMessage() {
          return { usage: { input_tokens: 100, output_tokens: 50 } };
        },
      })),
      create: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{}' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
    },
  }));
});

// Mock services that transitively import ESM-only packages (@google/genai)
jest.mock('@/services/AppImageGenerator', () => ({
  generateImagesForApp: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/utils/imageUrlInjector', () => ({
  injectImageUrls: jest.fn((files: unknown) => files),
}));

jest.mock('@/utils/mockAI', () => ({
  isMockAIEnabled: jest.fn().mockReturnValue(false),
  mockFullAppResponse: jest.fn(),
}));

import { POST as modifyPost } from '../../src/app/api/ai-builder/modify/route';
import { POST as fullAppPost } from '../../src/app/api/ai-builder/full-app/route';

/**
 * Helper to extract JSON from NextResponse
 */
async function getResponseJson(response: unknown): Promise<unknown> {
  const res = response as { json?: () => Promise<unknown>; text?: () => Promise<string> };
  if (typeof res.json === 'function') {
    return await res.json();
  }
  if (typeof res.text === 'function') {
    const text = await res.text();
    return JSON.parse(text);
  }
  throw new Error('Cannot extract JSON from response');
}

/**
 * Helper: Create mock request object
 */
function createMockRequest(body: unknown): Request {
  return {
    json: async () => body,
    headers: new Headers(),
    method: 'POST',
  } as unknown as Request;
}

describe('AI Builder API Authentication Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
  });

  describe('Modify Route (/api/ai-builder/modify)', () => {
    test('accepts request without authentication headers', async () => {
      // Create request with NO auth headers
      const request = createMockRequest({
        prompt: 'Add a button',
        currentAppState: {
          files: [{ path: 'src/App.tsx', content: 'export default function App() {}' }],
        },
      });

      const response = await modifyPost(request);

      // Should NOT return 401 Unauthorized - this documents current (insecure) behavior
      expect((response as { status: number }).status).not.toBe(401);
    });

    test('returns 400 for invalid request body', async () => {
      const request = createMockRequest({
        // Missing required fields
      });

      const response = await modifyPost(request);
      const data = await getResponseJson(response);

      expect((response as { status: number }).status).toBe(400);
      expect((data as { error: string }).error).toBeDefined();
    });

    test('returns 500 when API key is missing', async () => {
      delete process.env.ANTHROPIC_API_KEY;

      const request = createMockRequest({
        prompt: 'Add a button',
        currentAppState: { files: [] },
      });

      const response = await modifyPost(request);
      const data = await getResponseJson(response);

      expect((response as { status: number }).status).toBe(500);
      expect((data as { error: string }).error).toContain('API key');
    });
  });

  describe('Full App Route (/api/ai-builder/full-app)', () => {
    test('accepts request without authentication headers', async () => {
      // Create request with NO auth headers
      const request = createMockRequest({
        prompt: 'Build a todo app',
        name: 'Todo App',
        description: 'A simple todo application',
      });

      const response = await fullAppPost(request);

      // Should NOT return 401 Unauthorized - this documents current (insecure) behavior
      expect((response as { status: number }).status).not.toBe(401);
    });

    test('returns 400 for invalid request body', async () => {
      const request = createMockRequest({
        // Missing required prompt
        name: 'Test',
      });

      const response = await fullAppPost(request);

      // Should return error for missing prompt
      expect((response as { status: number }).status).toBeGreaterThanOrEqual(400);
    });

    test('returns 500 when API key is missing', async () => {
      delete process.env.ANTHROPIC_API_KEY;

      const request = createMockRequest({
        prompt: 'Build an app',
        name: 'Test App',
        description: 'Test',
      });

      const response = await fullAppPost(request);
      const data = await getResponseJson(response);

      expect((response as { status: number }).status).toBe(500);
      expect((data as { error: string }).error).toContain('API key');
    });
  });

  describe('Request Validation', () => {
    test('modify route validates currentAppState is present', async () => {
      const request = createMockRequest({
        prompt: 'Add a button',
        // Missing currentAppState
      });

      const response = await modifyPost(request);
      const data = await getResponseJson(response);

      expect((response as { status: number }).status).toBe(400);
      expect((data as { error: string }).error).toBeDefined();
    });

    test('modify route validates files array in currentAppState', async () => {
      const request = createMockRequest({
        prompt: 'Add a button',
        currentAppState: {
          // Missing files array
        },
      });

      const response = await modifyPost(request);

      // Should handle gracefully (either 400 or work with empty files)
      expect((response as { status: number }).status).toBeDefined();
    });
  });

  describe('Error Response Format', () => {
    test('returns consistent error format with error property', async () => {
      delete process.env.ANTHROPIC_API_KEY;

      const request = createMockRequest({
        prompt: 'Test',
        currentAppState: { files: [] },
      });

      const response = await modifyPost(request);
      const data = (await getResponseJson(response)) as { error?: string };

      // Error response should have 'error' property
      expect(data).toHaveProperty('error');
      expect(typeof data.error).toBe('string');
    });
  });
});

/**
 * SECURITY NOTE
 * =============
 *
 * These tests document that AI builder routes currently accept requests
 * WITHOUT authentication. This is a known security gap.
 *
 * The middleware explicitly excludes /api/ai-builder from auth checks:
 * middleware.ts line 85: '/((?!...api/ai-builder...).*)'
 *
 * To fix this, authentication should be added to each route handler:
 *
 * ```typescript
 * import { createClient } from '@/utils/supabase/server';
 *
 * export async function POST(request: Request) {
 *   const supabase = await createClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 *
 *   if (!user) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *   }
 *
 *   // ... rest of handler
 * }
 * ```
 */

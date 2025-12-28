/**
 * Builder Chat Route Tests
 *
 * Tests the /api/builder/chat endpoint for ACT mode conversations.
 * Covers intent detection, response types, and error handling.
 */

// Mock NextResponse before importing route
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

// Mock response content for different scenarios
let mockResponseContent = 'I can help you with that.';
let mockShouldThrow = false;
let mockErrorMessage = '';

// Mock Anthropic SDK
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockImplementation(async () => {
        if (mockShouldThrow) {
          throw new Error(mockErrorMessage);
        }
        return {
          content: [{ type: 'text', text: mockResponseContent }],
          usage: {
            input_tokens: 500,
            output_tokens: 200,
          },
        };
      }),
    },
  }));
});

import { POST } from '../../src/app/api/builder/chat/route';

// Helper functions
function setMockResponse(content: string) {
  mockResponseContent = content;
  mockShouldThrow = false;
}

function setMockError(message: string) {
  mockShouldThrow = true;
  mockErrorMessage = message;
}

function resetMock() {
  mockResponseContent = 'I can help you with that.';
  mockShouldThrow = false;
  mockErrorMessage = '';
}

function createMockRequest(body: unknown): Request {
  return {
    json: async () => body,
    headers: new Headers(),
    method: 'POST',
  } as unknown as Request;
}

async function getResponseJson(response: unknown): Promise<unknown> {
  const res = response as { json?: () => Promise<unknown> };
  if (typeof res.json === 'function') {
    return await res.json();
  }
  throw new Error('Cannot extract JSON from response');
}

describe('Builder Chat Route Tests', () => {
  beforeEach(() => {
    resetMock();
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
  });

  describe('Basic Request Handling', () => {
    test('accepts valid request with message and history', async () => {
      setMockResponse('Here is how you can build a todo app...');

      const request = createMockRequest({
        message: 'How do I build a todo app?',
        conversationHistory: [],
      });

      const response = await POST(request);
      const data = (await getResponseJson(response)) as { message?: string };

      expect((response as { status: number }).status).toBe(200);
      expect(data.message).toBeDefined();
    });

    test('handles request with conversation history', async () => {
      setMockResponse('Based on our discussion, I recommend...');

      const request = createMockRequest({
        message: 'What do you recommend?',
        conversationHistory: [
          { role: 'user', content: 'I want to build an app' },
          { role: 'assistant', content: 'What kind of app?' },
        ],
      });

      const response = await POST(request);
      const data = (await getResponseJson(response)) as { message?: string };

      expect((response as { status: number }).status).toBe(200);
      expect(data.message).toBeDefined();
    });

    test('handles request with context summary', async () => {
      setMockResponse('Continuing from where we left off...');

      const request = createMockRequest({
        message: 'Continue with the implementation',
        conversationHistory: [],
        contextSummary: 'User wants a React todo app with dark mode',
      });

      const response = await POST(request);

      expect((response as { status: number }).status).toBe(200);
    });

    test('handles request with current app state', async () => {
      setMockResponse('I see you have a todo app. Let me suggest...');

      const request = createMockRequest({
        message: 'How can I improve this?',
        conversationHistory: [],
        currentAppState: {
          name: 'Todo App',
          files: [{ path: 'src/App.tsx', content: 'export default function App() {}' }],
          appType: 'react',
        },
      });

      const response = await POST(request);

      expect((response as { status: number }).status).toBe(200);
    });
  });

  describe('Response Type Detection', () => {
    test('returns responseType in response', async () => {
      setMockResponse('I can help you with that question.');

      const request = createMockRequest({
        message: 'What is React?',
        conversationHistory: [],
      });

      const response = await POST(request);
      const data = (await getResponseJson(response)) as { responseType?: string };

      expect((response as { status: number }).status).toBe(200);
      expect(data.responseType).toBeDefined();
    });

    test('returns token usage stats', async () => {
      setMockResponse('Here is my response.');

      const request = createMockRequest({
        message: 'Tell me about React',
        conversationHistory: [],
      });

      const response = await POST(request);
      const data = (await getResponseJson(response)) as {
        tokensUsed?: { input: number; output: number };
      };

      expect((response as { status: number }).status).toBe(200);
      expect(data.tokensUsed).toBeDefined();
      expect(data.tokensUsed?.input).toBeGreaterThan(0);
      expect(data.tokensUsed?.output).toBeGreaterThan(0);
    });

    test('returns build trigger flags', async () => {
      setMockResponse('I can build that for you.');

      const request = createMockRequest({
        message: 'Build me a todo app',
        conversationHistory: [],
      });

      const response = await POST(request);
      const data = (await getResponseJson(response)) as {
        shouldTriggerBuild?: boolean;
        shouldTriggerModify?: boolean;
        shouldTriggerDesign?: boolean;
      };

      expect((response as { status: number }).status).toBe(200);
      expect(typeof data.shouldTriggerBuild).toBe('boolean');
      expect(typeof data.shouldTriggerModify).toBe('boolean');
      expect(typeof data.shouldTriggerDesign).toBe('boolean');
    });
  });

  describe('Error Handling', () => {
    test('returns 500 when API key is missing', async () => {
      delete process.env.ANTHROPIC_API_KEY;

      const request = createMockRequest({
        message: 'Hello',
        conversationHistory: [],
      });

      const response = await POST(request);
      const data = (await getResponseJson(response)) as { error?: string };

      expect((response as { status: number }).status).toBe(500);
      expect(data.error).toContain('API key');
    });

    test('handles API errors gracefully', async () => {
      setMockError('Rate limit exceeded');

      const request = createMockRequest({
        message: 'Hello',
        conversationHistory: [],
      });

      const response = await POST(request);
      const data = (await getResponseJson(response)) as { error?: string };

      expect((response as { status: number }).status).toBeGreaterThanOrEqual(400);
      expect(data.error).toBeDefined();
    });
  });

  describe('Image Support', () => {
    test('accepts request with image', async () => {
      setMockResponse('I can see the image you shared.');

      const request = createMockRequest({
        message: 'What do you see in this image?',
        conversationHistory: [],
        image:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        hasImage: true,
      });

      const response = await POST(request);

      expect((response as { status: number }).status).toBe(200);
    });
  });
});

describe('Intent Analysis Logic', () => {
  // Test the patterns directly (simulating what the route does)

  describe('Build Intent Patterns', () => {
    const buildPatterns = [
      /^(build|create|make|generate)\s+(it|this|that)$/i,
      /^(build|create|make|generate)\s+(me\s+)?(a|an|the)?\s*/i,
      /^(give me|show me)\s+(a|an)?\s*(new\s+)?(app|component|page)/i,
      /^(implement|start)\s+(it|this|that|the\s+plan|building)$/i,
      /^(go|do\s+it|let'?s\s+go|let'?s\s+build|yes|yep|yeah|sure|ok|okay)$/i,
    ];

    test('detects "build it" as build intent', () => {
      const message = 'build it';
      const matches = buildPatterns.some((p) => p.test(message.trim()));
      expect(matches).toBe(true);
    });

    test('detects "create a todo app" as build intent', () => {
      const message = 'create a todo app';
      const matches = buildPatterns.some((p) => p.test(message.trim()));
      expect(matches).toBe(true);
    });

    test('detects "let\'s go" as build intent (confirmation)', () => {
      const message = "let's go";
      const matches = buildPatterns.some((p) => p.test(message.trim()));
      expect(matches).toBe(true);
    });

    test('detects "yes" as build intent (confirmation)', () => {
      const message = 'yes';
      const matches = buildPatterns.some((p) => p.test(message.trim()));
      expect(matches).toBe(true);
    });

    test('does not detect questions as build intent', () => {
      const message = 'What is React?';
      const matches = buildPatterns.some((p) => p.test(message.trim()));
      expect(matches).toBe(false);
    });
  });

  describe('Modify Intent Patterns', () => {
    const modifyPatterns = [
      /^(change|update|fix|modify|edit|add|remove|delete)\s/i,
      /(change|update|fix|modify)\s+(the|this|my)/i,
    ];

    test('detects "change the button color" as modify intent', () => {
      const message = 'change the button color';
      const matches = modifyPatterns.some((p) => p.test(message.trim()));
      expect(matches).toBe(true);
    });

    test('detects "fix this bug" as modify intent', () => {
      const message = 'fix this bug';
      const matches = modifyPatterns.some((p) => p.test(message.trim()));
      expect(matches).toBe(true);
    });

    test('detects "add a new feature" as modify intent', () => {
      const message = 'add a new feature';
      const matches = modifyPatterns.some((p) => p.test(message.trim()));
      expect(matches).toBe(true);
    });
  });

  describe('Design Intent Patterns', () => {
    const designPatterns = [
      /^(change|update|fix|make|adjust)\s+(the\s+)?(color|font|background|shadow|spacing|border|style|header|footer|sidebar|card|button)/i,
      /(more|less)\s+(rounded|subtle|dark|light|spacious|compact|bold|soft)/i,
      /change\s+.*\s+to\s+#[0-9A-Fa-f]{3,6}/i,
      /(glassmorphism|neumorphism|gradient|animation|effect|hover\s+effect)/i,
    ];

    test('detects "make it more rounded" as design intent', () => {
      const message = 'make it more rounded';
      const matches = designPatterns.some((p) => p.test(message.trim()));
      expect(matches).toBe(true);
    });

    test('detects "change the color to #ff0000" as design intent', () => {
      const message = 'change the color to #ff0000';
      const matches = designPatterns.some((p) => p.test(message.trim()));
      expect(matches).toBe(true);
    });

    test('detects "add glassmorphism" as design intent', () => {
      const message = 'add glassmorphism effect';
      const matches = designPatterns.some((p) => p.test(message.trim()));
      expect(matches).toBe(true);
    });

    test('detects "adjust the spacing" as design intent', () => {
      const message = 'adjust the spacing';
      const matches = designPatterns.some((p) => p.test(message.trim()));
      expect(matches).toBe(true);
    });
  });

  describe('Clarification Detection', () => {
    test('detects "would you like me to" as clarification', () => {
      const response = 'Would you like me to implement this feature?';
      const isClarification =
        response.toLowerCase().includes('would you like me to') ||
        response.toLowerCase().includes('do you want me to') ||
        response.toLowerCase().includes('should i');
      expect(isClarification).toBe(true);
    });

    test('detects "let me know if" as clarification', () => {
      const response = 'Let me know if you need more details.';
      const isClarification = response.toLowerCase().includes('let me know if');
      expect(isClarification).toBe(true);
    });
  });
});

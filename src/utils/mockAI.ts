/**
 * Mock AI Responses
 *
 * Provides pre-built mock responses for testing without calling Claude API.
 * Only used when NEXT_PUBLIC_MOCK_AI=true in development mode.
 *
 * Benefits:
 * - Instant responses (~50ms vs 10-30s)
 * - No API credits used
 * - Works offline
 * - Consistent responses for testing
 */

import { DEBUG } from './debug';

/**
 * Check if mock AI mode is enabled
 * SAFETY: Only works in development AND requires explicit opt-in
 */
export function isMockAIEnabled(): boolean {
  return DEBUG.MOCK_AI;
}

/**
 * Mock response for full app generation
 */
export const mockFullAppResponse = {
  files: [
    {
      filename: 'App.tsx',
      content: `import React, { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          Mock App Preview
        </h1>
        <p className="text-gray-600 mb-4 text-center">
          This is a mock response. Real AI generation is disabled.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setCount(c => c - 1)}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
          >
            -
          </button>
          <span className="text-2xl font-mono w-16 text-center">{count}</span>
          <button
            onClick={() => setCount(c => c + 1)}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
          >
            +
          </button>
        </div>
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm text-center">
            ⚠️ Mock AI Mode Active
          </p>
        </div>
      </div>
    </div>
  );
}`,
    },
    {
      filename: 'index.css',
      content: `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}`,
    },
  ],
  explanation:
    '**Mock Response** - This is a placeholder response because Mock AI Mode is enabled. To use real AI generation, disable NEXT_PUBLIC_MOCK_AI in your environment.',
  tokensUsed: {
    input: 0,
    output: 0,
    cached: 0,
  },
};

/**
 * Mock response for component generation
 */
export const mockComponentResponse = {
  code: `import React from 'react';

interface MockComponentProps {
  title?: string;
}

export function MockComponent({ title = 'Mock Component' }: MockComponentProps) {
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
      <p className="text-gray-600 mt-2">
        This is a mock component. Real AI is disabled.
      </p>
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
        <span className="text-yellow-800 text-sm">⚠️ Mock AI Mode</span>
      </div>
    </div>
  );
}

export default MockComponent;`,
  explanation: 'Mock component generated because NEXT_PUBLIC_MOCK_AI is enabled.',
  tokensUsed: { input: 0, output: 0, cached: 0 },
};

/**
 * Mock response for code modification
 */
export const mockModifyResponse = {
  diffs: [
    {
      filename: 'App.tsx',
      hunks: [
        {
          oldStart: 1,
          oldLines: 3,
          newStart: 1,
          newLines: 4,
          content: `+// Mock modification - AI is disabled
 import React from 'react';

+// This change was simulated`,
        },
      ],
    },
  ],
  explanation: 'Mock modification - no actual AI analysis performed.',
  tokensUsed: { input: 0, output: 0, cached: 0 },
};

/**
 * Mock response for chat/Q&A
 */
export const mockChatResponse = {
  message: `I'm currently in **Mock AI Mode**, so I can't provide real AI responses.

To enable real AI:
1. Remove \`NEXT_PUBLIC_MOCK_AI=true\` from your environment
2. Restart the development server

This mode is useful for:
- Testing UI without API calls
- Offline development
- Faster iteration on non-AI features`,
  tokensUsed: { input: 0, output: 0, cached: 0 },
};

/**
 * Mock response for phase generation
 */
export const mockPhaseResponse = {
  phases: [
    {
      id: 'mock-phase-1',
      name: 'Mock Foundation',
      description: 'This is a mock phase - AI is disabled',
      features: ['Mock feature 1', 'Mock feature 2'],
      estimatedTokens: 0,
      dependencies: [],
    },
    {
      id: 'mock-phase-2',
      name: 'Mock Features',
      description: 'Second mock phase',
      features: ['Mock feature 3'],
      estimatedTokens: 0,
      dependencies: ['mock-phase-1'],
    },
  ],
  totalPhases: 2,
  explanation: 'Mock phases generated - real AI analysis is disabled.',
  tokensUsed: { input: 0, output: 0, cached: 0 },
};

/**
 * Mock streaming response generator
 * Simulates SSE events for streaming endpoints
 */
export async function* mockStreamingResponse(): AsyncGenerator<string> {
  yield 'event: start\ndata: {"timestamp":"' + new Date().toISOString() + '"}\n\n';

  await delay(100);
  yield 'event: thinking\ndata: {"content":"Mock AI is processing..."}\n\n';

  await delay(200);
  yield 'event: file_start\ndata: {"filename":"App.tsx","index":0}\n\n';

  await delay(100);
  yield 'event: file_progress\ndata: {"content":"// Mock generated code\\n","progress":50}\n\n';

  await delay(100);
  yield 'event: file_complete\ndata: {"filename":"App.tsx","totalChars":100}\n\n';

  await delay(100);
  yield `event: complete\ndata: ${JSON.stringify({
    files: mockFullAppResponse.files,
    tokensUsed: { input: 0, output: 0, cached: 0 },
    isMock: true,
  })}\n\n`;
}

/**
 * Get mock response based on route type
 */
export function getMockResponse(
  routeType: 'full-app' | 'component' | 'modify' | 'chat' | 'phases'
): unknown {
  const responses: Record<string, unknown> = {
    'full-app': mockFullAppResponse,
    component: mockComponentResponse,
    modify: mockModifyResponse,
    chat: mockChatResponse,
    phases: mockPhaseResponse,
  };

  return responses[routeType] || mockChatResponse;
}

/**
 * Create a mock Response object for API routes
 */
export function createMockAPIResponse(
  routeType: 'full-app' | 'component' | 'modify' | 'chat' | 'phases'
): Response {
  const data = getMockResponse(routeType) as Record<string, unknown>;
  return Response.json({
    ...data,
    _mock: true,
    _mockWarning: 'This response was generated by Mock AI Mode. Set NEXT_PUBLIC_MOCK_AI=false for real AI.',
  });
}

/**
 * Helper delay function
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

# Server-Side Preview Snapshot Plan

## Overview

This document outlines the implementation plan for server-side preview snapshots using Puppeteer. This feature will allow the AI to "see" the rendered preview by capturing screenshots on the server, bypassing browser cross-origin restrictions.

## Problem Statement

The Sandpack preview runs in a cross-origin iframe (`col.csbops.io`), which prevents client-side screenshot capture due to browser security restrictions. Server-side rendering with Puppeteer solves this by rendering the app code in a controlled environment.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Browser)                         │
│                                                              │
│  Triggers:                                                   │
│  1. User asks "can you see?", "what does it look like?"     │
│  2. After successful app build/modification                  │
│  3. Manual "Snapshot" button click                          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  POST /api/preview-snapshot                          │   │
│  │  Body: { files: [...], dependencies: {...} }         │   │
│  └────────────────────────┬─────────────────────────────┘   │
└───────────────────────────┼─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Server (API Route)                         │
│                                                              │
│  1. Receive app files and dependencies                      │
│  2. Generate HTML with React + Tailwind CDN                 │
│  3. Launch Puppeteer (headless Chrome)                      │
│  4. Load HTML, wait for React to render                     │
│  5. page.screenshot() → PNG buffer                          │
│  6. Convert to base64, return to client                     │
│  7. Close browser instance                                   │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Client (Browser)                         │
│                                                              │
│  1. Receive base64 screenshot                               │
│  2. Store in state (latestSnapshot)                         │
│  3. Include with next AI message if relevant                │
│  4. Display thumbnail indicator showing snapshot available  │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Steps

### Phase 1: API Endpoint Setup

#### 1.1 Install Dependencies

```bash
npm install puppeteer puppeteer-core @sparticuz/chromium
```

**Note:** For Vercel/serverless, use `@sparticuz/chromium` for a lightweight Chromium binary.

#### 1.2 Create API Route

**File:** `src/app/api/preview-snapshot/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
// For serverless: import chromium from '@sparticuz/chromium';

interface SnapshotRequest {
  files: Array<{ path: string; content: string }>;
  dependencies: Record<string, string>;
  appName?: string;
  viewport?: { width: number; height: number };
}

export async function POST(request: NextRequest) {
  try {
    const body: SnapshotRequest = await request.json();
    
    // Generate HTML from app files
    const html = generatePreviewHtml(body);
    
    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({
      width: body.viewport?.width || 1280,
      height: body.viewport?.height || 720,
    });
    
    // Load HTML content
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Wait for React to render
    await page.waitForSelector('#root > *', { timeout: 10000 });
    
    // Small delay for animations/transitions
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Take screenshot
    const screenshot = await page.screenshot({
      type: 'png',
      encoding: 'base64',
    });
    
    await browser.close();
    
    return NextResponse.json({
      success: true,
      screenshot: `data:image/png;base64,${screenshot}`,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Snapshot error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

function generatePreviewHtml(data: SnapshotRequest): string {
  // Find App.tsx content
  const appFile = data.files.find(f => 
    f.path.includes('App.tsx') || f.path.includes('App.jsx')
  );
  
  if (!appFile) {
    throw new Error('No App file found');
  }
  
  // Transform JSX to JS (simplified - may need Babel for complex cases)
  // For production, consider using esbuild or Babel transform
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.appName || 'Preview'}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${appFile.content}
    
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  </script>
</body>
</html>`;
}
```

### Phase 2: Client Integration

#### 2.1 Add Snapshot Service Hook

**File:** `src/hooks/usePreviewSnapshot.ts`

```typescript
import { useState, useCallback } from 'react';

interface SnapshotResult {
  success: boolean;
  screenshot?: string;
  error?: string;
  timestamp?: string;
}

export function usePreviewSnapshot() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [latestSnapshot, setLatestSnapshot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const captureSnapshot = useCallback(async (
    files: Array<{ path: string; content: string }>,
    dependencies: Record<string, string>,
    options?: { width?: number; height?: number }
  ): Promise<SnapshotResult> => {
    setIsCapturing(true);
    setError(null);
    
    try {
      const response = await fetch('/api/preview-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files,
          dependencies,
          viewport: {
            width: options?.width || 1280,
            height: options?.height || 720,
          },
        }),
      });
      
      const result: SnapshotResult = await response.json();
      
      if (result.success && result.screenshot) {
        setLatestSnapshot(result.screenshot);
      } else {
        setError(result.error || 'Failed to capture snapshot');
      }
      
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Network error';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsCapturing(false);
    }
  }, []);

  const clearSnapshot = useCallback(() => {
    setLatestSnapshot(null);
    setError(null);
  }, []);

  return {
    captureSnapshot,
    clearSnapshot,
    isCapturing,
    latestSnapshot,
    error,
  };
}
```

#### 2.2 Integrate with AIBuilder

Add to `AIBuilder.tsx`:

```typescript
// Import the hook
import { usePreviewSnapshot } from '@/hooks/usePreviewSnapshot';

// Inside the component
const { captureSnapshot, latestSnapshot, isCapturing } = usePreviewSnapshot();

// Auto-capture after successful build
useEffect(() => {
  if (currentComponent && !isCapturing) {
    const appData = JSON.parse(currentComponent.code);
    captureSnapshot(appData.files, appData.dependencies);
  }
}, [currentComponent?.id]); // Only on component change

// Include in AI requests when user asks about visuals
const sendMessage = async () => {
  // ... existing code ...
  
  // Detect visual questions
  const isVisualQuestion = /can you see|what does it look like|show me|preview|screenshot/i.test(userInput);
  
  if (isVisualQuestion && latestSnapshot) {
    requestBody.previewSnapshot = latestSnapshot;
    requestBody.hasSnapshot = true;
  }
  
  // ... rest of request ...
};
```

### Phase 3: "Can You See" Detection

#### 3.1 Visual Question Patterns

```typescript
const VISUAL_QUESTION_PATTERNS = [
  /can you see/i,
  /what does it look like/i,
  /how does it look/i,
  /show me/i,
  /look at (the|my) (preview|app|screen)/i,
  /see (the|my) (preview|app|screen)/i,
  /check (the|my) (preview|app|screen)/i,
  /what('s| is) (on|in) (the|my) (screen|preview)/i,
  /screenshot/i,
  /visual/i,
];

function isVisualQuestion(message: string): boolean {
  return VISUAL_QUESTION_PATTERNS.some(pattern => pattern.test(message));
}
```

#### 3.2 Smart Response Flow

When visual question detected:
1. Check if snapshot exists and is recent (< 30 seconds old)
2. If not, trigger new snapshot capture
3. Include snapshot in AI request
4. AI can now describe what it "sees"

### Phase 4: Serverless Optimization (Vercel)

For deployment on Vercel, use lightweight Chromium:

```typescript
// src/app/api/preview-snapshot/route.ts
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export async function POST(request: NextRequest) {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });
  // ... rest of implementation
}
```

**vercel.json configuration:**
```json
{
  "functions": {
    "src/app/api/preview-snapshot/route.ts": {
      "memory": 1024,
      "maxDuration": 30
    }
  }
}
```

## File Structure

```
src/
├── app/
│   └── api/
│       └── preview-snapshot/
│           └── route.ts          # Puppeteer snapshot endpoint
├── hooks/
│   └── usePreviewSnapshot.ts     # Client-side snapshot hook
├── utils/
│   └── visualDetection.ts        # Visual question detection
└── components/
    └── AIBuilder.tsx             # Integration point
```

## API Reference

### POST /api/preview-snapshot

**Request:**
```json
{
  "files": [
    { "path": "src/App.tsx", "content": "..." }
  ],
  "dependencies": {
    "react": "^18.0.0"
  },
  "appName": "My App",
  "viewport": {
    "width": 1280,
    "height": 720
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "screenshot": "data:image/png;base64,...",
  "timestamp": "2024-12-01T12:00:00.000Z"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Error message"
}
```

## Considerations

### Performance
- Puppeteer cold start: ~2-3 seconds
- Screenshot capture: ~1-2 seconds
- Consider caching recent snapshots
- Use connection pooling for high traffic

### Cost (Vercel)
- Serverless function execution time
- Memory usage (1GB recommended for Puppeteer)
- Consider rate limiting

### Security
- Validate and sanitize input code
- Set execution timeout
- Isolate Puppeteer process
- Don't expose sensitive data in screenshots

### Limitations
- Complex animations may not render correctly
- External API calls in the app won't work
- Large apps may timeout
- Some CSS features may render differently

## Testing

```typescript
// tests/preview-snapshot.test.ts
describe('Preview Snapshot API', () => {
  it('should capture screenshot of simple React app', async () => {
    const response = await fetch('/api/preview-snapshot', {
      method: 'POST',
      body: JSON.stringify({
        files: [{
          path: 'App.tsx',
          content: 'export default function App() { return <h1>Hello</h1>; }'
        }],
        dependencies: {}
      })
    });
    
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.screenshot).toMatch(/^data:image\/png;base64,/);
  });
});
```

## Rollout Plan

1. **Week 1:** Implement API endpoint, test locally
2. **Week 2:** Add client hook and integration
3. **Week 3:** Add visual question detection
4. **Week 4:** Deploy to staging, performance testing
5. **Week 5:** Production release with monitoring

## Success Metrics

- Screenshot capture success rate > 95%
- Average capture time < 5 seconds
- User satisfaction with AI "vision" responses
- Reduction in user complaints about AI not seeing changes

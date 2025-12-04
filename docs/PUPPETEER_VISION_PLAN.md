# Plan: Server-Side Screenshot with Puppeteer

Enable the AI to see the live preview by capturing screenshots server-side using Puppeteer. This approach bypasses all client-side security restrictions (CORS, tainted canvas, iframe sandboxing).

## Why Puppeteer?

| Approach | Problem |
|----------|---------|
| `html2canvas` in iframe | Fails due to Sandpack iframe sandbox restrictions |
| `html2canvas` from parent | Cross-origin iframe security blocks access |
| Screen Capture API | Requires user permission popup every time |
| **Puppeteer (server-side)** | ✅ Full control, no security restrictions |

## Architecture Overview

```
┌─────────────────┐     POST /api/screenshot     ┌──────────────────┐
│   Client        │  ─────────────────────────►  │   Next.js API    │
│   (AIBuilder)   │     { html, css, deps }      │   Route          │
│                 │  ◄─────────────────────────  │                  │
│                 │     { image: base64 }        │                  │
└─────────────────┘                              └────────┬─────────┘
                                                          │
                                                          ▼
                                                 ┌──────────────────┐
                                                 │   Puppeteer      │
                                                 │   (Headless      │
                                                 │   Chrome)        │
                                                 └──────────────────┘
```

## Implementation Steps

### Phase 1: Install Dependencies

```bash
npm install puppeteer esbuild
```

- **puppeteer** - Headless Chrome for screenshots
- **esbuild** - Ultra-fast bundler to compile multi-file apps (handles imports, TypeScript, JSX)

**Note for Railway:** Regular `puppeteer` works fine since Railway runs full containers (not serverless).

---

### Phase 2: Create Screenshot API Route

**File:** `src/app/api/screenshot/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import puppeteer, { Browser } from 'puppeteer';
import { buildPreviewHtml } from '@/utils/previewHtmlBuilder';

// Browser singleton for connection pooling (avoids cold start per request)
let browserInstance: Browser | null = null;
let browserLastUsed = 0;
const BROWSER_IDLE_TIMEOUT = 60000; // Close after 1 min idle

async function getBrowser(): Promise<Browser> {
  browserLastUsed = Date.now();

  if (browserInstance?.connected) {
    return browserInstance;
  }

  browserInstance = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',  // Reduce memory in containers
    ],
  });

  // Auto-close browser after idle timeout
  const checkIdle = setInterval(async () => {
    if (Date.now() - browserLastUsed > BROWSER_IDLE_TIMEOUT && browserInstance) {
      await browserInstance.close().catch(() => {});
      browserInstance = null;
      clearInterval(checkIdle);
    }
  }, 10000);

  return browserInstance;
}

export async function POST(req: NextRequest) {
  let page = null;

  try {
    const { files, name, dependencies, width = 1280, height = 720 } = await req.json();

    if (!files || !Array.isArray(files)) {
      return NextResponse.json({ error: 'Files array required' }, { status: 400 });
    }

    // Build HTML with bundled code
    const html = await buildPreviewHtml({ files, name, dependencies });

    const browser = await getBrowser();
    page = await browser.newPage();
    await page.setViewport({ width, height });

    // Set timeout for page load
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 10000
    });

    // Wait for React to render
    await new Promise(resolve => setTimeout(resolve, 800));

    const screenshot = await page.screenshot({
      type: 'jpeg',
      quality: 80,
      encoding: 'base64',
    });

    return NextResponse.json({
      image: `data:image/jpeg;base64,${screenshot}`,
      width,
      height
    });
  } catch (error) {
    console.error('Screenshot error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to capture screenshot' },
      { status: 500 }
    );
  } finally {
    // Always close the page (but keep browser open for reuse)
    if (page) {
      await page.close().catch(() => {});
    }
  }
}
```

---

### Phase 3: Create HTML Builder Utility (with esbuild)

**File:** `src/utils/previewHtmlBuilder.ts`

Uses **esbuild** to bundle multi-file apps. This handles:
- ✅ Import statements between files (`import Header from './Header'`)
- ✅ TypeScript/TSX compilation
- ✅ Tree shaking unused code
- ✅ Fast (~5-10ms for typical apps)

```typescript
import * as esbuild from 'esbuild';

interface AppFile {
  path: string;
  content: string;
  description?: string;
}

interface BuildInput {
  files: AppFile[];
  name?: string;
  dependencies?: Record<string, string>;
}

// Virtual file system plugin for esbuild
function virtualFsPlugin(files: AppFile[]): esbuild.Plugin {
  const fileMap = new Map<string, string>();

  // Normalize paths and build lookup map
  files.forEach(f => {
    let path = f.path;
    if (path.startsWith('src/')) path = path.slice(4);
    if (!path.startsWith('/')) path = '/' + path;
    fileMap.set(path, f.content);

    // Also map without extension for import resolution
    const withoutExt = path.replace(/\.(tsx?|jsx?)$/, '');
    if (!fileMap.has(withoutExt)) {
      fileMap.set(withoutExt, f.content);
    }
  });

  return {
    name: 'virtual-fs',
    setup(build) {
      // Resolve imports to virtual paths
      build.onResolve({ filter: /^\./ }, args => {
        const resolved = new URL(args.path, `file://${args.importer}`).pathname;
        // Try exact match, then with extensions
        for (const ext of ['', '.tsx', '.ts', '.jsx', '.js']) {
          if (fileMap.has(resolved + ext)) {
            return { path: resolved + ext, namespace: 'virtual' };
          }
        }
        return { path: resolved, namespace: 'virtual' };
      });

      // Load virtual files
      build.onLoad({ filter: /.*/, namespace: 'virtual' }, args => {
        const content = fileMap.get(args.path);
        if (content) {
          return {
            contents: content,
            loader: args.path.endsWith('.tsx') ? 'tsx' :
                    args.path.endsWith('.ts') ? 'ts' :
                    args.path.endsWith('.jsx') ? 'jsx' : 'js'
          };
        }
        return { contents: '', loader: 'js' };
      });

      // Handle external packages (React, lucide-react, etc.)
      build.onResolve({ filter: /^[^./]/ }, args => {
        return { path: args.path, external: true };
      });
    }
  };
}

export async function buildPreviewHtml(input: BuildInput): Promise<string> {
  const { files, name = 'Preview', dependencies = {} } = input;

  // Find entry point
  const entryFile = files.find(f =>
    f.path === 'App.tsx' ||
    f.path === 'src/App.tsx' ||
    f.path.endsWith('/App.tsx')
  );

  if (!entryFile) {
    throw new Error('No App.tsx entry point found');
  }

  // Create entry wrapper that renders App
  const entryCode = `
    import App from './App';
    import { createRoot } from 'react-dom/client';
    const root = createRoot(document.getElementById('root'));
    root.render(<App />);
  `;

  const allFiles = [
    ...files,
    { path: '/entry.tsx', content: entryCode }
  ];

  // Bundle with esbuild
  const result = await esbuild.build({
    stdin: {
      contents: entryCode,
      resolveDir: '/',
      loader: 'tsx'
    },
    bundle: true,
    write: false,
    format: 'iife',
    target: 'es2020',
    jsx: 'automatic',
    minify: false,
    plugins: [virtualFsPlugin(allFiles)],
    external: ['react', 'react-dom', 'react-dom/client', 'lucide-react'],
    define: {
      'process.env.NODE_ENV': '"production"'
    }
  });

  const bundledCode = result.outputFiles[0].text;

  // Collect CSS
  const cssFiles = files.filter(f => f.path.endsWith('.css'));
  const cssContent = cssFiles.map(f => f.content).join('\n');

  // Escape for HTML
  const escapedName = name.replace(/[<>&"']/g, c =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] || c)
  );

  // Check for common dependencies
  const hasLucide = 'lucide-react' in dependencies;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapedName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  ${hasLucide ? '<script src="https://unpkg.com/lucide-react@latest/dist/umd/lucide-react.min.js"></script>' : ''}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    ${cssContent}
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    // Provide React globals for the bundle
    window.React = React;
    window.ReactDOM = ReactDOM;
    ${hasLucide ? 'window.LucideReact = lucide;' : ''}
  </script>
  <script>
    ${bundledCode}
  </script>
</body>
</html>`;
}
```

**Why esbuild?**
- Handles `import X from './Component'` between files
- Compiles TypeScript + JSX in ~5ms
- Tree-shakes unused exports
- No Babel runtime needed

---

### Phase 4: Add Capture Function to PowerfulPreview

**File:** `src/components/PowerfulPreview.tsx`

Add props and expose capture functionality:

```typescript
interface PowerfulPreviewProps {
  appDataJson: string;
  isFullscreen?: boolean;
  onCaptureReady?: (captureFunc: () => Promise<string | null>) => void;
}
```

The capture function sends files to the API (bundling happens server-side):

```typescript
const capturePreview = async (): Promise<string | null> => {
  try {
    const appData = JSON.parse(appDataJson);

    const response = await fetch('/api/screenshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: appData.files,
        name: appData.name,
        dependencies: appData.dependencies,
        width: 1280,
        height: 720
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Screenshot failed');
    }

    const { image } = await response.json();
    return image;
  } catch (error) {
    console.error('Capture failed:', error);
    return null;
  }
};

// Pass to parent via callback
useEffect(() => {
  onCaptureReady?.(capturePreview);
}, [appDataJson]);
```

---

### Phase 5: Add Capture Button to FullAppPreview

**File:** `src/components/FullAppPreview.tsx`

Add a camera button that triggers capture:

```tsx
const [isCapturing, setIsCapturing] = useState(false);
const [captureSuccess, setCaptureSuccess] = useState(false);

const handleCapture = async () => {
  if (!captureFunc) return;

  setIsCapturing(true);
  const image = await captureFunc();
  setIsCapturing(false);

  if (image) {
    setCaptureSuccess(true);
    onScreenshot?.(image);
    setTimeout(() => setCaptureSuccess(false), 2000);
  }
};

// In JSX:
<button
  onClick={handleCapture}
  disabled={isCapturing}
  className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50"
  title="Capture for AI"
>
  {isCapturing ? (
    <Loader2 className="w-4 h-4 animate-spin" />
  ) : captureSuccess ? (
    <Check className="w-4 h-4 text-green-400" />
  ) : (
    <Camera className="w-4 h-4" />
  )}
</button>
```

---

### Phase 6: Wire to AIBuilder

**File:** `src/components/AIBuilder.tsx`

Handle the captured screenshot:

```typescript
const handleScreenshot = (image: string) => {
  setUploadedImage(image);
  // Show toast notification
  toast.success('📸 Preview captured - will be sent with next message');
};

// Pass to FullAppPreview:
<FullAppPreview
  // ...existing props
  onScreenshot={handleScreenshot}
/>
```

---

### Phase 7: Railway Production Deployment

Railway runs Docker containers with full system access, so Puppeteer works natively. Just need to ensure Chromium dependencies are installed.

**Option A: Add to `package.json` scripts (Recommended)**

```json
{
  "scripts": {
    "postinstall": "npx puppeteer browsers install chrome"
  }
}
```

**Option B: Use a Dockerfile**

If you have a `Dockerfile`, add Chromium dependencies:

```dockerfile
FROM node:20-slim

# Install Chromium dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

**Option C: Railway Nixpacks (Default)**

Railway auto-detects Node.js and uses Nixpacks. Add a `railway.toml`:

```toml
[build]
nixPkgs = ["chromium"]

[deploy]
startCommand = "npm start"
```

And set environment variable in Railway dashboard:
```
PUPPETEER_EXECUTABLE_PATH=/nix/store/.../chromium
```

**Note:** The API route in Phase 2 already includes Railway-compatible settings (`executablePath`, `--disable-dev-shm-usage`, etc.).

---

## File Checklist

- [ ] `package.json` - Add `puppeteer` and `esbuild`
- [ ] `src/app/api/screenshot/route.ts` - New API route with browser pooling
- [ ] `src/utils/previewHtmlBuilder.ts` - esbuild-based HTML builder
- [ ] `src/components/PowerfulPreview.tsx` - Add `onCaptureReady` prop
- [ ] `src/components/FullAppPreview.tsx` - Add capture button + `onScreenshot` prop
- [ ] `src/components/AIBuilder.tsx` - Wire `handleScreenshot` to state
- [ ] `railway.toml` or `Dockerfile` - Chromium for production

---

## API Contract

### Request
```typescript
POST /api/screenshot
Content-Type: application/json

{
  "files": [
    { "path": "App.tsx", "content": "...", "description": "..." },
    { "path": "components/Header.tsx", "content": "...", "description": "..." }
  ],
  "name": "My App",              // optional
  "dependencies": {              // optional
    "lucide-react": "^0.300.0"
  },
  "width": 1280,                 // optional, default 1280
  "height": 720                  // optional, default 720
}
```

### Response
```typescript
{
  "image": "data:image/jpeg;base64,/9j/4AAQ...",
  "width": 1280,
  "height": 720
}
```

### Error Response
```typescript
{
  "error": "Error message"  // e.g., "No App.tsx entry point found"
}
```

---

## Performance Considerations

| Concern | Solution |
|---------|----------|
| Browser cold start | ✅ Browser pooling with 60s idle timeout |
| Memory usage | Pages closed after each request, browser reused |
| esbuild speed | ~5-10ms to bundle typical apps |
| Image size | JPEG at 80% quality, max 1280px width |
| Rate limiting | Add cooldown between captures (2-3 seconds) |

---

## Security Considerations

- ✅ No raw HTML accepted - files are bundled server-side with esbuild
- ✅ App name escaped for HTML injection
- ✅ Page timeout set to 10 seconds
- ✅ Browser args disable GPU/sandbox for container safety
- Consider: Rate limit API endpoint
- Consider: Authentication check for production

---

## Testing Plan

1. **Unit test:** esbuild bundles multi-file app correctly
2. **Unit test:** HTML builder escapes app name properly
3. **Integration test:** API route returns base64 image
4. **E2E test:** Capture button → image appears in chat
5. **Edge cases:**
   - Single-file app (App.tsx only)
   - Multi-file app with imports (`import Header from './Header'`)
   - App with no CSS
   - App with lucide-react icons
   - App with TypeScript types
   - Very long/complex apps
   - Apps with animations
   - Invalid app (no App.tsx)

---

## Alternative: Hybrid Approach (Future)

If server-side proves too slow, consider:

1. Try client-side capture first (in case security allows)
2. Fall back to server-side if client fails
3. Cache bundled code for repeat captures of same app

---

## Timeline Estimate

| Phase | Effort |
|-------|--------|
| Phase 1-2: Install deps + API route | 1.5 hours |
| Phase 3: esbuild HTML builder | 2 hours |
| Phase 4-5: Component updates | 2 hours |
| Phase 6: AIBuilder wiring | 30 min |
| Phase 7: Railway production setup | 1 hour |
| Testing | 1.5 hours |
| **Total** | ~8-9 hours |

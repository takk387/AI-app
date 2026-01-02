# Railway Preview Optimization Plan

## Goal

Reduce preview deploy time from **30-60 seconds** to **10-15 seconds** consistently.

---

## Current State

### What's Already Optimized

- ✅ Project reuse via Supabase mapping (saves ~20s on redeploys)
- ✅ Auto-cleanup after 30 minutes
- ✅ File validation and sanitization

### Current Bottlenecks

| Step           | Time       | Why Slow                          |
| -------------- | ---------- | --------------------------------- |
| Create project | 5-10s      | Only on first deploy (now cached) |
| Upload files   | 2-5s       | Base64 in env var                 |
| npm install    | 15-30s     | Fresh install every time          |
| Build (Vite)   | 5-15s      | No build cache                    |
| Start server   | 2-5s       | Cold start                        |
| **Total**      | **30-60s** |                                   |

### Target After Optimization

| Step           | Time     | How                 |
| -------------- | -------- | ------------------- |
| Create project | 0s       | Already cached      |
| Upload files   | 1-2s     | Optimized transfer  |
| npm install    | 2-5s     | Cached node_modules |
| Build (Vite)   | 2-5s     | Build cache         |
| Start server   | 1-2s     | Warm container      |
| **Total**      | **~10s** |                     |

---

## Optimization Strategies

### 1. Cache node_modules Between Deploys

**Current:** Fresh `npm install` every deploy (15-30s)

**Solution:** Use Railway volumes to persist node_modules

```typescript
// In deploy route - mount a volume for node_modules
const deploymentConfig = {
  // ... existing config
  volumes: [
    {
      mountPath: '/app/node_modules',
      name: `deps-${projectId}`, // Reuse same volume per project
    },
  ],
};
```

**Start command update:**

```bash
# Check if node_modules exists and is valid
if [ ! -d "node_modules" ] || [ "$(cat node_modules/.package-lock-hash 2>/dev/null)" != "$(md5sum package-lock.json | cut -d' ' -f1)" ]; then
  npm install
  md5sum package-lock.json | cut -d' ' -f1 > node_modules/.package-lock-hash
fi
npm run build && npm start
```

**Expected savings:** 10-25 seconds

---

### 2. Pre-built Base Image with Common Dependencies

**Current:** Uses `node:20` and installs everything from scratch

**Solution:** Create custom Docker image with pre-installed common deps

```dockerfile
# railway-preview-base/Dockerfile
FROM node:20-slim

# Pre-install common dependencies
WORKDIR /base-deps
RUN npm init -y && npm install \
  react@18 \
  react-dom@18 \
  vite@5 \
  @vitejs/plugin-react@4 \
  tailwindcss@3 \
  typescript@5 \
  @types/react@18 \
  @types/react-dom@18 \
  postcss \
  autoprefixer \
  --save

# Copy pre-installed node_modules for reuse
RUN cp -r node_modules /pre-installed-modules

WORKDIR /app
```

**Deploy config update:**

```typescript
const deploymentConfig = {
  image: 'your-registry/railway-preview-base:latest',
  startCommand: `
    # Link pre-installed modules for common deps
    cp -rn /pre-installed-modules/* node_modules/ 2>/dev/null || true
    npm install --prefer-offline
    npm run build && npm start
  `,
};
```

**Expected savings:** 10-20 seconds

---

### 3. Smarter File Transfer

**Current:** All files Base64 encoded in single env var

**Problem:**

- Base64 adds 33% overhead
- Single env var has size limits
- No incremental updates

**Solution A: Use Railway volumes for files**

```typescript
// Upload files to volume instead of env var
async function uploadFilesToVolume(projectId: string, files: AppFile[]) {
  const volume = await railway.createVolume({
    projectId,
    name: `files-${Date.now()}`,
  });

  // Upload via Railway's file API or SSH
  await railway.uploadFiles(volume.id, files);

  return volume.mountPath;
}
```

**Solution B: Git-based deployment**

```typescript
// Push to temporary git repo, let Railway clone
async function deployViaGit(files: AppFile[]) {
  const repo = await createTempGitRepo(files);

  return railway.deployFromGit({
    repoUrl: repo.url,
    branch: 'main',
  });
}
```

**Solution C: Compressed transfer**

```typescript
// Compress files before Base64
import pako from 'pako';

function compressFiles(files: AppFile[]): string {
  const json = JSON.stringify(files);
  const compressed = pako.deflate(json);
  return Buffer.from(compressed).toString('base64');
}

// In start command
const startCommand = `
  node -e "
    const pako = require('pako');
    const compressed = Buffer.from(process.env.APP_FILES, 'base64');
    const files = JSON.parse(pako.inflate(compressed, { to: 'string' }));
    // ... write files
  "
`;
```

**Expected savings:** 1-3 seconds

---

### 4. Parallel Operations

**Current:** Sequential - upload → install → build → start

**Solution:** Parallelize where possible

```typescript
// In start command - parallel operations
const startCommand = `
  # Extract files (fast)
  node extract-files.js &

  # Start installing deps immediately
  npm install &

  # Wait for both
  wait

  # Build and start
  npm run build && npm start
`;
```

**For the build step:**

```typescript
// vite.config.js - parallel build
export default {
  build: {
    minify: 'esbuild', // Faster than terser
    target: 'esnext', // Less transpilation
    sourcemap: false, // Skip for preview
  },
  esbuild: {
    // Use all available CPUs
    logLevel: 'error',
  },
};
```

**Expected savings:** 2-5 seconds

---

### 5. Keep Services Warm

**Current:** Service goes cold, 30-min cleanup

**Solution:** Extend warm time for active users

```typescript
// RailwayService.ts updates

class RailwayService {
  // Increase cleanup timeout for active sessions
  private CLEANUP_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour instead of 30 min

  // Ping service to keep warm
  async keepWarm(deploymentId: string) {
    const deployment = this.deployments.get(deploymentId);
    if (deployment?.previewUrl) {
      // Ping every 5 minutes to prevent cold start
      fetch(deployment.previewUrl, { method: 'HEAD' }).catch(() => {});
    }
  }

  // Start keep-warm when user is active
  startKeepWarm(deploymentId: string) {
    const interval = setInterval(
      () => {
        this.keepWarm(deploymentId);
      },
      5 * 60 * 1000
    ); // Every 5 minutes

    this.keepWarmIntervals.set(deploymentId, interval);
  }
}
```

**Expected savings:** Instant redeploys when warm (2-5s instead of 30s)

---

### 6. Optimized Vite Config for Preview

**Current:** Standard Vite build

**Solution:** Speed-optimized config for previews

```typescript
// Generated vite.config.js for previews
export default {
  build: {
    // Speed optimizations
    minify: false, // Skip minification for preview
    sourcemap: false, // Skip sourcemaps
    target: 'esnext', // Modern browsers only
    cssMinify: false, // Skip CSS minification
    reportCompressedSize: false, // Skip gzip size calc

    // Reduce work
    rollupOptions: {
      output: {
        manualChunks: undefined, // Single bundle faster
      },
    },
  },

  // Faster dep optimization
  optimizeDeps: {
    holdUntilCrawlEnd: false,
  },
};
```

**Expected savings:** 3-8 seconds

---

### 7. Skip Build for Simple Changes

**Current:** Full rebuild on every change

**Solution:** Detect if rebuild is needed

```typescript
// Check if only content changed (no new deps, no config changes)
function needsRebuild(oldFiles: AppFile[], newFiles: AppFile[]): boolean {
  const configFiles = ['package.json', 'vite.config', 'tsconfig.json', 'tailwind.config'];

  for (const file of newFiles) {
    if (configFiles.some((c) => file.path.includes(c))) {
      const oldFile = oldFiles.find((f) => f.path === file.path);
      if (!oldFile || oldFile.content !== file.content) {
        return true; // Config changed, need rebuild
      }
    }
  }

  return false; // Only source files changed
}

// If no rebuild needed, just hot-swap files
if (!needsRebuild(oldFiles, newFiles)) {
  await hotSwapFiles(deploymentId, changedFiles);
  // Skip npm install and build entirely
}
```

**Expected savings:** 15-25 seconds (when applicable)

---

### 8. Use Railway's Native Build Cache

**Current:** Build cache may not persist

**Solution:** Explicitly enable and configure caching

```toml
# railway.toml
[build]
builder = "nixpacks"
buildCommand = "npm run build"

[build.cache]
# Cache these directories between builds
paths = [
  "node_modules",
  ".vite",
  ".cache"
]
```

**Deploy config:**

```typescript
const deploymentConfig = {
  // Enable build caching
  buildCache: true,

  // Use Nixpacks for better caching
  builder: 'nixpacks',
};
```

**Expected savings:** 5-15 seconds on subsequent builds

---

## Implementation Priority

### Phase 1: Quick Wins (1-2 days)

- [ ] Optimized Vite config (skip minification)
- [ ] Extend cleanup timeout to 1 hour
- [ ] Add keep-warm pinging
- [ ] Enable Railway build cache

**Expected improvement:** 30-60s → 20-40s

### Phase 2: Caching (3-5 days)

- [ ] Implement node_modules volume caching
- [ ] Add dependency hash checking
- [ ] Compressed file transfer

**Expected improvement:** 20-40s → 15-25s

### Phase 3: Pre-built Base (1 week)

- [ ] Create custom Docker image with common deps
- [ ] Set up image registry
- [ ] Update deploy config to use custom image

**Expected improvement:** 15-25s → 10-15s

### Phase 4: Smart Rebuilds (1 week)

- [ ] Detect config vs source changes
- [ ] Implement hot-swap for source-only changes
- [ ] Skip build when possible

**Expected improvement:** Instant for minor changes (2-5s)

---

## Monitoring & Metrics

### Track These Metrics

```typescript
interface DeploymentMetrics {
  deploymentId: string;
  totalTime: number;
  breakdown: {
    projectSetup: number;
    fileUpload: number;
    npmInstall: number;
    build: number;
    serverStart: number;
  };
  cacheHits: {
    nodeModules: boolean;
    buildCache: boolean;
  };
  filesChanged: number;
  rebuildRequired: boolean;
}

// Log on each deployment
function logDeploymentMetrics(metrics: DeploymentMetrics) {
  console.log(`[Railway] Deploy ${metrics.deploymentId}:`);
  console.log(`  Total: ${metrics.totalTime}ms`);
  console.log(
    `  npm install: ${metrics.breakdown.npmInstall}ms (cached: ${metrics.cacheHits.nodeModules})`
  );
  console.log(`  build: ${metrics.breakdown.build}ms (cached: ${metrics.cacheHits.buildCache})`);
}
```

### Success Criteria

| Metric                         | Current | Target |
| ------------------------------ | ------- | ------ |
| Cold deploy (new project)      | 45-60s  | 20-30s |
| Warm deploy (existing project) | 20-40s  | 10-15s |
| Hot deploy (source only)       | 20-40s  | 5-10s  |
| Cache hit rate                 | ~0%     | >80%   |

---

## Alternative: Hybrid Approach

If Railway optimization doesn't get below 15s, consider hybrid:

```
Code Change
    ↓
Is it UI only? ────Yes────→ Browser Preview (esbuild-wasm)
    │                         └── Instant (<1s)
    No
    ↓
Is API route changed? ──Yes──→ Railway Preview
    │                           └── 10-15s
    No
    ↓
Use cached Railway preview
    └── Instant (already running)
```

This way:

- 80% of changes (UI) = instant preview
- 20% of changes (API) = Railway preview

---

## Summary

| Optimization          | Savings | Effort | Priority |
| --------------------- | ------- | ------ | -------- |
| Optimized Vite config | 3-8s    | Low    | High     |
| Keep services warm    | 10-20s  | Low    | High     |
| Enable build cache    | 5-15s   | Low    | High     |
| node_modules caching  | 10-25s  | Medium | High     |
| Pre-built base image  | 10-20s  | Medium | Medium   |
| Compressed transfer   | 1-3s    | Low    | Low      |
| Smart rebuilds        | 15-25s  | High   | Medium   |

**Total potential savings: 30-50 seconds** (bringing deploys from 45-60s down to 10-15s)

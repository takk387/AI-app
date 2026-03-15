# Enhanced Build Progress System

## Overview

A Webpack-style animated build progress overlay for the esbuild-wasm preview system. Provides real-time feedback on bundling progress with module-level tracking, animated spinners, and smooth transitions.

**Goal:** Make the build process feel fast, informative, and polished - even when it only takes 1-2 seconds.

---

## Current State

**Location:** `src/components/preview/BrowserPreview.tsx`

**Current UI:**

```
┌─────────────────────────┐
│                         │
│     ⚡ (pulsing icon)   │
│     Bundling...         │
│                         │
└─────────────────────────┘
```

**Problems:**

- No progress indication
- No file-level feedback
- No sense of what's happening
- Feels slower than it is

---

## Proposed Design

### Visual States

#### State 1: Initializing esbuild

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│              ⚡ Preparing Build Environment         │
│                                                     │
│         Loading esbuild compiler...                 │
│                                                     │
│              ◐  (rotating spinner)                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### State 2: Resolving Modules

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│              ⚡ Building Your App                   │
│                                                     │
│    ┌───────────────────────────────────────┐       │
│    │████████░░░░░░░░░░░░░░░░░░░░│ 28%     │       │
│    └───────────────────────────────────────┘       │
│                                                     │
│    ⠋ Resolving modules...                          │
│                                                     │
│      ✓ app/layout.tsx                              │
│      ✓ app/page.tsx                                │
│      → components/Header.tsx                        │
│      ○ components/Button.tsx                        │
│      ○ lib/utils.ts                                │
│                                                     │
│    3 of 12 modules                                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### State 3: Bundling

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│              ⚡ Building Your App                   │
│                                                     │
│    ┌───────────────────────────────────────┐       │
│    │██████████████████░░░░░░░░░░│ 65%     │       │
│    └───────────────────────────────────────┘       │
│                                                     │
│    ✓ Resolved 12 modules                           │
│    ⠙ Bundling code...                              │
│                                                     │
│      Transforming JSX...                           │
│      Tree shaking...                               │
│                                                     │
│    Elapsed: 0.4s                                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### State 4: Finalizing

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│              ⚡ Building Your App                   │
│                                                     │
│    ┌───────────────────────────────────────┐       │
│    │█████████████████████████████│ 95%    │       │
│    └───────────────────────────────────────┘       │
│                                                     │
│    ✓ Resolved 12 modules                           │
│    ✓ Bundled in 0.3s                               │
│    ⠹ Rendering preview...                          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### State 5: Complete (Brief Flash)

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│              ✓ Built Successfully                  │
│                                                     │
│    12 modules • 45KB • 0.8s                        │
│                                                     │
└─────────────────────────────────────────────────────┘
        (fades out after 500ms)
```

#### State 6: Error

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│              ✗ Build Failed                        │
│                                                     │
│    Error in components/Button.tsx:24               │
│                                                     │
│    ┌─────────────────────────────────────────┐     │
│    │ 23 │ export function Button({ label }) {│     │
│    │ 24 │   return <button class={styles}    │     │
│    │    │                 ^^^^^ ← JSX error  │     │
│    │ 25 │ }                                  │     │
│    └─────────────────────────────────────────┘     │
│                                                     │
│    [View Full Error]  [Retry Build]                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Animated Spinner

Braille-pattern spinner (smooth rotation):

```typescript
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
// 80ms per frame = smooth rotation
```

Alternative - Dots spinner:

```typescript
const DOTS_FRAMES = ['⠋', '⠙', '⠚', '⠞', '⠖', '⠦', '⠴', '⠲', '⠳', '⠓'];
```

Alternative - Block spinner:

```typescript
const BLOCK_FRAMES = ['▖', '▘', '▝', '▗'];
```

---

## Progress Tracking

### How to Track Module Resolution

esbuild's `onResolve` and `onLoad` plugins can report progress:

```typescript
// In BrowserPreviewService.ts
interface BuildProgress {
  phase: 'init' | 'resolve' | 'bundle' | 'render' | 'complete' | 'error';
  modulesTotal: number;
  modulesResolved: number;
  currentModule: string | null;
  resolvedModules: string[];
  elapsed: number;
  bundleSize?: number;
  error?: BuildError;
}

interface BuildError {
  file: string;
  line: number;
  column: number;
  message: string;
  snippet?: string;
}
```

### Modified Virtual File System Plugin

```typescript
function createVirtualFsPlugin(
  files: Map<string, string>,
  onProgress: (progress: BuildProgress) => void
): esbuild.Plugin {
  const resolvedModules: string[] = [];
  const totalModules = files.size;

  return {
    name: 'virtual-fs',
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) => {
        const moduleName = args.path;

        // Report progress
        onProgress({
          phase: 'resolve',
          modulesTotal: totalModules,
          modulesResolved: resolvedModules.length,
          currentModule: moduleName,
          resolvedModules: [...resolvedModules],
          elapsed: Date.now() - startTime,
        });

        // ... existing resolution logic

        resolvedModules.push(moduleName);
        return { path: moduleName, namespace: 'virtual' };
      });

      build.onLoad({ filter: /.*/, namespace: 'virtual' }, (args) => {
        // Report load progress
        onProgress({
          phase: 'resolve',
          modulesTotal: totalModules,
          modulesResolved: resolvedModules.length,
          currentModule: args.path,
          resolvedModules: [...resolvedModules],
          elapsed: Date.now() - startTime,
        });

        const content = files.get(args.path);
        return { contents: content, loader: getLoader(args.path) };
      });
    },
  };
}
```

### Progress Callback Flow

```
BrowserPreview.tsx
       │
       ▼
BrowserPreviewService.bundleApp(files, onProgress)
       │
       ├─► onProgress({ phase: 'init' })
       │
       ├─► esbuild.build() with virtual-fs plugin
       │      │
       │      ├─► onResolve → onProgress({ phase: 'resolve', currentModule: '...' })
       │      ├─► onLoad → onProgress({ phase: 'resolve', modulesResolved: n })
       │      └─► ... for each module
       │
       ├─► onProgress({ phase: 'bundle' })
       │
       ├─► onProgress({ phase: 'render' })
       │
       └─► onProgress({ phase: 'complete', bundleSize: ... })
```

---

## Component Structure

```
src/components/preview/
├── BrowserPreview.tsx          # Main preview (updated)
├── BuildProgress/
│   ├── BuildProgressOverlay.tsx    # Main overlay container
│   ├── ProgressBar.tsx             # Animated progress bar
│   ├── Spinner.tsx                 # Animated spinner
│   ├── ModuleList.tsx              # File resolution list
│   ├── BuildStats.tsx              # Final stats display
│   ├── BuildError.tsx              # Error display
│   └── useBuildProgress.ts         # Progress state hook
└── BrowserPreviewService.ts    # Service (updated with callbacks)
```

---

## Implementation

### BuildProgressOverlay.tsx

```tsx
import { AnimatePresence, motion } from 'framer-motion';
import { BuildProgress } from './useBuildProgress';
import { ProgressBar } from './ProgressBar';
import { Spinner } from './Spinner';
import { ModuleList } from './ModuleList';
import { BuildStats } from './BuildStats';
import { BuildError } from './BuildError';

interface Props {
  progress: BuildProgress | null;
  isVisible: boolean;
}

export function BuildProgressOverlay({ progress, isVisible }: Props) {
  if (!progress) return null;

  const getProgressPercent = () => {
    switch (progress.phase) {
      case 'init':
        return 5;
      case 'resolve':
        const resolveProgress =
          progress.modulesTotal > 0 ? (progress.modulesResolved / progress.modulesTotal) * 60 : 0;
        return 5 + resolveProgress;
      case 'bundle':
        return 70;
      case 'render':
        return 90;
      case 'complete':
        return 100;
      case 'error':
        return (progress.modulesResolved / progress.modulesTotal) * 65;
      default:
        return 0;
    }
  };

  const getPhaseMessage = () => {
    switch (progress.phase) {
      case 'init':
        return 'Preparing build environment...';
      case 'resolve':
        return 'Resolving modules...';
      case 'bundle':
        return 'Bundling code...';
      case 'render':
        return 'Rendering preview...';
      case 'complete':
        return 'Built successfully!';
      case 'error':
        return 'Build failed';
      default:
        return 'Building...';
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm
                     flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-slate-800 rounded-xl p-8 max-w-md w-full mx-4
                       border border-slate-700 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              {progress.phase === 'complete' ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-green-400 text-2xl"
                >
                  ✓
                </motion.div>
              ) : progress.phase === 'error' ? (
                <span className="text-red-400 text-2xl">✗</span>
              ) : (
                <Spinner />
              )}
              <h2 className="text-white text-lg font-medium">
                {progress.phase === 'complete'
                  ? 'Built Successfully'
                  : progress.phase === 'error'
                    ? 'Build Failed'
                    : 'Building Your App'}
              </h2>
            </div>

            {/* Progress Bar */}
            {progress.phase !== 'error' && <ProgressBar percent={getProgressPercent()} />}

            {/* Phase Message */}
            <div className="flex items-center gap-2 mt-4 text-slate-300">
              {progress.phase !== 'complete' && progress.phase !== 'error' && <Spinner size="sm" />}
              <span>{getPhaseMessage()}</span>
            </div>

            {/* Module List (during resolve phase) */}
            {progress.phase === 'resolve' && (
              <ModuleList
                modules={progress.resolvedModules}
                currentModule={progress.currentModule}
                total={progress.modulesTotal}
              />
            )}

            {/* Error Display */}
            {progress.phase === 'error' && progress.error && <BuildError error={progress.error} />}

            {/* Stats (on complete) */}
            {progress.phase === 'complete' && (
              <BuildStats
                moduleCount={progress.modulesResolved}
                bundleSize={progress.bundleSize}
                elapsed={progress.elapsed}
              />
            )}

            {/* Elapsed Time */}
            {progress.phase !== 'complete' && progress.phase !== 'error' && (
              <div className="mt-4 text-slate-500 text-sm">
                Elapsed: {(progress.elapsed / 1000).toFixed(1)}s
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### ProgressBar.tsx

```tsx
import { motion } from 'framer-motion';

interface Props {
  percent: number;
}

export function ProgressBar({ percent }: Props) {
  return (
    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    </div>
  );
}
```

### Spinner.tsx

```tsx
import { useEffect, useState } from 'react';

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

interface Props {
  size?: 'sm' | 'md' | 'lg';
}

export function Spinner({ size = 'md' }: Props) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % FRAMES.length);
    }, 80);
    return () => clearInterval(interval);
  }, []);

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-xl',
    lg: 'text-3xl',
  };

  return <span className={`${sizeClasses[size]} text-blue-400 font-mono`}>{FRAMES[frame]}</span>;
}
```

### ModuleList.tsx

```tsx
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  modules: string[];
  currentModule: string | null;
  total: number;
}

export function ModuleList({ modules, currentModule, total }: Props) {
  // Show last 5 resolved + current
  const visibleModules = modules.slice(-4);

  const getShortName = (path: string) => {
    // Convert "src/components/Button.tsx" to "components/Button.tsx"
    return path.replace(/^(src\/|app\/|pages\/)/, '');
  };

  return (
    <div className="mt-4 space-y-1 font-mono text-sm">
      <AnimatePresence mode="popLayout">
        {visibleModules.map((mod) => (
          <motion.div
            key={mod}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-slate-400"
          >
            <span className="text-green-400">✓</span>
            <span>{getShortName(mod)}</span>
          </motion.div>
        ))}

        {currentModule && (
          <motion.div
            key="current"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-blue-300"
          >
            <span>→</span>
            <span>{getShortName(currentModule)}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-slate-500 mt-2">
        {modules.length} of {total} modules
      </div>
    </div>
  );
}
```

### BuildError.tsx

```tsx
interface Props {
  error: {
    file: string;
    line: number;
    column: number;
    message: string;
    snippet?: string;
  };
}

export function BuildError({ error }: Props) {
  return (
    <div className="mt-4">
      <div className="text-red-400 text-sm mb-2">
        Error in {error.file}:{error.line}
      </div>

      {error.snippet && (
        <pre className="bg-slate-900 rounded-lg p-3 text-sm overflow-x-auto">
          <code className="text-slate-300">{error.snippet}</code>
        </pre>
      )}

      <div className="mt-3 text-slate-400 text-sm">{error.message}</div>

      <div className="mt-4 flex gap-2">
        <button
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600
                          rounded text-sm text-white transition-colors"
        >
          View Full Error
        </button>
        <button
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500
                          rounded text-sm text-white transition-colors"
        >
          Retry Build
        </button>
      </div>
    </div>
  );
}
```

### BuildStats.tsx

```tsx
import { motion } from 'framer-motion';

interface Props {
  moduleCount: number;
  bundleSize?: number;
  elapsed: number;
}

export function BuildStats({ moduleCount, bundleSize, elapsed }: Props) {
  const formatSize = (bytes?: number) => {
    if (!bytes) return null;
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 flex items-center gap-3 text-slate-400 text-sm"
    >
      <span>{moduleCount} modules</span>
      {bundleSize && (
        <>
          <span className="text-slate-600">•</span>
          <span>{formatSize(bundleSize)}</span>
        </>
      )}
      <span className="text-slate-600">•</span>
      <span>{(elapsed / 1000).toFixed(1)}s</span>
    </motion.div>
  );
}
```

### useBuildProgress.ts

```typescript
import { useState, useCallback, useRef } from 'react';

export interface BuildProgress {
  phase: 'init' | 'resolve' | 'bundle' | 'render' | 'complete' | 'error';
  modulesTotal: number;
  modulesResolved: number;
  currentModule: string | null;
  resolvedModules: string[];
  elapsed: number;
  bundleSize?: number;
  error?: {
    file: string;
    line: number;
    column: number;
    message: string;
    snippet?: string;
  };
}

export function useBuildProgress() {
  const [progress, setProgress] = useState<BuildProgress | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const startTimeRef = useRef<number>(0);
  const hideTimeoutRef = useRef<NodeJS.Timeout>();

  const startBuild = useCallback((totalModules: number) => {
    startTimeRef.current = Date.now();
    setIsVisible(true);
    setProgress({
      phase: 'init',
      modulesTotal: totalModules,
      modulesResolved: 0,
      currentModule: null,
      resolvedModules: [],
      elapsed: 0,
    });
  }, []);

  const updateProgress = useCallback((update: Partial<BuildProgress>) => {
    setProgress((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        ...update,
        elapsed: Date.now() - startTimeRef.current,
      };
    });
  }, []);

  const completeBuild = useCallback((bundleSize?: number) => {
    setProgress((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        phase: 'complete',
        elapsed: Date.now() - startTimeRef.current,
        bundleSize,
      };
    });

    // Hide after brief display
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 800);
  }, []);

  const failBuild = useCallback((error: BuildProgress['error']) => {
    setProgress((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        phase: 'error',
        elapsed: Date.now() - startTimeRef.current,
        error,
      };
    });
  }, []);

  const reset = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    setProgress(null);
    setIsVisible(false);
  }, []);

  return {
    progress,
    isVisible,
    startBuild,
    updateProgress,
    completeBuild,
    failBuild,
    reset,
  };
}
```

---

## Service Updates

### BrowserPreviewService.ts Changes

```typescript
// Add to existing service

export type ProgressCallback = (progress: BuildProgress) => void;

export async function bundleApp(
  files: AppFile[],
  onProgress?: ProgressCallback
): Promise<BundleResult> {
  const startTime = Date.now();

  // Phase: Init
  onProgress?.({
    phase: 'init',
    modulesTotal: files.length,
    modulesResolved: 0,
    currentModule: null,
    resolvedModules: [],
    elapsed: 0,
  });

  // Initialize esbuild if needed
  await initEsbuild();

  // Create file map
  const fileMap = new Map(files.map((f) => [f.path, f.content]));
  const resolvedModules: string[] = [];

  // Create plugin with progress tracking
  const virtualFsPlugin: esbuild.Plugin = {
    name: 'virtual-fs-with-progress',
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) => {
        const modulePath = resolveModulePath(args.path, args.importer, fileMap);

        if (modulePath && !resolvedModules.includes(modulePath)) {
          resolvedModules.push(modulePath);

          // Report progress
          onProgress?.({
            phase: 'resolve',
            modulesTotal: files.length,
            modulesResolved: resolvedModules.length,
            currentModule: modulePath,
            resolvedModules: [...resolvedModules],
            elapsed: Date.now() - startTime,
          });
        }

        return modulePath ? { path: modulePath, namespace: 'virtual' } : { external: true };
      });

      build.onLoad({ filter: /.*/, namespace: 'virtual' }, (args) => {
        const content = fileMap.get(args.path);
        return {
          contents: content || '',
          loader: getLoader(args.path),
        };
      });
    },
  };

  // Phase: Bundle
  onProgress?.({
    phase: 'bundle',
    modulesTotal: files.length,
    modulesResolved: resolvedModules.length,
    currentModule: null,
    resolvedModules,
    elapsed: Date.now() - startTime,
  });

  try {
    const result = await esbuild.build({
      entryPoints: [findEntryPoint(fileMap)],
      bundle: true,
      format: 'iife',
      plugins: [virtualFsPlugin],
      write: false,
      // ... other options
    });

    const bundledCode = result.outputFiles?.[0]?.text || '';
    const bundleSize = new Blob([bundledCode]).size;

    // Phase: Render
    onProgress?.({
      phase: 'render',
      modulesTotal: files.length,
      modulesResolved: resolvedModules.length,
      currentModule: null,
      resolvedModules,
      elapsed: Date.now() - startTime,
    });

    return {
      success: true,
      code: bundledCode,
      bundleSize,
      moduleCount: resolvedModules.length,
    };
  } catch (error) {
    const buildError = parseBuildError(error);

    onProgress?.({
      phase: 'error',
      modulesTotal: files.length,
      modulesResolved: resolvedModules.length,
      currentModule: null,
      resolvedModules,
      elapsed: Date.now() - startTime,
      error: buildError,
    });

    return {
      success: false,
      error: buildError,
    };
  }
}

function parseBuildError(error: unknown): BuildProgress['error'] {
  // Parse esbuild error format
  if (error instanceof Error) {
    const match = error.message.match(/(\S+):(\d+):(\d+):\s*(.+)/);
    if (match) {
      return {
        file: match[1],
        line: parseInt(match[2]),
        column: parseInt(match[3]),
        message: match[4],
      };
    }
    return {
      file: 'unknown',
      line: 0,
      column: 0,
      message: error.message,
    };
  }
  return {
    file: 'unknown',
    line: 0,
    column: 0,
    message: String(error),
  };
}
```

---

## Integration with BrowserPreview.tsx

```tsx
// In BrowserPreview.tsx

import { BuildProgressOverlay } from './BuildProgress/BuildProgressOverlay';
import { useBuildProgress } from './BuildProgress/useBuildProgress';
import { bundleApp } from '@/services/BrowserPreviewService';

export function BrowserPreview({ files }: Props) {
  const { progress, isVisible, startBuild, updateProgress, completeBuild, failBuild, reset } =
    useBuildProgress();

  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    async function build() {
      reset();
      startBuild(files.length);

      const result = await bundleApp(files, (p) => {
        updateProgress(p);
      });

      if (result.success) {
        completeBuild(result.bundleSize);

        // Small delay to show completion state
        setTimeout(() => {
          setHtml(wrapInHtml(result.code));
        }, 300);
      } else {
        failBuild(result.error);
      }
    }

    build();
  }, [files]);

  return (
    <div className="relative w-full h-full">
      {/* Preview iframe */}
      {html && <iframe srcDoc={html} className="w-full h-full border-0" sandbox="allow-scripts" />}

      {/* Build progress overlay */}
      <BuildProgressOverlay progress={progress} isVisible={isVisible} />
    </div>
  );
}
```

---

## Animation Timing

| Phase            | Duration  | Progress %  |
| ---------------- | --------- | ----------- |
| Init             | 100-300ms | 0-5%        |
| Resolve          | 200-800ms | 5-65%       |
| Bundle           | 100-500ms | 65-90%      |
| Render           | 50-200ms  | 90-100%     |
| Complete display | 500-800ms | 100% (hold) |

**Total typical build: 0.5-2s**

---

## Implementation Phases

### Phase 1: Core Overlay

- [ ] BuildProgressOverlay component
- [ ] ProgressBar component
- [ ] Spinner component
- [ ] useBuildProgress hook
- [ ] Basic phase transitions

### Phase 2: Module Tracking

- [ ] Update BrowserPreviewService with callbacks
- [ ] ModuleList component
- [ ] Real-time module resolution display
- [ ] Animated list updates

### Phase 3: Error Handling

- [ ] BuildError component
- [ ] Parse esbuild errors
- [ ] Code snippet display
- [ ] Retry functionality

### Phase 4: Polish

- [ ] BuildStats component
- [ ] Smooth animations (framer-motion)
- [ ] Bundle size display
- [ ] Performance optimization
- [ ] Fade out timing

---

## Dependencies

```json
{
  "framer-motion": "^10.x" // Already in project
}
```

No new dependencies required.

---

## Summary

| Current            | Enhanced                             |
| ------------------ | ------------------------------------ |
| "Bundling..." text | Animated progress bar                |
| No progress        | Module-by-module tracking            |
| Basic error        | Rich error display with code snippet |
| Instant hide       | Smooth fade with stats               |
| No feedback        | Real-time phase updates              |

**Result:** Build process feels fast, informative, and polished.

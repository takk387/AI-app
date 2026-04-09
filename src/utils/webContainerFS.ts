import type { FileSystemTree } from '@webcontainer/api';
import type { AppFile } from '@/types/railway';

/**
 * Convert AppFile[] to WebContainer FileSystemTree format.
 *
 * AppFile:    { path: '/src/App.tsx', content: '...' }
 * FileSystem: { src: { directory: { 'App.tsx': { file: { contents: '...' } } } } }
 */
export function toFileSystemTree(files: AppFile[]): FileSystemTree {
  const tree: FileSystemTree = {};

  for (const file of files) {
    const normalizedPath = file.path.replace(/^\//, '');
    const parts = normalizedPath.split('/');
    let current = tree;

    for (let i = 0; i < parts.length - 1; i++) {
      const dir = parts[i];
      if (!current[dir]) {
        current[dir] = { directory: {} };
      }
      const node = current[dir];
      if ('directory' in node) {
        current = node.directory;
      }
    }

    const fileName = parts[parts.length - 1];
    current[fileName] = { file: { contents: file.content } };
  }

  return tree;
}

/**
 * Detect if the file list represents a Next.js project (app/page.tsx, app/layout.tsx).
 */
export function isNextJsProject(files: AppFile[]): boolean {
  return files.some(
    (f) =>
      f.path.includes('app/page.tsx') ||
      f.path.includes('app/page.ts') ||
      f.path.includes('app/layout.tsx') ||
      f.path.includes('app/layout.ts')
  );
}

const DEFAULT_NEXTJS_DEPS: Record<string, string> = {
  next: '^15.1.0',
  react: '^18.3.1',
  'react-dom': '^18.3.1',
};

const DEFAULT_NEXTJS_DEV_DEPS: Record<string, string> = {
  '@types/react': '^18.3.0',
  '@types/react-dom': '^18.3.0',
  typescript: '^5.5.0',
};

const DEFAULT_VITE_DEPS: Record<string, string> = {
  react: '^18.3.1',
  'react-dom': '^18.3.1',
  'framer-motion': 'latest',
  'lucide-react': 'latest',
  'react-router-dom': 'latest',
  clsx: 'latest',
  'tailwind-merge': 'latest',
};

const DEFAULT_VITE_DEV_DEPS: Record<string, string> = {
  '@vitejs/plugin-react': '^4.3.0',
  vite: '^5.4.0',
  tailwindcss: '^3.4.0',
  postcss: '^8.4.0',
  autoprefixer: '^10.4.0',
  '@types/react': '^18.3.0',
  '@types/react-dom': '^18.3.0',
  typescript: '^5.5.0',
};

/**
 * Ensure a package.json exists in the file list.
 * If one is already present (AI generated it), use it.
 * Otherwise generate a Vite-based package.json from the dependencies map.
 */
export function ensurePackageJson(files: AppFile[], deps: Record<string, string>): AppFile[] {
  const hasPackageJson = files.some((f) => f.path === '/package.json' || f.path === 'package.json');
  if (hasPackageJson) return files;

  if (isNextJsProject(files)) {
    return scaffoldNextJsProject(files, deps);
  }
  return scaffoldViteProject(files, deps);
}

function scaffoldNextJsProject(files: AppFile[], deps: Record<string, string>): AppFile[] {
  const mergedDeps = { ...DEFAULT_NEXTJS_DEPS, ...deps };
  const packageJson = {
    name: 'preview-app',
    private: true,
    scripts: { dev: 'next dev', build: 'next build', start: 'next start' },
    dependencies: mergedDeps,
    devDependencies: DEFAULT_NEXTJS_DEV_DEPS,
  };

  const scaffoldFiles: AppFile[] = [
    { path: '/package.json', content: JSON.stringify(packageJson, null, 2) },
  ];

  if (!files.some((f) => f.path.includes('next.config'))) {
    scaffoldFiles.push({
      path: '/next.config.js',
      content: `/** @type {import('next').NextConfig} */\nmodule.exports = { reactStrictMode: true };\n`,
    });
  }

  if (!files.some((f) => f.path.includes('tsconfig'))) {
    scaffoldFiles.push({
      path: '/tsconfig.json',
      content: JSON.stringify(
        {
          compilerOptions: {
            target: 'es5',
            lib: ['dom', 'dom.iterable', 'esnext'],
            allowJs: true,
            skipLibCheck: true,
            strict: true,
            noEmit: true,
            esModuleInterop: true,
            module: 'esnext',
            moduleResolution: 'bundler',
            resolveJsonModule: true,
            isolatedModules: true,
            jsx: 'preserve',
            incremental: true,
            plugins: [{ name: 'next' }],
            paths: { '@/*': ['./*'] },
          },
          include: ['next-env.d.ts', '**/*.ts', '**/*.tsx'],
          exclude: ['node_modules'],
        },
        null,
        2
      ),
    });
  }

  return [...scaffoldFiles, ...files];
}

function scaffoldViteProject(files: AppFile[], deps: Record<string, string>): AppFile[] {
  const mergedDeps = { ...DEFAULT_VITE_DEPS, ...deps };
  const packageJson = {
    name: 'preview-app',
    private: true,
    type: 'module',
    scripts: { dev: 'vite', build: 'vite build' },
    dependencies: mergedDeps,
    devDependencies: DEFAULT_VITE_DEV_DEPS,
  };

  const scaffoldFiles: AppFile[] = [
    { path: '/package.json', content: JSON.stringify(packageJson, null, 2) },
  ];

  if (!files.some((f) => f.path.includes('vite.config'))) {
    scaffoldFiles.push({
      path: '/vite.config.ts',
      content: `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({\n  plugins: [react()],\n});\n`,
    });
  }

  if (!files.some((f) => f.path === '/index.html' || f.path === 'index.html')) {
    scaffoldFiles.push({
      path: '/index.html',
      content: `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Preview</title>\n    <script src="https://cdn.tailwindcss.com"></script>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>\n`,
    });
  }

  if (
    !files.some(
      (f) =>
        f.path.includes('main.tsx') || f.path.includes('main.ts') || f.path.includes('index.tsx')
    )
  ) {
    scaffoldFiles.push({
      path: '/src/main.tsx',
      content: `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\n\nReactDOM.createRoot(document.getElementById('root')!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);\n`,
    });
  }

  return [...scaffoldFiles, ...files];
}

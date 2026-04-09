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

  const mergedDeps = { ...DEFAULT_VITE_DEPS, ...deps };

  const packageJson = {
    name: 'preview-app',
    private: true,
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
    },
    dependencies: mergedDeps,
    devDependencies: DEFAULT_VITE_DEV_DEPS,
  };

  const scaffoldFiles: AppFile[] = [
    { path: '/package.json', content: JSON.stringify(packageJson, null, 2) },
  ];

  // Add vite config if not present
  const hasViteConfig = files.some((f) => f.path.includes('vite.config'));
  if (!hasViteConfig) {
    scaffoldFiles.push({
      path: '/vite.config.ts',
      content: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`,
    });
  }

  // Add index.html if not present (Vite entry point)
  const hasIndexHtml = files.some((f) => f.path === '/index.html' || f.path === 'index.html');
  if (!hasIndexHtml) {
    scaffoldFiles.push({
      path: '/index.html',
      content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Preview</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    });
  }

  // Add main.tsx entry if not present
  const hasMain = files.some(
    (f) => f.path.includes('main.tsx') || f.path.includes('main.ts') || f.path.includes('index.tsx')
  );
  if (!hasMain) {
    scaffoldFiles.push({
      path: '/src/main.tsx',
      content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
    });
  }

  return [...scaffoldFiles, ...files];
}

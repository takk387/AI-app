/**
 * Preview HTML Builder with esbuild
 *
 * Bundles multi-file React apps into a single HTML document for server-side screenshot capture.
 * Uses esbuild's virtual filesystem plugin to handle imports between files.
 *
 * Note: This module uses require() to ensure esbuild only loads server-side.
 */

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

/**
 * Virtual filesystem plugin for esbuild
 * Maps app files to a virtual filesystem that esbuild can resolve imports from
 */
function createVirtualFsPlugin(files: AppFile[]) {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setup(build: any) {
      // Resolve relative imports to virtual paths
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      build.onResolve({ filter: /^\./ }, (args: any) => {
        // Handle case where importer is undefined/empty (e.g., stdin entry)
        const importer = args.importer || '/entry.tsx';
        let resolved: string;
        try {
          resolved = new URL(args.path, `file://${importer}`).pathname;
        } catch {
          // Fallback: simple path resolution
          const dir = importer.substring(0, importer.lastIndexOf('/')) || '/';
          resolved = args.path.startsWith('./')
            ? `${dir}/${args.path.slice(2)}`
            : `${dir}/${args.path}`;
        }
        // Try exact match, then with extensions
        for (const ext of ['', '.tsx', '.ts', '.jsx', '.js']) {
          if (fileMap.has(resolved + ext)) {
            return { path: resolved + ext, namespace: 'virtual' };
          }
        }
        return { path: resolved, namespace: 'virtual' };
      });

      // Load virtual files
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      build.onLoad({ filter: /.*/, namespace: 'virtual' }, (args: any) => {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      build.onResolve({ filter: /^[^./]/ }, (args: any) => {
        return { path: args.path, external: true };
      });
    }
  };
}

/**
 * Build a complete HTML document from app files
 * Bundles all files using esbuild and injects into HTML with CDN dependencies
 */
export async function buildPreviewHtml(input: BuildInput): Promise<string> {
  // Use require() to ensure this only loads on the server
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const esbuild = require('esbuild');

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
    plugins: [createVirtualFsPlugin(allFiles)],
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

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
 * Shim modules that map CDN globals to ES module exports
 * These allow esbuild to bundle code that imports from react/react-dom
 * while using CDN-loaded globals at runtime
 */
const SHIM_MODULES: Record<string, string> = {
  react: `
    const React = window.React;
    export default React;
    export const { useState, useEffect, useCallback, useMemo, useRef, useContext, useReducer, useLayoutEffect, useImperativeHandle, useDebugValue, createContext, createElement, cloneElement, isValidElement, Children, Fragment, StrictMode, Suspense, lazy, memo, forwardRef, createRef } = React;
  `,
  'react-dom': `
    const ReactDOM = window.ReactDOM;
    export default ReactDOM;
    export const { createPortal, flushSync, render, hydrate, unmountComponentAtNode } = ReactDOM;
  `,
  'react-dom/client': `
    const ReactDOM = window.ReactDOM;
    export const createRoot = (container) => ReactDOM.createRoot(container);
    export const hydrateRoot = (container, element) => ReactDOM.hydrateRoot(container, element);
  `,
  'react/jsx-runtime': `
    const React = window.React;
    export const jsx = React.createElement;
    export const jsxs = React.createElement;
    export const jsxDEV = React.createElement;
    export const Fragment = React.Fragment;
  `,
  'react/jsx-dev-runtime': `
    const React = window.React;
    export const jsx = React.createElement;
    export const jsxs = React.createElement;
    export const jsxDEV = React.createElement;
    export const Fragment = React.Fragment;
  `,
  'lucide-react': `
    const LucideReact = window.LucideReact || window.lucide || {};
    export default LucideReact;
    // Export all icons - lucide-react exposes them on the module
    const icons = LucideReact;
    export const { Menu, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Search, Plus, Minus, Check, AlertCircle, Info, Settings, User, Home, Mail, Phone, Calendar, Clock, Star, Heart, ThumbsUp, Share, Download, Upload, Edit, Trash, Copy, Save, Refresh, Filter, Sort, Grid, List, Eye, EyeOff, Lock, Unlock, Bell, MessageCircle, Send, Image, Video, Music, File, Folder, Link, ExternalLink, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, MoreHorizontal, MoreVertical, Sun, Moon, Cloud, Zap, Activity, TrendingUp, TrendingDown, BarChart, PieChart, DollarSign, CreditCard, ShoppingCart, Package, Truck, MapPin, Navigation, Globe, Wifi, Bluetooth, Battery, Power, Volume, VolumeX, Mic, MicOff, Camera, Printer, Monitor, Smartphone, Tablet, Laptop, Watch, Headphones, Speaker, Tv, Radio, Gamepad, Gift, Award, Flag, Bookmark, Tag, Hash, AtSign, Percent, Slash } = icons;
  `,
};

/**
 * Virtual filesystem plugin for esbuild
 * Maps app files to a virtual filesystem that esbuild can resolve imports from
 */
function createVirtualFsPlugin(files: AppFile[], hasDependencies: Record<string, string>) {
  const fileMap = new Map<string, string>();

  // Normalize paths and build lookup map
  files.forEach((f) => {
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
      // Handle npm package imports - resolve to shims or mark external
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      build.onResolve({ filter: /^[^./]/ }, (args: any) => {
        const pkgName = args.path;
        // Check if we have a shim for this package
        if (SHIM_MODULES[pkgName]) {
          return { path: pkgName, namespace: 'shim' };
        }
        // For lucide-react, only include shim if it's in dependencies
        if (pkgName === 'lucide-react' && 'lucide-react' in hasDependencies) {
          return { path: pkgName, namespace: 'shim' };
        }
        // Unknown packages - return empty module to prevent errors
        return { path: pkgName, namespace: 'empty' };
      });

      // Load shim modules
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      build.onLoad({ filter: /.*/, namespace: 'shim' }, (args: any) => {
        const shimCode = SHIM_MODULES[args.path];
        if (shimCode) {
          return { contents: shimCode, loader: 'js' };
        }
        return { contents: 'export default {};', loader: 'js' };
      });

      // Empty module for unknown packages
      build.onLoad({ filter: /.*/, namespace: 'empty' }, () => {
        return { contents: 'export default {}; export const __empty = true;', loader: 'js' };
      });

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
            loader: args.path.endsWith('.tsx')
              ? 'tsx'
              : args.path.endsWith('.ts')
                ? 'ts'
                : args.path.endsWith('.jsx')
                  ? 'jsx'
                  : 'js',
          };
        }
        return { contents: '', loader: 'js' };
      });
    },
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
  const entryFile = files.find(
    (f) => f.path === 'App.tsx' || f.path === 'src/App.tsx' || f.path.endsWith('/App.tsx')
  );

  if (!entryFile) {
    throw new Error('No App.tsx entry point found');
  }

  // Create entry wrapper that renders App
  // Import React explicitly for classic JSX transform (React.createElement)
  const entryCode = `
    import React from 'react';
    import App from './App';
    import { createRoot } from 'react-dom/client';
    const root = createRoot(document.getElementById('root'));
    root.render(React.createElement(App));
  `;

  const allFiles = [...files, { path: '/entry.tsx', content: entryCode }];

  // Bundle with esbuild
  const result = await esbuild.build({
    stdin: {
      contents: entryCode,
      resolveDir: '/',
      loader: 'tsx',
    },
    bundle: true,
    write: false,
    format: 'iife',
    target: 'es2020',
    // Use classic JSX transform (React.createElement) for CDN compatibility
    jsx: 'transform',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    minify: false,
    plugins: [createVirtualFsPlugin(allFiles, dependencies)],
    // No externals - we use shim modules that map to window globals
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  });

  const bundledCode = result.outputFiles[0].text;

  // Collect CSS
  const cssFiles = files.filter((f) => f.path.endsWith('.css'));
  const cssContent = cssFiles.map((f) => f.content).join('\n');

  // Escape for HTML
  const escapedName = name.replace(
    /[<>&"']/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' })[c] || c
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
    // Wrap in try-catch to display errors visibly
    try {
      ${bundledCode}
    } catch (err) {
      console.error('App render error:', err);
      document.getElementById('root').innerHTML = '<div style="padding:20px;color:red;font-family:monospace;"><h2>Render Error</h2><pre>' + err.message + '</pre></div>';
    }
  </script>
</body>
</html>`;
}

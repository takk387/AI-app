"use client";

import React from 'react';
import { SandpackProvider, SandpackPreview, SandpackLayout } from '@codesandbox/sandpack-react';

interface AppFile {
  path: string;
  content: string;
  description: string;
}

interface FullAppData {
  name: string;
  description: string;
  appType?: 'FRONTEND_ONLY' | 'FULL_STACK';
  files: AppFile[];
  dependencies: Record<string, string>;
  setupInstructions: string;
}

interface PowerfulPreviewProps {
  appDataJson: string;
}

export default function PowerfulPreview({ appDataJson }: PowerfulPreviewProps) {
  const appData: FullAppData = JSON.parse(appDataJson);

  // Convert files to Sandpack format - React template needs / prefix
  const sandpackFiles: Record<string, { code: string }> = {};
  
  appData.files.forEach(file => {
    // Map file paths to Sandpack structure
    let sandpackPath = file.path;
    
    // Handle different file structures - remove src/ prefix
    if (sandpackPath.startsWith('src/')) {
      sandpackPath = sandpackPath.substring(4); // Remove 'src/' (4 characters)
    }
    
    // Keep as App.tsx for TypeScript support
    if (sandpackPath === 'App.tsx' || sandpackPath === 'app/page.tsx' || sandpackPath === 'page.tsx') {
      sandpackPath = 'App.tsx';
    }
    
    // Add leading / for Sandpack react template
    if (!sandpackPath.startsWith('/') && !sandpackPath.startsWith('public/')) {
      sandpackPath = '/' + sandpackPath;
    }
    
    // Sandpack file format uses objects with 'code' property
    sandpackFiles[sandpackPath] = { code: file.content };
  });

  // Ensure we have /App.tsx
  if (!sandpackFiles['/App.tsx']) {
    console.error('No /App.tsx found in files:', Object.keys(sandpackFiles));
    console.log('Original file paths:', appData.files.map(f => f.path));
  }

  // Add index.tsx for TypeScript support
  if (!sandpackFiles['/index.tsx'] && !sandpackFiles['/index.js']) {
    sandpackFiles['/index.tsx'] = {
      code: `import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import App from "./App";

const root = createRoot(document.getElementById("root")!);
root.render(<App />);`
    };
  }

  // Add styles.css - Sandpack format
  if (!sandpackFiles['/styles.css']) {
    sandpackFiles['/styles.css'] = {
      code: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3, h4, h5, h6 {
  margin: 0;
}`
    };
  }

  // Add public/index.html with Tailwind CDN
  if (!sandpackFiles['/public/index.html']) {
    sandpackFiles['/public/index.html'] = {
      code: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${appData.name || 'App'}</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`
    };
  }

  // Merge user dependencies with required ones
  const dependencies = {
    react: '^18.0.0',
    'react-dom': '^18.0.0',
    'react-scripts': '^5.0.0',
    ...appData.dependencies,
  };

  console.log('Sandpack files:', Object.keys(sandpackFiles));
  console.log('/App.tsx exists:', !!sandpackFiles['/App.tsx']);
  console.log('Dependencies:', dependencies);
  
  // Log first 200 chars of App.tsx to verify content
  if (sandpackFiles['/App.tsx']) {
    console.log('App.tsx content preview:', sandpackFiles['/App.tsx'].code.substring(0, 200));
  }

  return (
    <div className="w-full h-full" style={{ minHeight: '600px' }}>
      <SandpackProvider
        template="react-ts"
        theme="dark"
        files={sandpackFiles}
        customSetup={{
          dependencies,
        }}
        options={{
          autorun: true,
          autoReload: true,
          recompileMode: 'immediate',
          externalResources: ['https://cdn.tailwindcss.com'],
        }}
      >
        <SandpackLayout style={{ height: '100%', width: '100%' }}>
          <SandpackPreview 
            showOpenInCodeSandbox={false}
            showRefreshButton={true}
            actionsChildren={
              <button
                onClick={() => window.location.reload()}
                className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded"
              >
                Reset
              </button>
            }
            style={{ height: '100%', width: '100%' }}
          />
        </SandpackLayout>
        
        {appData.appType === 'FULL_STACK' && (
          <div className="absolute top-4 left-4 bg-yellow-500/90 text-yellow-900 px-4 py-2 rounded-lg text-sm font-medium shadow-lg z-50">
            ⚠️ Preview mode: Backend features disabled
          </div>
        )}
      </SandpackProvider>
    </div>
  );
}

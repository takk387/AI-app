"use client";

import React from 'react';
import { Sandpack } from '@codesandbox/sandpack-react';

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

  // Convert files to Sandpack format
  const sandpackFiles: Record<string, string> = {};
  
  appData.files.forEach(file => {
    // Map file paths to Sandpack structure
    let sandpackPath = file.path;
    
    // Handle different file structures
    if (sandpackPath === 'src/App.tsx' || sandpackPath === 'App.tsx') {
      sandpackPath = '/App.tsx';
    } else if (sandpackPath === 'app/page.tsx' || sandpackPath === 'page.tsx') {
      sandpackPath = '/App.tsx'; // Rename Next.js pages to App.tsx for React preview
    } else if (sandpackPath.startsWith('src/')) {
      sandpackPath = sandpackPath.substring(3); // Remove src/ prefix
    }
    
    // Start all paths with /
    if (!sandpackPath.startsWith('/')) {
      sandpackPath = '/' + sandpackPath;
    }
    
    sandpackFiles[sandpackPath] = file.content;
  });

  // Add index.js if not present
  if (!sandpackFiles['/index.js'] && !sandpackFiles['/index.tsx']) {
    sandpackFiles['/index.js'] = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);`;
  }

  // Add styles.css if not present (for Tailwind or custom styles)
  if (!sandpackFiles['/styles.css']) {
    sandpackFiles['/styles.css'] = `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  -webkit-font-smoothing: antialiased;
}`;
  }

  // Add public/index.html if needed
  if (!sandpackFiles['/public/index.html']) {
    sandpackFiles['/public/index.html'] = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appData.name}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div id="root"></div>
</body>
</html>`;
  }

  // Merge user dependencies with required ones
  const dependencies = {
    react: '^18.2.0',
    'react-dom': '^18.2.0',
    ...appData.dependencies,
  };

  return (
    <div className="h-full w-full">
      <Sandpack
        template="react"
        theme="dark"
        files={sandpackFiles}
        customSetup={{
          dependencies: dependencies,
          entry: '/index.js',
        }}
        options={{
          showNavigator: false,
          showTabs: true,
          showLineNumbers: true,
          showInlineErrors: true,
          wrapContent: true,
          editorHeight: '100%',
          editorWidthPercentage: 0, // Hide editor, show only preview
          classes: {
            'sp-wrapper': 'h-full',
            'sp-layout': 'h-full',
            'sp-preview': 'h-full',
          },
        }}
      />
      
      {appData.appType === 'FULL_STACK' && (
        <div className="absolute top-4 left-4 bg-yellow-500/90 text-yellow-900 px-4 py-2 rounded-lg text-sm font-medium shadow-lg">
          ⚠️ Preview mode: Backend features disabled
        </div>
      )}
    </div>
  );
}

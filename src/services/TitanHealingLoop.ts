/**
 * Titan Healing Loop - Self-Healing Fidelity Refinement
 *
 * Extracted from TitanPipelineService.ts
 * Captures screenshots of rendered code and compares against originals
 * via VisionLoopEngine for iterative refinement.
 *
 * Dependencies: puppeteer (screenshot capture), VisionLoopEngine (critique + fix)
 */

import puppeteer from 'puppeteer';

// ============================================================================
// JSX MARKUP EXTRACTION
// ============================================================================

/**
 * Extract JSX markup from React component code
 * Converts React component to static HTML for screenshot capture
 */
export function extractJSXMarkup(reactCode: string): string {
  try {
    // Find the return statement in the component
    const returnMatch = reactCode.match(/return\s*\(([\s\S]*?)\);?\s*}/);
    if (!returnMatch) {
      // Try single-line return
      const singleLineMatch = reactCode.match(/return\s+(<[\s\S]*?>[\s\S]*?<\/[\s\S]*?>)/);
      if (!singleLineMatch) {
        console.warn('[TitanPipeline] Could not extract JSX from React component');
        return '<div>Error: Could not extract JSX</div>';
      }
      return singleLineMatch[1];
    }

    let jsx = returnMatch[1].trim();

    // Remove React-specific syntax that won't work in static HTML
    // Remove className -> class
    jsx = jsx.replace(/className=/g, 'class=');

    // Remove style objects and convert to inline styles (basic conversion)
    jsx = jsx.replace(/style=\{\{([^}]+)\}\}/g, (match, styleContent) => {
      // Convert JS object to CSS string
      const cssString = styleContent
        .split(',')
        .map((prop: string) => {
          const [key, value] = prop.split(':').map((s: string) => s.trim());
          if (!key || !value) return '';
          // Convert camelCase to kebab-case
          const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
          // Remove quotes from value
          const cssValue = value.replace(/['"]/g, '');
          return `${cssKey}:${cssValue}`;
        })
        .filter(Boolean)
        .join(';');
      return `style="${cssString}"`;
    });

    // Remove event handlers (onClick, onChange, etc.)
    jsx = jsx.replace(/\s+on[A-Z]\w+={[^}]+}/g, '');

    // Remove {variable} interpolations - replace with placeholder
    jsx = jsx.replace(/\{[\w.]+\}/g, '[dynamic]');

    // Remove lucide-react icon components - replace with placeholder
    jsx = jsx.replace(/<([A-Z]\w+)\s*\/>/g, '<span class="icon-placeholder">[$1 Icon]</span>');

    return jsx;
  } catch (error) {
    console.error('[TitanPipeline] JSX extraction error:', error);
    return '<div>Error extracting JSX</div>';
  }
}

// ============================================================================
// SCREENSHOT CAPTURE
// ============================================================================

/**
 * Render generated code and capture screenshot using Puppeteer
 * This captures the ACTUAL rendered output for comparison with original
 *
 * IMPROVED: Now renders real React with Lucide icons instead of placeholders
 */
export async function captureRenderedScreenshot(
  code: string,
  assets?: Record<string, string>
): Promise<string | null> {
  let browser = null;
  try {
    console.log('[TitanPipeline] Launching headless browser for screenshot...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // Instead of extracting static HTML, create a minimal React runtime
    // that can actually render the component with proper icons
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/lucide-react@latest/dist/umd/lucide-react.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      margin: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    #root {
      width: 100%;
      min-height: 100vh;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    try {
      // Inject extracted asset URLs so <img> tags can resolve correctly
      const assets = ${JSON.stringify(assets || {})};

      // Extract App component code (remove imports and export)
      const appCode = ${JSON.stringify(code)};

      // Remove import statements
      let cleanCode = appCode.replace(/^import.*from.*['"];?$/gm, '');

      // Remove export default
      cleanCode = cleanCode.replace(/export default /g, '');
      
      // Replace Lucide icon imports with window.lucideReact references
      // Icons are available as window.lucideReact.Home, window.lucideReact.User, etc.
      const iconPattern = /<([A-Z][a-zA-Z]+)\\s*(\\/?>|[^>]*>)/g;
      cleanCode = cleanCode.replace(iconPattern, (match, iconName, rest) => {
        // Common Lucide icon names
        const lucideIcons = [
          'Home', 'User', 'Menu', 'Search', 'Settings', 'Star', 'Heart', 'Check',
          'Plus', 'Minus', 'X', 'ChevronLeft', 'ChevronRight', 'ChevronDown', 'ChevronUp',
          'ArrowRight', 'ArrowLeft', 'Mail', 'Phone', 'MapPin', 'Calendar', 'Clock',
          'Bell', 'ShoppingCart', 'CreditCard', 'Download', 'Upload', 'Eye', 'EyeOff',
          'Info', 'AlertCircle', 'Play', 'Pause', 'Share', 'Lock', 'Unlock'
        ];
        
        if (lucideIcons.includes(iconName)) {
          return '<LucideIcon name="' + iconName + '"' + rest;
        }
        return match;
      });
      
      // Create a wrapper component that renders Lucide icons
      const LucideIcon = ({ name, size = 20, color = 'currentColor', ...props }) => {
        const IconComponent = window.lucideReact[name];
        if (!IconComponent) {
          return React.createElement('span', { style: { color: '#999' } }, '[' + name + ']');
        }
        return React.createElement(IconComponent, { size, color, ...props });
      };
      
      // Evaluate the component code in a safe context
      // Pass 'assets' so the generated code can reference extracted asset URLs
      const AppFunction = new Function('React', 'LucideIcon', 'assets', \`
        const { useState, useEffect, useRef } = React;
        \${cleanCode}
        return App;
      \`)(React, LucideIcon, assets);
      
      // Render the app
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(AppFunction));
      
      console.log('[Healing Screenshot] React app rendered successfully');
    } catch (error) {
      console.error('[Healing Screenshot] Render error:', error);
      document.getElementById('root').innerHTML = '<div style="padding: 20px; color: red;">Error rendering component: ' + error.message + '</div>';
    }
  </script>
</body>
</html>
    `;

    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 15000 });

    // Wait for React to render and Tailwind to process
    await new Promise<void>((resolve) => setTimeout(resolve, 2000));

    // Check for render errors
    const hasError = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root?.textContent?.includes('Error rendering');
    });

    if (hasError) {
      console.warn('[TitanPipeline] Component rendered with errors, screenshot may be incomplete');
    }

    // Capture screenshot as PNG with base64 encoding
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: true,
      encoding: 'base64',
    });

    console.log('[TitanPipeline] Screenshot captured successfully');

    // Return as data URL (screenshot is already base64 string)
    return `data:image/png;base64,${screenshot}`;
  } catch (error) {
    console.error('[TitanPipeline] Screenshot capture failed:', error);
    return null;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

// ============================================================================
// HEALING LOOP EXECUTION
// ============================================================================

import type { AppFile } from '@/types/railway';
import type {
  VisualManifest,
  ComponentStructure,
  MotionPhysics,
  MergeStrategy,
} from '@/types/titanPipeline';
import { createVisionLoopEngine } from './VisionLoopEngine';
import { assembleCode } from './TitanBuilder';

export interface HealingLoopParams {
  files: AppFile[];
  manifests: VisualManifest[];
  physics: MotionPhysics | null;
  strategy: MergeStrategy;
  structure: ComponentStructure | null;
  input: {
    files: { base64: string; mimeType: string; filename: string }[];
    currentCode: string | null;
    instructions: string;
  };
  finalAssets: Record<string, string>;
  primaryImageRef?: { fileUri: string; mimeType: string };
  maxIterations?: number;
  targetFidelity?: number;
}

export interface HealingLoopResult {
  files: AppFile[];
  warnings: string[];
  timingMs: number;
}

/**
 * Run the self-healing vision loop:
 * 1. Capture screenshot of current code
 * 2. Critique via VisionLoopEngine (compares to original)
 * 3. Apply fixes to manifests
 * 4. Regenerate code with healing context
 * 5. Repeat until target fidelity or max iterations
 */
export async function runHealingLoop(params: HealingLoopParams): Promise<HealingLoopResult> {
  const {
    manifests,
    physics,
    strategy,
    structure,
    input,
    finalAssets,
    primaryImageRef,
    maxIterations = 2,
    targetFidelity = 95,
  } = params;
  let { files } = params;

  const warnings: string[] = [];
  const healStart = Date.now();
  let totalFixesApplied = 0;
  let lastFidelity = 0;

  try {
    const visionEngine = createVisionLoopEngine({
      maxIterations,
      targetFidelity,
    });
    const originalImage = input.files[0].base64;

    for (let iteration = 1; iteration <= maxIterations; iteration++) {
      // 1. Get current App.tsx
      const appFile = files.find((f) => f.path === '/src/App.tsx');
      if (!appFile) {
        warnings.push('No App.tsx found, skipping healing loop');
        break;
      }

      // 2. Render and capture screenshot (pass assets so <img> tags resolve correctly)
      const screenshot = await captureRenderedScreenshot(appFile.content, finalAssets);
      if (!screenshot) {
        warnings.push(`Screenshot capture failed on iteration ${iteration}, stopping healing`);
        break;
      }

      // 3. Critique and fix
      // Caller guarantees manifests[0].global_theme.dom_tree exists before invoking healing loop
      const currentComponents = [manifests[0].global_theme!.dom_tree] as any;
      const stepResult = await visionEngine.executeStep(
        originalImage,
        currentComponents,
        null,
        async () => screenshot,
        iteration
      );

      lastFidelity = stepResult.fidelityScore;
      totalFixesApplied += stepResult.changesApplied;

      console.log(`[TitanPipeline] Healing iteration ${iteration}:`, {
        fidelityScore: stepResult.fidelityScore,
        changesApplied: stepResult.changesApplied,
        modifiedComponents: stepResult.modifiedComponentIds.length,
      });

      // 4. Stop early if fidelity target reached or no changes
      if (stepResult.fidelityScore >= targetFidelity) {
        console.log(
          `[TitanPipeline] Target fidelity reached (${stepResult.fidelityScore}%), stopping`
        );
        break;
      }
      if (stepResult.changesApplied === 0) {
        console.log('[TitanPipeline] No fixes applied, stopping healing loop');
        break;
      }

      // 5. Update manifest and regenerate code for next iteration
      manifests[0].global_theme!.dom_tree = stepResult.components[0];

      // NOTE: Describe what was ALREADY FIXED, not what needs fixing.
      // The manifest now contains the corrected components, so telling the AI
      // what to fix again causes a double-layer bug.
      const issuesSummary =
        stepResult.modifiedComponentIds.length > 0
          ? `${stepResult.changesApplied} corrections have been APPLIED to the manifest. ` +
            `Components already fixed: ${stepResult.modifiedComponentIds.join(', ')}. ` +
            `DO NOT re-fix these components — use their current values exactly as-is. ` +
            `Current fidelity: ${stepResult.fidelityScore}%. Target: ${targetFidelity}%.`
          : `Fidelity: ${stepResult.fidelityScore}%. Overall visual accuracy needs improvement.`;

      // CRITICAL FIX: Force CREATE mode during healing iterations.
      // If we pass the original strategy (which may be MERGE or EDIT), the AI will
      // try to ADD elements on top of existing code, causing double-layer bugs.
      // By forcing CREATE mode and passing null for currentCode, we ensure the AI
      // regenerates from the corrected manifest only.
      const healingStrategy: MergeStrategy = {
        ...strategy,
        mode: 'CREATE',
        execution_plan: {
          ...strategy.execution_plan,
          preserve_existing_code: false,
        },
      };

      files = await assembleCode(
        structure,
        manifests,
        physics,
        healingStrategy,
        null, // Don't pass existing code - regenerate from manifest only
        input.instructions,
        finalAssets,
        primaryImageRef,
        {
          iteration,
          previousFidelityScore: stepResult.fidelityScore,
          modifiedComponentIds: stepResult.modifiedComponentIds,
          issuesSummary,
        }
      );
    }

    if (totalFixesApplied > 0) {
      warnings.push(
        `Healing loop applied ${totalFixesApplied} fixes across iterations (fidelity: ${lastFidelity.toFixed(1)}%)`
      );
    } else {
      warnings.push(`Healing loop: No fixes needed (fidelity: ${lastFidelity.toFixed(1)}%)`);
    }
  } catch (error) {
    console.error('[TitanPipeline] Healing loop error:', error);
    warnings.push('Healing loop encountered an error but pipeline continued');
  }

  const timingMs = Date.now() - healStart;
  console.log(`[TitanPipeline] Healing loop completed in ${timingMs}ms`);

  return { files, warnings, timingMs };
}

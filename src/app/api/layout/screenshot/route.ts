/**
 * Screenshot API Route
 *
 * Server-side screenshot capture using Puppeteer.
 * Used by the self-healing vision loop to capture the current
 * rendered layout for comparison with the original design.
 *
 * Features:
 * - Captures HTML/CSS to base64 PNG
 * - Handles blur effects, gradients, and custom fonts correctly
 * - Configurable viewport dimensions
 * - Falls back gracefully if Puppeteer unavailable
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ScreenshotRequest, ScreenshotResponse } from '@/types/layoutAnalysis';

// Lazy-load puppeteer to avoid issues in environments where it's not available
let puppeteerModule: typeof import('puppeteer') | null = null;

async function getPuppeteer() {
  if (!puppeteerModule) {
    try {
      puppeteerModule = await import('puppeteer');
    } catch (error) {
      console.warn('[Screenshot API] Puppeteer not available:', error);
      return null;
    }
  }
  return puppeteerModule;
}

export async function POST(req: NextRequest) {
  try {
    const body: ScreenshotRequest = await req.json();
    const { html, css, viewport = { width: 1280, height: 800 } } = body;

    if (!html) {
      return NextResponse.json(
        { success: false, error: 'HTML content is required' } as ScreenshotResponse,
        { status: 400 }
      );
    }

    const puppeteer = await getPuppeteer();

    if (!puppeteer) {
      return NextResponse.json(
        {
          success: false,
          error: 'Puppeteer not available. Use client-side html2canvas as fallback.',
        } as ScreenshotResponse,
        { status: 503 }
      );
    }

    // Launch browser with appropriate settings for server environment
    const browser = await puppeteer.default.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
      ],
    });

    try {
      const page = await browser.newPage();

      // Set viewport
      await page.setViewport({
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 2, // Higher quality screenshot
      });

      // Build the full HTML document with styles
      const fullHtml = buildFullHtmlDocument(html, css, viewport);

      // Set the page content
      await page.setContent(fullHtml, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // Wait a bit for any CSS transitions/animations to settle
      await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 500)));

      // Take the screenshot
      const screenshotBuffer = await page.screenshot({
        type: 'png',
        fullPage: false,
        encoding: 'base64',
      });

      const response: ScreenshotResponse = {
        success: true,
        image: `data:image/png;base64,${screenshotBuffer}`,
      };

      return NextResponse.json(response);
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('[Screenshot API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Screenshot capture failed';
    return NextResponse.json({ success: false, error: errorMessage } as ScreenshotResponse, {
      status: 500,
    });
  }
}

/**
 * Build a complete HTML document with proper styling
 */
function buildFullHtmlDocument(
  html: string,
  css?: string,
  viewport?: { width: number; height: number }
): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Layout Screenshot</title>

  <!-- Google Fonts for common font families -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

  <style>
    /* Reset and base styles */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      width: ${viewport?.width || 1280}px;
      height: ${viewport?.height || 800}px;
      overflow: hidden;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    body {
      background: #ffffff;
      position: relative;
    }

    /* Support for blur effects (glassmorphism) */
    .backdrop-blur {
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }

    /* Support for gradients */
    .gradient-support {
      background-image: var(--gradient);
    }

    /* Custom CSS from request */
    ${css || ''}
  </style>
</head>
<body>
  ${html}
</body>
</html>
  `.trim();
}

/**
 * GET handler for health check
 */
export async function GET() {
  const puppeteer = await getPuppeteer();
  return NextResponse.json({
    available: !!puppeteer,
    message: puppeteer
      ? 'Screenshot API ready with Puppeteer'
      : 'Puppeteer not available - use html2canvas fallback',
  });
}

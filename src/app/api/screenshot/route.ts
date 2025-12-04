/**
 * Screenshot API Route
 *
 * Captures screenshots of the app preview using Puppeteer server-side.
 * Bypasses client-side security restrictions (CORS, tainted canvas, iframe sandboxing).
 */

import { NextRequest, NextResponse } from 'next/server';
import puppeteer, { Browser, Page } from 'puppeteer';
import { buildPreviewHtml } from '@/utils/previewHtmlBuilder';

// Browser singleton for connection pooling (avoids cold start per request)
let browserInstance: Browser | null = null;
let browserLastUsed = 0;
let browserLaunching: Promise<Browser> | null = null;
const BROWSER_IDLE_TIMEOUT = 60000; // Close after 1 min idle

// Viewport limits to prevent memory abuse
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1080;
const MIN_WIDTH = 320;
const MIN_HEIGHT = 240;

async function getBrowser(): Promise<Browser> {
  browserLastUsed = Date.now();

  if (browserInstance?.connected) {
    return browserInstance;
  }

  // Prevent race condition: if already launching, wait for that promise
  if (browserLaunching) {
    return browserLaunching;
  }

  browserLaunching = puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process', // Reduce memory in containers
    ],
  });

  try {
    browserInstance = await browserLaunching;
  } finally {
    browserLaunching = null;
  }

  // Auto-close browser after idle timeout
  const checkIdle = setInterval(async () => {
    if (Date.now() - browserLastUsed > BROWSER_IDLE_TIMEOUT && browserInstance) {
      await browserInstance.close().catch(() => {});
      browserInstance = null;
      clearInterval(checkIdle);
    }
  }, 10000);

  return browserInstance;
}

export async function POST(req: NextRequest) {
  let page: Page | null = null;

  try {
    const body = await req.json();
    const { files, name, dependencies } = body;

    // Validate and clamp viewport dimensions
    let width = typeof body.width === 'number' ? body.width : 1280;
    let height = typeof body.height === 'number' ? body.height : 720;
    width = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width));
    height = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, height));

    if (!files || !Array.isArray(files)) {
      return NextResponse.json({ error: 'Files array required' }, { status: 400 });
    }

    if (files.length === 0) {
      return NextResponse.json({ error: 'Files array cannot be empty' }, { status: 400 });
    }

    // Build HTML with bundled code
    const html = await buildPreviewHtml({ files, name, dependencies });

    const browser = await getBrowser();
    page = await browser.newPage();
    await page.setViewport({ width, height });

    // Set timeout for page load
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 15000,
    });

    // Wait for React to actually render content into #root
    // This is more reliable than a fixed timeout
    try {
      await page.waitForFunction(
        () => {
          const root = document.getElementById('root');
          // Check that root exists and has actual rendered content
          return root && root.children.length > 0 && root.innerHTML.trim().length > 0;
        },
        { timeout: 10000 }
      );
      console.log('React rendered successfully');
    } catch {
      // If waitForFunction times out, log what's in #root for debugging
      const rootContent = await page.evaluate(() => {
        const root = document.getElementById('root');
        return root ? root.innerHTML.substring(0, 500) : 'root element not found';
      });
      console.warn('React render wait timed out. Root content:', rootContent);
    }

    // Additional small delay for any final paints/layout
    await new Promise((resolve) => setTimeout(resolve, 500));

    const screenshot = await page.screenshot({
      type: 'jpeg',
      quality: 80,
      encoding: 'base64',
    });

    return NextResponse.json({
      image: `data:image/jpeg;base64,${screenshot}`,
      width,
      height,
    });
  } catch (error) {
    console.error('Screenshot error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to capture screenshot' },
      { status: 500 }
    );
  } finally {
    // Always close the page (but keep browser open for reuse)
    if (page) {
      await page.close().catch(() => {});
    }
  }
}

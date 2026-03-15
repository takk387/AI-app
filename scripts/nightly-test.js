#!/usr/bin/env node

/**
 * NIGHTLY TEST RUNNER - Automated Bug Finding with Puppeteer
 *
 * Navigates through the full 5-step app flow headlessly, captures:
 *   - Console errors and warnings
 *   - Failed network requests
 *   - Screenshot at each step
 *   - State validation (Zustand store checks)
 *   - Performance timing
 *
 * Output: debug-sessions/findings.md (auto-feeds into debug-loop.js)
 *
 * Usage:
 *   node scripts/nightly-test.js
 *   node scripts/nightly-test.js --run-debug-loop     (also runs the debate after)
 *   node scripts/nightly-test.js --url https://custom-url.com
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── Configuration ────────────────────────────────────────────────────────────

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEBUG_DIR = path.join(PROJECT_ROOT, 'debug-sessions');
const SCREENSHOTS_DIR = path.join(DEBUG_DIR, 'screenshots');
const FINDINGS_FILE = path.join(DEBUG_DIR, 'findings-puppeteer.md');

let APP_URL = 'https://ai-app-production-e93b.up.railway.app';
const NAVIGATION_TIMEOUT = 60000;
const STEP_WAIT = 3000;

// ─── Parse CLI Args ───────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    url: APP_URL,
    runDebugLoop: false,
    headless: true,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) {
      config.url = args[i + 1];
      i++;
    } else if (args[i] === '--run-debug-loop') {
      config.runDebugLoop = true;
    } else if (args[i] === '--visible') {
      config.headless = false;
    }
  }

  return config;
}

// ─── Bug Collector ────────────────────────────────────────────────────────────

class BugCollector {
  constructor() {
    this.consoleErrors = [];
    this.consoleWarnings = [];
    this.networkFailures = [];
    this.stateIssues = [];
    this.performanceIssues = [];
    this.stepResults = [];
    this.screenshots = [];
  }

  addConsoleError(step, message) {
    this.consoleErrors.push({ step, message, timestamp: new Date().toISOString() });
  }

  addConsoleWarning(step, message) {
    this.consoleWarnings.push({ step, message, timestamp: new Date().toISOString() });
  }

  addNetworkFailure(step, url, status, method) {
    this.networkFailures.push({ step, url, status, method, timestamp: new Date().toISOString() });
  }

  addStateIssue(step, description, expected, actual) {
    this.stateIssues.push({ step, description, expected, actual });
  }

  addPerformanceIssue(step, description, duration) {
    this.performanceIssues.push({ step, description, duration });
  }

  addStepResult(step, name, status, notes = '') {
    this.stepResults.push({ step, name, status, notes });
  }

  generateFindings() {
    const totalBugs =
      this.consoleErrors.length +
      this.networkFailures.length +
      this.stateIssues.length +
      this.performanceIssues.length;

    let md = `# Automated Bug Findings - Nightly Test Run\n\n`;
    md += `## Source: Puppeteer Headless Test (${new Date().toISOString()})\n\n`;
    md += `**App URL:** ${APP_URL}\n`;
    md += `**Total issues found:** ${totalBugs}\n\n`;
    md += `---\n\n`;

    // Step Results Summary
    md += `## Step Results Summary\n\n`;
    for (const step of this.stepResults) {
      const icon = step.status === 'PASS' ? 'PASS' : step.status === 'FAIL' ? 'FAIL' : 'WARN';
      md += `- Step ${step.step}: ${step.name} - ${icon}${step.notes ? ' — ' + step.notes : ''}\n`;
    }
    md += `\n---\n\n`;

    // Console Errors
    if (this.consoleErrors.length > 0) {
      md += `## Console Errors (${this.consoleErrors.length})\n\n`;
      for (const err of this.consoleErrors) {
        md += `### [Step ${err.step}] ${err.timestamp}\n`;
        md += `\`\`\`\n${err.message}\n\`\`\`\n\n`;
      }
      md += `---\n\n`;
    }

    // Network Failures
    if (this.networkFailures.length > 0) {
      md += `## Network Failures (${this.networkFailures.length})\n\n`;
      for (const fail of this.networkFailures) {
        md += `- [Step ${fail.step}] ${fail.method} ${fail.url} → **${fail.status}**\n`;
      }
      md += `\n---\n\n`;
    }

    // State Issues
    if (this.stateIssues.length > 0) {
      md += `## State Issues (${this.stateIssues.length})\n\n`;
      for (const issue of this.stateIssues) {
        md += `### [Step ${issue.step}] ${issue.description}\n`;
        md += `- **Expected:** ${issue.expected}\n`;
        md += `- **Actual:** ${issue.actual}\n\n`;
      }
      md += `---\n\n`;
    }

    // Performance Issues
    if (this.performanceIssues.length > 0) {
      md += `## Performance Issues (${this.performanceIssues.length})\n\n`;
      for (const perf of this.performanceIssues) {
        md += `- [Step ${perf.step}] ${perf.description} — **${perf.duration}ms**\n`;
      }
      md += `\n---\n\n`;
    }

    // Console Warnings
    if (this.consoleWarnings.length > 0) {
      md += `## Console Warnings (${this.consoleWarnings.length})\n\n`;
      for (const warn of this.consoleWarnings.slice(0, 20)) {
        md += `- [Step ${warn.step}] ${warn.message.substring(0, 200)}\n`;
      }
      if (this.consoleWarnings.length > 20) {
        md += `- ...and ${this.consoleWarnings.length - 20} more warnings\n`;
      }
      md += `\n---\n\n`;
    }

    // Screenshots reference
    if (this.screenshots.length > 0) {
      md += `## Screenshots\n\n`;
      for (const ss of this.screenshots) {
        md += `- Step ${ss.step}: \`${ss.path}\`\n`;
      }
      md += `\n`;
    }

    return md;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function screenshot(page, collector, step, name) {
  const filename = `step${step}-${name}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  collector.screenshots.push({ step, path: `screenshots/${filename}` });
  console.log(`    [screenshot] ${filename}`);
}

async function waitAndCheck(page, collector, step, ms = STEP_WAIT) {
  await new Promise((r) => setTimeout(r, ms));
}

// Check Zustand store state via window
async function getStoreState(page) {
  try {
    return await page.evaluate(() => {
      // Try to access Zustand store from window (devtools)
      // Next.js apps often expose state through __NEXT_DATA__ or we can check localStorage
      const stored = localStorage.getItem('app-builder-storage');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return null;
        }
      }
      return null;
    });
  } catch {
    return null;
  }
}

// ─── Test Steps ───────────────────────────────────────────────────────────────

async function testStep1_Wizard(page, collector) {
  const step = 1;
  console.log('\n  ── Step 1: Wizard ──');
  const start = Date.now();

  try {
    await page.goto(`${APP_URL}/app/wizard`, {
      waitUntil: 'networkidle2',
      timeout: NAVIGATION_TIMEOUT,
    });
    await waitAndCheck(page, collector, step, 5000);
    await screenshot(page, collector, step, 'wizard-loaded');

    // Check if the wizard loaded
    const hasInput = await page.$('input, textarea, [contenteditable]');
    const hasChat = await page.$('[class*="chat"], [class*="conversation"], [class*="wizard"]');

    if (!hasInput && !hasChat) {
      collector.addStateIssue(step, 'Wizard page has no input or chat interface', 'Chat input visible', 'No interactive elements found');
      collector.addStepResult(step, 'Wizard', 'FAIL', 'No chat interface rendered');
      return false;
    }

    // Try typing a test message
    const input = await page.$('textarea, input[type="text"], [contenteditable="true"]');
    if (input) {
      await input.type('Build me a recipe sharing app called TestApp with user profiles and recipe search', { delay: 30 });
      await waitAndCheck(page, collector, step, 2000);

      // Try submitting
      const submitBtn = await page.$('button[type="submit"], button:has(svg), [class*="send"]');
      if (submitBtn) {
        await submitBtn.click();
        await waitAndCheck(page, collector, step, 15000); // Wait for AI response
        await screenshot(page, collector, step, 'wizard-response');
      }
    }

    const duration = Date.now() - start;
    if (duration > 30000) {
      collector.addPerformanceIssue(step, 'Wizard step took too long', duration);
    }

    collector.addStepResult(step, 'Wizard', 'PASS');
    return true;
  } catch (err) {
    collector.addStepResult(step, 'Wizard', 'FAIL', err.message);
    await screenshot(page, collector, step, 'wizard-error');
    return false;
  }
}

async function testStep2_Design(page, collector) {
  const step = 2;
  console.log('\n  ── Step 2: Design ──');
  const start = Date.now();

  try {
    await page.goto(`${APP_URL}/app/design`, {
      waitUntil: 'networkidle2',
      timeout: NAVIGATION_TIMEOUT,
    });
    await waitAndCheck(page, collector, step, 5000);
    await screenshot(page, collector, step, 'design-loaded');

    // Check if layout builder loaded
    const hasCanvas = await page.$('[class*="layout"], [class*="canvas"], [class*="builder"], [class*="design"]');

    if (!hasCanvas) {
      collector.addStateIssue(step, 'Design page missing layout builder', 'Layout builder visible', 'No builder elements found');
      collector.addStepResult(step, 'Design', 'WARN', 'Layout builder not detected');
    }

    // Check Zustand state for appConcept
    const state = await getStoreState(page);
    if (state && state.state) {
      const concept = state.state.appConcept;
      if (!concept || !concept.name || concept.name === 'Untitled App') {
        collector.addStateIssue(step, 'appConcept missing or untitled at Design step',
          'Valid app concept with name', `Got: ${concept ? concept.name : 'null'}`);
      }
    }

    // Look for generate button
    const generateBtn = await page.$('button');
    const buttons = await page.$$('button');
    let foundGenerate = false;
    for (const btn of buttons) {
      const text = await page.evaluate((el) => el.textContent, btn);
      if (text && text.toLowerCase().includes('generate')) {
        foundGenerate = true;
        break;
      }
    }

    const duration = Date.now() - start;
    if (duration > 30000) {
      collector.addPerformanceIssue(step, 'Design page load too slow', duration);
    }

    collector.addStepResult(step, 'Design', 'PASS', foundGenerate ? 'Generate button found' : 'No generate button found');
    await screenshot(page, collector, step, 'design-final');
    return true;
  } catch (err) {
    collector.addStepResult(step, 'Design', 'FAIL', err.message);
    await screenshot(page, collector, step, 'design-error');
    return false;
  }
}

async function testStep3_AIPlan(page, collector) {
  const step = 3;
  console.log('\n  ── Step 3: AI Plan ──');
  const start = Date.now();

  try {
    await page.goto(`${APP_URL}/app/ai-plan`, {
      waitUntil: 'networkidle2',
      timeout: NAVIGATION_TIMEOUT,
    });
    await waitAndCheck(page, collector, step, 5000);
    await screenshot(page, collector, step, 'aiplan-loaded');

    // Check if the planning interface loaded
    const pageContent = await page.content();
    const hasPlanning = pageContent.includes('plan') || pageContent.includes('architect') || pageContent.includes('consensus');

    if (!hasPlanning) {
      collector.addStateIssue(step, 'AI Plan page missing planning interface', 'Planning UI visible', 'No planning elements detected');
    }

    const duration = Date.now() - start;
    collector.addStepResult(step, 'AI Plan', 'PASS');
    return true;
  } catch (err) {
    collector.addStepResult(step, 'AI Plan', 'FAIL', err.message);
    await screenshot(page, collector, step, 'aiplan-error');
    return false;
  }
}

async function testStep4_Review(page, collector) {
  const step = 4;
  console.log('\n  ── Step 4: Review ──');
  const start = Date.now();

  try {
    await page.goto(`${APP_URL}/app/review`, {
      waitUntil: 'networkidle2',
      timeout: NAVIGATION_TIMEOUT,
    });
    await waitAndCheck(page, collector, step, 5000);
    await screenshot(page, collector, step, 'review-loaded');

    // Check Zustand state for stale data
    const state = await getStoreState(page);
    if (state && state.state) {
      const plan = state.state.dynamicPhasePlan;
      const concept = state.state.appConcept;

      // Check for stale project name references
      if (plan && concept && concept.name) {
        const planStr = JSON.stringify(plan);
        // Look for project names that don't match current concept
        if (concept.name !== 'Untitled App' && !planStr.includes(concept.name)) {
          collector.addStateIssue(step, 'Build plan may reference stale project name',
            `References to "${concept.name}"`, 'Current project name not found in plan');
        }
      }

      // Check for concept integrity
      if (concept && concept.name === 'Untitled App' && concept.coreFeatures && concept.coreFeatures.length > 0) {
        collector.addStateIssue(step, 'Concept has features but name is "Untitled App"',
          'Named concept', 'Untitled App with features — possible state corruption');
      }
    }

    const duration = Date.now() - start;
    collector.addStepResult(step, 'Review', 'PASS');
    return true;
  } catch (err) {
    collector.addStepResult(step, 'Review', 'FAIL', err.message);
    await screenshot(page, collector, step, 'review-error');
    return false;
  }
}

async function testStep5_Builder(page, collector) {
  const step = 5;
  console.log('\n  ── Step 5: Builder ──');
  const start = Date.now();

  try {
    await page.goto(`${APP_URL}/app`, {
      waitUntil: 'networkidle2',
      timeout: NAVIGATION_TIMEOUT,
    });
    await waitAndCheck(page, collector, step, 5000);
    await screenshot(page, collector, step, 'builder-loaded');

    // Check Zustand state before any interaction
    const stateBefore = await getStoreState(page);
    let conceptBefore = null;
    if (stateBefore && stateBefore.state) {
      conceptBefore = stateBefore.state.appConcept;
    }

    // CRITICAL TEST: Check Plan/Act toggle state wipe (Bug #1 from previous findings)
    const buttons = await page.$$('button');
    let planTab = null;
    let actTab = null;
    for (const btn of buttons) {
      const text = await page.evaluate((el) => el.textContent.trim().toLowerCase(), btn);
      if (text === 'plan') planTab = btn;
      if (text === 'act') actTab = btn;
    }

    if (planTab && conceptBefore) {
      console.log('    [test] Clicking Plan tab to check state preservation...');
      await planTab.click();
      await waitAndCheck(page, collector, step, 3000);
      await screenshot(page, collector, step, 'builder-plan-tab');

      const stateAfterPlan = await getStoreState(page);
      if (stateAfterPlan && stateAfterPlan.state) {
        const conceptAfter = stateAfterPlan.state.appConcept;
        if (conceptBefore.name && conceptBefore.name !== 'Untitled App') {
          if (!conceptAfter || conceptAfter.name === 'Untitled App' || conceptAfter.name !== conceptBefore.name) {
            collector.addStateIssue(step,
              'CRITICAL: Plan tab toggle wiped appConcept (Bug #1 regression)',
              `appConcept.name = "${conceptBefore.name}"`,
              `appConcept.name = "${conceptAfter ? conceptAfter.name : 'null'}"`);
          }
        }
      }

      // Switch back to Act
      if (actTab) {
        await actTab.click();
        await waitAndCheck(page, collector, step, 3000);

        const stateAfterAct = await getStoreState(page);
        if (stateAfterAct && stateAfterAct.state) {
          const conceptFinal = stateAfterAct.state.appConcept;
          if (conceptBefore.name && conceptBefore.name !== 'Untitled App') {
            if (!conceptFinal || conceptFinal.name !== conceptBefore.name) {
              collector.addStateIssue(step,
                'CRITICAL: Data not restored after switching back to Act tab',
                `appConcept.name = "${conceptBefore.name}"`,
                `appConcept.name = "${conceptFinal ? conceptFinal.name : 'null'}"`);
            }
          }
        }
      }
    }

    // Check build progress
    const progressEl = await page.$('[class*="progress"], [role="progressbar"]');
    if (progressEl) {
      const progress = await page.evaluate((el) => {
        const width = el.style?.width;
        const ariaVal = el.getAttribute('aria-valuenow');
        return { width, ariaVal };
      }, progressEl);
      console.log(`    [info] Build progress: ${progress.width || progress.ariaVal || 'unknown'}`);
    }

    const duration = Date.now() - start;
    if (duration > 30000) {
      collector.addPerformanceIssue(step, 'Builder page load slow', duration);
    }

    collector.addStepResult(step, 'Builder', conceptBefore ? 'PASS' : 'WARN', 'State tests completed');
    await screenshot(page, collector, step, 'builder-final');
    return true;
  } catch (err) {
    collector.addStepResult(step, 'Builder', 'FAIL', err.message);
    await screenshot(page, collector, step, 'builder-error');
    return false;
  }
}

// ─── Service Health Checks (no browser needed) ───────────────────────────────

async function checkServiceHealth(collector) {
  console.log('\n  ── Service Health Checks ──');
  const https = require('https');
  const http = require('http');

  // Helper to make a simple GET request
  function httpGet(url, timeoutMs = 15000) {
    return new Promise((resolve) => {
      const start = Date.now();
      const client = url.startsWith('https') ? https : http;
      const req = client.get(url, { timeout: timeoutMs }, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          resolve({ status: res.statusCode, data, duration: Date.now() - start });
        });
      });
      req.on('error', (err) => {
        resolve({ status: 0, data: '', error: err.message, duration: Date.now() - start });
      });
      req.on('timeout', () => {
        req.destroy();
        resolve({ status: 0, data: '', error: 'Request timed out', duration: Date.now() - start });
      });
    });
  }

  // 1. Railway deployment health (main app)
  console.log('    [check] Railway app health...');
  const appHealth = await httpGet(APP_URL);
  if (appHealth.status === 0 || appHealth.status >= 500) {
    collector.addStateIssue(0, 'Railway deployment is DOWN or erroring',
      'HTTP 200', `HTTP ${appHealth.status} — ${appHealth.error || 'Server error'}`);
    collector.addStepResult(0, 'Railway Health', 'FAIL', `Status ${appHealth.status}`);
  } else if (appHealth.duration > 10000) {
    collector.addPerformanceIssue(0, 'Railway app response extremely slow', appHealth.duration);
    collector.addStepResult(0, 'Railway Health', 'WARN', `${appHealth.duration}ms response time`);
  } else {
    collector.addStepResult(0, 'Railway Health', 'PASS', `${appHealth.status} in ${appHealth.duration}ms`);
  }
  console.log(`      Status: ${appHealth.status}, Time: ${appHealth.duration}ms`);

  // 2. API endpoint checks
  const apiEndpoints = [
    { name: 'Layout Pipeline', path: '/api/layout/pipeline' },
    { name: 'Generate Route', path: '/api/generate' },
    { name: 'AI Plan', path: '/api/ai-plan' },
  ];

  for (const endpoint of apiEndpoints) {
    console.log(`    [check] API: ${endpoint.name}...`);
    const result = await httpGet(`${APP_URL}${endpoint.path}`);
    // We expect 405 (method not allowed) for POST endpoints on GET, or 401/403 — that's fine, means the endpoint exists
    if (result.status === 0) {
      collector.addStateIssue(0, `API endpoint ${endpoint.name} is unreachable`,
        'Endpoint responding', `${result.error}`);
      collector.addStepResult(0, `API: ${endpoint.name}`, 'FAIL', result.error);
    } else if (result.status >= 500) {
      collector.addStateIssue(0, `API endpoint ${endpoint.name} returning server error`,
        'No 5xx errors', `HTTP ${result.status}`);
      collector.addStepResult(0, `API: ${endpoint.name}`, 'FAIL', `HTTP ${result.status}`);
    } else {
      collector.addStepResult(0, `API: ${endpoint.name}`, 'PASS', `HTTP ${result.status} in ${result.duration}ms`);
    }
    console.log(`      Status: ${result.status}, Time: ${result.duration}ms`);
  }

  // 3. GitHub CI status (uses gh CLI if available)
  console.log('    [check] GitHub CI status...');
  try {
    const ghResult = require('child_process').spawnSync(
      'gh',
      ['run', 'list', '--limit', '3', '--json', 'status,conclusion,name,createdAt,headBranch'],
      {
        cwd: PROJECT_ROOT,
        encoding: 'utf-8',
        timeout: 15000,
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );

    if (ghResult.status === 0 && ghResult.stdout) {
      try {
        const runs = JSON.parse(ghResult.stdout);
        let hasFailure = false;

        for (const run of runs) {
          if (run.conclusion === 'failure') {
            hasFailure = true;
            collector.addStateIssue(0, `GitHub CI failure: "${run.name}" on ${run.headBranch}`,
              'All CI checks passing', `Failed at ${run.createdAt}`);
          }
          console.log(`      ${run.name}: ${run.conclusion || run.status} (${run.headBranch})`);
        }

        collector.addStepResult(0, 'GitHub CI', hasFailure ? 'FAIL' : 'PASS',
          hasFailure ? 'Recent CI failures detected' : 'All recent runs passing');
      } catch (parseErr) {
        collector.addStepResult(0, 'GitHub CI', 'WARN', 'Could not parse gh output');
      }
    } else {
      console.log('      gh CLI not available or not authenticated — skipping');
      collector.addStepResult(0, 'GitHub CI', 'WARN', 'gh CLI not available');
    }
  } catch (err) {
    console.log(`      gh CLI error: ${err.message}`);
    collector.addStepResult(0, 'GitHub CI', 'WARN', 'gh CLI not available');
  }

  // 4. Supabase health (basic check via app's Supabase URL from env)
  console.log('    [check] Supabase connectivity...');
  try {
    const envFile = fs.readFileSync(path.join(PROJECT_ROOT, '.env.local'), 'utf-8');
    const supabaseUrlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
    if (supabaseUrlMatch) {
      const supabaseUrl = supabaseUrlMatch[1].trim();
      const sbHealth = await httpGet(`${supabaseUrl}/rest/v1/`, 10000);
      if (sbHealth.status === 0) {
        collector.addStateIssue(0, 'Supabase is unreachable',
          'Supabase responding', sbHealth.error);
        collector.addStepResult(0, 'Supabase', 'FAIL', sbHealth.error);
      } else if (sbHealth.status >= 500) {
        collector.addStateIssue(0, 'Supabase returning server errors',
          'No 5xx errors', `HTTP ${sbHealth.status}`);
        collector.addStepResult(0, 'Supabase', 'FAIL', `HTTP ${sbHealth.status}`);
      } else {
        collector.addStepResult(0, 'Supabase', 'PASS', `HTTP ${sbHealth.status} in ${sbHealth.duration}ms`);
      }
      console.log(`      Status: ${sbHealth.status}, Time: ${sbHealth.duration}ms`);
    } else {
      collector.addStepResult(0, 'Supabase', 'WARN', 'No SUPABASE_URL in .env.local');
    }
  } catch (err) {
    collector.addStepResult(0, 'Supabase', 'WARN', `Could not read .env.local: ${err.message}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const config = parseArgs();

  console.log('\n========================================');
  console.log('   NIGHTLY TEST RUNNER');
  console.log('   Automated Bug Finding');
  console.log('========================================\n');

  // Ensure directories exist
  if (!fs.existsSync(DEBUG_DIR)) fs.mkdirSync(DEBUG_DIR, { recursive: true });
  if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  console.log(`[*] Target: ${config.url}`);
  console.log(`[*] Headless: ${config.headless}`);
  console.log(`[*] Auto-run debug loop: ${config.runDebugLoop}\n`);

  APP_URL = config.url;

  const collector = new BugCollector();
  let currentStep = 0;

  // Launch browser
  console.log('[*] Launching Puppeteer...');
  const browser = await puppeteer.launch({
    headless: config.headless ? 'new' : false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900 },
  });

  const page = await browser.newPage();

  // Capture console messages
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      collector.addConsoleError(currentStep, text);
    } else if (type === 'warning' && !text.includes('DevTools')) {
      collector.addConsoleWarning(currentStep, text);
    }
  });

  // Capture failed network requests
  page.on('response', (response) => {
    const status = response.status();
    if (status >= 400) {
      collector.addNetworkFailure(currentStep, response.url(), status, response.request().method());
    }
  });

  // Capture page errors
  page.on('pageerror', (err) => {
    collector.addConsoleError(currentStep, `Page Error: ${err.message}`);
  });

  try {
    // Run service health checks first (no browser needed for these)
    await checkServiceHealth(collector);

    // Run all 5 UI steps
    currentStep = 1;
    await testStep1_Wizard(page, collector);

    currentStep = 2;
    await testStep2_Design(page, collector);

    currentStep = 3;
    await testStep3_AIPlan(page, collector);

    currentStep = 4;
    await testStep4_Review(page, collector);

    currentStep = 5;
    await testStep5_Builder(page, collector);

  } catch (err) {
    console.error(`\n[!] Fatal error during testing: ${err.message}`);
    collector.addConsoleError(currentStep, `Fatal: ${err.message}`);
  } finally {
    await browser.close();
    console.log('\n[*] Browser closed.');
  }

  // Generate findings
  const findings = collector.generateFindings();
  fs.writeFileSync(FINDINGS_FILE, findings, 'utf-8');
  console.log(`[+] Findings saved to: debug-sessions/findings-puppeteer.md`);
  console.log(`[+] Screenshots saved to: debug-sessions/screenshots/`);

  // Summary
  const total =
    collector.consoleErrors.length +
    collector.networkFailures.length +
    collector.stateIssues.length +
    collector.performanceIssues.length;

  // Service health summary
  const serviceSteps = collector.stepResults.filter((s) => s.step === 0);
  const failedServices = serviceSteps.filter((s) => s.status === 'FAIL');

  console.log(`\n  Results:`);
  console.log(`    Service checks:     ${serviceSteps.length} (${failedServices.length} failed)`);
  console.log(`    Console errors:     ${collector.consoleErrors.length}`);
  console.log(`    Network failures:   ${collector.networkFailures.length}`);
  console.log(`    State issues:       ${collector.stateIssues.length}`);
  console.log(`    Performance issues: ${collector.performanceIssues.length}`);
  console.log(`    Total issues:       ${total}`);

  // Run database health check (writes to its own db-health.md)
  console.log('\n[*] Running database health check...');
  try {
    require('child_process').spawnSync(
      'node',
      [path.join(__dirname, 'db-health-check.js')],
      {
        cwd: PROJECT_ROOT,
        encoding: 'utf-8',
        timeout: 30000,
        shell: true,
        stdio: 'inherit',
      }
    );
  } catch (err) {
    console.error(`[!] DB health check failed: ${err.message}`);
  }

  // Optionally run debug loop
  if (config.runDebugLoop && total > 0) {
    console.log('\n── Running Debug Loop ──────────────────\n');
    try {
      const result = require('child_process').spawnSync(
        'node',
        [path.join(__dirname, 'debug-loop.js')],
        {
          cwd: PROJECT_ROOT,
          encoding: 'utf-8',
          timeout: 600000, // 10 min for full debug loop
          shell: true,
          stdio: 'inherit',
        }
      );
    } catch (err) {
      console.error(`[!] Debug loop failed: ${err.message}`);
    }
  } else if (total > 0) {
    console.log(`\n  Run the debug loop to analyze these findings:`);
    console.log(`    node scripts/debug-loop.js\n`);
  } else {
    console.log(`\n  No issues found! Your app is looking clean.\n`);
  }

  console.log('========================================');
  console.log('   NIGHTLY TEST COMPLETE');
  console.log('========================================\n');
}

main().catch(console.error);

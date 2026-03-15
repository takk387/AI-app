#!/usr/bin/env node

/**
 * DEBUG LOOP - Automated Claude-to-Claude Debugging
 *
 * Automates the back-and-forth debugging workflow between a "Browser Analyst"
 * and a "Code Reviewer" using Claude Code CLI in headless mode.
 *
 * Usage:
 *   1. Paste your Chrome Claude findings into: debug-sessions/findings.md
 *   2. Run: node scripts/debug-loop.js
 *   3. The script runs the debate loop automatically
 *   4. Final consensus plan appears in: debug-sessions/fix-plan.md
 *   5. Feed the fix plan to Antigravity Claude to execute
 *
 * Options:
 *   --max-rounds <n>    Max debate rounds (default: 4)
 *   --findings <path>   Custom findings file path
 *   --auto-fix          After consensus, automatically run Claude Code to apply fixes
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ─── Configuration ────────────────────────────────────────────────────────────

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEBUG_DIR = path.join(PROJECT_ROOT, 'debug-sessions');
const FINDINGS_FILE = path.join(DEBUG_DIR, 'findings.md');
const DEBATE_LOG = path.join(DEBUG_DIR, 'debate-log.md');
const FIX_PLAN_FILE = path.join(DEBUG_DIR, 'fix-plan.md');

const DEFAULT_MAX_ROUNDS = 4;

// ─── Parse CLI Args ───────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    maxRounds: DEFAULT_MAX_ROUNDS,
    findingsPath: FINDINGS_FILE,
    autoFix: false,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--max-rounds' && args[i + 1]) {
      config.maxRounds = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--findings' && args[i + 1]) {
      config.findingsPath = path.resolve(args[i + 1]);
      i++;
    } else if (args[i] === '--auto-fix') {
      config.autoFix = true;
    }
  }

  return config;
}

// ─── Claude Code CLI Wrapper ──────────────────────────────────────────────────

function callClaude(prompt, contextFiles = []) {
  // Use spawnSync to pipe prompt via stdin — works on Windows, Mac, and Linux
  try {
    const result = require('child_process').spawnSync(
      'claude',
      ['-p', '--max-turns', '3'],
      {
        input: prompt,
        cwd: PROJECT_ROOT,
        encoding: 'utf-8',
        timeout: 300000, // 5 minute timeout per call
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );

    if (result.error) {
      console.error('  [!] Claude CLI error:', result.error.message);
      return `ERROR: Claude CLI failed - ${result.error.message}`;
    }

    if (result.status !== 0) {
      const errMsg = result.stderr || 'Unknown error';
      console.error('  [!] Claude CLI exit code ' + result.status + ':', errMsg.substring(0, 200));
      return `ERROR: Claude CLI failed (exit ${result.status}) - ${errMsg.substring(0, 200)}`;
    }

    return (result.stdout || '').trim();
  } catch (err) {
    console.error('  [!] Claude CLI error:', err.message);
    return `ERROR: Claude CLI failed - ${err.message}`;
  }
}

// ─── Personas / Prompts ───────────────────────────────────────────────────────

function browserAnalystPrompt(findings, previousReview = null) {
  let prompt = `You are the BROWSER ANALYST - an expert at finding UI bugs, runtime errors, and user-facing issues in web applications.

PROJECT CONTEXT: This is a Next.js AI App Builder project.

ORIGINAL FINDINGS FROM BROWSER INSPECTION:
${findings}
`;

  if (previousReview) {
    prompt += `
THE CODE REVIEWER has analyzed your findings and responded with:
${previousReview}

Based on the Code Reviewer's analysis:
1. Do you AGREE or DISAGREE with their assessment? Be specific.
2. Are there additional browser-side details that change their conclusions?
3. What points do you both agree on now?
4. Rate consensus on a scale of 1-10 (10 = full agreement).

Start your response with "CONSENSUS: X/10" where X is your rating.
`;
  }

  return prompt;
}

function codeReviewerPrompt(findings, browserAnalysis) {
  return `You are the CODE REVIEWER - an expert at analyzing source code, architecture, and root cause analysis for web application bugs.

PROJECT CONTEXT: This is a Next.js AI App Builder project. You have access to the full codebase.

ORIGINAL BUG FINDINGS:
${findings}

THE BROWSER ANALYST says:
${browserAnalysis}

Your job:
1. Analyze the findings from a code/architecture perspective.
2. Identify the likely ROOT CAUSE in the source code.
3. Point out anything the Browser Analyst might have missed or misidentified.
4. Suggest specific files and code changes needed.
5. Rate consensus on a scale of 1-10 (10 = full agreement with Browser Analyst).

Start your response with "CONSENSUS: X/10" where X is your rating.
`;
}

function fixPlanPrompt(findings, debateLog) {
  // Truncate the debate log if it's too long to avoid timeout
  const maxDebateLength = 8000;
  let trimmedDebate = debateLog;
  if (debateLog.length > maxDebateLength) {
    // Keep the last rounds (most refined consensus) and trim the rest
    trimmedDebate = '...[earlier rounds trimmed for brevity]...\n\n' +
      debateLog.substring(debateLog.length - maxDebateLength);
  }

  return `You are a SENIOR ENGINEER creating a final fix plan based on a debugging session.

ORIGINAL FINDINGS:
${findings}

DEBATE SUMMARY (Browser Analyst vs Code Reviewer):
${trimmedDebate}

Create a concise FINAL FIX PLAN with:
1. **Root Cause Summary** - One paragraph per bug
2. **Fix Steps** - Numbered steps with exact file paths and code changes
3. **Testing Plan** - How to verify each fix
4. **Risk Assessment** - Side effects to watch for

Be specific with file paths and code. Format as markdown ready for an AI coding agent to execute.
`;
}

// ─── Extract Consensus Score ──────────────────────────────────────────────────

function extractConsensus(response) {
  const match = response.match(/CONSENSUS:\s*(\d+)\s*\/\s*10/i);
  return match ? parseInt(match[1], 10) : 0;
}

// ─── Main Loop ────────────────────────────────────────────────────────────────

async function main() {
  const config = parseArgs();

  console.log('\n========================================');
  console.log('   DEBUG LOOP - Claude-to-Claude');
  console.log('   Automated Debugging System');
  console.log('========================================\n');

  // Ensure debug directory exists
  if (!fs.existsSync(DEBUG_DIR)) {
    fs.mkdirSync(DEBUG_DIR, { recursive: true });
    console.log('[+] Created debug-sessions/ directory');
  }

  // Check for findings file
  if (!fs.existsSync(config.findingsPath)) {
    // Create a template
    const template = `# Bug Findings

## Paste your Chrome Claude findings below:

<!--
  Instructions:
  1. Copy the bug analysis from Claude in Chrome
  2. Paste it here
  3. Save the file
  4. Run: node scripts/debug-loop.js
-->

`;
    fs.writeFileSync(config.findingsPath, template, 'utf-8');
    console.log(`[!] No findings file found.`);
    console.log(`    Created template at: debug-sessions/findings.md`);
    console.log(`    Paste your Chrome Claude findings there and run again.\n`);
    process.exit(0);
  }

  const findings = fs.readFileSync(config.findingsPath, 'utf-8');

  if (findings.includes('Paste your Chrome Claude findings below') && findings.trim().endsWith('-->')) {
    console.log('[!] Findings file is still the template.');
    console.log('    Paste your Chrome Claude findings into debug-sessions/findings.md\n');
    process.exit(0);
  }

  console.log(`[*] Loaded findings from: ${path.relative(PROJECT_ROOT, config.findingsPath)}`);
  console.log(`[*] Max debate rounds: ${config.maxRounds}`);
  console.log(`[*] Auto-fix mode: ${config.autoFix ? 'ON' : 'OFF'}\n`);

  // Initialize debate log
  let debateLog = `# Debug Debate Log\n`;
  debateLog += `**Date:** ${new Date().toISOString()}\n`;
  debateLog += `**Findings file:** ${path.relative(PROJECT_ROOT, config.findingsPath)}\n\n`;
  debateLog += `---\n\n`;
  debateLog += `## Original Findings\n\n${findings}\n\n---\n\n`;

  let lastReviewerResponse = null;
  let consensusReached = false;
  const CONSENSUS_THRESHOLD = 8;

  for (let round = 1; round <= config.maxRounds; round++) {
    console.log(`\n── Round ${round}/${config.maxRounds} ${'─'.repeat(40)}\n`);

    // Step 1: Browser Analyst
    console.log('  [Browser Analyst] Analyzing...');
    const analystResponse = callClaude(
      browserAnalystPrompt(findings, lastReviewerResponse)
    );
    const analystConsensus = extractConsensus(analystResponse);

    debateLog += `## Round ${round} - Browser Analyst\n\n${analystResponse}\n\n---\n\n`;
    console.log(`  [Browser Analyst] Done. Consensus: ${analystConsensus}/10`);

    // Check if consensus reached from analyst side
    if (analystConsensus >= CONSENSUS_THRESHOLD) {
      console.log(`\n  ** Consensus reached from Analyst side (${analystConsensus}/10) **`);
      consensusReached = true;
    }

    // Step 2: Code Reviewer
    console.log('  [Code Reviewer] Analyzing...');
    const reviewerResponse = callClaude(
      codeReviewerPrompt(findings, analystResponse)
    );
    const reviewerConsensus = extractConsensus(reviewerResponse);

    debateLog += `## Round ${round} - Code Reviewer\n\n${reviewerResponse}\n\n---\n\n`;
    console.log(`  [Code Reviewer] Done. Consensus: ${reviewerConsensus}/10`);

    lastReviewerResponse = reviewerResponse;

    // Check if both agree
    if (reviewerConsensus >= CONSENSUS_THRESHOLD && analystConsensus >= CONSENSUS_THRESHOLD) {
      console.log(`\n  ** Full consensus reached! (Analyst: ${analystConsensus}/10, Reviewer: ${reviewerConsensus}/10) **`);
      consensusReached = true;
      break;
    } else if (reviewerConsensus >= CONSENSUS_THRESHOLD) {
      console.log(`\n  ** Consensus reached from Reviewer side (${reviewerConsensus}/10) **`);
    }

    if (consensusReached) break;

    console.log(`  [Status] Avg consensus: ${((analystConsensus + reviewerConsensus) / 2).toFixed(1)}/10`);
  }

  // Save debate log
  fs.writeFileSync(DEBATE_LOG, debateLog, 'utf-8');
  console.log(`\n[+] Debate log saved to: debug-sessions/debate-log.md`);

  // Step 3: Generate fix plan
  console.log('\n── Generating Fix Plan ──────────────────\n');
  console.log('  [Senior Engineer] Creating consensus fix plan...');

  const fixPlan = callClaude(fixPlanPrompt(findings, debateLog));

  const fixPlanDoc = `# Fix Plan\n\n**Generated:** ${new Date().toISOString()}\n**Consensus reached:** ${consensusReached ? 'Yes' : 'No (max rounds hit)'}\n\n---\n\n${fixPlan}`;
  fs.writeFileSync(FIX_PLAN_FILE, fixPlanDoc, 'utf-8');
  console.log(`  [+] Fix plan saved to: debug-sessions/fix-plan.md`);

  // Step 4: Auto-fix if enabled
  if (config.autoFix) {
    console.log('\n── Auto-Fix Mode ───────────────────────\n');
    console.log('  [Executor] Applying fixes via Claude Code...');

    const autoFixResult = callClaude(
      `You are a senior developer. Apply the following fix plan to this codebase. Make the changes directly.\n\n${fixPlan}`
    );

    const fixResultFile = path.join(DEBUG_DIR, 'fix-result.md');
    fs.writeFileSync(fixResultFile, `# Fix Result\n\n${autoFixResult}`, 'utf-8');
    console.log(`  [+] Fix result saved to: debug-sessions/fix-result.md`);
  }

  // Done
  console.log('\n========================================');
  console.log('   DEBUG LOOP COMPLETE');
  console.log('========================================');
  console.log(`\n  Files created:`);
  console.log(`    - debug-sessions/debate-log.md  (full debate)`);
  console.log(`    - debug-sessions/fix-plan.md    (action plan)`);
  if (config.autoFix) {
    console.log(`    - debug-sessions/fix-result.md  (applied changes)`);
  }
  console.log(`\n  Next steps:`);
  if (!config.autoFix) {
    console.log(`    1. Review the fix plan in debug-sessions/fix-plan.md`);
    console.log(`    2. Paste it into Antigravity Claude to execute`);
    console.log(`    3. Or re-run with --auto-fix to apply automatically\n`);
  } else {
    console.log(`    1. Review the changes made by Claude Code`);
    console.log(`    2. Test the application in your browser\n`);
  }
}

main().catch(console.error);

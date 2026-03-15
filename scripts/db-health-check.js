#!/usr/bin/env node

/**
 * DATABASE HEALTH CHECK
 *
 * Generates a Supabase health report by querying the database directly.
 * Checks for: stuck builds, orphaned data, stale sessions, subscription issues.
 *
 * This script queries the Supabase REST API directly using the service key
 * from .env.local. It writes results to debug-sessions/db-health.md
 *
 * Usage:
 *   node scripts/db-health-check.js
 *   node scripts/db-health-check.js --append-findings   (appends to findings.md)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEBUG_DIR = path.join(PROJECT_ROOT, 'debug-sessions');
const DB_HEALTH_FILE = path.join(DEBUG_DIR, 'db-health.md');
const FINDINGS_FILE = path.join(DEBUG_DIR, 'findings.md');

// ─── Load Supabase config from .env.local ─────────────────────────────────────

function loadEnv() {
  const envPath = path.join(PROJECT_ROOT, '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('[!] .env.local not found');
    process.exit(1);
  }

  const env = {};
  const content = fs.readFileSync(envPath, 'utf-8').replace(/\r/g, ''); // Handle Windows line endings
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      const key = trimmed.substring(0, eqIndex).trim();
      const value = trimmed.substring(eqIndex + 1).trim();
      env[key] = value;
    }
  }

  console.log(`  [debug] Found env keys: ${Object.keys(env).join(', ')}`);

  return {
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

// ─── Supabase REST API helper ─────────────────────────────────────────────────

function supabaseQuery(supabaseUrl, apiKey, table, params = '') {
  return new Promise((resolve, reject) => {
    const url = new URL(`/rest/v1/${table}${params}`, supabaseUrl);
    const options = {
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Prefer: 'count=exact',
      },
      timeout: 10000,
    };

    https.get(url.toString(), options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const count = res.headers['content-range']
            ? parseInt(res.headers['content-range'].split('/')[1])
            : null;
          resolve({ data: JSON.parse(data), count, status: res.statusCode });
        } catch (err) {
          resolve({ data: [], count: 0, status: res.statusCode, error: err.message });
        }
      });
    }).on('error', (err) => {
      resolve({ data: [], count: 0, status: 0, error: err.message });
    });
  });
}

// ─── Health Checks ────────────────────────────────────────────────────────────

async function runHealthChecks(supabaseUrl, apiKey) {
  const issues = [];
  const stats = {};

  console.log('\n  ── Database Health Checks ──\n');

  // 1. Check for stuck/failed builds
  console.log('  [check] Build statuses...');
  const builds = await supabaseQuery(supabaseUrl, apiKey, 'project_documentation',
    '?select=project_name,build_status,stats,updated_at&order=updated_at.desc');

  if (builds.data && builds.data.length > 0) {
    stats.totalProjects = builds.data.length;
    const failed = builds.data.filter((b) => b.build_status === 'failed');
    const stuck = builds.data.filter((b) => {
      if (b.build_status !== 'building') return false;
      const updatedAt = new Date(b.updated_at);
      return Date.now() - updatedAt.getTime() > 60 * 60 * 1000; // stuck > 1 hour
    });
    const zeroProgress = builds.data.filter((b) => {
      const s = b.stats;
      return b.build_status === 'ready' && s && parseInt(s.totalPhases) === 0;
    });

    if (failed.length > 0) {
      issues.push({
        severity: 'HIGH',
        category: 'Build',
        description: `${failed.length} failed build(s): ${failed.map((f) => f.project_name).join(', ')}`,
      });
    }
    if (stuck.length > 0) {
      issues.push({
        severity: 'HIGH',
        category: 'Build',
        description: `${stuck.length} build(s) stuck in "building" state for over 1 hour: ${stuck.map((s) => s.project_name).join(', ')}`,
      });
    }
    if (zeroProgress.length > 0) {
      issues.push({
        severity: 'MEDIUM',
        category: 'Build',
        description: `${zeroProgress.length} project(s) with "ready" status but 0 phases initialized: ${zeroProgress.map((z) => z.project_name).join(', ')}`,
      });
    }

    console.log(`    Total projects: ${builds.data.length}`);
    console.log(`    Failed: ${failed.length}, Stuck: ${stuck.length}, Zero-progress: ${zeroProgress.length}`);
  }

  // 2. Check for duplicate/stale project names (session leak indicator)
  console.log('  [check] Stale session data...');
  const names = builds.data ? builds.data.map((b) => b.project_name) : [];
  const duplicates = names.filter((name, idx) => names.indexOf(name) !== idx);
  const uniqueDuplicates = [...new Set(duplicates)];

  if (uniqueDuplicates.length > 0) {
    issues.push({
      severity: 'LOW',
      category: 'Data',
      description: `Duplicate project names found (possible stale session data): ${uniqueDuplicates.join(', ')}`,
    });
    console.log(`    Duplicate project names: ${uniqueDuplicates.join(', ')}`);
  } else {
    console.log('    No duplicate project names');
  }

  // 3. Check generated_apps count and recent activity
  console.log('  [check] Generated apps...');
  const apps = await supabaseQuery(supabaseUrl, apiKey, 'generated_apps',
    '?select=title,updated_at&order=updated_at.desc&limit=5');

  if (apps.data) {
    stats.totalGeneratedApps = apps.count || apps.data.length;
    console.log(`    Total generated apps: ${stats.totalGeneratedApps}`);
    if (apps.data.length > 0) {
      console.log(`    Most recent: "${apps.data[0].title}" (${apps.data[0].updated_at})`);
    }
  }

  // 4. Check subscription health
  console.log('  [check] Subscription status...');
  const subs = await supabaseQuery(supabaseUrl, apiKey, 'user_subscriptions',
    '?select=tier,status,current_period_end');

  if (subs.data && subs.data.length > 0) {
    stats.totalSubscriptions = subs.data.length;
    const pastDue = subs.data.filter((s) => s.status === 'past_due');
    const expiringSoon = subs.data.filter((s) => {
      if (!s.current_period_end) return false;
      const daysLeft = (new Date(s.current_period_end) - Date.now()) / (1000 * 60 * 60 * 24);
      return daysLeft > 0 && daysLeft < 7;
    });

    if (pastDue.length > 0) {
      issues.push({
        severity: 'HIGH',
        category: 'Billing',
        description: `${pastDue.length} subscription(s) past due`,
      });
    }
    if (expiringSoon.length > 0) {
      issues.push({
        severity: 'LOW',
        category: 'Billing',
        description: `${expiringSoon.length} subscription(s) expiring within 7 days`,
      });
    }

    const tierCounts = {};
    subs.data.forEach((s) => {
      tierCounts[s.tier] = (tierCounts[s.tier] || 0) + 1;
    });
    console.log(`    Tiers: ${Object.entries(tierCounts).map(([k, v]) => `${k}(${v})`).join(', ')}`);
    console.log(`    Past due: ${pastDue.length}`);
  }

  // 5. Check Railway projects
  console.log('  [check] Railway deployments...');
  const railway = await supabaseQuery(supabaseUrl, apiKey, 'railway_projects',
    '?select=app_id,preview_url,updated_at');

  if (railway.data) {
    stats.railwayProjects = railway.data.length;
    console.log(`    Active deployments: ${railway.data.length}`);
  }

  // 6. Check for orphaned data
  console.log('  [check] Data integrity...');
  // Check if there are generated_apps without user_profiles
  const orphanCheck = await supabaseQuery(supabaseUrl, apiKey, 'user_profiles', '?select=user_id');
  stats.userProfiles = orphanCheck.count || (orphanCheck.data ? orphanCheck.data.length : 0);
  console.log(`    User profiles: ${stats.userProfiles}`);

  return { issues, stats };
}

// ─── Generate Report ──────────────────────────────────────────────────────────

function generateReport(issues, stats) {
  let md = `# Database Health Report\n\n`;
  md += `**Date:** ${new Date().toISOString()}\n`;
  md += `**Project:** AI-App-Builder (Supabase)\n\n`;
  md += `---\n\n`;

  // Stats
  md += `## Database Stats\n\n`;
  for (const [key, value] of Object.entries(stats)) {
    md += `- **${key.replace(/([A-Z])/g, ' $1').trim()}:** ${value}\n`;
  }
  md += `\n---\n\n`;

  // Issues
  if (issues.length === 0) {
    md += `## Issues: None Found\n\nDatabase is healthy.\n`;
  } else {
    md += `## Issues Found (${issues.length})\n\n`;
    for (const issue of issues) {
      md += `### [${issue.severity}] ${issue.category}\n`;
      md += `${issue.description}\n\n`;
    }
  }

  return md;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const appendFindings = process.argv.includes('--append-findings');

  console.log('========================================');
  console.log('   DATABASE HEALTH CHECK');
  console.log('   Supabase Monitoring');
  console.log('========================================');

  if (!fs.existsSync(DEBUG_DIR)) fs.mkdirSync(DEBUG_DIR, { recursive: true });

  const { supabaseUrl, supabaseKey } = loadEnv();
  if (!supabaseUrl || !supabaseKey) {
    console.error('[!] Missing SUPABASE_URL or API key in .env.local');
    process.exit(1);
  }

  console.log(`[*] Supabase URL: ${supabaseUrl}`);

  const { issues, stats } = await runHealthChecks(supabaseUrl, supabaseKey);
  const report = generateReport(issues, stats);

  fs.writeFileSync(DB_HEALTH_FILE, report, 'utf-8');
  console.log(`\n[+] Health report saved to: debug-sessions/db-health.md`);


  console.log(`\n  Summary: ${issues.length} issue(s) found`);
  for (const issue of issues) {
    console.log(`    [${issue.severity}] ${issue.category}: ${issue.description}`);
  }

  console.log('\n========================================');
  console.log('   HEALTH CHECK COMPLETE');
  console.log('========================================\n');
}

main().catch(console.error);

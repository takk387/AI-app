# One-Click Deployment System Plan

## Overview

A comprehensive deployment system enabling users to deploy their generated full-stack apps with a single click to:

- **Web** (with custom domains, auto-scaling, and database)
- **iOS App Store**
- **Android Google Play Store**
- **Desktop PC** (Windows, macOS, Linux)

**Key Achievement**: Reduce deployment costs from **$7,500/month** (Railway for 500 apps) to **$50-250/month** using Turso + Cloudflare.

---

## Current System Analysis

### What's Already Implemented

| Component                      | Implementation                      | File                                        |
| ------------------------------ | ----------------------------------- | ------------------------------------------- |
| **Database Schema Generation** | Prisma via BackendArchitectureAgent | `src/services/BackendArchitectureAgent.ts`  |
| **In-Browser SQLite**          | sql.js (WASM) for previews          | `src/services/InBrowserDatabaseService.ts`  |
| **API Route Generation**       | Complete CRUD with RBAC             | `src/prompts/full-app/backend-templates.ts` |
| **Authentication**             | NextAuth.js with providers          | `src/prompts/full-app/backend-templates.ts` |
| **Real-time Features**         | SSE, WebSocket support              | `src/types/architectureSpec.ts`             |
| **File Storage**               | Supabase buckets                    | `src/services/StorageService.ts`            |
| **Railway Preview**            | 30-min temporary deploys            | `src/services/RailwayService.ts`            |
| **Vercel Deploy**              | Token-based deployment              | `src/services/DeploymentService.ts`         |

### Current Limitations

| Issue                       | Current State              | Impact                       |
| --------------------------- | -------------------------- | ---------------------------- |
| Railway cost                | ~$15/app/month             | $7,500/month for 500 apps    |
| Railway auto-cleanup        | 30-minute timeout          | Preview only, not production |
| No database provisioning    | Users deploy frontend only | Can't deploy full-stack apps |
| No SQLite → Production path | In-browser only            | Database lost on deploy      |
| No auto-scaling             | Fixed Railway resources    | Can't handle traffic spikes  |
| No mobile/desktop           | Web only                   | Limited market reach         |

---

## Cost Comparison

### Current vs Proposed (500 Apps)

| Solution                      | Database  | Frontend | Monthly Cost | Per App    | Savings |
| ----------------------------- | --------- | -------- | ------------ | ---------- | ------- |
| **Railway (current)**         | Included  | Included | $7,500       | $15.00     | -       |
| **Turso + Cloudflare**        | Turso     | CF Pages | $50-250      | $0.10-0.50 | **97%** |
| **Neon Agent + Cloudflare**   | Neon      | CF Pages | $100-500     | $0.20-1.00 | **93%** |
| **Multi-tenant + Cloudflare** | Shared DB | CF Pages | $25-120      | $0.05-0.24 | **98%** |

### Why Turso is the Best Fit

| Factor                     | Turso                  | Why It Fits                                 |
| -------------------------- | ---------------------- | ------------------------------------------- |
| **SQLite Compatible**      | Yes                    | Matches existing `InBrowserDatabaseService` |
| **Prisma Support**         | Yes                    | Works with generated Prisma schemas         |
| **Price**                  | $4.99/mo for 1,000 DBs | 500 active DBs included                     |
| **Edge Replicas**          | Yes                    | Zero-latency reads globally                 |
| **Scale to Zero**          | Yes                    | Inactive apps = $0                          |
| **Cloudflare Integration** | Native                 | Works with CF Workers                       |

---

## Recommended Architecture

### Database Strategy: Hybrid Approach

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATABASE ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     PREVIEW (Development)                        │    │
│  │                                                                  │    │
│  │   In-Browser SQLite (sql.js)                                    │    │
│  │   • Zero cost                                                    │    │
│  │   • Instant preview                                              │    │
│  │   • Data stored in browser                                       │    │
│  │   • Current implementation: InBrowserDatabaseService.ts          │    │
│  │                                                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                              │                                           │
│                              │ One-Click Deploy                          │
│                              ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    PRODUCTION (Deployed)                         │    │
│  │                                                                  │    │
│  │   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐           │    │
│  │   │   TURSO     │   │    NEON     │   │  BYO DB     │           │    │
│  │   │  (Default)  │   │ (PostgreSQL)│   │  (Custom)   │           │    │
│  │   │             │   │             │   │             │           │    │
│  │   │ • SQLite    │   │ • PostgreSQL│   │ • Any DB    │           │    │
│  │   │ • $0.01/app │   │ • $0.20/app │   │ • User pays │           │    │
│  │   │ • Edge sync │   │ • Full SQL  │   │ • Full ctrl │           │    │
│  │   └─────────────┘   └─────────────┘   └─────────────┘           │    │
│  │                                                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Full System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      AI APP BUILDER PLATFORM                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐    ┌────────────────────────────────────────┐     │
│  │ Generated App    │    │         Deployment Orchestrator         │     │
│  │                  │    │                                         │     │
│  │ • Next.js App    │───▶│  1. Provision Database (Turso/Neon)    │     │
│  │ • Prisma Schema  │    │  2. Run Migrations                      │     │
│  │ • API Routes     │    │  3. Deploy Frontend (Cloudflare)        │     │
│  │ • Auth Config    │    │  4. Configure Domain                    │     │
│  │ • SQLite Data    │    │  5. Set Environment Variables           │     │
│  └──────────────────┘    └───────────────┬────────────────────────┘     │
│                                          │                               │
│         ┌────────────────────────────────┼────────────────────────┐     │
│         │                                │                        │     │
│         ▼                                ▼                        ▼     │
│  ┌─────────────────┐          ┌─────────────────┐       ┌─────────────┐ │
│  │  Web Deploy     │          │  Mobile Deploy  │       │   Desktop   │ │
│  │                 │          │                 │       │   Deploy    │ │
│  │ ┌─────────────┐ │          │ ┌─────────────┐ │       │             │ │
│  │ │ Cloudflare  │ │          │ │  Capacitor  │ │       │ ┌─────────┐ │ │
│  │ │ Pages       │ │          │ │  + EAS      │ │       │ │  Tauri  │ │ │
│  │ └─────────────┘ │          │ └─────────────┘ │       │ └─────────┘ │ │
│  │                 │          │                 │       │             │ │
│  │ ┌─────────────┐ │          │ ┌─────────────┐ │       │ Win/Mac/Lin │ │
│  │ │   Turso     │ │          │ │   iOS App   │ │       │             │ │
│  │ │  Database   │ │          │ │   Store     │ │       └─────────────┘ │
│  │ └─────────────┘ │          │ └─────────────┘ │                       │
│  │                 │          │                 │                       │
│  │ ┌─────────────┐ │          │ ┌─────────────┐ │                       │
│  │ │  Supabase   │ │          │ │  Google     │ │                       │
│  │ │  Storage    │ │          │ │  Play       │ │                       │
│  │ └─────────────┘ │          │ └─────────────┘ │                       │
│  └─────────────────┘          └─────────────────┘                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Database Deployment

### Option 1: Turso (Default - Recommended)

**Why Turso:**

- SQLite-compatible (matches current `InBrowserDatabaseService`)
- Prisma adapter available (`@prisma/adapter-libsql`)
- $4.99/month for 1,000 databases
- Edge replicas for global low-latency
- Scale to zero (idle = free)

**Pricing Breakdown:**

| Tier      | Price    | Databases | Active Limit | Row Reads/mo |
| --------- | -------- | --------- | ------------ | ------------ |
| Free      | $0       | 500       | -            | 500M         |
| Developer | $4.99/mo | 1,000     | 500          | 2.5B         |
| Scaler    | $29/mo   | Unlimited | 2,500        | 100B         |

**Integration Path:**

```typescript
// Current: In-Browser SQLite (InBrowserDatabaseService.ts)
import initSqlJs from 'sql.js';
const db = await initSqlJs();

// Production: Turso with Prisma
import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

const libsql = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const adapter = new PrismaLibSQL(libsql);
const prisma = new PrismaClient({ adapter });
```

**Migration from In-Browser SQLite:**

1. Export browser SQLite data as SQL dump
2. Create Turso database via API
3. Apply Prisma schema migration
4. Import seed data
5. Update connection string in deployed app

### Option 2: Neon Agent Plan (PostgreSQL)

**When to Use:**

- Apps requiring advanced PostgreSQL features
- Complex queries, full-text search, JSONB
- Enterprise customers wanting PostgreSQL

**Pricing:**

| Feature               | Details                       |
| --------------------- | ----------------------------- |
| Projects              | 30,000 per organization       |
| Compute               | $0.106/CU-hour                |
| Storage               | $0.35/GB-month                |
| Initial Credits       | $30,000                       |
| Scale to Zero         | Yes (350ms cold start)        |
| Free Tier Sponsorship | Neon sponsors your free users |

**Prisma Schema Adjustment:**

```prisma
// Development (SQLite)
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

// Production (Neon PostgreSQL)
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Option 3: BYO Database (Bring Your Own)

**For Advanced Users:**

- Connect own Supabase, PlanetScale, Railway Postgres
- Full control over database
- User responsible for costs and scaling

**Implementation:**

- User provides `DATABASE_URL` during deployment
- System validates connection
- Runs Prisma migrations against their DB

---

## Frontend Deployment

### Cloudflare Pages (Primary)

**Why Cloudflare:**

- Free tier: Unlimited sites, 500 builds/month
- Auto-scaling: Serverless, handles any traffic
- Global CDN: 300+ edge locations
- Custom domains: Free SSL included
- No timeout/cleanup issues

**Limits:**

| Resource       | Free                        | Paid        |
| -------------- | --------------------------- | ----------- |
| Projects       | 100 (soft limit, can raise) | Unlimited   |
| Builds         | 500/month                   | 5,000/month |
| Bandwidth      | Unlimited                   | Unlimited   |
| Custom domains | 100/project                 | 100/project |

**Integration with Turso:**

```typescript
// Cloudflare Worker with Turso Edge
import { createClient } from '@libsql/client/web';

export default {
  async fetch(request, env) {
    const client = createClient({
      url: env.TURSO_URL,
      authToken: env.TURSO_AUTH_TOKEN,
    });

    const result = await client.execute('SELECT * FROM users');
    return Response.json(result.rows);
  },
};
```

### Vercel (Alternative)

**When to Use:**

- Users already have Vercel accounts
- Need Vercel-specific features
- Existing integration works

---

## User Pricing Tiers

### Recommended Pricing Model

| Tier           | Features                                     | Your Cost  | Suggested Price | Margin |
| -------------- | -------------------------------------------- | ---------- | --------------- | ------ |
| **Free**       | In-browser preview only                      | $0         | $0              | -      |
| **Starter**    | Web deploy, shared Turso DB, subdomain       | ~$0.10/app | $5/mo           | 98%    |
| **Pro**        | Dedicated Turso DB, custom domain, analytics | ~$0.50/app | $15/mo          | 97%    |
| **Business**   | Neon PostgreSQL, priority support            | ~$2/app    | $49/mo          | 96%    |
| **Enterprise** | BYO infrastructure, SLA, white-label         | Custom     | Custom          | -      |

### Cost Breakdown by Tier

**Starter Tier ($5/mo to user):**

```
Turso (shared pool): $0.005/app
Cloudflare Pages:    $0 (free tier)
Supabase Storage:    $0.05/app
Your margin:         $4.95/app (99%)
```

**Pro Tier ($15/mo to user):**

```
Turso (dedicated):   $0.20/app
Cloudflare Pages:    $0 (free tier)
Supabase Storage:    $0.10/app
Custom domain SSL:   $0 (free)
Your margin:         $14.70/app (98%)
```

**Business Tier ($49/mo to user):**

```
Neon PostgreSQL:     $1-2/app
Cloudflare Pages:    $0
Supabase Storage:    $0.20/app
Priority compute:    $0.50/app
Your margin:         $46-47/app (95%)
```

---

## Feature Specifications

### 1. Web Deployment (Full-Stack)

#### Deployment Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    ONE-CLICK WEB DEPLOYMENT                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Step 1: Database Provisioning                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ • Create Turso database via API                              │ │
│  │ • Generate auth token                                        │ │
│  │ • Apply Prisma migrations                                    │ │
│  │ • Seed initial data (if any from preview)                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              ▼                                    │
│  Step 2: Environment Setup                                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ • TURSO_DATABASE_URL                                         │ │
│  │ • TURSO_AUTH_TOKEN                                           │ │
│  │ • NEXTAUTH_SECRET (auto-generated)                           │ │
│  │ • NEXTAUTH_URL (deployment URL)                              │ │
│  │ • User-provided API keys (Stripe, etc.)                      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              ▼                                    │
│  Step 3: Code Transformation                                      │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ • Update Prisma datasource (sqlite → libsql)                 │ │
│  │ • Add @prisma/adapter-libsql                                 │ │
│  │ • Configure edge runtime for API routes                      │ │
│  │ • Generate production package.json                           │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              ▼                                    │
│  Step 4: Deploy to Cloudflare                                     │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ • Create Cloudflare Pages project                            │ │
│  │ • Upload build output                                        │ │
│  │ • Set environment variables                                  │ │
│  │ • Configure custom domain (optional)                         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              ▼                                    │
│  Step 5: Verification                                             │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ • Health check endpoint                                      │ │
│  │ • Database connectivity test                                 │ │
│  │ • Return deployment URL                                      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

#### Database Migration Service

```typescript
// src/services/deployment/DatabaseMigrationService.ts

interface MigrationResult {
  success: boolean;
  databaseUrl: string;
  authToken: string;
  tablesCreated: string[];
  seedDataImported: boolean;
}

class DatabaseMigrationService {
  // Create Turso database for deployed app
  async provisionTursoDatabase(appId: string, prismaSchema: string): Promise<MigrationResult>;

  // Export in-browser SQLite data
  async exportBrowserData(db: Database): Promise<SQLDump>;

  // Apply Prisma schema to Turso
  async applyMigrations(databaseUrl: string, schema: string): Promise<void>;

  // Import seed data
  async importSeedData(databaseUrl: string, data: SQLDump): Promise<void>;

  // Transform Prisma schema for production
  async transformSchema(schema: string, target: 'turso' | 'neon'): Promise<string>;
}
```

### 2. iOS Deployment

#### Prerequisites

- Apple Developer Account ($99/year)
- App Store Connect API Key

#### Features

- Convert Next.js app to iOS using Capacitor
- Cloud builds via EAS Build
- Automatic icon/splash generation
- TestFlight distribution option
- App Store submission

#### Capacitor Integration

```typescript
// Generated capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.user.appname',
  appName: 'App Name',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    // For apps with backend, point to deployed URL
    url: 'https://app.example.com',
    cleartext: false,
  },
  plugins: {
    // Native plugins based on app features
  },
};

export default config;
```

### 3. Android Deployment

#### Prerequisites

- Google Play Developer Account ($25 one-time)
- Play Console Service Account

#### Features

- Convert Next.js app to Android using Capacitor
- Cloud builds via EAS Build
- Automatic asset generation
- Internal testing track option
- Play Store submission

### 4. Desktop Deployment

#### Platforms

- Windows (.exe, .msi)
- macOS (.dmg, .app)
- Linux (.AppImage, .deb)

#### Features

- Convert using Tauri (lightweight, Rust-based)
- Cross-platform cloud builds
- Auto-updater support
- Native file system access

---

## New Files to Create

### Services

| File                                                  | Purpose                                    |
| ----------------------------------------------------- | ------------------------------------------ |
| `src/services/deployment/DeploymentOrchestrator.ts`   | Main coordinator for all deployment types  |
| `src/services/deployment/TursoService.ts`             | Turso database provisioning and management |
| `src/services/deployment/NeonService.ts`              | Neon PostgreSQL provisioning               |
| `src/services/deployment/CloudflareService.ts`        | Cloudflare Pages API integration           |
| `src/services/deployment/DatabaseMigrationService.ts` | SQLite → Production migration              |
| `src/services/deployment/EnvironmentService.ts`       | Environment variable management            |
| `src/services/deployment/MobileDeployService.ts`      | iOS/Android build orchestration            |
| `src/services/deployment/DesktopDeployService.ts`     | Tauri build orchestration                  |
| `src/services/deployment/DomainService.ts`            | Domain management and DNS                  |
| `src/services/deployment/PricingService.ts`           | Usage tracking and billing                 |

### API Routes

| Route                              | Purpose                              |
| ---------------------------------- | ------------------------------------ |
| `POST /api/deploy/web`             | Full-stack web deployment            |
| `POST /api/deploy/database`        | Database-only provisioning           |
| `POST /api/deploy/ios`             | Trigger iOS build                    |
| `POST /api/deploy/android`         | Trigger Android build                |
| `POST /api/deploy/desktop`         | Trigger desktop builds               |
| `GET /api/deploy/status/[id]`      | Check deployment status              |
| `POST /api/deploy/migrate-data`    | Migrate browser SQLite to production |
| `POST /api/domains/check`          | Check domain availability            |
| `POST /api/domains/configure`      | Configure custom domain              |
| `GET /api/turso/databases`         | List user's Turso databases          |
| `DELETE /api/turso/databases/[id]` | Delete Turso database                |

### Components

| File                                                 | Purpose                     |
| ---------------------------------------------------- | --------------------------- |
| `src/components/deployment/DeploymentModal.tsx`      | Main deployment interface   |
| `src/components/deployment/DatabaseConfigPanel.tsx`  | Database provider selection |
| `src/components/deployment/WebDeployPanel.tsx`       | Web deployment options      |
| `src/components/deployment/MobileDeployPanel.tsx`    | iOS/Android options         |
| `src/components/deployment/DesktopDeployPanel.tsx`   | Desktop options             |
| `src/components/deployment/DomainConfigPanel.tsx`    | Domain setup UI             |
| `src/components/deployment/EnvironmentVarsPanel.tsx` | Env var configuration       |
| `src/components/deployment/DeploymentStatus.tsx`     | Real-time status display    |
| `src/components/deployment/DeploymentHistory.tsx`    | Past deployments list       |
| `src/components/deployment/UsageStats.tsx`           | Cost and usage display      |

### Types

| File                               | Purpose                   |
| ---------------------------------- | ------------------------- |
| `src/types/deployment/database.ts` | Database deployment types |
| `src/types/deployment/turso.ts`    | Turso-specific types      |
| `src/types/deployment/neon.ts`     | Neon-specific types       |
| `src/types/deployment/web.ts`      | Web deployment types      |
| `src/types/deployment/mobile.ts`   | Mobile deployment types   |
| `src/types/deployment/desktop.ts`  | Desktop deployment types  |
| `src/types/deployment/pricing.ts`  | Pricing and usage types   |

---

## Database Schema Changes

### New Tables

#### `deployed_apps`

```sql
CREATE TABLE deployed_apps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  project_id UUID REFERENCES project_documentation(id),

  -- Deployment info
  platform TEXT NOT NULL, -- 'web' | 'ios' | 'android' | 'windows' | 'macos' | 'linux'
  status TEXT NOT NULL, -- 'provisioning' | 'deploying' | 'active' | 'failed' | 'suspended'
  deployment_url TEXT,
  custom_domain TEXT,

  -- Database info
  database_provider TEXT, -- 'turso' | 'neon' | 'byo'
  database_id TEXT, -- Provider's database ID
  database_url_encrypted BYTEA,

  -- Hosting info
  hosting_provider TEXT, -- 'cloudflare' | 'vercel'
  hosting_project_id TEXT,

  -- Pricing tier
  tier TEXT DEFAULT 'starter', -- 'starter' | 'pro' | 'business' | 'enterprise'

  -- Metadata
  config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_deployed_at TIMESTAMPTZ
);
```

#### `deployment_usage`

```sql
CREATE TABLE deployment_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deployed_app_id UUID REFERENCES deployed_apps(id),

  -- Period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- Database usage
  db_reads BIGINT DEFAULT 0,
  db_writes BIGINT DEFAULT 0,
  db_storage_bytes BIGINT DEFAULT 0,

  -- Hosting usage
  requests BIGINT DEFAULT 0,
  bandwidth_bytes BIGINT DEFAULT 0,
  compute_ms BIGINT DEFAULT 0,

  -- Costs (in cents)
  database_cost_cents INTEGER DEFAULT 0,
  hosting_cost_cents INTEGER DEFAULT 0,
  total_cost_cents INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `user_subscriptions`

```sql
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,

  tier TEXT NOT NULL DEFAULT 'free', -- 'free' | 'starter' | 'pro' | 'business' | 'enterprise'
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'past_due' | 'canceled'

  -- Limits
  max_deployed_apps INTEGER NOT NULL DEFAULT 0,
  max_custom_domains INTEGER NOT NULL DEFAULT 0,

  -- Stripe integration
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,

  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Third-Party API Integration

### Turso API

```typescript
// src/services/deployment/TursoService.ts

interface TursoConfig {
  organizationId: string;
  apiToken: string;
}

class TursoService {
  private baseUrl = 'https://api.turso.tech/v1';

  // Create database for user app
  async createDatabase(name: string, group?: string): Promise<TursoDatabase> {
    const response = await fetch(`${this.baseUrl}/organizations/${this.orgId}/databases`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        group: group || 'default',
      }),
    });
    return response.json();
  }

  // Create auth token for database
  async createAuthToken(dbName: string): Promise<string> {
    const response = await fetch(
      `${this.baseUrl}/organizations/${this.orgId}/databases/${dbName}/auth/tokens`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiToken}` },
      }
    );
    const { jwt } = await response.json();
    return jwt;
  }

  // Get database URL
  getDatabaseUrl(dbName: string): string {
    return `libsql://${dbName}-${this.orgId}.turso.io`;
  }

  // Delete database
  async deleteDatabase(dbName: string): Promise<void> {
    await fetch(`${this.baseUrl}/organizations/${this.orgId}/databases/${dbName}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.apiToken}` },
    });
  }
}
```

### Neon API (Agent Plan)

```typescript
// src/services/deployment/NeonService.ts

class NeonService {
  private baseUrl = 'https://console.neon.tech/api/v2';

  async createProject(name: string): Promise<NeonProject> {
    const response = await fetch(`${this.baseUrl}/projects`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project: {
          name,
          region_id: 'aws-us-east-1', // or let user choose
          pg_version: 16,
        },
      }),
    });
    return response.json();
  }

  // Connection string for Prisma
  getConnectionString(project: NeonProject): string {
    const { host, database, user, password } = project.connection_uris[0];
    return `postgresql://${user}:${password}@${host}/${database}?sslmode=require`;
  }
}
```

### Cloudflare Pages API

```typescript
// src/services/deployment/CloudflareService.ts

class CloudflareService {
  private baseUrl = 'https://api.cloudflare.com/client/v4';

  async createPagesProject(name: string): Promise<CFPagesProject> {
    const response = await fetch(`${this.baseUrl}/accounts/${this.accountId}/pages/projects`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        production_branch: 'main',
      }),
    });
    return response.json();
  }

  async deployToPages(
    projectName: string,
    files: DeploymentFile[],
    envVars: Record<string, string>
  ): Promise<CFDeployment> {
    // Upload files and trigger deployment
    const formData = new FormData();
    for (const file of files) {
      formData.append(file.path, new Blob([file.content]));
    }

    const response = await fetch(
      `${this.baseUrl}/accounts/${this.accountId}/pages/projects/${projectName}/deployments`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiToken}` },
        body: formData,
      }
    );
    return response.json();
  }

  async setEnvironmentVariables(projectName: string, vars: Record<string, string>): Promise<void> {
    // Set production environment variables
    await fetch(`${this.baseUrl}/accounts/${this.accountId}/pages/projects/${projectName}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deployment_configs: {
          production: {
            env_vars: Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, { value: v }])),
          },
        },
      }),
    });
  }
}
```

---

## UI/UX Design

### Deployment Modal - Database Selection

```
┌──────────────────────────────────────────────────────────────────┐
│ Deploy Your App                                             [X]  │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Step 1 of 3: Database Configuration                             │
│                                                                   │
│  Your app uses a database. Choose how to deploy it:              │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ ◉ Turso (Recommended)                           $5/mo       │ │
│  │   SQLite-compatible • Edge replicas • Auto-scaling          │ │
│  │   ✓ Compatible with your current database schema            │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ ○ Neon PostgreSQL                               $15/mo      │ │
│  │   Full PostgreSQL • Advanced queries • Larger scale         │ │
│  │   ⚠ Requires schema migration (automatic)                   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ ○ Bring Your Own Database                       Custom      │ │
│  │   Connect your existing database                            │ │
│  │   Supabase • PlanetScale • Railway • Custom                 │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ ☑ Import data from preview                                  │ │
│  │   Transfer your test data to production database            │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│                                    [Cancel]  [Next: Hosting →]   │
└──────────────────────────────────────────────────────────────────┘
```

### Deployment Modal - Hosting & Domain

```
┌──────────────────────────────────────────────────────────────────┐
│ Deploy Your App                                             [X]  │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Step 2 of 3: Hosting & Domain                                   │
│                                                                   │
│  Hosting Provider:                                                │
│  ◉ Cloudflare Pages (Recommended)                                │
│    Free • Auto-scaling • Global CDN • 300+ edge locations        │
│  ○ Vercel                                                        │
│    Great DX • Serverless • Existing integration                  │
│                                                                   │
│  ─────────────────────────────────────────────────────────────── │
│                                                                   │
│  Domain:                                                          │
│  ○ Free subdomain                                                │
│    myapp-abc123.pages.dev                                        │
│                                                                   │
│  ◉ Custom domain                                    Pro feature  │
│    ┌──────────────────────────────────┐                          │
│    │ myapp.com                        │ [Check]                  │
│    └──────────────────────────────────┘                          │
│    ✓ Domain available                                            │
│                                                                   │
│  ─────────────────────────────────────────────────────────────── │
│                                                                   │
│  Environment Variables:                                           │
│  These will be securely stored and injected at runtime           │
│                                                                   │
│  STRIPE_SECRET_KEY     [•••••••••••••••••] [Show]               │
│  SENDGRID_API_KEY      [•••••••••••••••••] [Show]               │
│  [+ Add Variable]                                                 │
│                                                                   │
│                              [← Back]  [Next: Review →]          │
└──────────────────────────────────────────────────────────────────┘
```

### Deployment Status

```
┌──────────────────────────────────────────────────────────────────┐
│ Deploying: My Awesome App                                   [X]  │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ✓ Database provisioned                              2s          │
│    └─ Turso database created: myapp-abc123                       │
│                                                                   │
│  ✓ Schema migrated                                   5s          │
│    └─ 8 tables created, 3 indexes added                          │
│                                                                   │
│  ✓ Data imported                                     3s          │
│    └─ 142 rows transferred from preview                          │
│                                                                   │
│  ◐ Deploying to Cloudflare...                       12s          │
│    └─ Uploading 47 files (2.3 MB)                                │
│    ████████████████████░░░░░░░░░░ 68%                            │
│                                                                   │
│  ○ Configuring domain                                             │
│  ○ Running health checks                                          │
│                                                                   │
│  ─────────────────────────────────────────────────────────────── │
│                                                                   │
│  Estimated time remaining: ~30 seconds                            │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Database Infrastructure (Week 1-2)

1. Implement `TursoService` with full API integration
2. Implement `NeonService` for PostgreSQL option
3. Create `DatabaseMigrationService` for SQLite → Production
4. Build database provisioning API routes
5. Create `DatabaseConfigPanel` component
6. Test Prisma adapter integration with Turso

### Phase 2: Web Deployment (Week 3-4)

1. Implement `CloudflareService` with Pages API
2. Create `DeploymentOrchestrator` to coordinate all services
3. Build `EnvironmentService` for secure env var handling
4. Create deployment API routes
5. Build `WebDeployPanel` component
6. Implement deployment status polling
7. Test end-to-end web deployment

### Phase 3: Domain & Polish (Week 5)

1. Implement `DomainService` for custom domains
2. Build `DomainConfigPanel` component
3. Add DNS verification system
4. Implement SSL status tracking
5. Create `DeploymentHistory` component
6. Add deployment analytics

### Phase 4: Pricing & Usage (Week 6)

1. Implement `PricingService` for usage tracking
2. Create usage tracking database tables
3. Build `UsageStats` component
4. Integrate with Stripe for payments
5. Implement tier limits and enforcement

### Phase 5: Mobile Deployment (Week 7-8)

1. Create Capacitor project generator
2. Implement `MobileDeployService`
3. Set up EAS Build integration
4. Build `MobileDeployPanel` component
5. Implement App Store Connect integration
6. Implement Play Console integration

### Phase 6: Desktop Deployment (Week 9-10)

1. Create Tauri project generator
2. Implement `DesktopDeployService`
3. Set up cross-platform build CI
4. Build `DesktopDeployPanel` component
5. Test Windows, macOS, Linux builds

---

## Environment Variables Required

### Platform (Your Infrastructure)

```env
# Turso (Platform Account)
TURSO_ORG_ID=your-org-id
TURSO_API_TOKEN=your-api-token

# Neon (Agent Plan)
NEON_API_KEY=your-neon-api-key

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token

# Encryption key for user credentials
CREDENTIALS_ENCRYPTION_KEY=your-32-byte-key
```

### Per Deployed App (Auto-generated)

```env
# Database (Turso example)
TURSO_DATABASE_URL=libsql://appname-orgid.turso.io
TURSO_AUTH_TOKEN=generated-jwt-token

# Or PostgreSQL (Neon example)
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Auth
NEXTAUTH_SECRET=auto-generated-secret
NEXTAUTH_URL=https://appname.pages.dev

# User-provided (collected during deploy)
STRIPE_SECRET_KEY=user-provided
# ... other API keys
```

---

## Security Considerations

### Credential Storage

- All API keys encrypted at rest (AES-256-GCM)
- User credentials stored in `user_credentials` table
- Database URLs encrypted in `deployed_apps` table
- Decryption only on server-side during deployment
- Keys can be rotated by user

### Database Isolation

- Each deployed app gets its own Turso/Neon database
- No cross-tenant data access possible
- Row-level security not required (full isolation)

### Build Isolation

- Each deployment runs in isolated environment
- No access to other users' code/data
- Source code not stored after deployment

---

## Testing Checklist

### Database Deployment

- [ ] Create Turso database via API
- [ ] Generate and store auth token
- [ ] Apply Prisma migrations to Turso
- [ ] Export browser SQLite data
- [ ] Import data into Turso
- [ ] Verify Prisma client works with Turso adapter
- [ ] Create Neon database via API
- [ ] Transform Prisma schema (SQLite → PostgreSQL)
- [ ] Apply migrations to Neon

### Web Deployment

- [ ] Create Cloudflare Pages project
- [ ] Upload build files
- [ ] Set environment variables
- [ ] Verify deployment URL works
- [ ] Test database connectivity from deployed app
- [ ] Configure custom domain
- [ ] Verify SSL certificate

### Mobile Deployment

- [ ] Generate Capacitor config
- [ ] Build iOS app via EAS
- [ ] Build Android app via EAS
- [ ] Submit to TestFlight
- [ ] Submit to Play Store internal track

### Desktop Deployment

- [ ] Generate Tauri config
- [ ] Build Windows executable
- [ ] Build macOS app
- [ ] Build Linux AppImage

---

## Migration from Current System

### Deprecation Plan

1. **Keep Railway for previews** (existing behavior)
2. **Add new deployment modal** alongside export
3. **Migrate users gradually** with opt-in
4. **Deprecate Railway for production** after validation
5. **Remove Railway production** code after full migration

### User Communication

```
We're upgrading our deployment system!

Old system: Railway ($15/app/month, 30-min preview timeout)
New system: Turso + Cloudflare ($0.10/app/month, permanent deployment)

Benefits:
✓ 99% cost reduction
✓ Permanent deployments (no timeout)
✓ Global edge performance
✓ Custom domains included
✓ Auto-scaling built-in

Action required: None! Your existing previews continue to work.
New deployments will use the improved system automatically.
```

---

## Managed API Services (Platform-Provided Keys)

### Overview

Allow users to use **your platform's API accounts** instead of setting up their own. Users pay you for usage, eliminating the hassle of creating accounts with multiple providers.

### How It Works

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      MANAGED API SERVICES FLOW                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  User's Deployed App                                                     │
│         │                                                                │
│         │ API Request (e.g., send email, AI completion)                 │
│         ▼                                                                │
│  ┌─────────────────────┐                                                │
│  │  Your API Gateway   │  1. Authenticate user/app                      │
│  │  /api/proxy/*       │  2. Check usage limits & billing status        │
│  │                     │  3. Forward request with YOUR master key       │
│  └──────────┬──────────┘  4. Log usage for billing                      │
│             │                                                            │
│             │ Uses YOUR platform API key                                │
│             ▼                                                            │
│  ┌─────────────────────┐                                                │
│  │  Third-Party        │  OpenAI, SendGrid, Twilio, Stripe, etc.       │
│  │  Service            │                                                │
│  └──────────┬──────────┘                                                │
│             │                                                            │
│             │ Bill goes to YOU (volume discounts)                       │
│             ▼                                                            │
│  ┌─────────────────────┐                                                │
│  │  Your Billing       │  Track per-user usage                          │
│  │  System (Stripe)    │  Metered billing → User invoice                │
│  └─────────────────────┘                                                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Supported Services

| Service       | Platform Feature | Implementation                      | Your Markup |
| ------------- | ---------------- | ----------------------------------- | ----------- |
| **OpenAI**    | None             | API proxy + usage tracking          | 25-35%      |
| **Anthropic** | None             | API proxy + usage tracking          | 25-35%      |
| **SendGrid**  | Subuser API      | Create subusers per customer        | 20-30%      |
| **Twilio**    | Subaccounts      | Native subaccount support           | 20-30%      |
| **Stripe**    | Stripe Connect   | Connected accounts (built for this) | 0.5-1%      |
| **Resend**    | API keys         | One key, track by metadata          | 20-30%      |
| **AWS S3/R2** | IAM/Tokens       | Scoped credentials per user         | 30-40%      |

### Pricing Model

#### Your Cost vs User Price

| Service         | Your Cost        | User Price       | Margin |
| --------------- | ---------------- | ---------------- | ------ |
| OpenAI GPT-4    | $0.03/1K tokens  | $0.04/1K tokens  | 33%    |
| OpenAI GPT-3.5  | $0.002/1K tokens | $0.003/1K tokens | 50%    |
| SendGrid Email  | $0.0008/email    | $0.001/email     | 25%    |
| Twilio SMS      | $0.0079/SMS      | $0.01/SMS        | 27%    |
| Twilio Voice    | $0.014/min       | $0.02/min        | 43%    |
| S3/R2 Storage   | $0.015/GB        | $0.02/GB         | 33%    |
| S3/R2 Bandwidth | $0.09/GB         | $0.12/GB         | 33%    |

#### User Options During Deployment

| Option                   | Description                 | Best For                 |
| ------------------------ | --------------------------- | ------------------------ |
| **Use Platform Account** | Pay-as-you-go, no setup     | Most users               |
| **Bring Your Own Key**   | User provides their API key | Power users, enterprises |

### New Files to Create

#### Services

| File                                               | Purpose                                   |
| -------------------------------------------------- | ----------------------------------------- |
| `src/services/api-gateway/APIGatewayService.ts`    | Main proxy service for all APIs           |
| `src/services/api-gateway/OpenAIProxyService.ts`   | OpenAI-specific proxy with token counting |
| `src/services/api-gateway/EmailProxyService.ts`    | SendGrid/Resend proxy                     |
| `src/services/api-gateway/SMSProxyService.ts`      | Twilio SMS/Voice proxy                    |
| `src/services/api-gateway/StorageProxyService.ts`  | S3/R2 storage proxy                       |
| `src/services/api-gateway/UsageTrackingService.ts` | Track all API usage                       |
| `src/services/api-gateway/BillingService.ts`       | Stripe metered billing                    |

#### API Routes

| Route                            | Purpose                         |
| -------------------------------- | ------------------------------- |
| `POST /api/proxy/openai/*`       | Proxy OpenAI requests           |
| `POST /api/proxy/anthropic/*`    | Proxy Anthropic requests        |
| `POST /api/proxy/email/send`     | Send email via platform account |
| `POST /api/proxy/sms/send`       | Send SMS via platform account   |
| `POST /api/proxy/storage/upload` | Upload to platform storage      |
| `GET /api/usage/current`         | Get current period usage        |
| `GET /api/usage/history`         | Get usage history               |

### Implementation

#### API Gateway Service

```typescript
// src/services/api-gateway/APIGatewayService.ts

interface ProxiedRequest {
  userId: string;
  appId: string;
  service: 'openai' | 'anthropic' | 'sendgrid' | 'twilio' | 'storage';
  endpoint: string;
  method: string;
  body?: any;
  headers?: Record<string, string>;
}

interface UsageRecord {
  userId: string;
  appId: string;
  service: string;
  endpoint: string;
  units: number; // tokens, emails, SMS, bytes, etc.
  costCents: number;
  timestamp: Date;
}

class APIGatewayService {
  private masterKeys = {
    openai: process.env.PLATFORM_OPENAI_KEY,
    anthropic: process.env.PLATFORM_ANTHROPIC_KEY,
    sendgrid: process.env.PLATFORM_SENDGRID_KEY,
    twilio_sid: process.env.PLATFORM_TWILIO_SID,
    twilio_token: process.env.PLATFORM_TWILIO_TOKEN,
  };

  async proxyRequest(req: ProxiedRequest): Promise<Response> {
    // 1. Verify user has valid billing (payment method on file)
    const billingStatus = await this.checkBillingStatus(req.userId);
    if (!billingStatus.active) {
      throw new Error('Please add a payment method to use platform APIs');
    }

    // 2. Check usage limits (prevent runaway costs)
    const usage = await this.getCurrentUsage(req.userId);
    if (usage.totalCents >= billingStatus.spendLimit * 100) {
      throw new Error('Monthly spend limit reached. Increase limit in settings.');
    }

    // 3. Forward request with platform's master key
    const response = await this.forwardToService(req);

    // 4. Calculate and log usage
    const usageRecord = this.calculateUsage(req, response);
    await this.logUsage(usageRecord);

    // 5. Report to Stripe for metered billing
    await this.reportToStripe(req.userId, req.service, usageRecord.units);

    return response;
  }

  private async forwardToService(req: ProxiedRequest): Promise<any> {
    const serviceConfig = this.getServiceConfig(req.service);

    const response = await fetch(`${serviceConfig.baseUrl}${req.endpoint}`, {
      method: req.method,
      headers: {
        Authorization: `Bearer ${this.masterKeys[req.service]}`,
        'Content-Type': 'application/json',
        ...req.headers,
      },
      body: req.body ? JSON.stringify(req.body) : undefined,
    });

    return response.json();
  }

  private calculateUsage(req: ProxiedRequest, response: any): UsageRecord {
    let units: number;
    let costCents: number;

    switch (req.service) {
      case 'openai':
        // Token-based pricing
        const tokens = response.usage?.total_tokens || 0;
        units = tokens;
        costCents = Math.ceil(tokens * 0.004); // $0.04 per 1K tokens markup
        break;

      case 'sendgrid':
        // Per-email pricing
        units = 1;
        costCents = 0.1; // $0.001 per email
        break;

      case 'twilio':
        // Per-SMS pricing
        units = response.num_segments || 1;
        costCents = units * 1; // $0.01 per SMS
        break;

      case 'storage':
        // Per-byte pricing
        units = req.body?.size || 0;
        costCents = Math.ceil((units / 1_000_000_000) * 2); // $0.02 per GB
        break;

      default:
        units = 1;
        costCents = 0;
    }

    return {
      userId: req.userId,
      appId: req.appId,
      service: req.service,
      endpoint: req.endpoint,
      units,
      costCents,
      timestamp: new Date(),
    };
  }
}
```

#### Usage Tracking Database

```sql
-- Track individual API calls
CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  app_id UUID REFERENCES deployed_apps(id),

  service TEXT NOT NULL, -- 'openai' | 'anthropic' | 'sendgrid' | 'twilio' | 'storage'
  endpoint TEXT NOT NULL,

  -- Usage metrics (varies by service)
  units INTEGER NOT NULL, -- tokens, emails, SMS, bytes
  unit_type TEXT NOT NULL, -- 'tokens' | 'emails' | 'sms' | 'bytes' | 'minutes'

  -- Cost
  cost_cents INTEGER NOT NULL,

  -- Metadata
  request_metadata JSONB, -- model, recipient, file info, etc.

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user queries
CREATE INDEX idx_api_usage_user_date ON api_usage(user_id, created_at DESC);
CREATE INDEX idx_api_usage_app ON api_usage(app_id, created_at DESC);

-- Aggregated monthly usage for billing
CREATE TABLE api_usage_monthly (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),

  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,

  -- Per-service totals
  openai_tokens BIGINT DEFAULT 0,
  openai_cost_cents INTEGER DEFAULT 0,

  anthropic_tokens BIGINT DEFAULT 0,
  anthropic_cost_cents INTEGER DEFAULT 0,

  sendgrid_emails INTEGER DEFAULT 0,
  sendgrid_cost_cents INTEGER DEFAULT 0,

  twilio_sms INTEGER DEFAULT 0,
  twilio_minutes INTEGER DEFAULT 0,
  twilio_cost_cents INTEGER DEFAULT 0,

  storage_bytes BIGINT DEFAULT 0,
  storage_cost_cents INTEGER DEFAULT 0,

  -- Totals
  total_cost_cents INTEGER DEFAULT 0,

  -- Billing status
  stripe_invoice_id TEXT,
  invoiced_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  UNIQUE(user_id, period_year, period_month)
);
```

#### Stripe Metered Billing

```typescript
// src/services/api-gateway/BillingService.ts

import Stripe from 'stripe';

class BillingService {
  private stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  // Create metered subscription for new user
  async setupMeteredBilling(userId: string, email: string): Promise<string> {
    // Create Stripe customer
    const customer = await this.stripe.customers.create({
      email,
      metadata: { userId },
    });

    // Create subscription with metered price items
    const subscription = await this.stripe.subscriptions.create({
      customer: customer.id,
      items: [
        { price: process.env.STRIPE_PRICE_OPENAI }, // Metered: OpenAI tokens
        { price: process.env.STRIPE_PRICE_EMAIL }, // Metered: Emails
        { price: process.env.STRIPE_PRICE_SMS }, // Metered: SMS
        { price: process.env.STRIPE_PRICE_STORAGE }, // Metered: Storage GB
      ],
      // Don't charge until usage is reported
      billing_cycle_anchor: 'now',
      proration_behavior: 'none',
    });

    // Store subscription info
    await this.storeSubscription(userId, customer.id, subscription.id);

    return subscription.id;
  }

  // Report usage to Stripe (called after each API call or batched)
  async reportUsage(userId: string, service: string, quantity: number): Promise<void> {
    const user = await this.getUser(userId);
    const subscriptionItemId = user.stripeSubscriptionItems[service];

    if (!subscriptionItemId) {
      throw new Error(`No subscription item for service: ${service}`);
    }

    await this.stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
      quantity,
      timestamp: Math.floor(Date.now() / 1000),
      action: 'increment',
    });
  }

  // Batch report usage (more efficient, run every hour)
  async reportBatchUsage(userId: string): Promise<void> {
    const unreportedUsage = await this.getUnreportedUsage(userId);

    for (const [service, quantity] of Object.entries(unreportedUsage)) {
      if (quantity > 0) {
        await this.reportUsage(userId, service, quantity);
      }
    }

    await this.markUsageReported(userId);
  }

  // Set spend limit to prevent runaway costs
  async setSpendLimit(userId: string, limitDollars: number): Promise<void> {
    await db
      .update('user_subscriptions', {
        spend_limit_cents: limitDollars * 100,
      })
      .where({ user_id: userId });
  }
}
```

### UI Components

#### API Configuration Panel (During Deployment)

```
┌──────────────────────────────────────────────────────────────────┐
│ Configure APIs                                              [X]  │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Your app uses the following services:                           │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ AI (OpenAI GPT-4)                                            │ │
│  │                                                              │ │
│  │ ◉ Use Platform Account (Recommended)                        │ │
│  │   Pay-as-you-go: $0.04 per 1K tokens                        │ │
│  │   No setup required • Instant activation                    │ │
│  │                                                              │ │
│  │ ○ Bring Your Own API Key                                    │ │
│  │   [________________________________________]                │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Email (SendGrid)                                             │ │
│  │                                                              │ │
│  │ ◉ Use Platform Account                                      │ │
│  │   Pay-as-you-go: $0.001 per email sent                      │ │
│  │                                                              │ │
│  │ ○ Bring Your Own API Key                                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Payments (Stripe)                                            │ │
│  │                                                              │ │
│  │ ○ Use Platform Account (Stripe Connect)                     │ │
│  │   We process payments, you receive payouts                   │ │
│  │   Platform fee: 1% + Stripe fees                            │ │
│  │                                                              │ │
│  │ ◉ Connect Your Own Stripe Account                           │ │
│  │   [Connect with Stripe →]  ✓ Connected                      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ─────────────────────────────────────────────────────────────── │
│                                                                   │
│  💡 Platform APIs require a payment method on file.              │
│     You'll only be charged for what you use.                     │
│                                                                   │
│                                    [Cancel]  [Continue →]        │
└──────────────────────────────────────────────────────────────────┘
```

#### Usage Dashboard

```
┌──────────────────────────────────────────────────────────────────┐
│ API Usage - December 2025                                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Current Bill: $47.23                   Next invoice: Jan 1      │
│  Spend Limit:  $100.00                  [Adjust Limit]           │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Service          Usage              Cost         Trend      │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │ OpenAI           892K tokens        $35.68       ↑ 12%     │  │
│  │ SendGrid         4,200 emails       $4.20        ↓ 5%      │  │
│  │ Twilio SMS       180 messages       $1.80        → 0%      │  │
│  │ Storage          2.8 GB             $5.55        ↑ 8%      │  │
│  │ ─────────────────────────────────────────────────────────  │  │
│  │ Total                               $47.23                 │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Usage by App:                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ my-saas-app.com         $32.10  ████████████████░░░░ 68%   │  │
│  │ client-portal.com       $12.50  ██████░░░░░░░░░░░░░░ 26%   │  │
│  │ internal-tool.pages.dev  $2.63  █░░░░░░░░░░░░░░░░░░░  6%   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  [View Detailed Logs]  [Download Report]  [Set Usage Alerts]     │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Special Integrations

#### Stripe Connect (For Payment Processing)

For apps that accept payments, use Stripe Connect to handle money:

```typescript
// src/services/api-gateway/StripeConnectService.ts

class StripeConnectService {
  private stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  // Create connected account for user's app
  async createConnectedAccount(userId: string, email: string): Promise<string> {
    const account = await this.stripe.accounts.create({
      type: 'express', // Stripe handles onboarding UI
      email,
      metadata: { userId },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    // Store account ID
    await this.storeConnectedAccount(userId, account.id);

    return account.id;
  }

  // Generate onboarding link
  async createOnboardingLink(accountId: string): Promise<string> {
    const link = await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.APP_URL}/settings/payments?refresh=true`,
      return_url: `${process.env.APP_URL}/settings/payments?success=true`,
      type: 'account_onboarding',
    });

    return link.url;
  }

  // Create payment intent (user's customer pays)
  async createPaymentIntent(
    connectedAccountId: string,
    amount: number,
    platformFeePercent: number = 1
  ): Promise<Stripe.PaymentIntent> {
    const platformFee = Math.round(amount * (platformFeePercent / 100));

    return this.stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      application_fee_amount: platformFee, // Your cut
      transfer_data: {
        destination: connectedAccountId, // User gets the rest
      },
    });
  }
}
```

#### Twilio Subaccounts

```typescript
// src/services/api-gateway/TwilioService.ts

class TwilioService {
  private client = twilio(process.env.PLATFORM_TWILIO_SID, process.env.PLATFORM_TWILIO_TOKEN);

  // Create subaccount for user (isolated usage tracking)
  async createSubaccount(userId: string, friendlyName: string): Promise<string> {
    const subaccount = await this.client.api.accounts.create({
      friendlyName: `User-${userId}: ${friendlyName}`,
    });

    await this.storeSubaccount(userId, subaccount.sid, subaccount.authToken);

    return subaccount.sid;
  }

  // Send SMS using user's subaccount
  async sendSMS(userId: string, to: string, body: string, from?: string): Promise<any> {
    const subaccount = await this.getSubaccount(userId);

    const userClient = twilio(subaccount.sid, subaccount.authToken);

    const message = await userClient.messages.create({
      to,
      body,
      from: from || process.env.PLATFORM_TWILIO_NUMBER,
    });

    // Log usage
    await this.logUsage(userId, 'sms', message.numSegments);

    return message;
  }
}
```

### Environment Variables

```env
# Platform Master API Keys
PLATFORM_OPENAI_KEY=sk-...
PLATFORM_ANTHROPIC_KEY=sk-ant-...
PLATFORM_SENDGRID_KEY=SG...
PLATFORM_TWILIO_SID=AC...
PLATFORM_TWILIO_TOKEN=...
PLATFORM_TWILIO_NUMBER=+1...

# Stripe (for billing users)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRICE_OPENAI=price_... # Metered price for OpenAI tokens
STRIPE_PRICE_EMAIL=price_...  # Metered price for emails
STRIPE_PRICE_SMS=price_...    # Metered price for SMS
STRIPE_PRICE_STORAGE=price_... # Metered price for storage

# Stripe Connect (for user payment processing)
STRIPE_CONNECT_CLIENT_ID=ca_...
```

### Benefits Summary

| For Users                          | For You                             |
| ---------------------------------- | ----------------------------------- |
| No account setup with 5+ providers | Recurring revenue on every API call |
| Single unified bill                | Volume discounts from providers     |
| Instant activation                 | Customer lock-in (switching cost)   |
| Pay only for what they use         | Usage data insights                 |
| Usage dashboard included           | Predictable margin per service      |
| No minimum commitments             | Scales with user growth             |

### Revenue Projections

| Scenario                | Monthly API Revenue | Your Margin   |
| ----------------------- | ------------------- | ------------- |
| 100 apps, light usage   | $500-1,000          | $125-300      |
| 500 apps, medium usage  | $5,000-10,000       | $1,250-3,000  |
| 1,000 apps, heavy usage | $20,000-50,000      | $5,000-15,000 |

This becomes a significant **passive revenue stream** that grows with user adoption.

---

## Summary

### Key Changes from Original Plan

| Aspect               | Original Plan  | Updated Plan                                  |
| -------------------- | -------------- | --------------------------------------------- |
| **Database**         | Not addressed  | Turso/Neon with full provisioning             |
| **Cost (500 apps)**  | Not calculated | $50-250/mo (vs $7,500 Railway)                |
| **SQLite Migration** | Not addressed  | Full browser → production path                |
| **Pricing Tiers**    | Not defined    | Free/Starter/Pro/Business/Enterprise          |
| **BYO Option**       | Not included   | Full support for custom DBs                   |
| **Managed APIs**     | Not included   | Platform-provided API keys with pay-as-you-go |

### Cost Savings (Infrastructure)

| Metric   | Railway   | Turso + Cloudflare | Savings      |
| -------- | --------- | ------------------ | ------------ |
| 500 apps | $7,500/mo | $50-250/mo         | **97%**      |
| Per app  | $15.00    | $0.10-0.50         | **97%**      |
| Annual   | $90,000   | $600-3,000         | **$87,000+** |

### Revenue Potential (Managed APIs)

| Scale      | Monthly API Revenue | Your Margin (25-35%) |
| ---------- | ------------------- | -------------------- |
| 100 apps   | $500-1,000          | $125-300             |
| 500 apps   | $5,000-10,000       | $1,250-3,000         |
| 1,000 apps | $20,000-50,000      | $5,000-15,000        |

### Complete Feature Set

| Feature                  | Description                                   |
| ------------------------ | --------------------------------------------- |
| **One-Click Web Deploy** | Full-stack with database, auto-scaling        |
| **iOS/Android Deploy**   | Capacitor + EAS Build to app stores           |
| **Desktop Deploy**       | Tauri for Windows/macOS/Linux                 |
| **Custom Domains**       | Free SSL, DNS management                      |
| **Database Options**     | Turso (SQLite), Neon (PostgreSQL), BYO        |
| **Managed APIs**         | OpenAI, SendGrid, Twilio, Stripe via platform |
| **Usage Billing**        | Stripe metered billing, spend limits          |
| **User Dashboard**       | Usage tracking, cost breakdown, alerts        |

### Sources

- [Turso Pricing](https://turso.tech/pricing)
- [Neon Agent Plan](https://neon.com/use-cases/ai-agents)
- [Neon Pricing](https://neon.com/pricing)
- [Cloudflare Pages Limits](https://developers.cloudflare.com/pages/platform/limits/)
- [Supabase Pricing](https://supabase.com/pricing)
- [Stripe Metered Billing](https://stripe.com/docs/billing/subscriptions/usage-based)
- [Stripe Connect](https://stripe.com/connect)

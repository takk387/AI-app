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

## Summary

### Key Changes from Original Plan

| Aspect               | Original Plan  | Updated Plan                         |
| -------------------- | -------------- | ------------------------------------ |
| **Database**         | Not addressed  | Turso/Neon with full provisioning    |
| **Cost (500 apps)**  | Not calculated | $50-250/mo (vs $7,500 Railway)       |
| **SQLite Migration** | Not addressed  | Full browser → production path       |
| **Pricing Tiers**    | Not defined    | Free/Starter/Pro/Business/Enterprise |
| **BYO Option**       | Not included   | Full support for custom DBs          |

### Cost Savings

| Metric   | Railway   | Turso + Cloudflare | Savings      |
| -------- | --------- | ------------------ | ------------ |
| 500 apps | $7,500/mo | $50-250/mo         | **97%**      |
| Per app  | $15.00    | $0.10-0.50         | **97%**      |
| Annual   | $90,000   | $600-3,000         | **$87,000+** |

### Sources

- [Turso Pricing](https://turso.tech/pricing)
- [Neon Agent Plan](https://neon.com/use-cases/ai-agents)
- [Neon Pricing](https://neon.com/pricing)
- [Cloudflare Pages Limits](https://developers.cloudflare.com/pages/platform/limits/)
- [Supabase Pricing](https://supabase.com/pricing)

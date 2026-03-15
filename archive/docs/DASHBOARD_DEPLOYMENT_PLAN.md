# Dashboard + One-Click Deployment Integration Plan

## Goal

Integrate One-Click Deployment into a User Dashboard, keeping the AI Builder lean. The Dashboard becomes the central hub for project management and deployment.

## User Decisions

- **AI Builder**: Redirect button to dashboard deployment page
- **Dashboard**: Per-project deploy actions (each project card has Deploy button)
- **Scope**: All platforms (web, iOS, Android, desktop)

---

## Architecture Overview

```
AI Builder                          Dashboard
┌─────────────────┐                ┌─────────────────────────────────────┐
│ Code Generation │                │ Project List                        │
│ Railway Preview │                │ ┌─────────────────────────────────┐ │
│ Export (ZIP)    │                │ │ ProjectCard                     │ │
│                 │   Redirect     │ │ [Continue] [Deploy] [Docs]      │ │
│ [Deploy] ──────────────────────► │ └─────────────────────────────────┘ │
└─────────────────┘                │                                     │
                                   │ UnifiedDeploymentModal              │
                                   │ ├── Web (Turso+Cloudflare/Vercel)   │
                                   │ ├── iOS (Capacitor+EAS)             │
                                   │ ├── Android (Capacitor+EAS)         │
                                   │ └── Desktop (Tauri)                 │
                                   └─────────────────────────────────────┘
```

---

## Deployment Infrastructure

### Cost Comparison (500 Apps)

| Solution               | Database | Frontend | Monthly Cost | Per App    | Savings |
| ---------------------- | -------- | -------- | ------------ | ---------- | ------- |
| **Railway (current)**  | Included | Included | $7,500       | $15.00     | -       |
| **Turso + Cloudflare** | Turso    | CF Pages | $50-250      | $0.10-0.50 | **97%** |
| **Neon + Cloudflare**  | Neon     | CF Pages | $100-500     | $0.20-1.00 | **93%** |

### Database Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     DATABASE ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                 PREVIEW (Development)                    │    │
│  │                                                          │    │
│  │   In-Browser SQLite (sql.js)                            │    │
│  │   • Zero cost                                            │    │
│  │   • Instant preview                                      │    │
│  │   • Data stored in browser                               │    │
│  │   • Current: InBrowserDatabaseService.ts                 │    │
│  │                                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              │ One-Click Deploy                  │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                 PRODUCTION (Deployed)                    │    │
│  │                                                          │    │
│  │   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   │    │
│  │   │   TURSO     │   │    NEON     │   │  BYO DB     │   │    │
│  │   │  (Default)  │   │ (PostgreSQL)│   │  (Custom)   │   │    │
│  │   │             │   │             │   │             │   │    │
│  │   │ • SQLite    │   │ • PostgreSQL│   │ • Any DB    │   │    │
│  │   │ • $0.01/app │   │ • $0.20/app │   │ • User pays │   │    │
│  │   │ • Edge sync │   │ • Full SQL  │   │ • Full ctrl │   │    │
│  │   └─────────────┘   └─────────────┘   └─────────────┘   │    │
│  │                                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Why Turso (Default)

| Factor                | Turso                  | Why It Fits                                 |
| --------------------- | ---------------------- | ------------------------------------------- |
| **SQLite Compatible** | Yes                    | Matches existing `InBrowserDatabaseService` |
| **Prisma Support**    | Yes                    | Works with generated Prisma schemas         |
| **Price**             | $4.99/mo for 1,000 DBs | 500 active DBs included                     |
| **Edge Replicas**     | Yes                    | Zero-latency reads globally                 |
| **Scale to Zero**     | Yes                    | Inactive apps = $0                          |

### Why Cloudflare Pages (Default)

| Resource       | Free            | Paid        |
| -------------- | --------------- | ----------- |
| Projects       | 100 (can raise) | Unlimited   |
| Builds         | 500/month       | 5,000/month |
| Bandwidth      | Unlimited       | Unlimited   |
| Custom domains | 100/project     | 100/project |

**Benefits:** Free tier, auto-scaling, global CDN, 300+ edge locations, free SSL

---

## Domain Purchase Integration

### Overview

Users can purchase domains directly through the platform during deployment.

### Domain Registrar: Cloudflare Registrar

**Why Cloudflare:**

- At-cost pricing (no markup)
- Same account as hosting (CF Pages)
- Instant DNS configuration
- Free WHOIS privacy
- Auto-renew support

### New Files for Domain Purchase

| File                                                  | Purpose                             |
| ----------------------------------------------------- | ----------------------------------- |
| `src/services/deployment/DomainPurchaseService.ts`    | Domain search, purchase, management |
| `src/components/deployment/DomainPurchaseSection.tsx` | Search and purchase UI              |
| `src/app/api/domains/search/route.ts`                 | Check domain availability           |
| `src/app/api/domains/purchase/route.ts`               | Purchase domain                     |
| `src/app/api/domains/transfer/route.ts`               | Transfer existing domain            |

### DomainPurchaseService

```typescript
class DomainPurchaseService {
  // Search for available domains
  async searchDomains(query: string): Promise<DomainSearchResult[]>;

  // Get pricing for domain
  async getDomainPricing(domain: string): Promise<DomainPricing>;

  // Purchase domain for user
  async purchaseDomain(userId: string, domain: string): Promise<DomainPurchase>;

  // Auto-configure DNS for deployed app
  async configureDNS(domain: string, deploymentUrl: string): Promise<void>;

  // Transfer existing domain to platform
  async initiateTransfer(domain: string, authCode: string): Promise<void>;
}
```

### Domain Options in Deployment Modal

```
┌──────────────────────────────────────────────────────────────────┐
│ Domain Configuration                                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ○ Free subdomain                                                │
│    myapp-abc123.pages.dev                                        │
│                                                                   │
│  ○ Use existing domain                                           │
│    ┌──────────────────────────────────┐                          │
│    │ myapp.com                        │                          │
│    └──────────────────────────────────┘                          │
│    DNS records will be provided after deployment                 │
│                                                                   │
│  ◉ Purchase new domain                                           │
│    ┌──────────────────────────────────┐                          │
│    │ myawesomeapp                     │ [Search]                 │
│    └──────────────────────────────────┘                          │
│                                                                   │
│    Available:                                                     │
│    ┌─────────────────────────────────────────────────────────┐   │
│    │ ✓ myawesomeapp.com         $9.77/year   [Select]        │   │
│    │ ✓ myawesomeapp.io          $32.00/year  [Select]        │   │
│    │ ✓ myawesomeapp.app         $14.00/year  [Select]        │   │
│    │ ✗ myawesomeapp.dev         Taken                        │   │
│    └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│    Selected: myawesomeapp.com ($9.77/year)                       │
│    ☑ Auto-renew annually                                         │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Domain Pricing (Cloudflare at-cost)

| TLD  | Registration | Renewal     |
| ---- | ------------ | ----------- |
| .com | $9.77/year   | $9.77/year  |
| .io  | $32.00/year  | $32.00/year |
| .app | $14.00/year  | $14.00/year |
| .dev | $12.00/year  | $12.00/year |
| .co  | $11.50/year  | $11.50/year |

### New Database Table: `user_domains`

```sql
CREATE TABLE user_domains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  deployed_app_id UUID REFERENCES deployed_apps(id),

  domain TEXT NOT NULL UNIQUE,
  registrar TEXT NOT NULL, -- 'cloudflare' | 'external'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'active' | 'expired' | 'transferring'

  registered_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT true,

  dns_configured BOOLEAN DEFAULT false,
  ssl_status TEXT DEFAULT 'pending', -- 'pending' | 'active' | 'failed'

  purchase_price_cents INTEGER,
  renewal_price_cents INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Environment Variables for Domains

```env
# Cloudflare Registrar
CLOUDFLARE_REGISTRAR_ACCOUNT_ID=
CLOUDFLARE_REGISTRAR_API_TOKEN=
```

---

## Phase 1: Dashboard Foundation

### Files to Create

| File                                          | Purpose                   |
| --------------------------------------------- | ------------------------- |
| `src/app/(protected)/app/dashboard/page.tsx`  | Server component entry    |
| `src/components/dashboard/DashboardView.tsx`  | Main client component     |
| `src/components/dashboard/ProjectCard.tsx`    | Project card with actions |
| `src/components/dashboard/ProjectList.tsx`    | Grid/list container       |
| `src/components/dashboard/StatsCards.tsx`     | Stats summary row         |
| `src/components/dashboard/ProjectFilters.tsx` | Search, filter, sort      |
| `src/components/dashboard/EmptyState.tsx`     | No projects placeholder   |
| `src/hooks/useDashboard.ts`                   | Data fetching hook        |
| `src/types/dashboard.ts`                      | Dashboard types           |

### Files to Modify

| File                                        | Change                                                |
| ------------------------------------------- | ----------------------------------------------------- |
| `src/components/SideDrawer.tsx`             | Add "Dashboard" link (line ~119, before Project Docs) |
| `src/components/marketing/MarketingNav.tsx` | Add "Dashboard" link when logged in                   |

### Dashboard Data Source

Use existing `ProjectDocumentationService.getByUserId()` - no new queries needed.

---

## Phase 2: Unified Deployment Modal

### Files to Create

| File                                                   | Purpose                       |
| ------------------------------------------------------ | ----------------------------- |
| `src/components/deployment/UnifiedDeploymentModal.tsx` | Main tabbed modal             |
| `src/components/deployment/WebDeployPanel.tsx`         | Web deployment (default tab)  |
| `src/components/deployment/MobileDeployPanel.tsx`      | iOS/Android tab               |
| `src/components/deployment/DesktopDeployPanel.tsx`     | Desktop tab                   |
| `src/components/deployment/DatabaseConfigSection.tsx`  | Turso/Neon/BYO selection      |
| `src/components/deployment/HostingSection.tsx`         | Cloudflare/Vercel selection   |
| `src/components/deployment/EnvironmentVarsSection.tsx` | Env var input                 |
| `src/components/deployment/DomainConfigSection.tsx`    | Custom domain setup           |
| `src/components/deployment/DomainPurchaseSection.tsx`  | Domain search and purchase    |
| `src/components/deployment/DeploymentProgress.tsx`     | Status display                |
| `src/hooks/useUnifiedDeployment.ts`                    | Deployment orchestration hook |
| `src/types/deployment/unified.ts`                      | Unified types                 |

### Modal Structure

```
UnifiedDeploymentModal
├── Tabs: [Web] [iOS] [Android] [Desktop]
├── WebDeployPanel
│   ├── DatabaseConfigSection (Turso recommended | Neon | BYO)
│   ├── HostingSection (Cloudflare | Vercel)
│   ├── EnvironmentVarsSection
│   └── DomainConfigSection
├── MobileDeployPanel
│   └── Platform toggle, Capacitor config, EAS status
├── DesktopDeployPanel
│   └── Platform select, Tauri config
└── DeploymentProgress (shown during deploy)
```

---

## Phase 3: Deployment Services

### Files to Create

| File                                                  | Purpose                             |
| ----------------------------------------------------- | ----------------------------------- |
| `src/services/deployment/DeploymentOrchestrator.ts`   | Main coordinator                    |
| `src/services/deployment/TursoService.ts`             | Turso DB provisioning               |
| `src/services/deployment/NeonService.ts`              | Neon PostgreSQL provisioning        |
| `src/services/deployment/CloudflareService.ts`        | Cloudflare Pages API                |
| `src/services/deployment/DatabaseMigrationService.ts` | SQLite → production                 |
| `src/services/deployment/MobileDeployService.ts`      | Capacitor + EAS                     |
| `src/services/deployment/DesktopDeployService.ts`     | Tauri builds                        |
| `src/services/deployment/EnvironmentService.ts`       | Secure env var handling             |
| `src/services/deployment/DomainService.ts`            | DNS configuration                   |
| `src/services/deployment/DomainPurchaseService.ts`    | Domain search, purchase, management |
| `src/services/deployment/DeployedAppsService.ts`      | CRUD for deployed_apps table        |
| `src/types/deployment/turso.ts`                       | Turso API types                     |
| `src/types/deployment/neon.ts`                        | Neon API types                      |
| `src/types/deployment/cloudflare.ts`                  | Cloudflare API types                |
| `src/types/deployment/mobile.ts`                      | Mobile types                        |
| `src/types/deployment/desktop.ts`                     | Desktop types                       |

### DeploymentOrchestrator Flow

```typescript
async deployWeb(projectId, config) {
  // 1. Provision database (Turso/Neon)
  // 2. Migrate data from browser SQLite
  // 3. Transform code for production
  // 4. Deploy to hosting (Cloudflare/Vercel)
  // 5. Configure domain (optional)
  // 6. Record in deployed_apps table
}
```

---

## Phase 4: API Routes

### Files to Create

| File                                       | Purpose                    |
| ------------------------------------------ | -------------------------- |
| `src/app/api/deploy/web/route.ts`          | Full-stack web deployment  |
| `src/app/api/deploy/database/route.ts`     | Database-only provisioning |
| `src/app/api/deploy/mobile/route.ts`       | iOS/Android builds         |
| `src/app/api/deploy/desktop/route.ts`      | Desktop builds             |
| `src/app/api/deploy/status/[id]/route.ts`  | Status polling             |
| `src/app/api/turso/databases/route.ts`     | Turso management           |
| `src/app/api/cloudflare/projects/route.ts` | Cloudflare management      |
| `src/app/api/domains/check/route.ts`       | Domain availability        |
| `src/app/api/domains/configure/route.ts`   | Domain setup               |
| `src/app/api/domains/search/route.ts`      | Search available domains   |
| `src/app/api/domains/purchase/route.ts`    | Purchase domain            |
| `src/app/api/domains/transfer/route.ts`    | Transfer existing domain   |

---

## Phase 5: Database Schema

### New Table: `deployed_apps`

```sql
CREATE TABLE deployed_apps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  project_id UUID REFERENCES project_documentation(id) NOT NULL,

  -- Deployment info
  platform TEXT NOT NULL, -- 'web'|'ios'|'android'|'windows'|'macos'|'linux'
  status TEXT NOT NULL DEFAULT 'pending',
  deployment_url TEXT,
  custom_domain TEXT,

  -- Database (web)
  database_provider TEXT, -- 'turso'|'neon'|'byo'
  database_id TEXT,
  database_url_encrypted BYTEA,

  -- Hosting (web)
  hosting_provider TEXT, -- 'cloudflare'|'vercel'
  hosting_project_id TEXT,

  -- Build (mobile/desktop)
  build_id TEXT,
  build_status TEXT,
  artifact_url TEXT,

  -- Metadata
  config JSONB,
  environment_vars_encrypted BYTEA,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_deployed_at TIMESTAMPTZ,

  UNIQUE(project_id, platform)
);
```

### Files to Create/Modify

| File                                           | Change                  |
| ---------------------------------------------- | ----------------------- |
| `supabase/migrations/XXXXXX_deployed_apps.sql` | New migration           |
| `src/types/supabase.ts`                        | Add deployed_apps types |
| `src/services/DeployedAppsService.ts`          | CRUD for deployed_apps  |

---

## Phase 6: AI Builder Refactor

### Files to Modify

| File                                 | Change                      |
| ------------------------------------ | --------------------------- |
| `src/components/MainBuilderView.tsx` | Simplify deploy to redirect |

### New Deploy Button Behavior

```typescript
const handleDeploy = () => {
  if (!currentAppId) {
    setShowNameAppModal(true); // Save first
    return;
  }
  router.push(`/app/dashboard?deploy=${currentAppId}`);
};
```

### Keep in AI Builder

- RailwayPreview (development preview)
- ExportModal (ZIP download)
- Simple "Deploy" redirect button

### Remove/Deprecate

- Complex deployment orchestration in builder
- Direct Vercel deployment from builder

---

## Phase 7: Dashboard Deploy Integration

Handle `?deploy=projectId` query param:

```typescript
// In DashboardView.tsx
const deployProjectId = searchParams.get('deploy');

useEffect(() => {
  if (deployProjectId && projects) {
    const project = projects.find((p) => p.id === deployProjectId);
    if (project) {
      setSelectedProject(project);
      setShowDeployModal(true);
    }
  }
}, [deployProjectId, projects]);
```

---

## Phase 8: Agent System

### Why Agents?

The deployment process involves complex multi-step workflows with error handling, decision making, and user communication. AI agents can orchestrate this intelligently.

### Claude Agent SDK Agents

#### 1. DeploymentAgent

**Purpose:** Orchestrates the entire deployment process

**File:** `src/agents/DeploymentAgent.ts`

```typescript
// Uses Claude Agent SDK to:
// 1. Analyze project to determine deployment needs
// 2. Provision database (choose Turso vs Neon based on app needs)
// 3. Transform code for production
// 4. Deploy to hosting provider
// 5. Configure domain
// 6. Verify deployment
// 7. Report status with explanations
```

**Benefits:**

- Intelligent error recovery (can analyze errors and fix)
- Can explain deployment decisions to users
- Handles edge cases without hardcoded logic
- Can be prompted with specific deployment preferences

#### 2. CodeTransformAgent

**Purpose:** Transforms generated code for production deployment

**File:** `src/agents/CodeTransformAgent.ts`

```typescript
// Uses Claude Agent SDK to:
// 1. Update Prisma schema (sqlite → libsql or postgresql)
// 2. Add production dependencies (@prisma/adapter-libsql)
// 3. Configure edge runtime for API routes
// 4. Update environment variable references
// 5. Optimize for production (tree-shaking, etc.)
```

**Benefits:**

- Handles app-specific variations intelligently
- Can fix issues it discovers during transformation
- Understands the code semantically, not just pattern matching

### Background Job System (Inngest)

For long-running tasks that don't need AI, use Inngest:

**Files:**

- `src/inngest/client.ts` - Inngest client setup
- `src/inngest/functions/mobileBuild.ts` - iOS/Android builds
- `src/inngest/functions/desktopBuild.ts` - Tauri builds
- `src/inngest/functions/databaseMigration.ts` - Large data migrations
- `src/app/api/inngest/route.ts` - Inngest webhook handler

```typescript
// Example: Mobile build function
export const mobileBuild = inngest.createFunction(
  { id: 'mobile-build' },
  { event: 'deploy/mobile.requested' },
  async ({ event, step }) => {
    // Step 1: Generate Capacitor config
    await step.run('generate-config', async () => { ... });

    // Step 2: Trigger EAS build
    const buildId = await step.run('trigger-eas', async () => { ... });

    // Step 3: Poll for completion (with built-in retry)
    await step.sleep('wait-for-build', '30s');

    // Step 4: Update status
    await step.run('update-status', async () => { ... });
  }
);
```

### Agent + Background Job Integration

```
User clicks "Deploy"
        ↓
DeploymentAgent analyzes project
        ↓
    ┌───┴───────────────────────────┐
    │                               │
    ▼                               ▼
Web Deploy                    Mobile/Desktop
(Agent handles directly)      (Background job)
    │                               │
    ▼                               ▼
CodeTransformAgent            Inngest function
    │                         (long-running)
    ▼                               │
TursoService                        │
CloudflareService                   │
    │                               │
    ▼                               ▼
Deployment Complete           Build Complete
    │                               │
    └───────────────┬───────────────┘
                    ▼
            Status Update to User
```

### New Files for Agent System

| File                                         | Purpose                             |
| -------------------------------------------- | ----------------------------------- |
| `src/agents/DeploymentAgent.ts`              | Main deployment orchestration agent |
| `src/agents/CodeTransformAgent.ts`           | Code transformation for production  |
| `src/agents/types.ts`                        | Agent type definitions              |
| `src/inngest/client.ts`                      | Inngest client configuration        |
| `src/inngest/functions/mobileBuild.ts`       | iOS/Android build jobs              |
| `src/inngest/functions/desktopBuild.ts`      | Desktop build jobs                  |
| `src/inngest/functions/databaseMigration.ts` | Large migration jobs                |
| `src/app/api/inngest/route.ts`               | Inngest webhook handler             |

### New Dependencies

```json
{
  "@anthropic-ai/sdk": "latest",
  "inngest": "^3.0.0"
}
```

### Agent Environment Variables

```env
# Claude Agent SDK (uses existing ANTHROPIC_API_KEY)

# Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
```

---

## Phase 9: Managed API Services (Revenue Feature)

**This is a key revenue feature that allows users to use your platform's API keys instead of setting up their own accounts.**

### Overview

```
User's Deployed App → Your API Gateway → Third-Party Services
                          ↓
                    Usage Tracking → Stripe Metered Billing → User Invoice
```

### Files to Create

#### Services (`src/services/api-gateway/`)

| File                       | Purpose                          |
| -------------------------- | -------------------------------- |
| `APIGatewayService.ts`     | Main proxy for all APIs          |
| `OpenAIProxyService.ts`    | OpenAI proxy + token counting    |
| `AnthropicProxyService.ts` | Anthropic proxy + token counting |
| `EmailProxyService.ts`     | SendGrid/Resend proxy            |
| `SMSProxyService.ts`       | Twilio SMS/Voice proxy           |
| `StorageProxyService.ts`   | S3/R2 storage proxy              |
| `UsageTrackingService.ts`  | Track all API usage              |
| `BillingService.ts`        | Stripe metered billing           |
| `StripeConnectService.ts`  | For apps accepting payments      |

#### API Routes

| Route                                            | Purpose                    |
| ------------------------------------------------ | -------------------------- |
| `src/app/api/proxy/openai/[...path]/route.ts`    | Proxy OpenAI requests      |
| `src/app/api/proxy/anthropic/[...path]/route.ts` | Proxy Anthropic requests   |
| `src/app/api/proxy/email/send/route.ts`          | Send email via platform    |
| `src/app/api/proxy/sms/send/route.ts`            | Send SMS via platform      |
| `src/app/api/proxy/storage/upload/route.ts`      | Upload to platform storage |
| `src/app/api/usage/current/route.ts`             | Get current period usage   |
| `src/app/api/usage/history/route.ts`             | Get usage history          |

#### Components

| File                                             | Purpose                           |
| ------------------------------------------------ | --------------------------------- |
| `src/components/deployment/APIConfigSection.tsx` | Platform vs BYO API key selection |
| `src/components/dashboard/UsageStats.tsx`        | Usage dashboard with costs        |
| `src/components/dashboard/UsageByApp.tsx`        | Per-app usage breakdown           |

### Pricing Model

| Service        | Platform Price  | Your Margin |
| -------------- | --------------- | ----------- |
| OpenAI GPT-4   | $0.04/1K tokens | 33%         |
| SendGrid Email | $0.001/email    | 25%         |
| Twilio SMS     | $0.01/SMS       | 27%         |
| Storage        | $0.02/GB        | 33%         |

---

## Phase 10: User Subscriptions & Pricing Tiers

### New Table: `user_subscriptions`

```sql
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,

  tier TEXT NOT NULL DEFAULT 'free', -- 'free'|'starter'|'pro'|'business'|'enterprise'
  status TEXT NOT NULL DEFAULT 'active', -- 'active'|'past_due'|'canceled'

  -- Limits
  max_deployed_apps INTEGER NOT NULL DEFAULT 0,
  max_custom_domains INTEGER NOT NULL DEFAULT 0,
  spend_limit_cents INTEGER DEFAULT 10000, -- $100 default

  -- Stripe
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,

  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### New Table: `api_usage`

```sql
CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  app_id UUID REFERENCES deployed_apps(id),

  service TEXT NOT NULL, -- 'openai'|'anthropic'|'sendgrid'|'twilio'|'storage'
  endpoint TEXT NOT NULL,
  units INTEGER NOT NULL, -- tokens, emails, SMS, bytes
  unit_type TEXT NOT NULL,
  cost_cents INTEGER NOT NULL,
  request_metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_usage_user_date ON api_usage(user_id, created_at DESC);
CREATE INDEX idx_api_usage_app ON api_usage(app_id, created_at DESC);
```

### New Table: `api_usage_monthly`

```sql
CREATE TABLE api_usage_monthly (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),

  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,

  openai_tokens BIGINT DEFAULT 0,
  openai_cost_cents INTEGER DEFAULT 0,
  anthropic_tokens BIGINT DEFAULT 0,
  anthropic_cost_cents INTEGER DEFAULT 0,
  sendgrid_emails INTEGER DEFAULT 0,
  sendgrid_cost_cents INTEGER DEFAULT 0,
  twilio_sms INTEGER DEFAULT 0,
  twilio_cost_cents INTEGER DEFAULT 0,
  storage_bytes BIGINT DEFAULT 0,
  storage_cost_cents INTEGER DEFAULT 0,
  total_cost_cents INTEGER DEFAULT 0,

  stripe_invoice_id TEXT,
  invoiced_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  UNIQUE(user_id, period_year, period_month)
);
```

### New Table: `deployment_usage`

```sql
CREATE TABLE deployment_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deployed_app_id UUID REFERENCES deployed_apps(id),

  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- Database
  db_reads BIGINT DEFAULT 0,
  db_writes BIGINT DEFAULT 0,
  db_storage_bytes BIGINT DEFAULT 0,

  -- Hosting
  requests BIGINT DEFAULT 0,
  bandwidth_bytes BIGINT DEFAULT 0,
  compute_ms BIGINT DEFAULT 0,

  -- Costs
  database_cost_cents INTEGER DEFAULT 0,
  hosting_cost_cents INTEGER DEFAULT 0,
  total_cost_cents INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Services

| File                                             | Purpose                     |
| ------------------------------------------------ | --------------------------- |
| `src/services/deployment/PricingService.ts`      | Usage tracking, tier limits |
| `src/services/deployment/SubscriptionService.ts` | Manage user subscriptions   |

---

## Phase 11: Dashboard Enhancements

### Additional Components

| File                                             | Purpose               |
| ------------------------------------------------ | --------------------- |
| `src/components/dashboard/RecentActivity.tsx`    | Activity timeline     |
| `src/components/dashboard/DeploymentHistory.tsx` | Past deployments list |
| `src/components/dashboard/index.ts`              | Barrel export         |

---

## Complete Environment Variables

```env
# === EXISTING (keep) ===
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
VERCEL_CLIENT_ID=
VERCEL_CLIENT_SECRET=

# === NEW: Deployment Infrastructure ===
TURSO_ORG_ID=
TURSO_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
NEON_API_KEY=
CREDENTIALS_ENCRYPTION_KEY=

# === NEW: Agent System ===
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# === NEW: Managed API Services ===
PLATFORM_OPENAI_KEY=
PLATFORM_ANTHROPIC_KEY=
PLATFORM_SENDGRID_KEY=
PLATFORM_TWILIO_SID=
PLATFORM_TWILIO_TOKEN=
PLATFORM_TWILIO_NUMBER=

# === NEW: Stripe Billing ===
STRIPE_SECRET_KEY=
STRIPE_PRICE_OPENAI=
STRIPE_PRICE_EMAIL=
STRIPE_PRICE_SMS=
STRIPE_PRICE_STORAGE=
STRIPE_CONNECT_CLIENT_ID=
```

---

## Complete File Count

### New Files by Category

| Category              | Count | Key Files                                                |
| --------------------- | ----- | -------------------------------------------------------- |
| Dashboard Components  | 10    | DashboardView, ProjectCard, UsageStats                   |
| Deployment Components | 12    | UnifiedDeploymentModal, WebDeployPanel, APIConfigSection |
| **Agents**            | 3     | DeploymentAgent, CodeTransformAgent                      |
| **Background Jobs**   | 5     | Inngest client, mobileBuild, desktopBuild                |
| API Gateway Services  | 9     | APIGatewayService, BillingService                        |
| Deployment Services   | 12    | DeploymentOrchestrator, TursoService, NeonService        |
| API Routes            | 19    | /api/deploy/_, /api/proxy/_, /api/inngest                |
| Types                 | 9     | dashboard.ts, unified.ts, agents/types.ts                |
| Hooks                 | 3     | useDashboard, useUnifiedDeployment                       |
| Database Migrations   | 1     | Multiple tables                                          |

**Total new files:** ~90
**Files to modify:** ~5
**New database tables:** 6 (deployed_apps, user_subscriptions, api_usage, api_usage_monthly, deployment_usage, user_domains)
**New dependencies:** @anthropic-ai/sdk, inngest

---

## Implementation Order

### Week 1: Dashboard Core

1. Dashboard types and useDashboard hook
2. DashboardView, ProjectCard, ProjectList, StatsCards
3. Dashboard page at /app/dashboard
4. SideDrawer and MarketingNav navigation

### Week 2: Deployment Modal UI

1. UnifiedDeploymentModal structure
2. WebDeployPanel with sections
3. DeploymentProgress component
4. useUnifiedDeployment hook (UI-only)

### Week 3: Backend Services + Database

1. All migrations (5 tables)
2. DeploymentOrchestrator, DeployedAppsService
3. TursoService + CloudflareService
4. DatabaseMigrationService

### Week 4: Agent System

1. DeploymentAgent (Claude Agent SDK)
2. CodeTransformAgent (Claude Agent SDK)
3. Inngest setup and background job functions
4. API route for Inngest webhook

### Week 5: API Routes + Integration

1. Deployment API routes (/api/deploy/\*)
2. Connect modal to backend via agents
3. Status polling
4. AI Builder refactor (deploy redirect)

### Week 6: Mobile/Desktop

1. MobileDeployPanel + MobileDeployService
2. DesktopDeployPanel + DesktopDeployService
3. Inngest functions for long-running builds

### Week 7: Managed APIs + Billing

1. API Gateway services
2. Proxy API routes (/api/proxy/\*)
3. BillingService + SubscriptionService
4. APIConfigSection in deployment modal

### Week 8: Usage Dashboard + Polish

1. UsageStats, RecentActivity, DeploymentHistory
2. Testing and bug fixes
3. Documentation

---

## Critical Files Reference

| File                                          | Why Critical            |
| --------------------------------------------- | ----------------------- |
| `src/services/ProjectDocumentationService.ts` | Dashboard data source   |
| `src/types/projectDocumentation.ts`           | Project types for cards |
| `src/components/SideDrawer.tsx`               | Navigation entry point  |
| `src/services/DeploymentService.ts`           | Existing Vercel pattern |
| `src/components/modals/DeploymentModal.tsx`   | Modal pattern reference |
| `src/components/MainBuilderView.tsx`          | Deploy button location  |

---

## Summary

**Total new files:** ~90
**Files to modify:** ~5
**New database tables:** 6
**New dependencies:** 2 (@anthropic-ai/sdk, inngest)
**Timeline:** 8 weeks

This comprehensive plan includes:

- User Dashboard with project management
- Multi-platform deployment (Web, iOS, Android, Desktop)
- **Deployment Infrastructure:** Turso + Cloudflare (97% cost savings vs Railway)
- **Domain Purchase:** Users can search and buy domains directly during deployment
- **Claude Agent SDK agents** for intelligent deployment orchestration
- **Inngest background jobs** for long-running builds
- Managed API Services for revenue generation
- Usage tracking and Stripe metered billing
- Pricing tiers and subscription management

The AI Builder stays lean, redirecting to Dashboard for all deployment functionality.

### Key Infrastructure

- **Database:** Turso (default, SQLite-compatible) or Neon (PostgreSQL) or BYO
- **Hosting:** Cloudflare Pages (default) or Vercel
- **Domains:** Cloudflare Registrar (at-cost pricing, auto DNS)

### Agent Benefits

- **DeploymentAgent**: Intelligent orchestration with error recovery and user explanations
- **CodeTransformAgent**: Semantic code understanding for production transformation
- **Background Jobs**: Reliable long-running builds with retry and status tracking

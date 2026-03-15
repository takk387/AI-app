# Preview & Hosting Architecture Research

## Date: December 20, 2025

## Current Problem

1. **Sandpack Issues**
   - Bundler timeouts/failures
   - Cannot run backend code (API routes, databases)

2. **Railway Preview Issues**
   - Creates a new project for EVERY preview (even for same app)
   - Wastes resources and slows down iteration
   - 30-60s setup time per preview

3. **WebContainer**
   - Exists in codebase but commercial licensing is expensive

---

## Root Cause Analysis

### Railway Project Creation

In `src/app/api/railway/deploy/route.ts:662`:

```typescript
const project = await createProject(appName); // ALWAYS creates new
```

In `src/services/RailwayService.ts:106-109`:

```typescript
if (this.currentDeployment) {
  await this.cleanup(); // Deletes existing before creating new
}
```

**Result:** Each preview = new Railway project = wasted resources

---

## Solution Options Explored

### Option 1: Browser-Only Preview ($0/month)

| Component   | Technology      | Purpose                 |
| ----------- | --------------- | ----------------------- |
| Bundler     | esbuild-wasm    | Replace Sandpack        |
| Database    | sql.js (SQLite) | In-browser database     |
| API Mocking | Service Worker  | Intercept /api/\* calls |

**Pros:**

- Zero infrastructure cost
- Instant feedback (no network latency)
- Works offline

**Cons:**

- Cannot run real Node.js runtime
- Service Worker complexity
- PostgreSQL features unavailable

### Option 2: Fix Railway Project Reuse (Recommended for Preview)

Persist Railway project mappings so same app reuses existing project.

**Database Schema:**

```sql
CREATE TABLE railway_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  app_id TEXT NOT NULL,
  railway_project_id TEXT NOT NULL,
  railway_service_id TEXT NOT NULL,
  railway_environment_id TEXT NOT NULL,
  preview_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, app_id)
);
```

**Expected Result:**
| Before | After |
|--------|-------|
| User edits app → New Railway project | Same project, redeploy |
| 30-60s full setup | 10-15s redeploy |
| N projects per app | 1 project per app |

### Option 3: Supabase Preview Branches ($25/month)

- Real PostgreSQL with preview branches
- Schema syncs automatically on deploy
- Auto-cleanup after timeout

---

## Continuous Hosting Cost Analysis

### Railway Pricing Model

- **Subscription:** $20/seat/month (Pro plan)
- **Included usage:** $20 of compute per month
- **Projects:** Unlimited (no cost to create)

### Resource Costs

| Resource | Cost           |
| -------- | -------------- |
| CPU      | $20/vCPU/month |
| RAM      | $10/GB/month   |

### Per-App Continuous Hosting Costs

| App Size | CPU       | RAM              | Monthly Cost |
| -------- | --------- | ---------------- | ------------ |
| Minimum  | 0.25 vCPU | 256MB            | ~$7.50       |
| Small    | 0.5 vCPU  | 512MB            | ~$15         |
| With DB  | 0.5 vCPU  | 512MB + Postgres | ~$20-25      |

### Cost At Scale (Railway)

| Active Apps | Min Spec  | Small Spec |
| ----------- | --------- | ---------- |
| 10 apps     | $75/mo    | $150/mo    |
| 50 apps     | $375/mo   | $750/mo    |
| 100 apps    | $750/mo   | $1,500/mo  |
| 500 apps    | $3,750/mo | $7,500/mo  |

---

## Alternative Hosting Platforms

| Platform              | Cost Model   | Est. Cost/App |
| --------------------- | ------------ | ------------- |
| Railway               | Per-resource | ~$7.50-15/mo  |
| Fly.io                | Per-resource | ~$3-7/mo      |
| Coolify (self-hosted) | Your server  | ~$1-2/mo\*    |
| Dokku (self-hosted)   | Your server  | ~$1-2/mo\*    |
| Kubernetes            | Your cluster | ~$0.50-2/mo\* |

\*Based on $50/mo VPS hosting ~25-50 small apps

---

## Deployment Business Models

### A: Users Deploy to Their Own Accounts

```
Your App Builder → Export Code → User deploys to Vercel/Railway/Netlify
```

- Zero hosting cost for you
- Users need technical knowledge
- Scales infinitely

### B: Managed Hosting (You Resell)

```
Your App Builder → Your Infrastructure → User's App
Pricing: $5-20/app/month to users
Cost:    $1-5/app/month to you
Margin:  $4-15/app/month profit
```

- Recurring revenue stream
- Need DevOps expertise
- You're responsible for uptime

### C: Hybrid (Recommended)

```
Preview Mode (Free):
  └── Railway (temporary, auto-cleanup with project reuse)

Deploy Mode (Options):
  ├── One-click to Vercel (user's account, free tier)
  ├── One-click to Railway (user's account)
  └── Managed hosting ($X/month, your infra)
```

---

## Recommended Implementation Path

### Phase 1: Fix Railway Preview (Immediate)

1. Add `railway_projects` table to Supabase
2. Implement `getOrCreateProject()` in deploy route
3. Remove auto-cleanup on each deploy
4. Pass `currentComponent.id` as appId

**Files to modify:**

- `src/app/api/railway/deploy/route.ts`
- `src/services/RailwayService.ts`
- `src/types/railway.ts`
- `src/components/preview/RailwayPreview.tsx`
- `src/components/PreviewContainer.tsx`

### Phase 2: Add Export Options (Medium-term)

- One-click export to Vercel
- One-click export to Netlify
- Download as ZIP

### Phase 3: Managed Hosting (Long-term, if demand)

- Self-hosted Coolify or similar
- User billing integration
- Custom domains

---

## Key Files Reference

| File                                        | Purpose                   |
| ------------------------------------------- | ------------------------- |
| `src/components/PreviewContainer.tsx`       | Mode orchestration        |
| `src/components/PowerfulPreview.tsx`        | Sandpack wrapper          |
| `src/components/preview/RailwayPreview.tsx` | Railway preview           |
| `src/services/RailwayService.ts`            | Railway service singleton |
| `src/app/api/railway/deploy/route.ts`       | Deploy API route          |
| `src/types/railway.ts`                      | Type definitions          |

---

## Sources

- [Railway Pricing](https://railway.com/pricing)
- [Railway Pricing Plans Docs](https://docs.railway.com/reference/pricing/plans)
- [Railway Pricing FAQs](https://docs.railway.com/reference/pricing/faqs)

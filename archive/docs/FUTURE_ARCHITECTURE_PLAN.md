# Future Architecture Plan

## Overview

This document outlines the evolution path from the current simple architecture to a scalable, production-ready system. **Only implement each phase when you hit the triggers listed.**

---

## Current Architecture (Phase 0)

```
┌─────────────────────────────────────────────────────────────────┐
│                     CURRENT ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              Railway (Monolith)                         │   │
│   │   ┌─────────────────────────────────────────────────┐   │   │
│   │   │  Next.js App                                    │   │   │
│   │   │  - Frontend (React)                             │   │   │
│   │   │  - API Routes (/api/ai-builder/*)               │   │   │
│   │   │  - AI Generation (Claude calls)                 │   │   │
│   │   └─────────────────────────────────────────────────┘   │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                      Supabase                           │   │
│   │   - PostgreSQL (generated_apps, user_profiles)          │   │
│   │   - Auth                                                │   │
│   │   - Storage (user-uploads, generated-assets)            │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Status**: ✅ Sufficient for 0-100 users

---

## Phase 1: Job Persistence & Basic Analytics

### Trigger Conditions
- [ ] You have 10+ active users
- [ ] Users complain about lost generations (browser closed, etc.)
- [ ] You want to understand usage patterns

### Architecture Changes

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 1 ADDITIONS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Railway (Monolith) - unchanged                                │
│                              │                                  │
│                              ▼                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                      Supabase                           │   │
│   │   + generation_jobs table (NEW)                         │   │
│   │   + analytics_events table (NEW)                        │   │
│   │   + usage_quotas table (NEW)                            │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Checklist

#### Database Schema
- [ ] Create `generation_jobs` table:
  ```sql
  CREATE TABLE generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'pending',
    -- 'pending' | 'processing' | 'completed' | 'failed'
    prompt TEXT NOT NULL,
    app_type TEXT,
    result JSONB,
    error_message TEXT,
    input_tokens INTEGER,
    output_tokens INTEGER,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
  );
  ```

- [ ] Create `usage_quotas` table:
  ```sql
  CREATE TABLE usage_quotas (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    daily_generations INTEGER DEFAULT 0,
    monthly_generations INTEGER DEFAULT 0,
    total_tokens_used BIGINT DEFAULT 0,
    last_reset_daily TIMESTAMPTZ DEFAULT NOW(),
    last_reset_monthly TIMESTAMPTZ DEFAULT NOW()
  );
  ```

- [ ] Add RLS policies for both tables

#### Code Changes
- [ ] Create `src/services/JobService.ts`:
  - [ ] `createJob(userId, prompt)` - Creates pending job
  - [ ] `startJob(jobId)` - Marks as processing
  - [ ] `completeJob(jobId, result)` - Stores result
  - [ ] `failJob(jobId, error)` - Records failure
  - [ ] `getJob(jobId)` - Retrieves job status
  - [ ] `getUserJobs(userId)` - List user's jobs

- [ ] Update API routes to use JobService:
  - [ ] `/api/ai-builder/full-app/route.ts`
  - [ ] `/api/ai-builder/modify/route.ts`
  - [ ] `/api/ai-builder/route.ts`

- [ ] Create `src/services/QuotaService.ts`:
  - [ ] `checkQuota(userId)` - Returns remaining quota
  - [ ] `incrementUsage(userId, tokens)` - Updates usage
  - [ ] `resetDailyQuotas()` - Cron job function

- [ ] Add job history UI:
  - [ ] Create `src/components/JobHistory.tsx`
  - [ ] Show past generations with status
  - [ ] Allow re-opening completed jobs

#### Monitoring
- [ ] Add error logging service (Sentry or LogTail)
- [ ] Create basic dashboard in Supabase

### Estimated Effort
- Database: 2-3 hours
- Backend services: 4-6 hours
- UI components: 3-4 hours
- Testing: 2-3 hours
- **Total: 2-3 days**

---

## Phase 2: Frontend/Backend Split

### Trigger Conditions
- [ ] You have 50+ active users
- [ ] Page load times are slow (>3s)
- [ ] You want Vercel's CDN for static content
- [ ] You're preparing to charge money

### Architecture Changes

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 2 ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────────┐       ┌──────────────────────────┐      │
│   │     Vercel       │       │        Railway           │      │
│   │   (Frontend)     │──────▶│    (AI API Service)      │      │
│   │                  │       │                          │      │
│   │ - Next.js pages  │       │ - /api/ai-builder/*      │      │
│   │ - Static assets  │       │ - /api/jobs/*            │      │
│   │ - Global CDN     │       │ - No timeout limits      │      │
│   │ - Image optim    │       │ - Claude API calls       │      │
│   └──────────────────┘       └──────────────────────────┘      │
│            │                            │                       │
│            └────────────┬───────────────┘                       │
│                         ▼                                       │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                      Supabase                           │   │
│   │   - All existing tables                                 │   │
│   │   - Realtime subscriptions for job status               │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Checklist

#### Infrastructure Setup
- [ ] Create new Vercel project
- [ ] Configure custom domain (frontend.yourapp.com or yourapp.com)
- [ ] Configure Railway custom domain (api.yourapp.com)
- [ ] Set up CORS headers on Railway API

#### Code Reorganization
- [ ] Create separate repository OR monorepo structure:
  ```
  /
  ├── apps/
  │   ├── web/          # Vercel deployment
  │   │   ├── src/
  │   │   │   ├── app/
  │   │   │   ├── components/
  │   │   │   └── ...
  │   │   └── package.json
  │   │
  │   └── api/          # Railway deployment
  │       ├── src/
  │       │   ├── routes/
  │       │   ├── services/
  │       │   └── ...
  │       └── package.json
  │
  └── packages/         # Shared code
      └── shared/
          ├── types/
          └── utils/
  ```

- [ ] Move AI routes to Railway service:
  - [ ] `/api/ai-builder/full-app`
  - [ ] `/api/ai-builder/modify`
  - [ ] `/api/ai-builder/route`
  - [ ] `/api/ai-builder/plan-phases`
  - [ ] `/api/chat`
  - [ ] `/api/jobs/*` (new)

- [ ] Keep on Vercel:
  - [ ] All page routes
  - [ ] `/api/auth/*` (Supabase auth helpers)
  - [ ] `/api/supabase-test`
  - [ ] Static API routes (no long processing)

#### Frontend Updates
- [ ] Create API client for Railway:
  ```typescript
  // src/lib/api-client.ts
  const API_BASE = process.env.NEXT_PUBLIC_API_URL;
  
  export async function generateApp(prompt: string) {
    return fetch(`${API_BASE}/ai-builder/full-app`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getToken()}`
      },
      body: JSON.stringify({ prompt })
    });
  }
  ```

- [ ] Add Supabase Realtime for job status:
  ```typescript
  // Subscribe to job updates
  supabase
    .channel('job-updates')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'generation_jobs',
      filter: `id=eq.${jobId}`
    }, (payload) => {
      updateJobStatus(payload.new);
    })
    .subscribe();
  ```

#### Environment Variables
- [ ] Vercel:
  - [ ] `NEXT_PUBLIC_API_URL` (Railway URL)
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`

- [ ] Railway:
  - [ ] `ANTHROPIC_API_KEY`
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `ALLOWED_ORIGINS` (Vercel URLs)

### Estimated Effort
- Infrastructure: 4-6 hours
- Code reorganization: 8-12 hours
- Testing & debugging: 4-6 hours
- **Total: 3-5 days**

---

## Phase 3: Monetization

### Trigger Conditions
- [ ] You have 100+ active users
- [ ] Users ask about paid features
- [ ] You want sustainable revenue
- [ ] You've validated product-market fit

### Architecture Changes

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 3 ADDITIONS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Vercel ◄──────────────────────────────────────► Railway      │
│     │                                                │          │
│     │    ┌────────────────────────────────┐         │          │
│     └───▶│           Stripe               │◄────────┘          │
│          │   - Subscriptions              │                     │
│          │   - Usage-based billing        │                     │
│          │   - Customer portal            │                     │
│          └────────────────────────────────┘                     │
│                         │                                       │
│                         ▼                                       │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                      Supabase                           │   │
│   │   + subscriptions table                                 │   │
│   │   + invoices table                                      │   │
│   │   + pricing_plans table                                 │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Checklist

#### Stripe Setup
- [ ] Create Stripe account
- [ ] Define pricing plans:
  ```
  Free:     5 generations/day, basic features
  Pro:      50 generations/day, all features, $10/mo
  Team:     Unlimited, priority, $30/mo
  ```
- [ ] Create products and prices in Stripe Dashboard
- [ ] Set up webhook endpoint

#### Database Schema
- [ ] Create `subscriptions` table:
  ```sql
  CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

- [ ] Create `pricing_plans` table:
  ```sql
  CREATE TABLE pricing_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price_monthly INTEGER, -- cents
    price_yearly INTEGER,  -- cents
    daily_limit INTEGER,
    monthly_limit INTEGER,
    features JSONB,
    stripe_price_id_monthly TEXT,
    stripe_price_id_yearly TEXT,
    is_active BOOLEAN DEFAULT TRUE
  );
  ```

#### Code Implementation
- [ ] Create `src/services/StripeService.ts`:
  - [ ] `createCustomer(userId, email)`
  - [ ] `createCheckoutSession(userId, planId)`
  - [ ] `createPortalSession(userId)`
  - [ ] `handleWebhook(event)`
  - [ ] `cancelSubscription(subscriptionId)`

- [ ] Create `/api/stripe/webhook/route.ts`:
  - [ ] Handle `checkout.session.completed`
  - [ ] Handle `customer.subscription.updated`
  - [ ] Handle `customer.subscription.deleted`
  - [ ] Handle `invoice.payment_failed`

- [ ] Create `/api/stripe/checkout/route.ts`
- [ ] Create `/api/stripe/portal/route.ts`

- [ ] Update QuotaService to check subscription:
  ```typescript
  async function checkQuota(userId: string) {
    const subscription = await getSubscription(userId);
    const plan = await getPlan(subscription.plan);
    const usage = await getUsage(userId);
    
    return {
      allowed: usage.daily < plan.daily_limit,
      remaining: plan.daily_limit - usage.daily,
      plan: plan.name
    };
  }
  ```

#### UI Components
- [ ] Create `src/components/PricingTable.tsx`
- [ ] Create `src/components/SubscriptionStatus.tsx`
- [ ] Create `src/components/UpgradePrompt.tsx`
- [ ] Create `src/app/pricing/page.tsx`
- [ ] Create `src/app/account/billing/page.tsx`

### Estimated Effort
- Stripe setup: 2-3 hours
- Database: 2-3 hours
- Backend services: 8-12 hours
- Webhook handling: 4-6 hours
- UI components: 6-8 hours
- Testing: 4-6 hours
- **Total: 5-7 days**

---

## Phase 4: Job Queue & Background Workers

### Trigger Conditions
- [ ] You have 200+ active users
- [ ] Concurrent requests cause failures
- [ ] You need priority queues (paid users first)
- [ ] You want better reliability/retry logic

### Architecture Changes

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 4 ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Vercel            Railway (API)          Railway (Workers)    │
│   ┌──────┐          ┌──────────┐           ┌──────────────┐    │
│   │      │─────────▶│ Enqueue  │──────────▶│   Worker 1   │    │
│   │ Web  │          │   Job    │           │   Worker 2   │    │
│   │      │◄─────────│          │◄──────────│   Worker N   │    │
│   └──────┘          └──────────┘           └──────────────┘    │
│       │                  │                        │             │
│       │                  ▼                        │             │
│       │          ┌──────────────┐                 │             │
│       │          │    Redis     │◄────────────────┘             │
│       │          │  (Upstash)   │                               │
│       │          │  Job Queue   │                               │
│       │          └──────────────┘                               │
│       │                  │                                      │
│       └──────────────────┼──────────────────────────────────────│
│                          ▼                                      │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                      Supabase                           │   │
│   │   + Realtime for job status updates                     │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Checklist

#### Infrastructure
- [ ] Set up Redis (Upstash or Railway Redis)
- [ ] Create separate Railway service for workers
- [ ] Configure auto-scaling rules

#### Job Queue Setup
- [ ] Install BullMQ:
  ```bash
  npm install bullmq ioredis
  ```

- [ ] Create `src/lib/queue.ts`:
  ```typescript
  import { Queue, Worker } from 'bullmq';
  import IORedis from 'ioredis';
  
  const connection = new IORedis(process.env.REDIS_URL);
  
  export const generationQueue = new Queue('generation', {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 500
    }
  });
  ```

- [ ] Create queue types:
  ```typescript
  interface GenerationJob {
    id: string;
    userId: string;
    prompt: string;
    type: 'full-app' | 'modify' | 'component';
    priority: 'free' | 'pro' | 'team';
    context?: any;
  }
  ```

#### Worker Implementation
- [ ] Create `apps/worker/src/index.ts`:
  ```typescript
  const worker = new Worker('generation', async (job) => {
    const { id, userId, prompt, type, context } = job.data;
    
    // Update status to processing
    await updateJobStatus(id, 'processing');
    
    try {
      // Call appropriate generation function
      const result = await generateApp(type, prompt, context);
      
      // Save result
      await completeJob(id, result);
      
      return result;
    } catch (error) {
      await failJob(id, error);
      throw error;
    }
  }, {
    connection,
    concurrency: 3 // Process 3 jobs simultaneously
  });
  ```

- [ ] Implement priority queues:
  ```typescript
  // Higher number = higher priority
  const PRIORITIES = {
    team: 1,
    pro: 5,
    free: 10
  };
  
  await generationQueue.add('generate', jobData, {
    priority: PRIORITIES[userPlan]
  });
  ```

#### API Updates
- [ ] Update `/api/ai-builder/full-app`:
  ```typescript
  export async function POST(request: Request) {
    // Validate request
    const { prompt } = await request.json();
    const user = await getUser(request);
    
    // Create job record
    const job = await createJob(user.id, prompt);
    
    // Enqueue for processing
    await generationQueue.add('generate', {
      id: job.id,
      userId: user.id,
      prompt,
      type: 'full-app',
      priority: user.plan
    });
    
    // Return immediately
    return Response.json({ jobId: job.id });
  }
  ```

- [ ] Create `/api/jobs/[id]/route.ts`:
  - [ ] GET: Return job status and result
  - [ ] DELETE: Cancel pending job

#### Monitoring
- [ ] Add Bull Board for queue monitoring:
  ```typescript
  import { createBullBoard } from '@bull-board/api';
  import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
  
  const serverAdapter = new ExpressAdapter();
  createBullBoard({
    queues: [new BullMQAdapter(generationQueue)],
    serverAdapter
  });
  ```

- [ ] Set up alerts for:
  - [ ] Queue length > 50
  - [ ] Job failure rate > 5%
  - [ ] Worker crashes

### Estimated Effort
- Infrastructure: 4-6 hours
- Queue setup: 4-6 hours
- Worker implementation: 8-12 hours
- API updates: 4-6 hours
- Monitoring: 4-6 hours
- Testing: 6-8 hours
- **Total: 7-10 days**

---

## Phase 5: Enterprise Features

### Trigger Conditions
- [ ] You have 500+ active users
- [ ] Enterprise customers request features
- [ ] You need team/organization support
- [ ] Revenue > $5000/month

### Features to Add
- [ ] Team workspaces
- [ ] Role-based access control
- [ ] SSO (SAML/OIDC)
- [ ] Audit logs
- [ ] Custom branding
- [ ] SLA guarantees
- [ ] Dedicated support
- [ ] On-premise deployment option

### Not Detailed Here
This phase is far enough away that requirements will change significantly. Plan when you reach this point.

---

## Cost Projections

| Phase | Monthly Cost | Users Supported |
|-------|-------------|-----------------|
| 0 (Current) | ~$5 | 0-100 |
| 1 (Jobs) | ~$5-10 | 100-200 |
| 2 (Split) | ~$25-40 | 200-500 |
| 3 (Monetization) | ~$50-100 | 500-1000 |
| 4 (Queue) | ~$100-200 | 1000-5000 |
| 5 (Enterprise) | ~$500+ | 5000+ |

**Note**: At Phase 3+, revenue should exceed infrastructure costs.

---

## Decision Log

Use this section to record why you moved to each phase:

### Phase 1 Decision
- **Date**: ___________
- **Trigger hit**: ___________
- **User count**: ___________
- **Notes**: ___________

### Phase 2 Decision
- **Date**: ___________
- **Trigger hit**: ___________
- **User count**: ___________
- **Notes**: ___________

### Phase 3 Decision
- **Date**: ___________
- **Trigger hit**: ___________
- **User count**: ___________
- **Revenue goal**: ___________
- **Notes**: ___________

### Phase 4 Decision
- **Date**: ___________
- **Trigger hit**: ___________
- **User count**: ___________
- **Concurrent issues**: ___________
- **Notes**: ___________

---

## Quick Reference

### When to Move to Next Phase

```
Phase 0 → 1:  10+ users OR losing generations to browser closes
Phase 1 → 2:  50+ users OR slow page loads OR preparing for payments
Phase 2 → 3:  100+ users OR users asking for paid features
Phase 3 → 4:  200+ users OR concurrent request failures
Phase 4 → 5:  500+ users OR enterprise customer requests
```

### Key Metrics to Track

- Daily active users
- Generations per day
- Failure rate
- Average generation time
- User retention (7-day, 30-day)
- Revenue (once monetized)

---

*Last Updated: November 26, 2025*

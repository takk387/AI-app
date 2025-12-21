# Custom Preview System Architecture Plan

## Overview

Replace broken Sandpack preview with a **3-tier hybrid preview system** that supports full-stack apps with database isolation, optimized for 500+ concurrent previews.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Preview Orchestrator                      │
│                    (Routes to appropriate tier)                  │
└─────────────────────────────────────────────────────────────────┘
                    │                │                │
        ┌───────────┘                │                └───────────┐
        ▼                            ▼                            ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│    TIER 1     │          │    TIER 2     │          │    TIER 3     │
│ WebContainers │          │  Docker Pool  │          │    Fly.io     │
│   (Browser)   │          │    (VPS)      │          │  (Overflow)   │
├───────────────┤          ├───────────────┤          ├───────────────┤
│ Frontend only │          │  Full-stack   │          │  Full-stack   │
│ Instant start │          │  Real DB      │          │  Auto-scale   │
│ Free          │          │  ~$0.01/hr    │          │  ~$0.003/hr   │
└───────────────┘          └───────────────┘          └───────────────┘
                                   │
                                   ▼
                    ┌───────────────────────────┐
                    │   Supabase PostgreSQL     │
                    │   (Schema Isolation)      │
                    │   preview_{uuid} schemas  │
                    └───────────────────────────┘
```

## Key Decisions

| Decision      | Choice               | Rationale                                |
| ------------- | -------------------- | ---------------------------------------- |
| VPS Provider  | Hetzner/DigitalOcean | Cost-effective for 500+ previews         |
| Database      | Supabase (existing)  | Already integrated, schema isolation     |
| Idle Timeout  | 1 hour               | Balance between UX and resources         |
| Deploy Target | Railway (primary)    | Full-stack support, existing integration |
| Overflow      | Fly.io               | Burst capacity, pay-per-use              |

---

## The Problem We're Solving

1. **Sandpack doesn't work** - Preview display never functioned properly
2. **Cost concerns** - Self-hosting every app before deployment is expensive
3. **Database chicken-and-egg** - How to configure DB if it's not initiated until deployment?

**Solution**: Initialize database during preview (in Supabase with isolated schema), then export and migrate to Railway on deployment.

---

## Database Strategy: Schema Isolation

Each preview gets its own PostgreSQL schema in Supabase:

```sql
-- Create isolated schema per preview
CREATE SCHEMA preview_{uuid};

-- All tables created under this schema
SET search_path TO preview_{uuid};

-- Prisma connects with schema parameter
-- DATABASE_URL=postgresql://...?schema=preview_{uuid}
```

**Benefits:**

- Complete data isolation (no collision possible)
- Uses existing Supabase (no new infrastructure)
- Easy cleanup (DROP SCHEMA CASCADE)
- Seamless migration to Railway deployment

**Preview-to-Deployment Flow:**

1. User builds app, preview runs with `preview_{uuid}` schema
2. User clicks "Deploy to Railway"
3. System exports schema structure + data
4. Railway project created with PostgreSQL addon
5. Migrations applied, data seeded from preview
6. App deployed with production DATABASE_URL
7. Preview schema cleaned up

---

## Infrastructure Requirements

### VPS Cluster (for 500+ concurrent)

- **3-5 VPS nodes** (Hetzner CPX31: 4 vCPU, 8GB RAM, ~$15/mo each)
- **~100 containers per node** (80MB RAM each)
- **Warm pool**: 20 pre-started containers per node
- **Total capacity**: ~400-500 concurrent, Fly.io handles overflow

### Container Specification

```yaml
resources:
  memory: 512MB (limit), 80MB (request)
  cpu: 0.25 cores (shared)
base_image: node:20-slim + common deps pre-installed
startup_time: ~3-5 seconds (warm), ~10s (cold)
idle_timeout: 1 hour (then suspended, not destroyed)
```

---

## Implementation Phases

### Phase 1: Preview Orchestrator Service (Week 1)

Create the central orchestration service that routes previews to the appropriate tier.

**New files:**

- `src/services/PreviewOrchestrator.ts` - Main orchestration logic
- `src/types/preview.ts` - TypeScript types for preview system
- `src/app/api/preview/orchestrate/route.ts` - Preview lifecycle API

**Modify:**

- `src/components/preview/PreviewModeSelector.tsx` - Add new tier options

### Phase 2: Supabase Schema Isolation (Week 1-2)

Implement per-preview database schemas in Supabase.

**New files:**

- `src/services/PreviewDatabaseService.ts` - Schema creation/management
- `src/app/api/preview/database/route.ts` - Database operations API
- `supabase/migrations/XXXXXX_preview_schemas.sql` - Schema template

**Key functions:**

- `createPreviewSchema(previewId, prismaSchema)` - Create isolated schema
- `seedPreviewData(previewId, seedData)` - Apply seed data
- `exportPreviewData(previewId)` - Export for deployment
- `cleanupStaleSchemas()` - Cleanup job for abandoned previews

### Phase 3: Docker Container Pool (Week 2-3)

Self-hosted Docker pool on VPS with warm containers.

**New files:**

- `src/services/ContainerPoolManager.ts` - Container lifecycle management
- `src/services/VPSNodeManager.ts` - Multi-node orchestration
- `docker/preview-base/Dockerfile` - Base container image
- `docker/docker-compose.preview.yml` - Local development setup

**Key features:**

- Warm pool (20 pre-started containers per node)
- 1-hour idle suspension with state preservation
- Health monitoring and auto-recovery
- Load balancing across VPS nodes

### Phase 4: Fly.io Overflow Integration (Week 3)

Burst capacity for when VPS pool is exhausted.

**New files:**

- `src/services/FlyioOverflowService.ts` - Fly.io machine management

**Modify:**

- `src/services/PreviewOrchestrator.ts` - Add Fly.io fallback routing

### Phase 5: Preview-to-Railway Deployment (Week 4)

Seamless transition from preview to production.

**Modify:**

- `src/services/RailwayService.ts` - Accept preview database export
- `src/app/api/railway/deploy/route.ts` - Include DB migration

**New flow:**

1. Export preview schema data from Supabase
2. Create Railway project with PostgreSQL addon
3. Apply migrations + seed with preview data
4. Deploy app code
5. Cleanup preview schema

### Phase 6: UI Integration (Week 4-5)

Update frontend components to use new preview system.

**Modify:**

- `src/components/PowerfulPreview.tsx` - Integrate orchestrator
- `src/components/FullAppPreview.tsx` - Remove, replaced by orchestrator
- `src/components/AIBuilder.tsx` - Update preview invocation
- `src/store/useAppStore.ts` - Add preview state management

---

## File Structure

### Existing files to modify:

```
src/services/WebContainerService.ts    - Tier 1, wrap with orchestrator
src/services/RailwayService.ts         - Pattern for new services
src/components/preview/PreviewModeSelector.tsx - UI to extend
src/utils/supabase/server.ts           - Supabase server client
src/hooks/useDatabaseSync.ts           - Sync patterns
```

### New files to create:

```
src/
├── services/
│   ├── PreviewOrchestrator.ts       # Central routing logic
│   ├── PreviewDatabaseService.ts    # Schema isolation
│   ├── ContainerPoolManager.ts      # Docker pool
│   ├── VPSNodeManager.ts            # Multi-node orchestration
│   └── FlyioOverflowService.ts      # Fly.io burst capacity
├── app/api/preview/
│   ├── orchestrate/route.ts         # Preview lifecycle
│   ├── database/route.ts            # DB operations
│   └── container/route.ts           # Container management
├── types/
│   └── preview.ts                   # Preview types
└── hooks/
    └── usePreviewOrchestrator.ts    # React hook

docker/
├── preview-base/
│   └── Dockerfile                   # Base container image
└── docker-compose.preview.yml       # Local dev setup
```

---

## Cost Estimate (500+ concurrent previews)

| Component                       | Monthly Cost    |
| ------------------------------- | --------------- |
| 5x Hetzner CPX31 VPS            | ~$75            |
| Supabase Pro (for schema count) | ~$25            |
| Fly.io overflow (~20% traffic)  | ~$50            |
| **Total**                       | **~$150/month** |

**Comparison:**

- Current Railway approach: ~$2,500+/month for 500 apps
- This approach: ~$150/month (94% cost reduction)

---

## Success Criteria

1. Full-stack preview works (frontend + backend + database)
2. Database isolation verified (no data leakage between previews)
3. Preview persists for 1 hour of inactivity
4. Preview-to-Railway deployment transfers data correctly
5. System handles 500+ concurrent previews
6. Cold start < 10 seconds, warm start < 5 seconds

---

## Alternative Approaches Considered

### Option A: Kubernetes (Rejected)

- Higher operational complexity
- Requires K8s expertise
- Overkill for this use case

### Option B: Fly.io Only (Rejected)

- Simpler but more expensive at scale
- ~$300-400/month for 500 previews
- Less control over infrastructure

### Option C: Neon PostgreSQL Branching (Considered)

- Great isolation via copy-on-write branches
- Additional vendor dependency
- May revisit if Supabase schema approach has limitations

---

## Open Questions

1. Do we need WebSocket support for real-time features in previews?
2. Should we support custom domains for previews?
3. How do we handle preview URLs (subdomain vs path-based)?
4. Do we need preview sharing/collaboration features?

---

_Plan created: December 2024_
_Status: Ready for review_

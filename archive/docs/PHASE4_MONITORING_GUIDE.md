# Phase 4: Monitoring & Analytics - Complete Guide

**Status:** ✅ Implementation Complete  
**Date:** November 23, 2025  
**Phase:** 4.1 ✅ | 4.2 ✅ | 4.3 ✅

---

## 📋 Overview

This document provides comprehensive guidance for monitoring and analyzing storage operations in the AI App Builder. Phase 4 establishes a production-grade analytics infrastructure that tracks all storage operations, monitors performance, and provides actionable insights.

---

## 🎯 What Was Built

### Phase 4.1: Storage Analytics Service ✅
- **File:** `src/services/StorageAnalytics.ts` (706 lines)
- **Features:**
  - Database integration with `analytics_events` table
  - In-memory metrics for real-time monitoring
  - Performance tracking with checkpoints
  - Comprehensive event tracking (upload, download, delete, list, errors, quota)
  - Utility functions for analytics operations

### Integration with StorageService ✅
- **File:** `src/services/StorageService.ts` (Updated)
- **Features:**
  - Automatic tracking of all storage operations
  - Performance monitoring with operation IDs
  - Error tracking with retry attempts
  - Validation error tracking
  - Zero-overhead when analytics is not provided (optional)

---

## 📊 Phase 4.2: Error Dashboard Queries

### Error Overview Query

Get a summary of all storage errors in the last 24 hours:

```sql
-- Storage Error Summary (Last 24 Hours)
SELECT 
  event_type,
  COUNT(*) as error_count,
  event_data->>'errorCode' as error_code,
  event_data->>'errorMessage' as error_message
FROM analytics_events
WHERE 
  event_type LIKE 'storage_%_error'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type, event_data->>'errorCode', event_data->>'errorMessage'
ORDER BY error_count DESC
LIMIT 20;
```

### Error Rate by Hour

Track error trends over time:

```sql
-- Hourly Error Rate
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total_errors,
  COUNT(*) FILTER (WHERE event_data->>'errorCode' = 'FILE_TOO_LARGE') as quota_errors,
  COUNT(*) FILTER (WHERE event_data->>'errorCode' = 'NETWORK_ERROR') as network_errors,
  COUNT(*) FILTER (WHERE event_data->>'errorCode' = 'PERMISSION_DENIED') as permission_errors
FROM analytics_events
WHERE 
  event_type LIKE 'storage_%_error'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY hour
ORDER BY hour DESC;
```

### User-Specific Error Analysis

Identify users experiencing the most errors:

```sql
-- Top Users by Error Count
SELECT 
  user_id,
  COUNT(*) as error_count,
  ARRAY_AGG(DISTINCT event_data->>'errorCode') as error_codes,
  MAX(created_at) as last_error_time
FROM analytics_events
WHERE 
  event_type LIKE 'storage_%_error'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_id
ORDER BY error_count DESC
LIMIT 10;
```

### Retry Success Rate

Analyze retry effectiveness:

```sql
-- Retry Analysis
SELECT 
  event_data->>'errorCode' as error_code,
  COUNT(*) FILTER (WHERE (event_data->>'retryAttempt')::int = 1) as first_attempt_failures,
  COUNT(*) FILTER (WHERE (event_data->>'retryAttempt')::int = 2) as second_attempt_failures,
  COUNT(*) FILTER (WHERE (event_data->>'retryAttempt')::int = 3) as third_attempt_failures,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE (event_data->>'retryAttempt')::int < 3) / 
    NULLIF(COUNT(*), 0), 
    2
  ) as retry_success_rate
FROM analytics_events
WHERE 
  event_type = 'storage_upload_error'
  AND event_data->>'isRetryable' = 'true'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY error_code
ORDER BY first_attempt_failures DESC;
```

### Critical Error Dashboard

Real-time view of critical errors requiring immediate attention:

```sql
-- Critical Errors Requiring Attention
SELECT 
  created_at,
  user_id,
  event_type,
  event_data->>'errorCode' as error_code,
  event_data->>'errorMessage' as error_message,
  event_data->>'bucket' as bucket,
  event_data->>'fileName' as file_name,
  event_data->>'fileSize' as file_size
FROM analytics_events
WHERE 
  event_type LIKE 'storage_%_error'
  AND (
    event_data->>'errorCode' IN ('QUOTA_EXCEEDED', 'PERMISSION_DENIED', 'BUCKET_NOT_FOUND')
    OR (event_data->>'retryAttempt')::int >= 3
  )
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

---

## ⚡ Phase 4.3: Performance Monitoring

### Performance Budgets

Define performance targets for storage operations:

```typescript
// Performance Budgets (src/services/StorageAnalytics.ts)
const PERFORMANCE_BUDGETS = {
  upload: {
    // Upload time budgets (milliseconds)
    small: 2000,    // < 1 MB
    medium: 5000,   // 1-10 MB
    large: 15000,   // 10-50 MB
  },
  download: {
    small: 1000,    // < 1 MB
    medium: 3000,   // 1-10 MB
    large: 10000,   // 10-50 MB
  },
  delete: {
    max: 1000,      // All deletes should complete under 1s
  },
  list: {
    small: 500,     // < 50 files
    medium: 1500,   // 50-100 files
    large: 3000,    // 100+ files
  },
};
```

### Performance Query: Average Upload Time

```sql
-- Average Upload Duration by File Size
SELECT 
  CASE 
    WHEN (event_data->>'fileSize')::bigint < 1048576 THEN 'Small (<1MB)'
    WHEN (event_data->>'fileSize')::bigint < 10485760 THEN 'Medium (1-10MB)'
    ELSE 'Large (>10MB)'
  END as size_category,
  COUNT(*) as upload_count,
  ROUND(AVG((event_data->>'duration')::int)) as avg_duration_ms,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (event_data->>'duration')::int)) as median_duration_ms,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (event_data->>'duration')::int)) as p95_duration_ms,
  ROUND(MAX((event_data->>'duration')::int)) as max_duration_ms
FROM analytics_events
WHERE 
  event_type = 'storage_upload_complete'
  AND event_data->>'success' = 'true'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY size_category
ORDER BY 
  CASE 
    WHEN size_category = 'Small (<1MB)' THEN 1
    WHEN size_category = 'Medium (1-10MB)' THEN 2
    ELSE 3
  END;
```

### Performance Query: Slow Operations

```sql
-- Slowest Operations (Last 24 Hours)
SELECT 
  event_type,
  created_at,
  user_id,
  event_data->>'operationId' as operation_id,
  event_data->>'fileName' as file_name,
  event_data->>'fileSize' as file_size,
  (event_data->>'duration')::int as duration_ms,
  event_data->>'bucket' as bucket
FROM analytics_events
WHERE 
  event_type IN ('storage_upload_complete', 'storage_download_complete', 'storage_list_complete')
  AND (event_data->>'duration')::int > 5000  -- Slower than 5 seconds
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY (event_data->>'duration')::int DESC
LIMIT 20;
```

### Performance Query: P95 Latency Tracking

```sql
-- P95 Latency by Operation Type (Last 7 Days)
WITH daily_metrics AS (
  SELECT 
    DATE_TRUNC('day', created_at) as day,
    event_type,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (event_data->>'duration')::int) as p95_duration
  FROM analytics_events
  WHERE 
    event_type IN ('storage_upload_complete', 'storage_download_complete', 'storage_delete_complete')
    AND event_data->>'success' = 'true'
    AND created_at > NOW() - INTERVAL '7 days'
  GROUP BY day, event_type
)
SELECT 
  day,
  MAX(CASE WHEN event_type = 'storage_upload_complete' THEN p95_duration END) as upload_p95,
  MAX(CASE WHEN event_type = 'storage_download_complete' THEN p95_duration END) as download_p95,
  MAX(CASE WHEN event_type = 'storage_delete_complete' THEN p95_duration END) as delete_p95
FROM daily_metrics
GROUP BY day
ORDER BY day DESC;
```

### Storage Usage Analytics

```sql
-- Storage Usage Metrics
SELECT 
  event_data->>'bucket' as bucket,
  COUNT(*) as total_uploads,
  SUM((event_data->>'fileSize')::bigint) as total_bytes,
  ROUND(AVG((event_data->>'fileSize')::bigint)) as avg_file_size,
  ARRAY_AGG(DISTINCT event_data->>'fileType') as file_types
FROM analytics_events
WHERE 
  event_type = 'storage_upload_complete'
  AND event_data->>'success' = 'true'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY bucket;
```

---

## 🚨 Alert Configuration

### Recommended Alert Thresholds

#### Error Rate Alerts

```sql
-- High Error Rate Alert (>5% in last hour)
SELECT 
  COUNT(*) FILTER (WHERE event_type LIKE '%_error') as errors,
  COUNT(*) as total_operations,
  ROUND(100.0 * COUNT(*) FILTER (WHERE event_type LIKE '%_error') / NULLIF(COUNT(*), 0), 2) as error_rate
FROM analytics_events
WHERE 
  event_type LIKE 'storage_%'
  AND created_at > NOW() - INTERVAL '1 hour'
HAVING 
  ROUND(100.0 * COUNT(*) FILTER (WHERE event_type LIKE '%_error') / NULLIF(COUNT(*), 0), 2) > 5;
```

#### Quota Warning Alert

```sql
-- Quota Usage Approaching Limit (>80%)
SELECT 
  user_id,
  event_data->>'bucket' as bucket,
  (event_data->>'usagePercentage')::numeric as usage_percent,
  event_data->>'warningLevel' as warning_level,
  created_at
FROM analytics_events
WHERE 
  event_type IN ('storage_quota_warning', 'storage_quota_exceeded')
  AND (event_data->>'usagePercentage')::numeric > 80
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY usage_percent DESC;
```

#### Performance Degradation Alert

```sql
-- Performance Degradation Alert (P95 > 2x normal)
WITH current_p95 AS (
  SELECT 
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (event_data->>'duration')::int) as p95
  FROM analytics_events
  WHERE 
    event_type = 'storage_upload_complete'
    AND created_at > NOW() - INTERVAL '1 hour'
),
baseline_p95 AS (
  SELECT 
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (event_data->>'duration')::int) as p95
  FROM analytics_events
  WHERE 
    event_type = 'storage_upload_complete'
    AND created_at BETWEEN NOW() - INTERVAL '7 days' AND NOW() - INTERVAL '1 day'
)
SELECT 
  current_p95.p95 as current_p95_ms,
  baseline_p95.p95 as baseline_p95_ms,
  ROUND(current_p95.p95 / NULLIF(baseline_p95.p95, 0), 2) as degradation_factor
FROM current_p95, baseline_p95
WHERE current_p95.p95 > baseline_p95.p95 * 2;
```

---

## 📈 Usage Examples

### Client Component with Analytics

```typescript
'use client';

import { createClient } from '@/utils/supabase/client';
import { StorageService } from '@/services/StorageService';
import { StorageAnalyticsService } from '@/services/StorageAnalytics';

export function FileUploadComponent() {
  const [storageService] = useState(() => {
    const supabase = createClient();
    const analytics = new StorageAnalyticsService(supabase);
    return new StorageService(supabase, analytics);
  });

  const handleUpload = async (file: File) => {
    const result = await storageService.upload('user-uploads', file);
    
    if (result.success) {
      console.log('File uploaded:', result.data);
      // Analytics automatically tracked
    } else {
      console.error('Upload failed:', result.error);
      // Error automatically tracked
    }
  };

  // ...
}
```

### Server Route with Analytics

```typescript
// app/api/storage-upload/route.ts
import { createClient } from '@/utils/supabase/server';
import { StorageService } from '@/services/StorageService';
import { StorageAnalyticsService } from '@/services/StorageAnalytics';

export async function POST(request: Request) {
  const supabase = await createClient();
  const analytics = new StorageAnalyticsService(supabase);
  const storage = new StorageService(supabase, analytics);

  const formData = await request.formData();
  const file = formData.get('file') as File;

  const result = await storage.upload('user-uploads', file);
  // Analytics automatically tracked in database

  if (result.success) {
    return Response.json({ success: true, file: result.data });
  } else {
    return Response.json({ success: false, error: result.error.message }, { status: 400 });
  }
}
```

### Querying Analytics in Real-Time

```typescript
import { createClient } from '@/utils/supabase/client';
import { StorageAnalyticsService } from '@/services/StorageAnalytics';

const supabase = createClient();
const analytics = new StorageAnalyticsService(supabase);

// Get in-memory metrics
const metrics = analytics.getMetricsSummary();
console.log('Storage Metrics:', {
  totalUploads: metrics.totalUploads,
  successRate: `${Math.round((metrics.successfulUploads / metrics.totalUploads) * 100)}%`,
  averageUploadTime: `${Math.round(metrics.averageUploadDuration)}ms`,
  totalBytesUploaded: `${(metrics.totalBytesUploaded / 1024 / 1024).toFixed(2)} MB`,
});

// Get database events
const recentErrors = await analytics.getStorageEvents({
  eventType: 'storage_upload_error',
  limit: 10,
});
console.log('Recent Errors:', recentErrors);
```

---

## 🔍 Monitoring Dashboard Setup

### Key Metrics to Track

1. **Operation Success Rate**
   - Target: >99.5%
   - Alert: <95%

2. **Average Upload Time**
   - Small files (<1MB): <2s
   - Medium files (1-10MB): <5s
   - Large files (>10MB): <15s

3. **Error Rate by Type**
   - Validation errors: Should decrease over time (indicates UX improvement needed)
   - Network errors: External dependency, track for patterns
   - Permission errors: Indicates security/auth issues

4. **Storage Quota Usage**
   - Warning: 60% (medium)
   - Warning: 80% (high)
   - Alert: 95% (critical)

5. **Retry Success Rate**
   - Target: >90% of retryable errors succeed on retry

### Recommended Dashboard Layout

```
┌─────────────────────────────────────────────────────────┐
│ STORAGE OPERATIONS DASHBOARD                             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│ │ Total Ops    │  │ Success Rate │  │ Avg Duration │   │
│ │ 1,234        │  │ 99.2%        │  │ 1,234ms      │   │
│ └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Upload Performance (Last 24h)                       │ │
│ │ [Line graph: avg, p50, p95 upload times]           │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Error Rate by Type                                  │ │
│ │ [Stacked bar chart: validation, network, other]    │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Storage Quota Usage                                 │ │
│ │ [Progress bars per bucket]                          │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Future Enhancements (Post-Phase 4)

### Sentry Integration

```typescript
// Future: Integrate with Sentry for error tracking
import * as Sentry from '@sentry/nextjs';

class StorageAnalyticsService {
  async trackError(data: ErrorEventData) {
    // Existing database tracking...
    await this.storeEvent('storage_upload_error', eventData);

    // Future: Send to Sentry
    Sentry.captureException(new Error(data.error.message), {
      tags: {
        operation: 'storage',
        bucket: data.bucket,
        errorCode: data.error.code,
      },
      extra: {
        operationId: data.operationId,
        isRetryable: data.isRetryable,
        retryAttempt: data.retryAttempt,
      },
    });
  }
}
```

### Real-Time Alerting

```typescript
// Future: Real-time alerts via webhook or email
async function checkAlertThresholds() {
  const metrics = analytics.getMetricsSummary();
  const errorRate = (metrics.failedUploads / metrics.totalUploads) * 100;

  if (errorRate > 5) {
    await sendAlert({
      severity: 'high',
      title: 'High Storage Error Rate',
      message: `Error rate: ${errorRate.toFixed(2)}%`,
      metrics,
    });
  }
}
```

---

## 📝 Summary

**Phase 4 Delivers:**

✅ **Comprehensive Analytics**
- All storage operations tracked
- Database persistence + in-memory metrics
- Performance monitoring with checkpoints

✅ **Error Tracking**
- Detailed error categorization
- Retry attempt tracking
- User-specific error analysis

✅ **Performance Monitoring**
- Operation timing
- Performance budgets
- P95 latency tracking

✅ **Production-Ready**
- Zero-overhead when disabled
- Type-safe implementation
- Works in all contexts (client/server)

**Total Lines of Code:** 706 (StorageAnalytics) + integration in StorageService

**Zero TypeScript Errors:** All type safety verified ✅

**Database Integration:** Fully integrated with existing `analytics_events` table ✅

**Documentation:** Complete monitoring guide with SQL queries and examples ✅

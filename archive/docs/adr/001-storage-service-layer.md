# ADR 001: Storage Service Layer Architecture

**Status:** ✅ Accepted and Implemented

**Date:** November 23, 2025

**Deciders:** Development Team

**Related Phases:** Phase 1 - Architectural Foundation

---

## Context

We needed to implement file storage functionality for our AI app builder platform using Supabase Storage. The application had several options for how to structure the storage integration:

1. **Direct Supabase calls in components** - Call Supabase storage methods directly from React components
2. **Utility functions** - Create standalone utility functions for storage operations
3. **Service layer (chosen)** - Implement a class-based service layer with dependency injection

### Requirements

- **Universal Compatibility**: Must work in both client components (browser) and server components/API routes
- **Testability**: Must be able to write comprehensive unit tests with mocked dependencies
- **Type Safety**: Full TypeScript integration with compile-time error checking
- **Security**: User-scoped access control with proper authentication
- **Maintainability**: Easy to understand, modify, and extend
- **Resilience**: Built-in error handling and retry logic

### Constraints

- Next.js 14 environment with both client and server rendering
- Supabase client must be created differently for client vs server contexts
- Cannot hardcode client creation due to server-side authentication requirements
- Need to support both authenticated and unauthenticated contexts

---

## Decision

We will implement a **class-based `StorageService`** with **dependency injection** for the Supabase client.

### Key Design Principles

1. **Dependency Injection Pattern**
   ```typescript
   export class StorageService {
     private client: SupabaseClient;
     
     constructor(client: SupabaseClient) {  // Client injected, not created
       this.client = client;
     }
   }
   ```

2. **Universal Compatibility**
   ```typescript
   // Client Component
   import { createClient } from '@/utils/supabase/client';
   const supabase = createClient();  // Browser client
   const service = new StorageService(supabase);
   
   // Server Component / API Route
   import { createClient } from '@/utils/supabase/server';
   const supabase = await createClient();  // Server client (reads cookies)
   const service = new StorageService(supabase);
   ```

3. **Comprehensive Public API**
   - `upload(bucket, file, config)` - Upload files with validation and retry
   - `list(bucket, options)` - List files with pagination and sorting
   - `delete(bucket, path)` - Delete files with ownership verification
   - `getUrl(bucket, path, options)` - Get public or signed URLs
   - `download(bucket, path)` - Download files with ownership checks

4. **Private Helper Methods**
   - `getUserId()` - Extract user ID from injected client
   - `validateFile()` - Size, type, and extension validation
   - `generatePath()` - User-scoped path generation with timestamps
   - `uploadWithRetry()` - Exponential backoff retry logic (3 attempts)
   - `getMetadata()` - Fetch file metadata from Supabase
   - `handleError()` - Consistent error mapping to StorageError types
   - `sleep()` - Async delay for retry mechanism

5. **Built-in Bucket Configurations**
   ```typescript
   private bucketConfigs: Record<BucketName, BucketConfig> = {
     'user-uploads': { maxFileSize: 10 * 1024 * 1024, allowedTypes: [...] },
     'generated-apps': { maxFileSize: 50 * 1024 * 1024, allowedTypes: [...] },
     'app-assets': { maxFileSize: 5 * 1024 * 1024, allowedTypes: [...] }
   };
   ```

---

## Consequences

### Positive

1. **Universal Compatibility** ✅
   - Same service works in client components, server components, and API routes
   - No code duplication for different environments
   - Proper authentication context in all scenarios

2. **Testability** ✅
   - Can inject mock Supabase client for unit tests
   - No need to mock global Supabase initialization
   - Fast, isolated tests without real API calls
   - Achieved 90%+ test coverage (31 unit tests, 14 integration tests)

3. **Type Safety** ✅
   - Full TypeScript integration with branded types
   - IDE autocomplete for all methods
   - Compile-time error checking
   - Generic `StorageResult<T>` for consistent return types

4. **Security** ✅
   - Server-side code always uses authenticated session from request
   - User-scoped file paths prevent unauthorized access
   - Ownership verification on delete and download operations
   - No cookie/session confusion

5. **Maintainability** ✅
   - Business logic centralized in one place
   - Easy to add new methods without scattered changes
   - Clear separation of concerns (business logic vs infrastructure)
   - Comprehensive JSDoc documentation

6. **Resilience** ✅
   - Built-in retry logic with exponential backoff (1s → 2s → 4s)
   - Smart retry detection (only retries network errors, not permission errors)
   - Comprehensive error handling with detailed error codes
   - Graceful degradation

7. **Extensibility** ✅
   - Easy to add new bucket configurations
   - Optional analytics integration (Phase 4)
   - Can extend with additional methods as needed
   - Supports middleware pattern (e.g., logging, caching)

### Negative

1. **Slight Complexity** ⚠️
   - More complex than direct Supabase calls
   - Requires understanding of dependency injection
   - **Mitigation:** Comprehensive documentation and usage examples

2. **Instantiation Boilerplate** ⚠️
   - Must create client before instantiating service
   - Two lines of code instead of direct import
   - **Mitigation:** Minimal overhead, enables proper architecture

3. **Learning Curve** ⚠️
   - Developers must understand the service pattern
   - Need to know when to use client vs server Supabase creation
   - **Mitigation:** Clear documentation, examples, and ADRs (like this one)

### Neutral

- **Class-based vs Functional:** Could have used a functional approach with closures, but class-based is more familiar to many developers and easier to extend
- **Single Service vs Multiple:** Currently one service handles all buckets; could have separate services per bucket but current approach is more flexible

---

## Alternatives Considered

### Alternative 1: Direct Supabase Calls in Components ❌

**Approach:**
```typescript
// In component
const supabase = createClient();
const { data } = await supabase.storage
  .from('user-uploads')
  .upload(path, file);
```

**Pros:**
- Simplest approach
- No abstraction layer
- Direct access to Supabase API

**Cons:**
- ❌ Not testable (can't mock)
- ❌ Scattered logic across components
- ❌ No centralized validation or retry logic
- ❌ Code duplication
- ❌ Hard to enforce consistent error handling
- ❌ Breaks in server context if using browser client

**Verdict:** Rejected due to lack of testability and maintainability issues

---

### Alternative 2: Utility Functions ❌

**Approach:**
```typescript
// src/utils/storage.ts
export async function uploadFile(bucket: string, file: File) {
  const supabase = createBrowserClient();
  return await supabase.storage.from(bucket).upload(...);
}
```

**Pros:**
- Simpler than class-based approach
- Easy to understand
- Centralized logic

**Cons:**
- ❌ Doesn't scale well (many function parameters)
- ❌ Can't share state across operations
- ❌ Hard to mock for testing
- ❌ No way to inject different clients
- ❌ Hardcoded client creation breaks in server context
- ❌ Can't maintain user context

**Verdict:** Rejected due to scalability issues and lack of dependency injection

---

### Alternative 3: Separate Browser/Server Services ❌

**Approach:**
```typescript
// BrowserStorageService.ts
export class BrowserStorageService {
  private client = createBrowserClient();
}

// ServerStorageService.ts  
export class ServerStorageService {
  private client = createServerClient();
}
```

**Pros:**
- Explicit separation of contexts
- No dependency injection needed

**Cons:**
- ❌ Code duplication (maintain two services)
- ❌ More complex API (which service to use?)
- ❌ Harder to test (two codebases)
- ❌ Doesn't work with dynamic contexts
- ❌ Still can't inject mock clients

**Verdict:** Rejected due to code duplication and maintenance burden

---

### Alternative 4: Service Layer with Optional Client Parameter ❌

**Approach:**
```typescript
export class StorageService {
  constructor(client?: SupabaseClient) {
    this.client = client || createBrowserClient();
  }
}
```

**Pros:**
- Backwards compatible
- Can work without explicit client

**Cons:**
- ❌ Breaks in server context (defaults to browser client)
- ❌ Can't access request cookies in API routes
- ❌ Authentication fails in server components
- ❌ False sense of simplicity (hides the problem)

**Verdict:** Rejected as it appears to work but fails in server contexts

---

## Implementation Details

### File Structure
```
src/
├── services/
│   ├── StorageService.ts        (690 lines - main service)
│   └── __tests__/
│       └── StorageService.test.ts (678 lines - 31 unit tests)
├── types/
│   └── storage.ts                (542 lines - type definitions)
└── __tests__/
    └── integration/
        └── storage-flow.test.ts  (645 lines - 14 integration tests)
```

### Usage Examples

#### Client Component
```typescript
'use client';
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { StorageService } from '@/services/StorageService';

export function FileManager() {
  const [service] = useState(() => {
    const supabase = createClient();
    return new StorageService(supabase);
  });
  
  const handleUpload = async (file: File) => {
    const result = await service.upload('user-uploads', file, {
      makePublic: false
    });
    
    if (result.success) {
      console.log('File uploaded:', result.data);
    } else {
      console.error('Upload failed:', result.error);
    }
  };
  
  return <div>...</div>;
}
```

#### Server Component
```typescript
import { createClient } from '@/utils/supabase/server';
import { StorageService } from '@/services/StorageService';

export async function ServerFileList() {
  const supabase = await createClient();
  const service = new StorageService(supabase);
  
  const result = await service.list('user-uploads', {
    limit: 10,
    sortBy: 'created_at',
    sortOrder: 'desc'
  });
  
  if (!result.success) {
    return <div>Error loading files</div>;
  }
  
  return <div>{/* Render files */}</div>;
}
```

#### API Route
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { StorageService } from '@/services/StorageService';

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const service = new StorageService(supabase);
  
  const { fileId } = await request.json();
  const result = await service.delete('user-uploads', fileId);
  
  if (result.success) {
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
}
```

#### Unit Test
```typescript
import { StorageService } from '@/services/StorageService';
import { createMockSupabaseClient } from '@/tests/mocks';

describe('StorageService', () => {
  it('should upload file successfully', async () => {
    const mockClient = createMockSupabaseClient();
    const service = new StorageService(mockClient);
    
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    const result = await service.upload('user-uploads', file);
    
    expect(result.success).toBe(true);
  });
});
```

---

## Metrics & Validation

### Test Coverage
- ✅ 31 unit tests (100% pass rate)
- ✅ 14 integration tests (100% pass rate)
- ✅ 90%+ code coverage of StorageService
- ✅ Zero TypeScript errors

### Performance
- ✅ Upload with retry: < 5s for 10MB files
- ✅ List operations: < 1s for 100 files
- ✅ Delete operations: < 500ms
- ✅ Zero overhead in happy path (no unnecessary abstraction cost)

### Security
- ✅ User-scoped file paths (`{userId}/{timestamp}_{filename}`)
- ✅ Ownership verification on delete/download
- ✅ Server-side authentication from request context
- ✅ No exposure of other users' files

---

## Future Considerations

### Potential Enhancements
1. **Caching Layer**: Add optional caching for frequently accessed files
2. **Background Jobs**: Queue large uploads for background processing
3. **Compression**: Auto-compress images before upload
4. **Thumbnails**: Generate thumbnails for images automatically
5. **Webhooks**: Emit events for storage operations
6. **Batch Operations**: Support bulk uploads/deletes more efficiently

### Migration Path
If we need to migrate to a different storage backend (AWS S3, Google Cloud Storage, etc.):
1. Create new service implementing the same interface
2. Gradually migrate buckets
3. No changes needed in components (dependency injection allows swapping)

---

## References

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Dependency Injection Pattern](https://en.wikipedia.org/wiki/Dependency_injection)
- [Next.js 14 Server/Client Components](https://nextjs.org/docs/app/building-your-application/rendering)
- Strategic Plan: `docs/SUPABASE_STORAGE_STRATEGIC_PLAN.md`
- Implementation: `src/services/StorageService.ts`
- Tests: `src/services/__tests__/StorageService.test.ts`

---

## Changelog

- **2025-11-23**: Initial ADR created documenting the Storage Service Layer architecture decision
- **2025-11-23**: Added test coverage metrics and validation results
- **2025-11-23**: Documented implementation details and usage examples

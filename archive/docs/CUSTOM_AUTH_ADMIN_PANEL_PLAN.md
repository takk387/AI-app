# Custom Auth + Admin Panel for Deployed Apps

## Overview

**Goal:** Allow app owners to view users who signed up for their deployed apps without requiring additional third-party services.

**Approach:** Option C - Custom Auth System with Admin Dashboard

- Include authentication in generated app code
- Users table in each deployed app's database
- Admin panel component for app owners to view signups

---

## Current State Analysis

### Existing Auth Template (`src/prompts/full-app/backend-templates.ts`)

- Uses NextAuth.js with CredentialsProvider
- **Problem:** Uses in-memory array instead of real database
- Has login form but no registration form
- No admin panel for viewing users

### Code Generation Flow

1. `DynamicPhaseGenerator` → recognizes "auth" feature domain
2. `PhaseExecutionManager` → generates code with AI
3. `DeploymentOrchestrator` → deploys with database provisioning
4. `DatabaseMigrationService` → migrates schema to Turso/Neon

---

## Implementation Plan

### Phase 1: Enhanced Auth Template

**File:** `src/prompts/full-app/backend-templates.ts`

Update `AUTH_TEMPLATE` to include:

1. **Database-backed user storage**
   - Replace in-memory array with Drizzle ORM queries
   - Support both Turso (SQLite) and Neon (PostgreSQL)

2. **Registration API route**

   ```typescript
   // app/api/auth/register/route.ts
   - Email validation
   - Password hashing with bcryptjs
   - Duplicate email check
   - Return user (without password)
   ```

3. **Registration form component**

   ```typescript
   // components/RegisterForm.tsx
   - Email, password, confirm password fields
   - Client-side validation
   - Success/error handling
   - Redirect to login on success
   ```

4. **User schema with Drizzle**
   ```typescript
   // lib/db/schema.ts
   export const users = sqliteTable('users', {
     id: text('id').primaryKey(),
     email: text('email').notNull().unique(),
     password: text('password').notNull(),
     name: text('name'),
     createdAt: integer('created_at', { mode: 'timestamp' }),
     lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
   });
   ```

---

### Phase 2: Admin Panel Template

**New template:** Add `ADMIN_PANEL_TEMPLATE` to `backend-templates.ts`

1. **Admin API routes**

   ```typescript
   // app/api/admin/users/route.ts
   - GET: List all users (paginated)
   - Requires owner authentication (special admin flag)

   // app/api/admin/stats/route.ts
   - GET: User statistics (total, new this week, active)
   ```

2. **Admin dashboard component**

   ```typescript
   // components/AdminDashboard.tsx
   - User count stats cards
   - User list table with search/filter
   - Export to CSV functionality
   - User activity timeline
   ```

3. **Admin authentication check**
   ```typescript
   // lib/admin-auth.ts
   - Check if current user has admin privileges
   - Owner email check against environment variable
   ```

---

### Phase 3: Types & Configuration

**File:** `src/types/appConcept.ts`

Add to `TechnicalRequirements`:

```typescript
interface TechnicalRequirements {
  // existing...
  needsAuth: boolean;
  needsAdminPanel?: boolean; // NEW: Auto-true if needsAuth
}
```

**File:** `src/services/DynamicPhaseGenerator.ts`

Update to auto-detect admin panel need:

- If `needsAuth: true`, also set `needsAdminPanel: true`
- Add "admin" domain features to phase plan

---

### Phase 4: Schema Generation Updates

**File:** `src/services/deployment/DatabaseMigrationService.ts`

Add users table to auto-injected schemas when auth is detected:

```typescript
const AUTH_USERS_SCHEMA: TableSchema = {
  name: 'users',
  columns: [
    { name: 'id', type: 'TEXT', nullable: false },
    { name: 'email', type: 'TEXT', nullable: false },
    { name: 'password', type: 'TEXT', nullable: false },
    { name: 'name', type: 'TEXT', nullable: true },
    { name: 'created_at', type: 'INTEGER', nullable: true },
    { name: 'last_login_at', type: 'INTEGER', nullable: true },
  ],
  primaryKey: ['id'],
  indexes: [{ name: 'idx_users_email', columns: ['email'], unique: true }],
};
```

---

### Phase 5: Deployment Modal Integration

**File:** `src/components/deployment/WebDeployPanel.tsx`

Add "Auth & Admin" configuration section:

- Toggle: Enable user authentication
- Input: Admin email (app owner's email)
- Checkbox: Include admin dashboard
- Info: "View signups at yourapp.com/admin"

---

## Files to Create/Modify

### New Files (as templates in backend-templates.ts)

| Template                         | Purpose                         |
| -------------------------------- | ------------------------------- |
| `RegisterForm.tsx`               | User registration component     |
| `AdminDashboard.tsx`             | Admin panel for viewing users   |
| `app/api/auth/register/route.ts` | Registration endpoint           |
| `app/api/admin/users/route.ts`   | List users endpoint             |
| `app/api/admin/stats/route.ts`   | User statistics endpoint        |
| `lib/db/schema.ts`               | Drizzle schema with users table |
| `lib/admin-auth.ts`              | Admin authentication helper     |

### Modified Files

| File                                                  | Change                                            |
| ----------------------------------------------------- | ------------------------------------------------- |
| `src/prompts/full-app/backend-templates.ts`           | Enhanced AUTH_TEMPLATE + new ADMIN_PANEL_TEMPLATE |
| `src/types/appConcept.ts`                             | Add `needsAdminPanel` to TechnicalRequirements    |
| `src/services/DynamicPhaseGenerator.ts`               | Auto-detect admin panel from auth                 |
| `src/services/deployment/DatabaseMigrationService.ts` | Auto-inject users table schema                    |
| `src/components/deployment/WebDeployPanel.tsx`        | Add auth configuration UI                         |

---

## Template Code Specifications

### 1. Enhanced NextAuth Configuration (for database)

```typescript
// app/api/auth/[...nextauth]/route.ts
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Replace in-memory lookup with:
async authorize(credentials) {
  const user = await db.select()
    .from(users)
    .where(eq(users.email, credentials.email))
    .limit(1);

  if (!user[0]) return null;

  const isValid = await bcrypt.compare(credentials.password, user[0].password);
  if (!isValid) return null;

  // Update last login
  await db.update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user[0].id));

  return { id: user[0].id, email: user[0].email, name: user[0].name };
}
```

### 2. Registration API

```typescript
// app/api/auth/register/route.ts
export async function POST(request: NextRequest) {
  const { email, password, name } = await request.json();

  // Check existing
  const existing = await db.select().from(users).where(eq(users.email, email));
  if (existing.length > 0) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
  }

  // Create user
  const hashedPassword = await bcrypt.hash(password, 10);
  const id = crypto.randomUUID();

  await db.insert(users).values({
    id,
    email,
    password: hashedPassword,
    name: name || null,
    createdAt: new Date(),
  });

  return NextResponse.json({ id, email, name });
}
```

### 3. Admin Users API

```typescript
// app/api/admin/users/route.ts
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  await requireAdmin(); // Throws if not admin

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 20;

  const allUsers = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  const total = await db.select({ count: count() }).from(users);

  return NextResponse.json({
    users: allUsers,
    total: total[0].count,
    page,
    totalPages: Math.ceil(total[0].count / limit),
  });
}
```

### 4. Admin Auth Helper

```typescript
// lib/admin-auth.ts
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export async function requireAdmin() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect('/login');
  }

  if (session.user.email !== ADMIN_EMAIL) {
    throw new Error('Unauthorized: Admin access required');
  }

  return session;
}

export async function isAdmin(): Promise<boolean> {
  const session = await getServerSession();
  return session?.user?.email === ADMIN_EMAIL;
}
```

---

## User Experience Flow

### For App Owners (Your Users)

1. Create app with auth features in AI Builder
2. Deploy app via one-click deployment
3. Deployment modal shows "Auth & Admin" section
4. Enter their email as admin email
5. App deploys with:
   - `/login` and `/register` pages
   - `/admin` dashboard (protected by admin email)
6. View signups at `their-app.com/admin`

### For End Users (Their App's Users)

1. Visit deployed app
2. Register at `/register`
3. Login at `/login`
4. Use the app normally

---

## Environment Variables for Deployed Apps

```env
# Auto-set by deployment system
DATABASE_URL=libsql://xxx.turso.io  # or postgres://
NEXTAUTH_SECRET=auto-generated
NEXTAUTH_URL=https://their-app.pages.dev
ADMIN_EMAIL=owner@example.com  # Set from deployment modal
```

---

## Verification Steps

### After Implementation

1. `npm run typecheck` - Must pass
2. `npm run lint` - Must pass
3. `npm run build` - Must succeed

### Manual Testing

1. Create a new app with "needs authentication" feature
2. Generate code, verify:
   - Login/Register forms exist
   - Users table in schema
   - Admin dashboard component
   - Admin API routes
3. Deploy app
4. Test registration flow on deployed app
5. Login as admin email, access `/admin`
6. Verify user list displays correctly

---

## Estimated Scope

| Component                       | Effort |
| ------------------------------- | ------ |
| Enhanced AUTH_TEMPLATE          | Medium |
| New ADMIN_PANEL_TEMPLATE        | Medium |
| Type updates                    | Small  |
| DynamicPhaseGenerator update    | Small  |
| DatabaseMigrationService update | Small  |
| WebDeployPanel UI               | Small  |
| Testing                         | Medium |

**Total:** ~4-6 hours of implementation work

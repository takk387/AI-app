# 🚀 Full-Stack Support Guide

## Overview

Your AI App Builder now supports **both frontend-only and full-stack applications**! The system intelligently detects what type of app you need based on your request.

---

## 📋 App Types

### 🎨 FRONTEND-ONLY Apps
**Best for:** UI components, calculators, games, dashboards, static sites

**Characteristics:**
- ✅ Runs instantly in live preview sandbox
- ✅ No backend setup required
- ✅ Uses localStorage for persistence
- ✅ Mock data and client-side logic
- ✅ Perfect for prototyping

**Examples:**
- "Build a todo app"
- "Create a calculator"
- "Make a weather dashboard" (with mock data)
- "Build a tic-tac-toe game"

**File Structure:**
```
src/
  App.tsx          # Plain JSX, runs in browser
```

---

### ⚡ FULL-STACK Apps
**Best for:** Real apps with databases, authentication, APIs, file uploads

**Characteristics:**
- 🔧 Requires local development server
- 🗄️ Database integration (Prisma + PostgreSQL/MongoDB)
- 🔐 Authentication (NextAuth.js)
- 🔌 API routes
- 📁 File uploads
- 💾 Real data persistence

**Examples:**
- "Build a blog with database"
- "Create an e-commerce site with user auth"
- "Make a task manager with real-time updates"
- "Build a CRM with customer database"

**File Structure:**
```
app/
  page.tsx                 # Main page
  layout.tsx               # Root layout
  api/
    posts/route.ts         # API endpoint
    auth/[...nextauth]/    # Auth endpoints
prisma/
  schema.prisma            # Database schema
lib/
  db.ts                    # Database client
  auth.ts                  # Auth utilities
middleware.ts              # Route protection
.env.example               # Environment template
```

---

## 🎯 When to Use Each Type

| Feature | Frontend-Only | Full-Stack |
|---------|--------------|------------|
| **Live Preview** | ✅ Yes | ❌ No (download required) |
| **Database** | ❌ localStorage only | ✅ PostgreSQL/MongoDB |
| **Authentication** | ❌ Mock only | ✅ Real OAuth/JWT |
| **API Routes** | ❌ No | ✅ Yes |
| **File Uploads** | ❌ No | ✅ Yes (local/cloud) |
| **Setup Time** | ⚡ Instant | 🔧 5-10 minutes |
| **Deployment** | 🚀 Easy (Vercel/Netlify) | 🚀 Requires database |

---

## 💡 Full-Stack Capabilities

### 1. **Database Integration (Prisma ORM)**

**Supported Databases:**
- PostgreSQL (recommended for production)
- MySQL
- MongoDB
- SQLite (for development)

**Example Schema:**
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  posts     Post[]
  createdAt DateTime @default(now())
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
}
```

**Usage:**
```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

// In API route
const posts = await prisma.post.findMany({
  where: { published: true },
  include: { author: true }
});
```

---

### 2. **Authentication (NextAuth.js)**

**Providers Supported:**
- Google OAuth
- GitHub OAuth
- Email/Password (Credentials)
- Magic Links

**Example Setup:**
```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  callbacks: {
    async session({ session, token }) {
      session.user.id = token.sub!;
      return session;
    }
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

**Protected Routes:**
```typescript
// middleware.ts
import { withAuth } from 'next-auth/middleware';

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token
  }
});

export const config = {
  matcher: ['/dashboard/:path*', '/api/posts/:path*']
};
```

---

### 3. **API Routes (REST)**

**Example CRUD API:**
```typescript
// app/api/posts/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/posts
export async function GET() {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json(posts);
}

// POST /api/posts
export async function POST(request: Request) {
  const { title, content } = await request.json();
  
  const post = await prisma.post.create({
    data: { title, content, published: false }
  });
  
  return NextResponse.json(post, { status: 201 });
}
```

**Dynamic Routes:**
```typescript
// app/api/posts/[id]/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const post = await prisma.post.findUnique({
    where: { id: params.id }
  });
  
  if (!post) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  
  return NextResponse.json(post);
}
```

---

### 4. **File Uploads**

**Local Storage:**
```typescript
// app/api/upload/route.ts
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  
  const path = join(process.cwd(), 'public/uploads', file.name);
  await writeFile(path, buffer);
  
  return NextResponse.json({ url: `/uploads/${file.name}` });
}
```

**Cloud Storage (Cloudinary):**
```typescript
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const dataURI = `data:${file.type};base64,${base64}`;
  
  const result = await cloudinary.uploader.upload(dataURI);
  
  return NextResponse.json({ url: result.secure_url });
}
```

---

### 5. **Real-time Features (Pusher)**

**Setup:**
```typescript
// lib/pusher.ts
import Pusher from 'pusher';
import PusherClient from 'pusher-js';

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!
});

export const pusherClient = new PusherClient(
  process.env.NEXT_PUBLIC_PUSHER_KEY!,
  { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER! }
);
```

**Trigger Events:**
```typescript
// app/api/messages/route.ts
import { pusherServer } from '@/lib/pusher';

export async function POST(request: Request) {
  const { message } = await request.json();
  
  await pusherServer.trigger('chat', 'new-message', {
    message,
    timestamp: new Date()
  });
  
  return NextResponse.json({ success: true });
}
```

**Subscribe to Events:**
```typescript
// app/chat/page.tsx
'use client';
import { pusherClient } from '@/lib/pusher';

export default function Chat() {
  useEffect(() => {
    const channel = pusherClient.subscribe('chat');
    
    channel.bind('new-message', (data) => {
      console.log('New message:', data);
    });
    
    return () => {
      pusherClient.unsubscribe('chat');
    };
  }, []);
}
```

---

### 6. **Email (Resend)**

**Send Transactional Emails:**
```typescript
// lib/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail(email: string, name: string) {
  await resend.emails.send({
    from: 'welcome@yourapp.com',
    to: email,
    subject: 'Welcome to Our App!',
    html: `<h1>Hi ${name}!</h1><p>Thanks for signing up.</p>`
  });
}
```

---

## 🛠️ Setup Instructions

### Step 1: Request a Full-Stack App

**Example prompts:**
- "Build a blog platform with PostgreSQL database and user authentication"
- "Create an e-commerce site with product database and checkout"
- "Make a SaaS dashboard with user management and API"

### Step 2: Download the Code

Click the **📥 Download** button in the preview to get all files.

### Step 3: Extract and Install

```bash
# Extract files to project folder
cd my-fullstack-app

# Install dependencies
npm install

# Install Prisma CLI globally (optional)
npm install -g prisma
```

### Step 4: Configure Environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"

# Auth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# OAuth (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# File Upload (optional)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Real-time (optional)
PUSHER_APP_ID="your-app-id"
PUSHER_KEY="your-key"
PUSHER_SECRET="your-secret"
PUSHER_CLUSTER="your-cluster"
```

### Step 5: Setup Database

```bash
# Run migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# (Optional) Seed database
npx prisma db seed
```

### Step 6: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🎨 Example Requests

### Frontend-Only Examples

```
✅ "Build a todo app with priorities and local storage"
✅ "Create a calculator with scientific functions"
✅ "Make a tic-tac-toe game with score tracking"
✅ "Build a kanban board with drag and drop"
✅ "Create a weather dashboard with charts"
```

### Full-Stack Examples

```
⚡ "Build a blog platform with PostgreSQL and user authentication"
⚡ "Create an e-commerce site with product database and Stripe checkout"
⚡ "Make a SaaS dashboard with subscription management"
⚡ "Build a CRM with customer database and email integration"
⚡ "Create a social media app with posts, likes, and real-time updates"
⚡ "Build a file sharing service with upload and download"
⚡ "Make a project management tool with teams and tasks"
```

---

## 🚀 Deployment

### Frontend-Only Apps

**Vercel:**
```bash
npm install -g vercel
vercel
```

**Netlify:**
```bash
npm install -g netlify-cli
netlify deploy --prod
```

### Full-Stack Apps

**Vercel with Database:**
1. Push code to GitHub
2. Import to Vercel
3. Add environment variables
4. Connect to Vercel Postgres/Supabase
5. Deploy!

**Railway:**
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

---

## 📊 Comparison: Before vs After

| Feature | Before | After |
|---------|--------|-------|
| **App Types** | Frontend only | Frontend + Full-stack |
| **Database** | ❌ | ✅ Prisma + PostgreSQL/MongoDB |
| **Authentication** | ❌ | ✅ NextAuth.js |
| **API Routes** | ❌ | ✅ REST + tRPC ready |
| **File Uploads** | ❌ | ✅ Local + Cloud (S3, Cloudinary) |
| **Real-time** | ❌ | ✅ Pusher/Socket.io |
| **Email** | ❌ | ✅ Resend/Nodemailer |
| **Capabilities** | Prototypes | Production apps |

---

## 💡 Tips & Best Practices

### 1. **Start Simple, Add Complexity**
```
Bad:  "Build a full e-commerce platform with everything"
Good: "Build an e-commerce site with product catalog and cart"
      Then: "Add user authentication"
      Then: "Add Stripe checkout"
```

### 2. **Be Specific About Backend Needs**
```
Bad:  "Create a blog"
Good: "Create a blog with PostgreSQL database and user authentication"
```

### 3. **Mention Database Type**
```
"Build a CRM with MongoDB database"
"Create a blog with PostgreSQL"
"Make a notes app with SQLite for local development"
```

### 4. **Request Specific Features**
```
"Build a social app with:
- User authentication (Google OAuth)
- Post creation and editing
- Like/comment system
- Real-time notifications
- Image uploads to Cloudinary"
```

---

## 🔍 Troubleshooting

### "Module not found" errors
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Prisma errors
```bash
# Reset database
npx prisma migrate reset

# Regenerate client
npx prisma generate
```

### Environment variable issues
```bash
# Check .env.local exists and has correct values
cat .env.local

# Restart dev server
npm run dev
```

---

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

**Your AI App Builder now creates production-ready full-stack applications! 🎉**

*Last Updated: October 20, 2025*

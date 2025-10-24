# 🚀 Full-Stack Quick Reference

## App Types at a Glance

### 🎨 Frontend-Only
**Use when:** Building UI prototypes, games, calculators, dashboards
**Preview:** ✅ Instant live preview
**Setup:** ⚡ None needed
**Example:** "Build a todo app"

### ⚡ Full-Stack  
**Use when:** Need database, auth, APIs, file uploads
**Preview:** 🔧 Download required
**Setup:** 5-10 minutes
**Example:** "Build a blog with PostgreSQL database"

---

## Quick Examples

### Frontend
```
"Build a calculator"
"Create a todo app with local storage"
"Make a tic-tac-toe game"
"Build a kanban board"
```

### Full-Stack
```
"Build a blog with PostgreSQL and auth"
"Create an e-commerce site with Stripe"
"Make a SaaS dashboard with subscriptions"
"Build a CRM with customer database"
```

---

## Backend Features Available

| Feature | Tech | Use Case |
|---------|------|----------|
| 🗄️ **Database** | Prisma + PostgreSQL | Data persistence |
| 🔐 **Auth** | NextAuth.js | User login (OAuth, JWT) |
| 🔌 **APIs** | Next.js Routes | REST endpoints |
| 📁 **Uploads** | Cloudinary/S3 | File management |
| ⚡ **Real-time** | Pusher | Live updates |
| ✉️ **Email** | Resend | Notifications |

---

## Setup Steps (Full-Stack)

1. **Download** code from preview
2. **Extract** to project folder
3. **Install** dependencies: `npm install`
4. **Configure** .env: `cp .env.example .env.local`
5. **Setup DB**: `npx prisma migrate dev`
6. **Run**: `npm run dev`

---

## File Structure

### Frontend-Only
```
src/
  App.tsx  # Everything here
```

### Full-Stack
```
app/
  page.tsx           # Main page
  api/*/route.ts     # API endpoints
prisma/
  schema.prisma      # Database
lib/
  db.ts              # DB client
.env.example         # Config
```

---

## Visual Indicators

### In Preview:
- **⚡ Full-Stack** badge → Needs local setup
- **🔌** icon → API route file
- **🗄️** icon → Database schema
- **🔐** icon → Environment config

---

## Deployment

### Frontend
```bash
vercel              # 1-click deploy
netlify deploy      # Alternative
```

### Full-Stack
```bash
# Vercel (recommended)
1. Push to GitHub
2. Import to Vercel
3. Add .env variables
4. Connect database
5. Deploy!
```

---

## Pro Tips

✅ **Be specific:** "with PostgreSQL" not just "with database"
✅ **Start simple:** Add features incrementally
✅ **Mention auth type:** "Google OAuth" or "email/password"
✅ **List requirements:** "with real-time updates and file uploads"

---

## Need Help?

📖 Read: `FULL_STACK_GUIDE.md` - Complete guide
📋 Check: `FULL_STACK_IMPLEMENTATION.md` - Technical details
💬 Ask: Use Q&A feature in chat!

---

**Your AI App Builder creates production-ready full-stack apps!** 🎉

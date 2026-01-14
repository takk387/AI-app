# Deployment System Setup Guide

This guide covers the third-party services required to enable one-click deployment for your users.

---

## Quick Start Checklist

| Service         | Required | Purpose                            | Free Tier       |
| --------------- | -------- | ---------------------------------- | --------------- |
| Cloudflare      | **Yes**  | Web hosting, domains, SSL, storage | Yes (unlimited) |
| Turso           | **Yes**  | SQLite edge databases              | Yes (500 DBs)   |
| Stripe          | **Yes**  | Billing & subscriptions            | Pay-as-you-go   |
| Neon            | Optional | PostgreSQL (alternative to Turso)  | Yes             |
| OpenAI          | Optional | AI features for deployed apps      | Pay-as-you-go   |
| Anthropic       | Optional | Claude for deployed apps           | Pay-as-you-go   |
| SendGrid/Resend | Optional | Email for deployed apps            | Free tier       |
| Twilio          | Optional | SMS for deployed apps              | Pay-as-you-go   |

---

## 1. Cloudflare (Required)

**Purpose:** Hosts deployed applications on Cloudflare Pages with automatic SSL, CDN, and custom domains.

### Setup Steps

1. Create account at [cloudflare.com](https://cloudflare.com)
2. Go to **My Profile** → **API Tokens** → **Create Token**
3. Create a custom token with these permissions:
   - `Account:Cloudflare Pages:Edit`
   - `Account:Account Settings:Read`
   - `Zone:DNS:Edit` (for custom domains)
   - `Zone:Zone:Read`

### Environment Variables

```env
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
```

### Where to Find Account ID

1. Log into Cloudflare Dashboard
2. Select any domain or go to **Workers & Pages**
3. Account ID is in the right sidebar

### Features Enabled

- ✅ Static site hosting (Cloudflare Pages)
- ✅ Automatic SSL certificates
- ✅ Global CDN distribution
- ✅ Custom domain configuration
- ✅ R2 storage for file uploads
- ✅ Domain registration/purchase

---

## 2. Turso (Required for Databases)

**Purpose:** Provisions SQLite databases at the edge for each deployed app.

### Setup Steps

1. Create account at [turso.tech](https://turso.tech)
2. Create an organization (or use personal)
3. Go to **Settings** → **API Tokens** → **Create Token**

### Environment Variables

```env
TURSO_ORG_ID=your_organization_slug
TURSO_API_TOKEN=your_api_token
```

### Where to Find Org ID

1. Go to [turso.tech/app](https://turso.tech/app)
2. Organization slug is in the URL: `turso.tech/app/{org-slug}/databases`

### Free Tier Limits

- 500 databases
- 9 GB total storage
- 1 billion row reads/month
- Unlimited locations

---

## 3. Stripe (Required for Billing)

**Purpose:** Handles subscription management, usage-based billing, and payment processing.

### Setup Steps

1. Create account at [stripe.com](https://stripe.com)
2. Complete business verification
3. Go to **Developers** → **API Keys**
4. Set up webhook endpoint

### Environment Variables

```env
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Webhook Setup

1. Go to **Developers** → **Webhooks** → **Add Endpoint**
2. URL: `https://your-domain.com/api/webhooks/stripe`
3. Events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`

### Products to Create

Create these products in Stripe Dashboard:

| Product  | Price  | Features                                            |
| -------- | ------ | --------------------------------------------------- |
| Free     | $0/mo  | 1 project, 1GB storage                              |
| Pro      | $19/mo | 10 projects, 10GB storage, custom domains           |
| Business | $49/mo | Unlimited projects, 100GB storage, priority support |

---

## 4. Neon (Optional - PostgreSQL Alternative)

**Purpose:** PostgreSQL databases for apps that need relational features beyond SQLite.

### Setup Steps

1. Create account at [neon.tech](https://neon.tech)
2. Go to **Account Settings** → **API Keys** → **Create API Key**

### Environment Variables

```env
NEON_API_KEY=your_api_key
```

### When to Use Neon vs Turso

| Use Turso (SQLite)        | Use Neon (PostgreSQL)  |
| ------------------------- | ---------------------- |
| Simple data models        | Complex joins/queries  |
| Edge performance critical | Full SQL compatibility |
| Lower latency reads       | Advanced data types    |
| Most web apps             | Enterprise features    |

---

## 5. OpenAI (Optional - Managed AI)

**Purpose:** Proxy OpenAI API calls for deployed apps so users don't need their own keys.

### Setup Steps

1. Create account at [platform.openai.com](https://platform.openai.com)
2. Go to **API Keys** → **Create new secret key**
3. Set usage limits to control costs

### Environment Variables

```env
OPENAI_API_KEY=sk-xxx
OPENAI_ORG_ID=org-xxx  # Optional
```

### How It Works

1. User's deployed app calls your proxy endpoint
2. Proxy authenticates user, checks quota
3. Forwards request to OpenAI with your API key
4. Tracks usage, bills user via Stripe

---

## 6. Anthropic (Optional - Managed AI)

**Purpose:** Proxy Claude API calls for deployed apps.

### Setup Steps

1. Create account at [console.anthropic.com](https://console.anthropic.com)
2. Go to **API Keys** → **Create Key**

### Environment Variables

```env
ANTHROPIC_API_KEY=sk-ant-xxx
```

---

## 7. SendGrid or Resend (Optional - Email)

**Purpose:** Send transactional emails from deployed apps.

### SendGrid Setup

1. Create account at [sendgrid.com](https://sendgrid.com)
2. Go to **Settings** → **API Keys** → **Create API Key**
3. Verify sender identity

```env
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

### Resend Setup (Alternative)

1. Create account at [resend.com](https://resend.com)
2. Go to **API Keys** → **Create API Key**
3. Verify domain

```env
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

---

## 8. Twilio (Optional - SMS)

**Purpose:** Send SMS messages from deployed apps.

### Setup Steps

1. Create account at [twilio.com](https://twilio.com)
2. Get a phone number
3. Find credentials in Console Dashboard

### Environment Variables

```env
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1234567890
```

---

## Complete .env.local Template

```env
# ===========================================
# REQUIRED: Core Deployment Services
# ===========================================

# Cloudflare (Hosting + Domains)
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=

# Turso (SQLite Databases)
TURSO_ORG_ID=
TURSO_API_TOKEN=

# Stripe (Billing)
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# ===========================================
# OPTIONAL: Alternative Database
# ===========================================

# Neon (PostgreSQL - alternative to Turso)
NEON_API_KEY=

# ===========================================
# OPTIONAL: Managed API Services
# ===========================================

# OpenAI (AI proxy for deployed apps)
OPENAI_API_KEY=

# Anthropic (Claude proxy for deployed apps)
ANTHROPIC_API_KEY=

# SendGrid (Email)
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=

# OR Resend (Email alternative)
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# Twilio (SMS)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

---

## Database Migrations

After setting up services, run the Supabase migrations in order:

```bash
# In Supabase SQL Editor, run these in order:
1. supabase/migrations/20260107000000_deployed_apps.sql
2. supabase/migrations/20260107000001_user_subscriptions.sql
3. supabase/migrations/20260107000002_api_usage.sql
4. supabase/migrations/20260107000003_deployment_usage.sql
5. supabase/migrations/20260107000004_user_domains.sql
```

**Important:** Run in order - later migrations reference tables from earlier ones.

---

## Testing Your Setup

### 1. Verify Cloudflare Connection

```bash
curl -X GET "https://api.cloudflare.com/client/v4/accounts/{account_id}/pages/projects" \
  -H "Authorization: Bearer {api_token}"
```

### 2. Verify Turso Connection

```bash
curl -X GET "https://api.turso.tech/v1/organizations/{org}/databases" \
  -H "Authorization: Bearer {api_token}"
```

### 3. Test Deployment Flow

1. Navigate to `/app/dashboard`
2. Create or select a project
3. Click **Deploy**
4. Select Web deployment
5. Configure database (Turso)
6. Click Deploy

---

## Cost Estimation

| Service    | Free Tier       | Typical Cost (100 users) |
| ---------- | --------------- | ------------------------ |
| Cloudflare | Unlimited sites | $0 (Pages is free)       |
| Turso      | 500 DBs, 9GB    | $0-29/mo                 |
| Stripe     | 2.9% + 30¢/txn  | ~$15/mo in fees          |
| OpenAI     | Pay-per-use     | $50-200/mo               |
| SendGrid   | 100 emails/day  | $0-20/mo                 |
| Twilio     | Pay-per-SMS     | $10-50/mo                |

**Estimated monthly cost for 100 active users:** $75-300/mo

---

## Troubleshooting

### "Cloudflare configuration missing"

- Verify `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` are set
- Check token has correct permissions

### "Turso configuration missing"

- Verify `TURSO_ORG_ID` matches your organization slug
- Regenerate API token if expired

### "deployed_apps does not exist"

- Run migrations in order (see Database Migrations section)
- Ensure `project_documentation` table exists first

### Stripe webhooks not working

- Verify webhook URL is publicly accessible
- Check `STRIPE_WEBHOOK_SECRET` matches the endpoint secret
- View webhook logs in Stripe Dashboard

---

## Security Considerations

1. **Never expose API keys to frontend** - All third-party calls go through your API routes
2. **Use environment variables** - Never commit secrets to git
3. **Set up Stripe webhook signature verification** - Prevents fake webhook calls
4. **Rate limit proxy endpoints** - Prevent abuse of managed APIs
5. **Monitor usage** - Set up alerts for unusual activity

---

## Next Steps

1. ✅ Set up required services (Cloudflare, Turso, Stripe)
2. ✅ Add environment variables to `.env.local`
3. ✅ Run database migrations
4. ✅ Test deployment flow locally
5. ⬜ Configure production environment variables
6. ⬜ Set up Stripe products and pricing
7. ⬜ Deploy to production

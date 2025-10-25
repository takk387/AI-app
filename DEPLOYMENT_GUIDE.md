# 🚀 Deployment Guide - AI App Builder

## Quick Deploy to Vercel (Recommended - 5-10 minutes)

Vercel is made by the creators of Next.js and provides the easiest deployment experience.

### Step 1: Sign Up for Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click **"Sign Up"**
3. Choose **"Continue with GitHub"** (easiest option)
4. Authorize Vercel to access your GitHub account

### Step 2: Import Your Project
1. Once logged in, click **"Add New..."** → **"Project"**
2. You'll see your GitHub repositories
3. Find **"AI-app"** and click **"Import"**

### Step 3: Configure Your Project
1. **Project Name**: Leave as is or change it
2. **Framework Preset**: Should auto-detect as "Next.js"
3. **Root Directory**: Leave as `./` (default)
4. **Build Command**: Leave as `npm run build` (default)
5. **Output Directory**: Leave as `.next` (default)

### Step 4: Add Environment Variable
🔴 **CRITICAL - Your app won't work without this!**

1. Click **"Environment Variables"** section
2. Add:
   - **Name**: `ANTHROPIC_API_KEY`
   - **Value**: `YOUR_ANTHROPIC_API_KEY_HERE`
   - Make sure it's checked for **Production**, **Preview**, and **Development**

3. Click **"Add"**

### Step 5: Deploy!
1. Click **"Deploy"**
2. Wait 2-3 minutes for the build to complete
3. 🎉 Your app is live!

### Step 6: Get Your Live URL
Once deployed, Vercel gives you:
- **Production URL**: `https://your-app-name.vercel.app`
- Can add custom domain later (optional)

---

## Alternative: Deploy to Netlify

### Prerequisites
1. Sign up at [netlify.com](https://netlify.com)
2. Connect your GitHub account

### Steps
1. Click **"Add new site"** → **"Import an existing project"**
2. Choose **GitHub** and select your **AI-app** repository
3. Configure:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
4. Add Environment Variable:
   - `ANTHROPIC_API_KEY` = your API key
5. Click **"Deploy site"**

---

## Alternative: Deploy to Railway

### Steps
1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. Click **"New Project"** → **"Deploy from GitHub repo"**
4. Select **AI-app**
5. Add Environment Variable:
   - `ANTHROPIC_API_KEY` = your API key
6. Railway auto-detects Next.js and deploys

---

## Post-Deployment Checklist

✅ **Test Your Live App:**
1. Visit your deployed URL
2. Try generating a simple app
3. Test image upload feature
4. Try exporting an app

✅ **Monitor Usage:**
- Check your Anthropic API usage at [console.anthropic.com](https://console.anthropic.com)
- Each app generation uses ~5,000-8,000 tokens

✅ **Set Up Custom Domain (Optional):**
- Vercel: Settings → Domains → Add your domain
- Follow DNS instructions from your domain registrar

---

## Troubleshooting

### "API key not configured" Error
**Solution**: Add `ANTHROPIC_API_KEY` environment variable in your hosting platform settings

### Build Fails
**Solution**: Check build logs. Common issues:
- Missing dependencies → Run `npm install` locally first
- TypeScript errors → Fix in VS Code before deploying

### App Works Locally But Not Live
**Solution**: 
1. Check environment variables are set
2. Check build logs for errors
3. Make sure `.env.local` is NOT committed to GitHub (it shouldn't be)

### Slow Performance
**Solution**:
- Use Vercel's Edge Network (automatic)
- Consider caching strategies for repeated requests
- Monitor API usage and implement rate limiting if needed

---

## Cost Considerations

### Hosting (FREE Tier Available)
- **Vercel Free**: 
  - 100GB bandwidth/month
  - Unlimited deployments
  - Serverless functions
  - Perfect for personal projects
  
- **Netlify Free**:
  - 100GB bandwidth/month
  - 300 build minutes/month

### Anthropic API Costs
- **Claude Sonnet 3.5**: ~$3 per million input tokens
- **Average app generation**: ~5,000-8,000 tokens
- **Cost per generation**: ~$0.015-0.024 (about 2 cents)
- **$5 credit**: ~200-300 app generations

💡 **Tip**: Set up billing alerts in Anthropic Console to monitor usage

---

## Next Steps After Deployment

1. **Share Your App**: Send the URL to friends/colleagues
2. **Add Authentication** (optional): Use NextAuth.js or Clerk
3. **Add Analytics** (optional): Vercel Analytics, Google Analytics
4. **Custom Domain**: Point your domain to Vercel
5. **Add More Features**: Rate limiting, user accounts, saved apps

---

## Quick Reference

**Your GitHub Repo**: https://github.com/takk387/AI-app

**Vercel Dashboard**: https://vercel.com/dashboard

**Anthropic Console**: https://console.anthropic.com

**Need Help?**
- Vercel Docs: https://vercel.com/docs
- Next.js Docs: https://nextjs.org/docs
- Anthropic API Docs: https://docs.anthropic.com

---

🎉 **Congratulations!** Your AI App Builder is now live and accessible to anyone on the internet!

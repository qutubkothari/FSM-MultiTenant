# 🚀 Deploy FSM Admin Dashboard to Render

## Why Render?
- ✅ **FREE** static site hosting
- ✅ **No credit card** required
- ✅ **Auto-deploy** from GitHub
- ✅ **SSL certificate** included
- ✅ **No complex setup** like Google Cloud

---

## 📋 Step-by-Step Deployment

### Step 1: Push Code to GitHub

```powershell
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial FSM app setup"

# Create repo on GitHub (go to github.com/new)
# Name: FSM (or fsm-mobile-app)
# Make it PRIVATE if you want

# Add remote (replace YOUR-USERNAME)
git remote add origin https://github.com/YOUR-USERNAME/FSM.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 2: Deploy on Render

1. **Go to Render:** https://render.com
2. **Sign up/Login** (use GitHub account - it's easier)
3. **Click "New +"** → **"Static Site"**
4. **Connect GitHub repository:**
   - Click "Connect GitHub"
   - Select your FSM repository
   - Click "Connect"

5. **Configure the deployment:**
   ```
   Name: fsm-admin-dashboard
   Branch: main
   Build Command: (leave empty)
   Publish Directory: admin
   ```

6. **Click "Create Static Site"**

7. **Wait 1-2 minutes** for deployment

8. **Done!** Your dashboard will be live at:
   ```
   https://fsm-admin-dashboard.onrender.com
   ```

---

## 🎯 Quick Deploy (If GitHub Already Set Up)

If you already have the code on GitHub:

1. Go to https://render.com/dashboard
2. Click "New +" → "Static Site"
3. Select your FSM repository
4. Set **Publish Directory** to: `admin`
5. Click "Create Static Site"

**That's it!** Auto-deploys on every git push.

---

## 🔄 Auto-Deploy on Code Changes

After initial setup, any changes you push to GitHub will **automatically deploy**:

```powershell
# Make changes to admin/index.html
# Then:
git add .
git commit -m "Updated dashboard"
git push

# Render automatically detects and deploys! 🎉
```

---

## 🔧 Alternative: Manual Deploy (No GitHub)

If you don't want to use GitHub:

### Option A: Netlify Drop

1. Go to: https://app.netlify.com/drop
2. Drag & drop the `admin` folder
3. Done! Instant deployment

### Option B: Vercel

```powershell
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy the admin folder
cd admin
vercel --prod

# You'll get a URL instantly!
```

### Option C: GitHub Pages (Free)

```powershell
# Install gh-pages
npm install --save-dev gh-pages

# Add to package.json scripts:
# "deploy:admin": "gh-pages -d admin"

# Then deploy:
npm run deploy:admin
```

---

## 📱 What About the Mobile App?

The mobile app (React Native) **cannot** be deployed to Render/Vercel/Netlify.

**For Mobile App:**

1. **Test Locally:**
   ```powershell
   npm start
   ```

2. **Build Android APK:**
   ```powershell
   .\build-apk.bat
   ```

3. **Distribute APK:**
   - Download from Expo dashboard
   - Share via WhatsApp/Email/Google Drive
   - Or publish to Google Play Store

---

## 🎁 What You're Deploying

**Deployed to Render:**
- ✅ Admin Dashboard (admin/index.html)
- ✅ Visit management interface
- ✅ Excel export functionality
- ✅ Real-time Supabase connection

**Not Deployed (Local Only):**
- ❌ Mobile app source code
- ❌ React Native components
- ❌ Build scripts

---

## 🔒 Environment Variables (If Needed)

If you want to hide Supabase credentials:

1. In Render dashboard → Your site → "Environment"
2. Add variables:
   ```
   SUPABASE_URL = https://ktvrffbccgxtaststlhw.supabase.co
   SUPABASE_ANON_KEY = eyJhbGc...your-key
   ```

3. Update admin/index.html to use:
   ```javascript
   const SUPABASE_URL = window.ENV?.SUPABASE_URL || 'your-fallback';
   ```

But for a static site, credentials in code are **normal** (they're public API keys).

---

## ✅ Recommended: Render (Easiest)

**Why Render?**
- Free forever for static sites
- Auto-deploys from GitHub
- Custom domains supported
- SSL certificate included
- No configuration needed

**Setup Time:** 5 minutes
**Cost:** $0

---

## 🚀 Ready to Deploy?

**Quickest Method (Netlify Drop):**
1. Go to: https://app.netlify.com/drop
2. Drag the `admin` folder
3. Done!

**Best Method (Render + GitHub):**
1. Push code to GitHub
2. Connect to Render
3. Auto-deploy forever

Choose your method and let me know if you need help with any step!

---

## 📞 Need Help?

**GitHub not set up?** 
```powershell
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"
```

**Don't want to use git?**
Use Netlify Drop (drag & drop) - easiest option!

**Want custom domain?**
All platforms support it (Render/Netlify/Vercel)

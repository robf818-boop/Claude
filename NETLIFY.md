# UnitIQ Netlify Deployment Guide

Quick guide to deploy UnitIQ Enterprise to Netlify.

---

## Quick Deploy (Recommended)

### Step 1: Connect to Netlify

**Option A: Deploy via Git (Recommended)**
1. Go to https://app.netlify.com/
2. Click **"Add new site"** > **"Import an existing project"**
3. Choose **GitHub** (or your git provider)
4. Select the **robf818-boop/Claude** repository
5. Select branch: **claude/hvac-intelligence-app-GlfQt**
6. Netlify will auto-detect settings from `netlify.toml`

**Option B: Netlify CLI (Alternative)**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

### Step 2: Configure Environment Variables

After connecting your site, add Firebase credentials:

1. In Netlify dashboard, go to **Site settings** > **Environment variables**
2. Click **"Add a variable"**
3. Add each of these variables:

```
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_UNITIQ_APP_ID=unitiq-enterprise-v1
```

**Get these values from:**
- Firebase Console: https://console.firebase.google.com/
- Project Settings > General > Your apps > Web app

### Step 3: Trigger Deploy

1. Click **"Deploys"** tab
2. Click **"Trigger deploy"** > **"Deploy site"**
3. Wait 2-3 minutes for build to complete
4. Your site will be live at: `https://your-site-name.netlify.app`

---

## Build Configuration

The `netlify.toml` file contains:

- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Node version**: 18
- **Redirects**: SPA routing to index.html
- **Headers**: Security and caching headers

---

## Firebase Setup (If Not Done)

Before deploying, make sure Firebase is configured:

1. **Create Firebase Project**
   - https://console.firebase.google.com/
   - Create project: "UnitIQ Enterprise"

2. **Enable Authentication**
   - Authentication > Sign-in method
   - Enable **Anonymous** sign-in

3. **Create Firestore Database**
   - Firestore Database > Create database
   - Start in **test mode** or **production mode**
   - Choose region (e.g., us-central1)

4. **Set Security Rules**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /artifacts/{appId}/public/data/{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

5. **Get Web App Config**
   - Project Settings (gear icon)
   - Scroll to "Your apps"
   - Select Web app or create one
   - Copy configuration values

---

## Testing Your Deployment

Once deployed:

1. **Visit your Netlify URL**
2. **Check Firebase Connection**
   - App should show loading screen briefly
   - Should auto-sign in anonymously
   - No Firebase errors in browser console

3. **Test Features**
   - Click "Start Scan" button
   - Click "Authenticate" to load demo unit
   - Navigate through tabs: General, Warranty, History, Docs
   - Test "Order / File Claim" workflow
   - Switch to "Office View" and verify it works

4. **Check Real-time Sync**
   - Open two browser windows
   - Order a part in one window
   - Check if it appears in Office View in both windows

---

## Custom Domain (Optional)

To add a custom domain:

1. **In Netlify Dashboard**:
   - Site settings > Domain management
   - Add custom domain

2. **Update DNS**:
   - Add CNAME record pointing to your Netlify domain
   - Or use Netlify DNS for easier setup

---

## Troubleshooting

### Build Fails
**Error: "Build failed"**
- Check build logs in Netlify dashboard
- Ensure all dependencies in package.json
- Verify Node version (should be 18+)

### Firebase Errors on Live Site
**Error: "Firebase: Error (auth/invalid-api-key)"**
- Check environment variables in Netlify are correct
- Ensure variable names start with `VITE_`
- Redeploy after adding variables

**Error: "Firebase app not initialized"**
- Verify all 6 Firebase environment variables are set
- Check browser console for specific error
- Ensure Firebase project is created and configured

### App Loads But Doesn't Work
**Firestore permission errors**
- Check Firestore security rules
- Ensure anonymous auth is enabled
- Verify rules allow authenticated users

---

## Continuous Deployment

Once connected to Git:

1. **Every push to your branch** triggers automatic deploy
2. **Preview deploys** for pull requests
3. **Production deploys** when you merge to main

To disable auto-deploy:
- Site settings > Build & deploy > Continuous deployment
- Toggle "Auto publishing"

---

## Performance & Monitoring

### Netlify Analytics (Optional)
- Site settings > Analytics
- Enable Netlify Analytics ($9/month)
- Track visitors, page views, bandwidth

### Firebase Analytics (Free)
- Already configured in Firebase
- Track user events and engagement
- View in Firebase Console > Analytics

---

## Environment Variables Reference

```bash
# Required for UnitIQ to work
VITE_FIREBASE_API_KEY=          # From Firebase Console
VITE_FIREBASE_AUTH_DOMAIN=      # your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=       # your-project-id
VITE_FIREBASE_STORAGE_BUCKET=   # your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=  # Numeric ID
VITE_FIREBASE_APP_ID=           # 1:xxx:web:xxx

# Optional customization
VITE_UNITIQ_APP_ID=unitiq-enterprise-v1  # Firestore path identifier
VITE_INITIAL_AUTH_TOKEN=        # Leave blank for anonymous auth
```

---

## Commands Reference

```bash
# Local development
npm run dev                    # Start dev server at localhost:5173

# Build for production
npm run build                  # Build to dist/

# Preview production build locally
npm run preview                # Preview at localhost:4173

# Deploy with Netlify CLI
netlify deploy                 # Deploy to draft URL
netlify deploy --prod          # Deploy to production

# Open Netlify dashboard
netlify open                   # Open site dashboard
```

---

## Resources

- **Netlify Dashboard**: https://app.netlify.com/
- **Netlify Docs**: https://docs.netlify.com/
- **Firebase Console**: https://console.firebase.google.com/
- **Vite Deployment Guide**: https://vitejs.dev/guide/static-deploy.html

---

## What's Next?

After deploying to Netlify:

1. ✅ **Test on web** - Verify all features work
2. ✅ **Share with team** - Get feedback on functionality
3. ✅ **Continue to iOS** - Follow TESTFLIGHT.md for iOS deployment
4. ✅ **Set up custom domain** - Professional URL for your app

---

**Your UnitIQ web app is now live! 🚀**

Share the URL with your team and field technicians to start testing.

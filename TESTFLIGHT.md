# UnitIQ TestFlight Deployment Guide

Complete guide for deploying **UnitIQ Enterprise** HVAC intelligence app to TestFlight.

---

## Prerequisites

### 1. Apple Developer Account
- **Required**: Active Apple Developer Program membership ($99/year)
- Sign up at: https://developer.apple.com/programs/
- Verify your account is active and in good standing

### 2. Development Environment
- **macOS**: Required for Xcode and iOS deployment
- **Xcode**: Version 14.0 or later (download from Mac App Store)
- **Node.js**: Already installed (verified in this project)
- **Firebase Project**: You'll need Firebase credentials (see Configuration section)

---

## Part 1: Firebase Configuration

### Step 1: Create Firebase Project
1. Go to https://console.firebase.google.com/
2. Click **"Add project"**
3. Name it **"UnitIQ Enterprise"** or your preferred name
4. Enable Google Analytics (recommended but optional)
5. Create the project

### Step 2: Add iOS App to Firebase
1. In Firebase Console, click **iOS+** icon
2. Register app with bundle ID: `com.unitiq.enterprise`
3. Download `GoogleService-Info.plist` (you can skip this for web-only Firebase)
4. Follow setup instructions if using native Firebase features

### Step 3: Enable Firebase Services
1. **Authentication**:
   - Go to Authentication > Sign-in method
   - Enable **Anonymous** authentication

2. **Firestore Database**:
   - Go to Firestore Database
   - Create database in **production mode** or **test mode**
   - Choose your preferred region (e.g., us-central1)

### Step 4: Set Up Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // UnitIQ data structure
    match /artifacts/{appId}/public/data/{document=**} {
      // Allow authenticated users to read and write
      allow read, write: if request.auth != null;
    }
  }
}
```

### Step 5: Get Firebase Configuration
1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll to **Your apps** section
3. Copy the Firebase configuration values:
   - API Key
   - Auth Domain
   - Project ID
   - Storage Bucket
   - Messaging Sender ID
   - App ID

### Step 6: Create Environment File
1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` with your Firebase credentials:
   ```env
   VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   VITE_FIREBASE_AUTH_DOMAIN=unitiq-enterprise.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=unitiq-enterprise
   VITE_FIREBASE_STORAGE_BUCKET=unitiq-enterprise.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
   VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
   VITE_UNITIQ_APP_ID=unitiq-enterprise-v1
   ```

3. **Important**: `.env.local` is in `.gitignore` and will NOT be committed

---

## Part 2: Build & Prepare iOS App

### Step 1: Build the Web App
```bash
npm run build
```

This compiles TypeScript and builds the production-ready web app with your Firebase config injected.

### Step 2: Sync to iOS
```bash
npx cap sync ios
```

This copies the built web app into the iOS project at `ios/App/App/public/`.

### Step 3: Open in Xcode
```bash
npm run ios:open
```

Or manually:
```bash
npx cap open ios
```

This opens `ios/App/App.xcodeproj` in Xcode.

---

## Part 3: Xcode Configuration

### Step 1: Configure Signing & Capabilities
1. In Xcode, select the **App** target in the project navigator
2. Go to **"Signing & Capabilities"** tab
3. **Team**: Select your Apple Developer team from dropdown
   - If you don't see your team, sign in with your Apple ID:
     - Xcode > Settings > Accounts > Add Apple ID
4. **Bundle Identifier**: Should already be `com.unitiq.enterprise`
5. **Signing Certificate**: Choose **"iPhone Distribution"** or **"Apple Development"**
6. Enable **"Automatically manage signing"** (recommended)

### Step 2: Set Version & Build Number
1. In the **General** tab:
   - **Version**: `1.0.0` (marketing version shown to users)
   - **Build**: `1` (increment for each TestFlight upload)

### Step 3: Configure App Icons (CRITICAL)
The project currently only has a 512x512 icon. You need a complete icon set:

**Option A: Use AppIcon.co (Recommended)**
1. Create a 1024x1024 PNG icon for UnitIQ
2. Go to https://www.appicon.co/
3. Upload your 1024x1024 icon
4. Download the generated iOS icon set
5. In Xcode, select `Assets.xcassets > AppIcon`
6. Drag all icon sizes into the appropriate slots

**Option B: Manual Creation**
Create icons at these sizes:
- 1024x1024 (App Store)
- 180x180 (iPhone @3x)
- 120x120 (iPhone @2x)
- 167x167 (iPad Pro @2x)
- 152x152 (iPad @2x)
- And more...

**Icon Design Tips for UnitIQ:**
- Use the blue/white Wind icon from the app
- Keep it simple and recognizable at small sizes
- No transparency (iOS requirement)
- Square image (iOS will add rounded corners)

### Step 4: Set Deployment Target
1. In **General** tab, set **"Deployment Info"**:
   - **Minimum Deployments**: iOS 15.0 (already configured)
   - **Supported Orientations**: Portrait, Landscape Left, Landscape Right

### Step 5: Configure Capabilities (if needed)
UnitIQ currently doesn't need special capabilities, but you can add:
- Push Notifications (for future features)
- Background Modes (for background sync)

---

## Part 4: Create Archive for TestFlight

### Step 1: Select Build Destination
1. In Xcode toolbar, click the device selector
2. Choose **"Any iOS Device (arm64)"**

### Step 2: Archive the App
1. In Xcode menu: **Product > Archive**
2. Wait for the build to complete (2-5 minutes)
3. The **Organizer** window will open automatically

### Step 3: Validate the Archive
1. In the Organizer, select your archive
2. Click **"Validate App"**
3. Choose your distribution certificate and provisioning profile
4. Click **"Validate"**
5. Wait for validation (checks for errors)
6. Fix any issues that appear

### Common Validation Issues:
- **Missing icon sizes**: Add complete icon set
- **Invalid bundle ID**: Must match App Store Connect
- **Code signing issues**: Check team and certificates

---

## Part 5: Upload to App Store Connect

### Step 1: Create App in App Store Connect
1. Go to https://appstoreconnect.apple.com/
2. Click **"My Apps"**
3. Click **"+"** button > **"New App"**
4. Fill in details:
   - **Platform**: iOS
   - **Name**: UnitIQ
   - **Primary Language**: English (U.S.)
   - **Bundle ID**: com.unitiq.enterprise
   - **SKU**: unitiq-001 (unique identifier)
   - **User Access**: Full Access

### Step 2: Fill App Information
1. **App Information**:
   - Category: Business or Productivity
   - Subcategory: (optional)

2. **Pricing and Availability**:
   - Price: Free or your price tier
   - Availability: Select countries

3. **App Privacy**:
   - Add privacy details about data collection
   - For UnitIQ: Collect user data (service requests, unit data)

### Step 3: Upload from Xcode
1. In Xcode Organizer, select your validated archive
2. Click **"Distribute App"**
3. Choose **"App Store Connect"**
4. Choose **"Upload"**
5. Select distribution options:
   - ✅ Include bitcode (if available)
   - ✅ Upload symbols for crash reporting
   - ✅ Manage version and build number
6. Review and **"Upload"**
7. Wait for upload (5-15 minutes depending on connection)

### Step 4: Wait for Processing
1. In App Store Connect > TestFlight tab
2. Your build will appear as **"Processing"**
3. Processing usually takes **10-60 minutes**
4. You'll receive an email when processing completes

---

## Part 6: Configure TestFlight

### Step 1: Add App Information for Testing
1. Go to **TestFlight** tab in App Store Connect
2. Select your build
3. Fill in **"Test Information"**:
   - **What to Test**: Describe new features or changes
   - **Beta App Description**: Brief description of UnitIQ
   - **Feedback Email**: Your support email
   - **Privacy Policy URL**: (optional but recommended)

### Step 2: Add Internal Testers
1. In **TestFlight > Internal Testing**:
2. Create a new internal group (e.g., "UnitIQ Team")
3. Add internal testers (up to 100 emails)
4. Internal testers can test immediately after processing

### Step 3: Add External Testers (Optional)
1. In **TestFlight > External Testing**:
2. Create a new external group (e.g., "Beta Testers")
3. Add external testers (up to 10,000 emails)
4. **Submit for Review**: External builds must be reviewed by Apple (24-48 hours)

### Step 4: Set Build for Testing
1. Select your processed build
2. Click **"Start Testing"** for internal groups
3. For external groups, wait for Apple review approval

---

## Part 7: Distribute to Testers

### Step 1: Invite Testers
1. Testers will receive an email invitation
2. Email contains a link to download TestFlight app
3. Testers must:
   - Install **TestFlight** from App Store
   - Accept invitation
   - Install **UnitIQ** through TestFlight

### Step 2: Share Public Link (External Only)
1. In External Testing, click **"Public Link"**
2. Enable public link
3. Share this link to allow anyone to test (up to limit)

### Step 3: Monitor Feedback
1. Testers can send feedback through TestFlight
2. View feedback in App Store Connect > TestFlight > Feedback
3. Monitor crash reports in Xcode Organizer

---

## Part 8: Update and Iterate

### For Each New Build:
1. Make code changes
2. Increment **Build Number** in Xcode (e.g., 1 → 2)
3. Run: `npm run build && npx cap sync ios`
4. Archive in Xcode (Product > Archive)
5. Upload to App Store Connect
6. Wait for processing
7. Add to TestFlight groups

**Version vs Build Number:**
- **Version** (1.0.0): User-facing, change for feature updates
- **Build** (1, 2, 3...): Internal, increment for every upload

---

## Troubleshooting

### Build Errors in Xcode
**Error: "Command CompileSwiftSources failed"**
- Solution: Clean build folder (Product > Clean Build Folder)
- Delete derived data: Xcode > Preferences > Locations > Derived Data > Delete

**Error: "Code signing failed"**
- Solution: Verify Team is selected in Signing & Capabilities
- Ensure bundle ID matches App Store Connect
- Try disabling/re-enabling "Automatically manage signing"

### Firebase Errors
**Error: "Firebase: Error (auth/invalid-api-key)"**
- Solution: Check `.env.local` has correct VITE_FIREBASE_API_KEY
- Rebuild: `npm run build && npx cap sync ios`

**Error: "Firebase: No Firebase App '[DEFAULT]' has been created"**
- Solution: Ensure environment variables are loaded in vite.config.ts
- Check that build includes the injected config

### TestFlight Issues
**Build stuck in "Processing"**
- Solution: Usually resolves in 30-60 minutes
- If > 2 hours, contact Apple Support
- Check for email from Apple about issues

**"Missing Compliance" Warning**
- Solution: In build details, answer export compliance questions
- For UnitIQ (no encryption beyond HTTPS): Select "No" for encryption

---

## Quick Reference Commands

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Then edit .env.local with your Firebase credentials

# Build web app
npm run build

# Sync to iOS
npx cap sync ios

# Open in Xcode
npm run ios:open

# Full build & sync
npm run ios:build
```

---

## Firebase Firestore Data Structure

UnitIQ uses this Firestore path:
```
/artifacts/{appId}/public/data/orders/
```

Each order document contains:
```typescript
{
  partName: string,
  partType: string,
  retailPrice: number,
  isWarranty: boolean,
  unitModel: string,
  unitSerial: string,
  isUrgent: boolean,
  status: string,
  techUid: string,
  createdAt: Timestamp
}
```

---

## Resources

- **Apple Developer**: https://developer.apple.com/
- **App Store Connect**: https://appstoreconnect.apple.com/
- **TestFlight**: https://developer.apple.com/testflight/
- **Firebase Console**: https://console.firebase.google.com/
- **Capacitor Docs**: https://capacitorjs.com/docs/ios
- **Vite Docs**: https://vitejs.dev/

---

## Support

For questions or issues:
1. Check this guide thoroughly
2. Review Firebase Console for data/auth issues
3. Check Xcode Organizer for crash logs
4. Review App Store Connect for submission issues

---

**Good luck with your TestFlight deployment! 🚀**

Your UnitIQ app is now ready for testing by field technicians and office staff.

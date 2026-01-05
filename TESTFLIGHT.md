# TestFlight Distribution Guide for DefendIQ

This guide walks you through the process of distributing DefendIQ to testers via Apple's TestFlight.

## Prerequisites

Before you begin, ensure you have:

1. **Mac with Xcode installed** (latest version recommended)
   - Download from Mac App Store
   - Requires macOS 13.5 or later for latest Xcode

2. **Apple Developer Account** ($99/year)
   - Sign up at https://developer.apple.com
   - Individual or Organization account

3. **Development certificates and provisioning profiles**
   - Will be created through Xcode

## Step 1: Initial Setup

The iOS platform has already been configured for your project. Verify the setup:

```bash
# Ensure all dependencies are installed
npm install

# Build the web app and sync to iOS
npm run ios:build
```

## Step 2: Open Project in Xcode

```bash
# Open the iOS project in Xcode
npm run ios:open
```

This will launch Xcode with the DefendIQ iOS project.

## Step 3: Configure App in Xcode

### 3.1 Update App Identity

1. In Xcode, select the **App** project in the navigator
2. Select the **App** target
3. Go to **Signing & Capabilities** tab
4. Configure the following:

   - **Team**: Select your Apple Developer team
   - **Bundle Identifier**: `com.defendiq.app` (already set)
   - Check **Automatically manage signing**

### 3.2 Set App Version and Build Number

1. In the **General** tab:
   - **Version**: `1.0.0` (already set)
   - **Build**: Start with `1`, increment for each TestFlight upload

### 3.3 Configure App Information

1. In the **General** tab:
   - **Display Name**: `DefendIQ`
   - **Deployment Target**: iOS 13.0 or higher recommended

## Step 4: Add App Icons

You need app icons in various sizes. Here's what to do:

### Option A: Use App Icon Generator (Recommended)

1. Create a 1024x1024 PNG icon for your app
2. Use an online tool like:
   - https://www.appicon.co
   - https://appiconmaker.co

3. Generate all required sizes
4. In Xcode, navigate to: `App > App > Assets.xcassets > AppIcon.appiconset`
5. Drag and drop the generated icons into their respective slots

### Option B: Manual Creation

Create icons in these sizes and add them to `AppIcon.appiconset`:
- 1024x1024 (App Store)
- 180x180 (iPhone 3x)
- 120x120 (iPhone 2x)
- 167x167 (iPad Pro)
- 152x152 (iPad)
- And other required sizes as shown in Xcode

## Step 5: Configure Info.plist (Optional)

Add permissions if your app needs device features:

1. Open `App/Info.plist`
2. Add any required usage descriptions (our app doesn't need any special permissions currently)

## Step 6: Build for Testing

1. In Xcode, select a target device:
   - Click the device selector next to the Run button
   - Choose **Any iOS Device (arm64)**

2. From the menu bar:
   - **Product** > **Archive**
   - Wait for the archive to complete (may take a few minutes)

## Step 7: Upload to App Store Connect

Once the archive completes:

1. The **Organizer** window opens automatically
2. Select your archive
3. Click **Distribute App**
4. Choose **App Store Connect**
5. Click **Upload**
6. Follow the prompts:
   - **Upload**: Select this option
   - **Automatically manage signing**: Recommended
   - Click **Upload**

Wait for the upload to complete. You'll receive an email when processing is done.

## Step 8: Set Up TestFlight in App Store Connect

1. Go to https://appstoreconnect.apple.com
2. Sign in with your Apple ID
3. Click **My Apps**
4. Click the **+** button and select **New App**

### 8.1 Create App Record (First time only)

Fill in the required information:
- **Platform**: iOS
- **Name**: DefendIQ
- **Primary Language**: English
- **Bundle ID**: Select `com.defendiq.app`
- **SKU**: `defendiq-app-001` (or any unique identifier)
- **User Access**: Full Access

### 8.2 Configure TestFlight

1. Click on your app in App Store Connect
2. Go to the **TestFlight** tab
3. Wait for your build to appear (processing can take 5-30 minutes)
4. Once available, your build will show under **iOS Builds**

## Step 9: Add Test Information

Before you can test, you need to provide:

1. Click on your build number
2. Add **Test Details**:
   - **What to Test**: "Test all game situations, AI generator, and rules handbook features"
   - **Test Notes**: Any specific instructions for testers

3. Add **Export Compliance Information**:
   - Does your app use encryption? **No** (for this app)
   - Click **Start Internal Testing**

## Step 10: Add Testers

### Internal Testers (up to 100)

1. In TestFlight tab, click **App Store Connect Users**
2. Click the **+** button
3. Add users from your team
4. They'll receive an email to test the app

### External Testers (up to 10,000)

1. In TestFlight tab, click **External Testers**
2. Create a test group
3. Add testers by email
4. External testing requires Beta App Review (1-2 days)

## Step 11: Testers Install the App

Testers need to:

1. Install **TestFlight** app from the App Store
2. Click the invite link from email
3. Accept the invitation
4. Tap **Install** in TestFlight

## Updating Your App for TestFlight

When you make changes to DefendIQ:

```bash
# 1. Make your code changes

# 2. Build and sync
npm run ios:build

# 3. Open Xcode
npm run ios:open

# 4. Increment the build number
#    (in Xcode: General tab > Build field)

# 5. Archive and upload
#    (Product > Archive > Distribute App)
```

## Quick Command Reference

```bash
# Install dependencies
npm install

# Run web version locally
npm run dev

# Build web app
npm run build

# Build and sync to iOS
npm run ios:build

# Open in Xcode
npm run ios:open

# (In Xcode) Archive for TestFlight
# Product > Archive > Distribute App > Upload
```

## Common Issues and Solutions

### Issue: "Failed to create provisioning profile"
**Solution**: Ensure you're signed into Xcode with your Apple Developer account (Xcode > Settings > Accounts)

### Issue: "No signing identity found"
**Solution**: Let Xcode automatically manage signing (check "Automatically manage signing" in Signing & Capabilities)

### Issue: "Build processing takes too long"
**Solution**: Normal processing time is 5-30 minutes. Check for email notification.

### Issue: "Archive option is greyed out"
**Solution**: Ensure you selected "Any iOS Device" as the build destination, not a simulator

### Issue: "Missing required icon sizes"
**Solution**: Use an app icon generator to create all required sizes

## Production Release (After TestFlight)

Once testing is complete:

1. Go to App Store Connect
2. Create a new version in **App Store** tab
3. Fill in all required metadata:
   - App description
   - Screenshots (iPhone 6.7", 6.5", iPad 12.9")
   - Keywords
   - Support URL
   - Marketing URL (optional)
   - Privacy Policy URL

4. Submit for review
5. Wait for Apple's approval (typically 1-3 days)

## Resources

- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [TestFlight Documentation](https://developer.apple.com/testflight/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [Xcode Documentation](https://developer.apple.com/xcode/)

## Support

For DefendIQ-specific questions, refer to the main README.md file.

For iOS/TestFlight questions:
- Apple Developer Forums: https://developer.apple.com/forums/
- Capacitor Community: https://ionic.link/discord

# Silent Update Setup Guide for Evidence Tracker

This guide will help you set up silent automatic updates for your Tauri application.

## Overview

Silent updates allow your Evidence Tracker application to automatically download and install updates in the background without user interaction.

## Prerequisites

1. GitHub repository for your project
2. GitHub Personal Access Token with `repo` scope
3. OpenSSL or similar tool for generating signing keys

## Step 1: Generate Signing Keys

### Windows (using OpenSSL)
```bash
# Install OpenSSL if not already installed
# Generate private key
openssl genrsa -out updater_private.pem 2048

# Generate public key
openssl rsa -in updater_private.pem -outform PEM -pubout -out updater_public.pem

# Copy the public key content for tauri.conf.json
type updater_public.pem
```

### macOS/Linux
```bash
# Generate private key
openssl genrsa -out updater_private.pem 2048

# Generate public key
openssl rsa -in updater_private.pem -outform PEM -pubout -out updater_public.pem

# Copy the public key content
cat updater_public.pem
```

## Step 2: Update Configuration

1. Replace `YOUR_PUBLIC_KEY_HERE` in `src-tauri/tauri.conf.json` with the actual public key from `updater_public.pem`
2. Replace `YOUR_USERNAME` with your actual GitHub username in the updater endpoints

## Step 3: Update GitHub Repository

### Update the GitHub API endpoint in tauri.conf.json:
```json
"updater": {
  "active": true,
  "endpoints": [
    "https://api.github.com/repos/YOUR_USERNAME/evidence-tracker/releases/latest"
  ],
  "dialog": false,
  "pubkey": "YOUR_PUBLIC_KEY_HERE"
}
```

## Step 4: Install Required Dependencies

Run the following commands:

```bash
npm install @tauri-apps/plugin-updater @tauri-apps/plugin-process @tauri-apps/plugin-dialog
```

## Step 5: Build and Release Process

### 1. Update version in package.json
Update the version number before each release:
```json
"version": "1.0.3"
```

### 2. Build the application
```bash
npm run tauri:build
```

### 3. Create GitHub Release

1. Go to your GitHub repository
2. Click "Releases" → "Draft a new release"
3. Create a new tag (e.g., `v1.0.3`)
4. Upload the built files:
   - `src-tauri/target/release/bundle/msi/Evidence Tracker_1.0.3_x64_en-US.msi`
   - `src-tauri/target/release/bundle/nsis/Evidence Tracker_1.0.3_x64-setup.exe`
5. Add release notes
6. Publish the release

### 4. Create updater signature file

For each release, you need to create a signature file:

#### Windows MSI
```bash
# Sign the MSI file
openssl dgst -sha256 -sign updater_private.pem -out signature.sig "Evidence Tracker_1.0.3_x64_en-US.msi"
```

#### Windows NSIS
```bash
# Sign the NSIS installer
openssl dgst -sha256 -sign updater_private.pem -out signature.sig "Evidence Tracker_1.0.3_x64-setup.exe"
```

## Step 6: Testing Silent Updates

### 1. Test locally
Create a test release with a higher version number and check if the app detects and installs it.

### 2. Check update logs
The application logs update checks to the console. Check the browser console for update-related messages.

### 3. Verify silent installation
The update should download and install automatically when available.

## Step 7: Security Best Practices

1. **Keep your private key secure**: Never commit `updater_private.pem` to version control
2. **Store private key safely**: Use environment variables or secure key storage
3. **Use HTTPS endpoints**: Always use secure URLs for update endpoints
4. **Test thoroughly**: Always test updates in a staging environment

## Troubleshooting

### Common Issues

1. **Update not detected**: Check GitHub API endpoint URL and version format
2. **Signature verification failed**: Ensure public key matches private key
3. **Download fails**: Check internet connectivity and GitHub rate limits
4. **Permission errors**: Ensure application has write permissions

### Debug Mode
To enable debug logging, add this to your environment:
```bash
TAURI_DEBUG=1
```

### Manual Update Check
You can manually trigger an update check by running:
```javascript
import { check } from '@tauri-apps/plugin-updater';
const update = await check();
console.log('Update available:', update?.available);
```

## Environment Variables

For production deployment, set these environment variables:

```bash
# GitHub token for releases (optional, for private repos)
GITHUB_TOKEN=your_token_here

# Update endpoint (optional, for custom update server)
TAURI_UPDATER_ENDPOINT=https://your-custom-server.com/updates
```

## Next Steps

1. Complete the configuration with your actual GitHub username and public key
2. Test the update mechanism with a test release
3. Set up automated release process using GitHub Actions
4. Monitor update success rates and user feedback

Remember to keep your signing keys secure and never share the private key!
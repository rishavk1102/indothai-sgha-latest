# Coolify Setup Steps - Fix Deployment

Follow these steps in order to fix your Coolify deployment:

## Step 1: Navigate to Your Application Settings
1. Go to your Coolify dashboard
2. Find your application (IndoThai_SGHA)
3. Click on it to open the application settings
4. Go to the **"Configuration"** or **"Settings"** tab

## Step 2: Fix Port Mapping
1. Scroll down to the **"Network"** section
2. Find **"Ports Mappings"** field
3. **Current value**: `3000:3000` ❌
4. **Change to**: `7072:7072` ✅
   - OR simply delete/clear the field (since port 7072 is already exposed)
5. Click **"Save"** or **"Update"**

## Step 3: Commit Configuration Files
**This fixes the "Nixpacks failed to detect" error!**

1. Two files have been created in your project root:
   - `nixpacks.toml` - Tells Nixpacks how to build your app
   - `package.json` - Helps Nixpacks detect this as a Node.js application

2. **Commit and push these files to your repository:**
   ```bash
   git add nixpacks.toml package.json
   git commit -m "Add nixpacks configuration and root package.json"
   git push
   ```
3. These files help Nixpacks detect and build your Node.js application correctly

## Step 4: Change Base Directory (CRITICAL FIX!)
**This fixes the "No such file or directory" error!**

1. Scroll to the **"Build"** section
2. Find **"Base Directory"** field
3. **Current value**: `/backend` ❌ (causes the error)
4. **Change to**: `/` (root/empty) ✅
   - This allows access to both `frontend` and `backend` folders
5. Find **"Publish Directory"** field
6. **Change to**: `/backend` ✅
   - This tells Coolify where the final application is located

## Step 5: Configure Build Commands (Optional)
**Note:** If you've committed `nixpacks.toml`, these commands are optional as the file handles them. But you can still set them for clarity:

Scroll to the **"Build"** section:

### Install Command:
1. Find the **"Install Command"** field
2. You can leave it empty (nixpacks.toml handles it) OR paste:
   ```
   cd frontend && npm install && cd ../backend && npm install
   ```

### Build Command:
1. Find the **"Build Command"** field
2. You can leave it empty (nixpacks.toml handles it) OR paste:
   ```
   cd frontend && npm run build
   ```

### Start Command:
1. Find the **"Start Command"** field
2. You can leave it empty (nixpacks.toml handles it) OR paste:
   ```
   cd backend && npm start
   ```

## Step 6: Verify Other Settings
Check these settings are correct:

### Build Section:
- **Base Directory**: `/` ✅ (changed from `/backend`)
- **Publish Directory**: `/backend` ✅ (changed from `/`)
- **Watch Paths**: `src/pages/**` (optional, can leave as is)

### Network Section:
- **Ports Exposes**: `7072` ✅ (should already be set correctly)
- **Network Aliases**: (leave empty)

### Static Site:
- **"Is it a static site?"**: Should be **UNCHECKED** ✅

## Step 7: Save and Redeploy
1. Click **"Save"** or **"Update"** button at the bottom
2. Go to the **"Deployments"** or **"Deploy"** tab
3. Click **"Redeploy"** or **"Deploy"** button
4. Wait for the build to complete

## Step 8: Verify Deployment
After deployment completes:

1. Check the **logs** to ensure:
   - Frontend build completed successfully
   - Backend started on port 7072
   - No errors in the logs

2. Visit your domain: `http://indothai.72.61.173.50.sslip.io`
   - Should see your application (not a blank screen)
   - Check browser console (F12) for any errors

## Troubleshooting

### If build fails:
- Check logs for specific error messages
- Verify Node.js version is compatible (Node 18+)
- Ensure all environment variables are set

### If still seeing blank screen:
- Check browser console (F12) for JavaScript errors
- Verify `backend/dist` folder exists and contains `index.html`
- Check network tab to see if static files are loading

### If API calls fail:
- Verify the frontend is using the correct URL (should be same origin in production)
- Check CORS settings in backend
- Verify backend is running on port 7072

## Summary of Changes

| Setting | Old Value | New Value |
|---------|-----------|-----------|
| Base Directory | `/backend` | `/` (root) |
| Publish Directory | `/` | `/backend` |
| Ports Mappings | `3000:3000` | `7072:7072` or empty |
| Install Command | (empty) | `cd frontend && npm install && cd ../backend && npm install` |
| Build Command | (empty) | `cd frontend && npm run build` |
| Start Command | (empty) | `cd backend && npm start` |

---

**Note**: After making these changes, you MUST redeploy the application for them to take effect!


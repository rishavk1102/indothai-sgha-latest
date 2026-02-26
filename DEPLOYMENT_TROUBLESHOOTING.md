# Deployment Troubleshooting Guide

## If Deployment Still Fails

### 1. Check Full Logs
The log you shared appears incomplete. Please:
- Scroll down in the Coolify logs to see the complete error message
- Look for lines that say "ERROR" or "FAILED"
- Copy the full error output

### 2. Common Issues and Fixes

#### Issue: "Nixpacks failed to detect"
**Solution:** 
- Ensure `package.json` and `nixpacks.toml` are in the root directory
- Verify they are committed and pushed to your repository
- Check that Base Directory in Coolify is set to `/` (root)

#### Issue: "No such file or directory"
**Solution:**
- Base Directory must be `/` (not `/backend`)
- Commands should use relative paths from root

#### Issue: Build fails during npm install
**Solution:**
- Check Node.js version compatibility
- Ensure all dependencies are listed in package.json files
- Check for memory issues (increase build resources if needed)

#### Issue: Port conflicts
**Solution:**
- Verify Ports Exposes is set to `7072`
- Remove or fix Ports Mappings (should be `7072:7072` or empty)

### 3. Verify Coolify Settings

Make sure these are set correctly:

**Build Section:**
- Base Directory: `/` (root)
- Publish Directory: `/backend`
- Install Command: `cd frontend && npm install && cd ../backend && npm install`
- Build Command: `cd frontend && npm run build`
- Start Command: `cd backend && npm start`

**Network Section:**
- Ports Exposes: `7072`
- Ports Mappings: `7072:7072` (or empty)

### 4. Alternative: Use Dockerfile Instead

If Nixpacks continues to fail, you can create a Dockerfile:

```dockerfile
FROM node:22

WORKDIR /app

# Install frontend dependencies
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

# Install backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# Copy all files
COPY . .

# Build frontend
RUN cd frontend && npm run build

# Expose port
EXPOSE 7072

# Start backend
WORKDIR /app/backend
CMD ["npm", "start"]
```

Then in Coolify:
- Set Base Directory to `/`
- Leave build commands empty (Dockerfile handles it)

### 5. Get More Information

To help debug, please provide:
1. **Full error logs** from Coolify (scroll to see complete error)
2. **Current Coolify settings** (screenshot or list of values)
3. **Repository structure** (confirm files are in root)

### 6. Quick Checklist

- [ ] `package.json` exists in root directory
- [ ] `nixpacks.toml` exists in root directory
- [ ] Both files are committed and pushed to repository
- [ ] Base Directory in Coolify is `/`
- [ ] Publish Directory is `/backend`
- [ ] Ports Exposes is `7072`
- [ ] Build commands are set correctly


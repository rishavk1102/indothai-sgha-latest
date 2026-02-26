# Coolify Deployment Configuration

## Current Setup (Base Directory: `/backend`)

Since your **Base Directory** is set to `/backend`, Coolify will work from the backend folder.
All commands below are relative to the backend directory.

### Build Section:
- **Install Command**: 
  ```
  cd ../frontend && npm install && cd ../backend && npm install
  ```
- **Build Command**: 
  ```
  cd ../frontend && npm run build
  ```
- **Start Command**: 
  ```
  npm start
  ```
- **Base Directory**: `/backend` ✅ (keep as is)
- **Publish Directory**: `/` ✅ (keep as is)

### Network Section:
- **Ports Exposes**: `7072` ✅ (correct)
- **Ports Mappings**: `7072:7072` ⚠️ **CHANGE THIS** (currently `3000:3000` is wrong!)
- **Network Aliases**: (leave empty)

---

## Alternative: Use Root Directory

If you prefer to work from the root:

- **Base Directory**: `/` (change from `/backend`)
- **Install Command**: 
  ```
  cd frontend && npm install && cd ../backend && npm install
  ```
- **Build Command**: 
  ```
  cd frontend && npm run build
  ```
- **Start Command**: 
  ```
  cd backend && npm start
  ```
- **Publish Directory**: `/backend` (or `/`)

---

## Important Notes:

1. **Port Mapping**: Change `3000:3000` to `7072:7072` or remove it entirely (since port is already exposed as 7072)
2. **Build Order**: Frontend must be built before backend starts (build outputs to `backend/dist`)
3. **Static Files**: Backend serves React app from `backend/dist` folder
4. **Environment**: Make sure all required environment variables are set in Coolify


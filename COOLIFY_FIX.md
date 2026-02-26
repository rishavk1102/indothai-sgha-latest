# Fix for "No such file or directory" Error

## Problem
The error occurs because with **Base Directory** set to `/backend`, Coolify works from the backend folder, but the frontend folder might not be accessible with relative paths.

## Solution Options

### Option 1: Change Base Directory to Root (RECOMMENDED)

1. Go to **Build** section
2. Change **Base Directory** from `/backend` to `/` (root)
3. Update commands:

   **Install Command:**
   ```
   cd frontend && npm install && cd ../backend && npm install
   ```

   **Build Command:**
   ```
   cd frontend && npm run build
   ```

   **Start Command:**
   ```
   cd backend && npm start
   ```

   **Publish Directory:** Change to `/backend` (or keep as `/`)

### Option 2: Keep Base Directory as `/backend` and Use Absolute Paths

If you want to keep Base Directory as `/backend`, use absolute paths:

   **Install Command:**
   ```
   cd /app/frontend && npm install && cd /app/backend && npm install
   ```

   **Build Command:**
   ```
   cd /app/frontend && npm run build
   ```

   **Start Command:**
   ```
   npm start
   ```

### Option 3: Use Single Command with Working Directory Check

   **Install Command:**
   ```
   (cd /app/frontend 2>/dev/null || cd ../frontend) && npm install && (cd /app/backend 2>/dev/null || cd ../backend || pwd) && npm install
   ```

   **Build Command:**
   ```
   (cd /app/frontend 2>/dev/null || cd ../frontend) && npm run build
   ```

## Recommended: Use Option 1

**Change Base Directory to `/` (root)** - This is the simplest and most reliable solution.

Then use these commands:
- **Install Command:** `cd frontend && npm install && cd ../backend && npm install`
- **Build Command:** `cd frontend && npm run build`
- **Start Command:** `cd backend && npm start`
- **Publish Directory:** `/backend` or `/`

This ensures both frontend and backend folders are accessible during the build process.


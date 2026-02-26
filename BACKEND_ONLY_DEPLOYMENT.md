# Backend Only Deployment - Simple Setup

## Coolify Configuration

### Build Section:
- **Base Directory**: `/backend`
- **Publish Directory**: `/` (or leave empty)
- **Install Command**: `npm install`
- **Build Command**: (leave empty - no build needed)
- **Start Command**: `npm start`

### Network Section:
- **Ports Exposes**: `7072`
- **Ports Mappings**: (leave empty or `7072:7072`)

### Static Site:
- **"Is it a static site?"**: UNCHECKED ✅

## That's it!

Just set Base Directory to `/backend`, Install Command to `npm install`, Start Command to `npm start`, and expose port `7072`.

The backend will be accessible at your Coolify domain URL.


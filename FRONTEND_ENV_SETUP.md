# Frontend Environment Configuration

## Overview

The frontend now uses environment variables to automatically switch between local development and production API endpoints.

## Configuration Files

### `.env` (Local Development)
Used when running `npm start` locally:
```env
REACT_APP_API_BASE_URL=http://localhost:7072
```

### `.env.production` (Production Build)
Used when running `npm run build` for production:
```env
REACT_APP_API_BASE_URL=http://indothai.72.61.173.50.sslip.io
```

## How It Works

1. **Local Development** (`npm start`):
   - Reads from `.env` file
   - Uses `http://localhost:7072` as the API base URL
   - Socket connections also use this URL

2. **Production Build** (`npm run build`):
   - Automatically reads from `.env.production` file
   - Uses `http://indothai.72.61.173.50.sslip.io` as the API base URL
   - Socket connections also use this URL

## Updated Files

1. **`src/config.js`**:
   - Now reads from `process.env.REACT_APP_API_BASE_URL`
   - Falls back to `http://localhost:7072` if not set

2. **`src/api/axios.js`**:
   - Imports config from `config.js`
   - Uses `config.apiBASEURL` for all API requests

3. **`src/context/socket.js`**:
   - Imports config from `config.js`
   - Uses `config.apiBASEURL` for socket connections

## Usage

### Local Development
```bash
cd frontend
npm start
# Automatically uses http://localhost:7072
```

### Production Build
```bash
cd frontend
npm run build
# Automatically uses http://indothai.72.61.173.50.sslip.io
```

## Important Notes

- React requires environment variables to be prefixed with `REACT_APP_` to be accessible in the browser
- The `.env` and `.env.production` files should be in the `frontend/` directory
- These files are typically gitignored (don't commit sensitive data)
- When deploying, ensure the production environment variables are set correctly

## Troubleshooting

If the API URL is not working:

1. **Check environment variable**:
   - In browser console: `console.log(process.env.REACT_APP_API_BASE_URL)`
   - Should show the correct URL

2. **Verify config.js**:
   - Check that `config.apiBASEURL` has the correct value
   - In browser console: `import config from './config'; console.log(config.apiBASEURL)`

3. **Rebuild if needed**:
   - After changing `.env.production`, you must rebuild: `npm run build`


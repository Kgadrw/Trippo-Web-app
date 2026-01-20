# API Configuration Guide

This guide explains how to configure the API URL for testing with localhost while keeping the deployed URL as default.

## Quick Start

### Option 1: Use Localhost Automatically in Dev Mode (Recommended)

When running `npm run dev`, the app will automatically use `http://localhost:3000/api` if no environment variables are set.

### Option 2: Explicitly Set API URL

Create a `.env.local` file in the root directory (this file is gitignored):

```bash
# Use localhost
VITE_API_URL=http://localhost:3000/api

# Or use deployed URL
VITE_API_URL=https://profit-backend-e4w1.onrender.com/api
```

### Option 3: Use Environment Variable Flag

Create a `.env.local` file:

```bash
# Enable localhost mode
VITE_USE_LOCALHOST=true

# Optional: Change port if your backend runs on different port
VITE_LOCAL_API_PORT=3000
```

## Configuration Priority

The API URL is determined in this order:

1. **`VITE_API_URL`** - If set, this takes highest priority (overrides everything)
2. **Dev Mode + `VITE_USE_LOCALHOST`** - In dev mode, defaults to localhost unless `VITE_USE_LOCALHOST=false`
3. **`VITE_USE_LOCALHOST=true`** - Forces localhost even in production
4. **Deployed URL** - Default fallback: `https://profit-backend-e4w1.onrender.com/api`

## Examples

### Testing with Localhost

Create `.env.local`:
```bash
VITE_USE_LOCALHOST=true
VITE_LOCAL_API_PORT=3000
```

Or explicitly:
```bash
VITE_API_URL=http://localhost:3000/api
```

### Using Deployed API in Dev Mode

Even in dev mode, you can use the deployed API by creating `.env.local`:
```bash
VITE_USE_LOCALHOST=false
```

Or explicitly set the deployed URL:
```bash
VITE_API_URL=https://profit-backend-e4w1.onrender.com/api
```

### Different Backend Port

If your backend runs on port 5000:
```bash
VITE_USE_LOCALHOST=true
VITE_LOCAL_API_PORT=5000
```

## Notes

- `.env.local` is gitignored and won't be committed
- Changes require restarting the dev server (`npm run dev`)
- The deployed URL remains the default if no environment variables are set
- Production builds will use the deployed URL unless `VITE_API_URL` is set during build

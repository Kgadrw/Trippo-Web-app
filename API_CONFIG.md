# API Configuration Guide

Configure the API URL via environment variables. The app defaults to a local backend at `http://localhost:3000/api`.

## Quick Start

### Default (localhost)

When no environment variables are set, the app uses `http://localhost:3000/api`.

### Custom API URL

Create a `.env.local` file in the root directory (gitignored):

```bash
VITE_API_URL=http://localhost:3000/api
```

### Different backend port

```bash
VITE_LOCAL_API_PORT=5000
```

Or set the full URL:

```bash
VITE_API_URL=http://localhost:5000/api
```

## Configuration priority

1. **`VITE_API_URL`** — full API base URL (highest priority)
2. **Localhost** — `http://localhost:{VITE_LOCAL_API_PORT || 3000}/api`

## Notes

- `.env.local` is gitignored
- Restart the dev server after changing env vars (`npm run dev`)
- For production, set `VITE_API_URL` at build time to your API host

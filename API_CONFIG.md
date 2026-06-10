# API Configuration Guide

The frontend always talks to a **local** backend at `http://localhost:3000/api` by default.

## Quick Start

1. Start the backend from the `backend/` folder (`npm run dev` — port **3000**).
2. Start the frontend (`npm run dev` — port **8080**).

No remote/deployed API URL is used.

## Custom backend port

If your backend runs on a different port, create `.env.local` in the project root (gitignored):

```bash
VITE_LOCAL_API_PORT=5000
```

This resolves to `http://localhost:5000/api`.

## Notes

- `.env.local` is gitignored
- Restart the dev server after changing env vars (`npm run dev`)
- The service worker (`public/sw.js`) uses the same localhost API base URL

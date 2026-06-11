# API Configuration Guide

## Quick Start (local)

1. Start the backend from the `backend/` folder (`npm run dev` — port **3000**).
2. Start the frontend (`npm run dev` — port **8080**, or the next free port).

On localhost, the frontend uses **`/api`** (Vite proxies to the backend). No extra env vars are needed.

## Production / deployed frontend

Set the backend URL at **build time**:

```bash
VITE_API_URL=https://your-backend.example.com/api
```

## Custom backend port (local)

Create `.env.local` in the project root (gitignored):

```bash
VITE_LOCAL_API_PORT=5000
```

Vite dev/preview proxy forwards `/api` to `http://localhost:5000/api`.

## Notes

- `.env.local` is gitignored
- Restart the dev server after changing env vars (`npm run dev`)
- `npm run preview` also proxies `/api` when testing a production build locally

// Vercel serverless entry point (repo root)
// Works when Vercel Root Directory is NOT set (project root = repo root).
// If Root Directory is set to `backend`, backend/api/index.ts is used instead.
import app from '../backend/src/server';

export default app;

// Cloudflare Worker entrypoint. Hono app serving the D&D Assistant API
// under /api/v1/*. Ports the Spring Boot DispatcherServlet + CorsConfig +
// GlobalExceptionHandler.

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppBindings } from './types';
import { HttpError } from './lib/errors';
import { attachUser } from './middleware/auth';
import health from './routes/health';
import auth from './routes/auth';
import monsters from './routes/monsters';
import spells from './routes/spells';
import gear from './routes/gear';
import characters from './routes/characters';
import campaigns from './routes/campaigns';
import parties from './routes/parties';
import sessions from './routes/sessions';
import { npcs, campaignNpcs } from './routes/npcs';
import { classes, races } from './routes/reference';
import campaignCharacters from './routes/campaign-characters';
import campaignParties from './routes/campaign-parties';
import { encounterSaves, campaignEncounterSaves } from './routes/encounter-saves';
import importRoutes from './routes/import';

const app = new Hono<AppBindings>();

// CORS — origins come from the FRONTEND_CORS_ORIGINS env var (comma-separated).
app.use('*', (c, next) => {
  const allowed = (c.env.FRONTEND_CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return cors({
    origin: (origin) =>
      allowed.length === 0 || allowed.includes(origin) ? origin : (allowed[0] ?? null),
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })(c, next);
});

// Attach the (optional) authenticated user to every API request.
app.use('/api/v1/*', attachUser);

// Routes.
app.route('/api/v1/health', health);
app.route('/api/v1/auth', auth);
app.route('/api/v1/monsters', monsters);
app.route('/api/v1/spells', spells);
app.route('/api/v1/gear', gear);
app.route('/api/v1/classes', classes);
app.route('/api/v1/races', races);
app.route('/api/v1/characters', characters);
app.route('/api/v1/campaigns', campaigns);
app.route('/api/v1/parties', parties);
// Nested under /campaigns/:campaignId/...
app.route('/api/v1/campaigns/:campaignId/sessions', sessions);
app.route('/api/v1/campaigns/:campaignId/npcs', campaignNpcs);
app.route('/api/v1/campaigns/:campaignId/characters', campaignCharacters);
app.route('/api/v1/campaigns/:campaignId/parties', campaignParties);
app.route('/api/v1/campaigns/:campaignId/encounters', campaignEncounterSaves);
// Top-level per-user collections
app.route('/api/v1/npcs', npcs);
app.route('/api/v1/encounter-saves', encounterSaves);
// Admin: bulk import + snapshot (open endpoint, mirrors the Java side).
app.route('/api/v1/import', importRoutes);

// Error shape matches src/ts/api/api-client.ts: {error:{code,message}}.
app.onError((err, c) => {
  if (err instanceof HttpError) {
    return c.json({ error: { code: err.code, message: err.message } }, err.status);
  }
  console.error('Unhandled error:', err);
  return c.json({ error: { code: 'INTERNAL', message: 'Internal server error' } }, 500);
});

app.notFound((c) => c.json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404));

export default app;

// Worker environment bindings (see wrangler.toml) and per-request context vars.

export interface Env {
  /** D1 database binding. */
  DB: D1Database;
  /** HS256 signing secret for JWTs. Set via `wrangler secret put` / .dev.vars. */
  JWT_SECRET: string;
  /** Comma-separated allowed CORS origins. */
  FRONTEND_CORS_ORIGINS: string;
}

/** Values set on the Hono context by the auth middleware. */
export type Variables = {
  userId: string | null;
  username: string | null;
};

/** Shorthand for the typed Hono app/context used throughout the worker. */
export type AppBindings = { Bindings: Env; Variables: Variables };

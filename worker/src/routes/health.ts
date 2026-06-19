import { Hono } from 'hono';
import type { AppBindings } from '../types';

const health = new Hono<AppBindings>();

health.get('/', async (c) => {
  let db: 'up' | 'down' = 'down';
  try {
    await c.env.DB.prepare('SELECT 1').first();
    db = 'up';
  } catch {
    db = 'down';
  }
  return c.json({ status: 'ok', db, time: new Date().toISOString() });
});

export default health;

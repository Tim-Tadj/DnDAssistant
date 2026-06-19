// Ports ReferenceDataController: read-only reference data for the character
// editor. Column names already match the wire field names, so rows are
// returned as-is.
//   GET /api/v1/classes , /api/v1/classes/:id
//   GET /api/v1/races   , /api/v1/races/:id

import { Hono } from 'hono';
import type { AppBindings } from '../types';
import { all, first } from '../db';
import { notFound } from '../lib/errors';

export const classes = new Hono<AppBindings>();

classes.get('/', async (c) => {
  return c.json(await all(c.env.DB, 'SELECT * FROM classes ORDER BY name'));
});

classes.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const row = await first(c.env.DB, 'SELECT * FROM classes WHERE id = ?', id);
  if (!row) throw notFound(`Class ${id} not found`);
  return c.json(row);
});

export const races = new Hono<AppBindings>();

races.get('/', async (c) => {
  return c.json(await all(c.env.DB, 'SELECT * FROM races ORDER BY name'));
});

races.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const row = await first(c.env.DB, 'SELECT * FROM races WHERE id = ?', id);
  if (!row) throw notFound(`Race ${id} not found`);
  return c.json(row);
});

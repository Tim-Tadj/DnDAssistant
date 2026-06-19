#!/usr/bin/env node
// Apply the per-table seed SQL files via `wrangler d1 execute --file=...`.
// Runs each file as its own short invocation so the whole seed completes
// in under a minute on a fresh local D1. Idempotent: every INSERT is
// INSERT OR IGNORE so re-running is a no-op.
//
// Usage:  node seed/apply.mjs local   | node seed/apply.mjs remote

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const target = (process.argv[2] ?? 'local').toLowerCase();
if (target !== 'local' && target !== 'remote') {
  console.error(`Unknown target '${target}' (use 'local' or 'remote')`);
  process.exit(2);
}

const files = [
  'seed-classes.sql',
  'seed-races.sql',
  'seed-spells.sql',
  'seed-gear.sql',
  'seed-monsters.sql',
];

let total = 0;
for (const f of files) {
  const path = join(__dirname, f);
  if (!existsSync(path)) {
    console.log(`  skip ${f} (not generated)`);
    continue;
  }
  process.stdout.write(`  applying ${f} ... `);
  const res = spawnSync(
    'npx',
    [
      'wrangler', 'd1', 'execute', 'dnd-assistant',
      `--${target}`,
      `--file=${path}`,
    ],
    {
      cwd: join(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      shell: true, // resolve npx.cmd on Windows
    },
  );
  if (res.status !== 0) {
    console.log(`FAILED (exit ${res.status})`);
    const out = (res.stdout ?? '') + (res.stderr ?? '');
    const lastLines = out.split(/\r?\n/).filter(Boolean).slice(-15).join('\n');
    console.error(lastLines);
    process.exit(res.status ?? 1);
  }
  // wrangler doesn't print a single "rows written" line; fall back to the
  // INSERT count in the SQL file (each statement is its own batch).
  const sql = readFileSync(path, 'utf8');
  const n = sql.split(/\r?\n/).filter((l) => l.startsWith('INSERT')).length;
  total += n;
  console.log(`OK (${n} statements)`);
}
console.log(`done. ${total} total rows inserted/ignored across ${files.length} files.`);

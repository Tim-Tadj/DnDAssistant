#!/usr/bin/env node
// One-shot deploy of the D&D Assistant to Cloudflare.
//
// Walks you through every step:
//   1. `wrangler login`         (interactive; you do this once on the machine)
//   2. `wrangler d1 create`     (creates the cloud D1)
//   3. patch `worker/wrangler.toml` with the printed database_id
//   4. `wrangler d1 migrate`    (apply migrations/0001_initial.sql)
//   5. `seed:remote`            (12 classes / 9 races / 396 spells / 152 gear / 409 monsters)
//   6. `wrangler secret put JWT_SECRET`
//   7. `wrangler deploy`        (Worker live at dnd-assistant-api.<sub>.workers.dev)
//
// The script re-runs each step until the cloud state matches. It bails with a
// clear message on any failure so you know exactly which keystroke is next.
//
// Usage:   node scripts/deploy.mjs
//
// Environment:
//   - CLOUDFLARE_ACCOUNT_SUBDOMAIN (optional): visible in the dashboard URL
//     after the first deploy. Used to print the Worker URL ahead of time.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const WORKER = join(ROOT, 'worker');

const RED = '\x1b[31m', GRN = '\x1b[32m', YEL = '\x1b[33m', DIM = '\x1b[2m', RST = '\x1b[0m';
const ok = (m) => console.log(`${GRN}\u2713${RST} ${m}`);
const info = (m) => console.log(`${YEL}\u2192${RST} ${m}`);
const err = (m) => console.log(`${RED}\u2717${RST} ${m}`);
const dim = (m) => console.log(`${DIM}${m}${RST}`);

const run = (cmd, args, opts = {}) => {
  return spawnSync(cmd, args, {
    cwd: opts.cwd ?? WORKER,
    stdio: opts.stdio ?? ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    shell: true, // resolve npx.cmd on Windows
    env: { ...process.env, ...(opts.env ?? {}) },
  });
};

const ask = async (rl, prompt, def = '') => {
  const hint = def ? ` [${def}]` : '';
  const ans = (await rl.question(`${prompt}${hint}: `)).trim();
  return ans || def;
};

const yesNo = async (rl, prompt, def = 'y') => {
  const ans = (await ask(rl, `${prompt} (y/n)`, def)).toLowerCase();
  return ans === 'y' || ans === 'yes';
};

const step = async (n, title, fn) => {
  console.log('');
  info(`Step ${n}: ${title}`);
  try {
    await fn();
    ok(`Step ${n} done.`);
  } catch (e) {
    err(`Step ${n} failed: ${e.message}`);
    throw e;
  }
};

// ---- step 1: wrangler login ------------------------------------------------

const ensureLoggedIn = async () => {
  // `wrangler whoami` exits 0 with output when authed, non-zero otherwise.
  const probe = run('npx', ['wrangler', 'whoami']);
  if (probe.status === 0 && probe.stdout && !probe.stdout.includes('Not authenticated')) {
    const m = probe.stdout.match(/associated with the email ([^\s]+)/);
    ok(`Already logged in to Cloudflare${m ? ' as ' + m[1] : ''}.`);
    return;
  }
  info('You need to log in to Cloudflare once on this machine.');
  info('A browser tab will open to authorize Wrangler. Sign in and click "Allow".');
  dim('(If the browser doesn\'t open, copy the URL from the terminal.)');
  const res = run('npx', ['wrangler', 'login'], { stdio: 'inherit' });
  if (res.status !== 0) throw new Error('wrangler login failed');
  ok('Logged in.');
};

// ---- step 2: create D1 -----------------------------------------------------

const tomlPath = join(WORKER, 'wrangler.toml');
const readToml = () => readFileSync(tomlPath, 'utf8');
const writeToml = (s) => writeFileSync(tomlPath, s, 'utf8');

const extractDatabaseId = (output) => {
  // wrangler prints:
  //   "Created D1 database 'dnd-assistant' (...id...)"
  //   "To use it in your Worker, add the following to your wrangler.toml:
  //    [[d1_databases]]
  //    binding = "DB"
  //    database_name = \"dnd-assistant\"
  //    database_id = \"abcd1234...\""
  const m = output.match(/database_id\s*=\s*"([0-9a-f-]+)"/i);
  return m ? m[1] : null;
};

const ensureD1 = async () => {
  const toml = readToml();
  const m = toml.match(/database_id\s*=\s*"([^"]+)"/);
  if (m && !m[1].startsWith('REPLACE')) {
    ok(`wrangler.toml already has database_id = ${m[1]}.`);
    return m[1];
  }
  info('Creating the production D1 database (this is a one-time operation).');
  // Capture stdout/stderr so we can parse out the database_id, but also
  // echo it to the terminal so the user sees what happened.
  const res = spawnSync('npx', ['wrangler', 'd1', 'create', 'dnd-assistant'], {
    cwd: WORKER,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    shell: true,
  });
  process.stdout.write(res.stdout ?? '');
  process.stderr.write(res.stderr ?? '');
  const combined = (res.stdout ?? '') + (res.stderr ?? '');
  let id = extractDatabaseId(combined);
  if (!id && /already exists/i.test(combined)) {
    info("A 'dnd-assistant' D1 already exists on this account. Looking it up…");
    const list = run('npx', ['wrangler', 'd1', 'list']);
    if (list.status === 0) {
      // Each row in the table starts with the database id (uuid) followed
      // by the name. Match the row whose name cell is exactly dnd-assistant.
      const lines = (list.stdout ?? '').split(/\r?\n/);
      for (const line of lines) {
        // Match: "<uuid> | dnd-assistant | ..." or "<uuid> │ dnd-assistant │ ..."
        const lm = line.match(/^\s*([0-9a-f-]{36})\s*[│|]\s*dnd-assistant\b/i);
        if (lm) { id = lm[1]; break; }
      }
    }
    if (id) ok(`Found existing D1 ${id} on this account.`);
  }
  if (!id) {
    if (res.status !== 0) {
      err("'wrangler d1 create' failed and we couldn't locate the existing database either.");
      err("Run `npx wrangler d1 list` manually and paste the id into worker/wrangler.toml.");
    } else {
      err("Couldn't auto-parse database_id from wrangler output. Open wrangler.toml and replace the placeholder manually.");
    }
    process.exit(1);
  }
  const next = toml.replace(/database_id\s*=\s*"[^"]+"/, `database_id = "${id}"`);
  writeToml(next);
  ok(`Patched wrangler.toml with database_id = ${id}.`);
  return id;
};

// ---- step 3: migrations + seed ---------------------------------------------

const ensureMigrated = async () => {
  info('Applying migrations to the production D1…');
  const res = run('npm', ['run', 'db:migrate:remote'], { stdio: 'inherit' });
  if (res.status !== 0) throw new Error('db:migrate:remote failed');
};

const ensureSeeded = async () => {
  info('Seeding bundled content (12 classes / 9 races / 396 spells / 152 gear / 409 monsters)…');
  const res = run('npm', ['run', 'seed:remote'], { stdio: 'inherit' });
  if (res.status !== 0) throw new Error('seed:remote failed');
};

// ---- step 4: JWT secret ----------------------------------------------------

const ensureSecret = async (rl) => {
  const list = run('npx', ['wrangler', 'secret', 'list']);
  if (list.status === 0 && list.stdout && list.stdout.includes('"name":"JWT_SECRET"')) {
    ok('JWT_SECRET already set on the Worker.');
    return;
  }
  info('Set a 32+ byte production secret for JWTs (used to sign auth tokens).');
  dim('Generate one with:  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"');
  const provided = await ask(rl, 'Paste a JWT_SECRET value (Enter to auto-generate one)', '');
  const value = provided || require('node:crypto').randomBytes(48).toString('base64url');
  info('Setting JWT_SECRET…');
  // wrangler reads the secret value from stdin. Pass it via `input` so it
  // never appears on the command line.
  const res = spawnSync('npx', ['wrangler', 'secret', 'put', 'JWT_SECRET'], {
    cwd: WORKER,
    stdio: ['pipe', 'inherit', 'inherit'],
    encoding: 'utf8',
    shell: true,
    input: value,
  });
  if (res.status !== 0) throw new Error('wrangler secret put failed');
  ok(`JWT_SECRET set (length ${value.length}).`);
};

// ---- step 5: deploy --------------------------------------------------------

const ensureDeployed = async () => {
  info('Deploying the Worker…');
  const res = run('npm', ['run', 'deploy'], { stdio: 'inherit' });
  if (res.status !== 0) throw new Error('wrangler deploy failed');
  ok('Worker deployed.');
};

// ---- step 6: smoke test ----------------------------------------------------

const smoke = async () => {
  // `wrangler deploy` prints the URL on its last line. We don't try to parse it
  // robustly; just probe the canonical dev subdomain shape if available.
  const subdomain = process.env.CLOUDFLARE_ACCOUNT_SUBDOMAIN ?? '';
  if (!subdomain) {
    info('Skipping post-deploy smoke test (set CLOUDFLARE_ACCOUNT_SUBDOMAIN to enable).');
    return;
  }
  const url = `https://dnd-assistant-api.${subdomain}.workers.dev/api/v1/health`;
  info(`Probing ${url} …`);
  try {
    const r = await fetch(url);
    const j = await r.json();
    if (r.ok && j?.status === 'ok') {
      ok(`Health check OK: ${JSON.stringify(j)}`);
    } else {
      err(`Health check failed: HTTP ${r.status} ${JSON.stringify(j)}`);
    }
  } catch (e) {
    err(`Health check failed: ${e.message}`);
  }
};

// ---- main -----------------------------------------------------------------

const main = async () => {
  console.log('');
  console.log('==================================================');
  console.log(' DnDAssistant \u2192 Cloudflare deploy');
  console.log('==================================================');
  console.log('');
  console.log('This script deploys:');
  console.log('  \u2022 the Hono + TypeScript Worker  \u2192 dnd-assistant-api.<sub>.workers.dev');
  console.log('  \u2022 the consolidated D1 schema    \u2192 migrations/0001_initial.sql');
  console.log('  \u2022 the bundled content            \u2192 12 classes / 9 races / 396 spells / 152 gear / 409 monsters');
  console.log('');
  console.log('You only need to run this once per fresh Cloudflare account.');
  console.log('');

  const rl = createInterface({ input: stdin, output: stdout });

  try {
    await step(1, 'Authenticate with Cloudflare', ensureLoggedIn);
    await step(2, 'Create the production D1 database', ensureD1);
    await step(3, 'Apply migrations to the cloud D1', ensureMigrated);
    await step(4, 'Seed bundled content (SRD + Monster Manual)', ensureSeeded);
    await step(5, 'Set JWT_SECRET', () => ensureSecret(rl));
    await step(6, 'Deploy the Worker', ensureDeployed);
    await step(7, 'Post-deploy smoke test', smoke);

    console.log('');
    ok('Done.');
    console.log('');
    console.log('Next:');
    console.log('  1. Open Cloudflare dashboard \u2192 Workers & Pages \u2192 Pages \u2192 Create');
    console.log('  2. Connect this Git repo, build command "npm run build", output "build"');
    console.log('  3. Set REACT_APP_API_BASE = https://dnd-assistant-api.<sub>.workers.dev/api/v1');
    console.log('  4. After the first Pages deploy, add the Pages URL to');
    console.log('     FRONTEND_CORS_ORIGINS in worker/wrangler.toml and re-deploy the Worker:');
    console.log('       npm run deploy --prefix worker');
    console.log('');
  } catch (e) {
    err(`Deploy halted. Re-run \`node scripts/deploy.mjs\` once you've fixed the above;`);
    err('each step is idempotent and will pick up where it left off.');
    process.exitCode = 1;
  } finally {
    rl.close();
  }
};

main();

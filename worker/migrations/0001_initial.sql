-- Cloudflare D1 (SQLite) schema for the D&D Assistant API.
-- Consolidated from the Spring Boot / PostgreSQL Flyway migrations V1..V14.
-- D1 starts empty, so the incremental migrations (and their Postgres-specific
-- backfills, e.g. V14) are collapsed into this single end-state schema.
--
-- Postgres -> SQLite type mapping:
--   BIGSERIAL PK -> INTEGER PRIMARY KEY (auto rowid)
--   UUID PK      -> TEXT PRIMARY KEY (app-generated via crypto.randomUUID())
--   BOOLEAN      -> INTEGER (0/1)
--   JSONB        -> TEXT (JSON string)
--   TIMESTAMPTZ  -> TEXT (CURRENT_TIMESTAMP default; ISO-8601 from the app)
--   DATE         -> TEXT
--
-- Tables are ordered so foreign-key targets are created first. D1 enforces
-- foreign keys during normal operation (and defers them during migration).

-- ===== Content / reference tables ==========================================

CREATE TABLE IF NOT EXISTS spells (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  level         TEXT NOT NULL,
  school        TEXT NOT NULL,
  type          TEXT NOT NULL,
  casting_time  TEXT NOT NULL,
  spell_range   TEXT NOT NULL,
  duration      TEXT NOT NULL,
  ritual        INTEGER NOT NULL DEFAULT 0,
  description   TEXT NOT NULL DEFAULT '',
  higher_levels TEXT NOT NULL DEFAULT '',
  classes       TEXT NOT NULL DEFAULT '',
  tags          TEXT NOT NULL DEFAULT '',
  components    TEXT NOT NULL DEFAULT '{}',
  provenance    TEXT NOT NULL DEFAULT 'srd',
  owner_user_id TEXT,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (name, provenance, owner_user_id)
);
CREATE INDEX IF NOT EXISTS spells_name_idx ON spells (lower(name));
CREATE INDEX IF NOT EXISTS spells_level_idx ON spells (level);

CREATE TABLE IF NOT EXISTS monsters (
  id                     INTEGER PRIMARY KEY,
  name                   TEXT NOT NULL,
  meta                   TEXT NOT NULL DEFAULT '',
  ac                     TEXT NOT NULL DEFAULT '',
  hp                     TEXT NOT NULL DEFAULT '',
  speed                  TEXT NOT NULL DEFAULT '',
  str                    TEXT NOT NULL DEFAULT '',
  str_mod                TEXT NOT NULL DEFAULT '',
  dex                    TEXT NOT NULL DEFAULT '',
  dex_mod                TEXT NOT NULL DEFAULT '',
  con                    TEXT NOT NULL DEFAULT '',
  con_mod                TEXT NOT NULL DEFAULT '',
  "int"                  TEXT NOT NULL DEFAULT '',
  int_mod                TEXT NOT NULL DEFAULT '',
  wis                    TEXT NOT NULL DEFAULT '',
  wis_mod                TEXT NOT NULL DEFAULT '',
  cha                    TEXT NOT NULL DEFAULT '',
  cha_mod                TEXT NOT NULL DEFAULT '',
  saving_throws          TEXT NOT NULL DEFAULT '',
  skills                 TEXT NOT NULL DEFAULT '',
  damage_vulnerabilities TEXT NOT NULL DEFAULT '',
  damage_resistances     TEXT NOT NULL DEFAULT '',
  damage_immunities      TEXT NOT NULL DEFAULT '',
  condition_immunities   TEXT NOT NULL DEFAULT '',
  senses                 TEXT NOT NULL DEFAULT '',
  languages              TEXT NOT NULL DEFAULT '',
  challenge              TEXT NOT NULL DEFAULT '',
  traits                 TEXT NOT NULL DEFAULT '',
  actions                TEXT NOT NULL DEFAULT '',
  reactions              TEXT NOT NULL DEFAULT '',
  legendary_actions      TEXT NOT NULL DEFAULT '',
  description            TEXT NOT NULL DEFAULT '',
  lair_actions           TEXT NOT NULL DEFAULT '',
  regional_effects       TEXT NOT NULL DEFAULT '',
  img_url                TEXT NOT NULL DEFAULT '',
  provenance             TEXT NOT NULL DEFAULT 'homebrew',
  owner_user_id          TEXT,
  created_at             TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (name, provenance, owner_user_id)
);
CREATE INDEX IF NOT EXISTS monsters_name_idx ON monsters (lower(name));
CREATE INDEX IF NOT EXISTS monsters_meta_idx ON monsters (lower(meta));

CREATE TABLE IF NOT EXISTS gear (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  kind          TEXT NOT NULL CHECK (kind IN ('weapon', 'armour', 'gear')),
  cost          TEXT NOT NULL DEFAULT '',
  weight        TEXT NOT NULL DEFAULT '',
  type          TEXT NOT NULL DEFAULT '',
  damage        TEXT,
  properties    TEXT,
  ac            TEXT,
  strength      TEXT,
  stealth       TEXT,
  description   TEXT,
  provenance    TEXT NOT NULL DEFAULT 'homebrew',
  owner_user_id TEXT,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (name, kind, provenance, owner_user_id)
);
CREATE INDEX IF NOT EXISTS gear_name_idx ON gear (lower(name));
CREATE INDEX IF NOT EXISTS gear_kind_idx ON gear (kind);
CREATE INDEX IF NOT EXISTS gear_type_idx ON gear (lower(type));

CREATE TABLE IF NOT EXISTS classes (
  id              INTEGER PRIMARY KEY,
  name            TEXT NOT NULL UNIQUE,
  hit_die         TEXT NOT NULL DEFAULT 'd8',
  primary_ability TEXT NOT NULL DEFAULT '',
  description     TEXT NOT NULL DEFAULT '',
  source          TEXT NOT NULL DEFAULT 'srd'
);
CREATE INDEX IF NOT EXISTS classes_name_idx ON classes (lower(name));

CREATE TABLE IF NOT EXISTS races (
  id              INTEGER PRIMARY KEY,
  name            TEXT NOT NULL UNIQUE,
  size            TEXT NOT NULL DEFAULT 'Medium',
  speed           INTEGER NOT NULL DEFAULT 30,
  ability_bonuses TEXT NOT NULL DEFAULT '',
  traits          TEXT NOT NULL DEFAULT '',
  source          TEXT NOT NULL DEFAULT 'srd'
);
CREATE INDEX IF NOT EXISTS races_name_idx ON races (lower(name));

-- ===== Users ===============================================================

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  email         TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  display_name  TEXT,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS users_username_idx ON users (lower(username));
CREATE INDEX IF NOT EXISTS users_email_idx ON users (lower(email)) WHERE email IS NOT NULL;

-- ===== Characters ==========================================================

CREATE TABLE IF NOT EXISTS characters (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  race_id       INTEGER NOT NULL REFERENCES races(id) ON DELETE RESTRICT,
  class_id      INTEGER NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  level         INTEGER NOT NULL DEFAULT 1,
  alignment     TEXT NOT NULL DEFAULT 'Neutral',
  background    TEXT NOT NULL DEFAULT '',
  str           INTEGER NOT NULL DEFAULT 10,
  dex           INTEGER NOT NULL DEFAULT 10,
  con           INTEGER NOT NULL DEFAULT 10,
  int_          INTEGER NOT NULL DEFAULT 10,
  wis           INTEGER NOT NULL DEFAULT 10,
  cha           INTEGER NOT NULL DEFAULT 10,
  hp_max        INTEGER NOT NULL DEFAULT 10,
  ac            INTEGER NOT NULL DEFAULT 10,
  notes         TEXT NOT NULL DEFAULT '',
  owner_user_id TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS characters_owner_idx ON characters (owner_user_id);
CREATE INDEX IF NOT EXISTS characters_name_idx ON characters (lower(name));

-- ===== Campaigns (incl. V11 workflow columns) ==============================

CREATE TABLE IF NOT EXISTS campaigns (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  setting         TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'active',
  notes           TEXT NOT NULL DEFAULT '',
  owner_user_id   TEXT NOT NULL,
  next_session_on TEXT,
  cadence         TEXT NOT NULL DEFAULT '',
  started_on      TEXT,
  archived        INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS campaigns_owner_idx ON campaigns (owner_user_id);
CREATE INDEX IF NOT EXISTS campaigns_name_idx ON campaigns (lower(name));
CREATE INDEX IF NOT EXISTS campaigns_next_session_idx ON campaigns (next_session_on);
CREATE INDEX IF NOT EXISTS campaigns_archived_idx ON campaigns (archived);

-- ===== Parties =============================================================

CREATE TABLE IF NOT EXISTS parties (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  owner_user_id TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS parties_owner_idx ON parties (owner_user_id);

CREATE TABLE IF NOT EXISTS party_members (
  party_id     TEXT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  position     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (party_id, character_id)
);
CREATE INDEX IF NOT EXISTS party_members_party_idx ON party_members (party_id);
CREATE INDEX IF NOT EXISTS party_members_character_idx ON party_members (character_id);

-- ===== Campaign sessions ===================================================

CREATE TABLE IF NOT EXISTS campaign_sessions (
  id             TEXT PRIMARY KEY,
  campaign_id    TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  session_number INTEGER NOT NULL DEFAULT 1,
  title          TEXT NOT NULL DEFAULT '',
  played_on      TEXT,
  summary        TEXT NOT NULL DEFAULT '',
  prep_notes     TEXT NOT NULL DEFAULT '',
  attendees      TEXT NOT NULL DEFAULT '[]',
  created_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS campaign_sessions_campaign_idx ON campaign_sessions (campaign_id, played_on DESC);
CREATE INDEX IF NOT EXISTS campaign_sessions_number_idx ON campaign_sessions (campaign_id, session_number DESC);

-- ===== Campaign NPCs (incl. V14 globalization) =============================
-- campaign_id nullable; owner_user_id required; campaign_tags = JSON array text.

CREATE TABLE IF NOT EXISTS campaign_npcs (
  id            TEXT PRIMARY KEY,
  campaign_id   TEXT REFERENCES campaigns(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'Notable',
  race          TEXT NOT NULL DEFAULT '',
  alignment     TEXT NOT NULL DEFAULT '',
  description   TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'alive',
  location      TEXT NOT NULL DEFAULT '',
  monster_id    INTEGER REFERENCES monsters(id) ON DELETE SET NULL,
  notes         TEXT NOT NULL DEFAULT '',
  campaign_tags TEXT NOT NULL DEFAULT '',
  owner_user_id TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS campaign_npcs_campaign_idx ON campaign_npcs (campaign_id);
CREATE INDEX IF NOT EXISTS campaign_npcs_name_idx ON campaign_npcs (lower(name));
CREATE INDEX IF NOT EXISTS campaign_npcs_monster_idx ON campaign_npcs (monster_id);
CREATE INDEX IF NOT EXISTS campaign_npcs_owner_idx ON campaign_npcs (owner_user_id, lower(name));

-- ===== Character state =====================================================

CREATE TABLE IF NOT EXISTS character_state (
  character_id         TEXT PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  current_hp           INTEGER NOT NULL,
  temp_hp              INTEGER NOT NULL DEFAULT 0,
  conditions           TEXT NOT NULL DEFAULT '[]',
  death_save_successes INTEGER NOT NULL DEFAULT 0,
  death_save_failures  INTEGER NOT NULL DEFAULT 0,
  hit_dice_used        INTEGER NOT NULL DEFAULT 0,
  last_long_rest       TEXT,
  last_short_rest      TEXT,
  updated_at           TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS character_state_updated_idx ON character_state (updated_at DESC);

-- ===== Encounter saves =====================================================

CREATE TABLE IF NOT EXISTS encounter_saves (
  id                  TEXT PRIMARY KEY,
  owner_user_id       TEXT NOT NULL,
  campaign_id         TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
  name                TEXT NOT NULL DEFAULT '',
  monsters_json       TEXT NOT NULL DEFAULT '[]',
  party_snapshot_json TEXT NOT NULL DEFAULT '[]',
  difficulty          TEXT NOT NULL DEFAULT '',
  total_xp            INTEGER NOT NULL DEFAULT 0,
  played_on           TEXT,
  notes               TEXT NOT NULL DEFAULT '',
  created_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS encounter_saves_owner_idx ON encounter_saves (owner_user_id, played_on DESC);
CREATE INDEX IF NOT EXISTS encounter_saves_campaign_idx ON encounter_saves (campaign_id);

-- ===== Per-campaign character override layer (V12) =========================

CREATE TABLE IF NOT EXISTS campaign_characters (
  id                   TEXT PRIMARY KEY,
  campaign_id          TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  character_id         TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  level                INTEGER NOT NULL DEFAULT 1,
  hp_max_override      INTEGER,
  ac_override          INTEGER,
  notes                TEXT NOT NULL DEFAULT '',
  conditions           TEXT NOT NULL DEFAULT '[]',
  death_save_successes INTEGER NOT NULL DEFAULT 0,
  death_save_failures  INTEGER NOT NULL DEFAULT 0,
  hit_dice_used        INTEGER NOT NULL DEFAULT 0,
  last_long_rest       TEXT,
  last_short_rest      TEXT,
  created_at           TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (campaign_id, character_id)
);
CREATE INDEX IF NOT EXISTS campaign_characters_campaign_idx ON campaign_characters (campaign_id);
CREATE INDEX IF NOT EXISTS campaign_characters_character_idx ON campaign_characters (character_id);

-- ===== Campaign <-> party junction (V13) ===================================

CREATE TABLE IF NOT EXISTS campaign_parties (
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  party_id    TEXT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL DEFAULT 0,
  added_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (campaign_id, party_id)
);
CREATE INDEX IF NOT EXISTS campaign_parties_party_idx ON campaign_parties (party_id);

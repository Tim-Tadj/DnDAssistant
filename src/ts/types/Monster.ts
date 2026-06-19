// Monsters are loaded from the backend API (see src/ts/api/monsters.ts).
// The bundled SRD / Monster Manual files are still used as seed sources
// by `worker/seed/generate.mjs`, but the frontend reads from
// `/api/v1/monsters` so any user-created (homebrew) monsters show up
// too.
//
// Wire shape (snake_case) matches the Worker route at
// `worker/src/routes/monsters.ts` and the D1 column names. This is the
// same convention as `Spell` and `Gear` — the previous PascalCase
// type matched the bundled JSON, but since the API is the source of
// truth, the type mirrors the API.

export const PLACEHOLDER_IMAGES = {
  humanoid: "https://media-waterdeep.cursecdn.com/attachments/2/656/humanoid.jpg",
  undead: "https://media-waterdeep.cursecdn.com/attachments/2/660/undead.jpg",
  beast: "https://media-waterdeep.cursecdn.com/attachments/2/648/beast.jpg",
  plant: "https://media-waterdeep.cursecdn.com/attachments/2/659/plant.jpg",
  ooze: "https://media-waterdeep.cursecdn.com/attachments/2/658/ooze.jpg"
};

export const resolveImgUrl = (imgUrl: string): string => {
  if (!imgUrl) return PLACEHOLDER_IMAGES.humanoid;
  if (/^https?:\/\//i.test(imgUrl)) return imgUrl;
  return `${process.env.PUBLIC_URL || ''}/${imgUrl}`;
};

export type Monster = {
  id?: number,
  name: string,
  meta: string,
  ac: string,
  hp: string,
  speed: string,
  str: string,
  str_mod: string,
  dex: string,
  dex_mod: string,
  con: string,
  con_mod: string,
  int: string,
  int_mod: string,
  wis: string,
  wis_mod: string,
  cha: string,
  cha_mod: string,
  saving_throws: string | undefined,
  skills: string | undefined,
  damage_vulnerabilities: string | undefined,
  damage_resistances: string | undefined,
  damage_immunities: string | undefined,
  condition_immunities: string | undefined,
  senses: string,
  languages: string,
  challenge: string,
  traits: string | undefined,
  actions: string,
  reactions: string | undefined,
  legendary_actions: string | undefined,
  description?: string,
  lair_actions?: string,
  regional_effects?: string,
  img_url: string,
  provenance: string,
};

export const defaultMonster = {
  name: "",
  meta: "Medium humanoid, any",
  ac: "12",
  hp: "10",
  speed: "30ft.",
  str: "10",
  str_mod: "(+0)",
  dex: "10",
  dex_mod: "(+0)",
  con: "10",
  con_mod: "(+0)",
  int: "10",
  int_mod: "(+0)",
  wis: "10",
  wis_mod: "(+0)",
  cha: "10",
  cha_mod: "(+0)",
  senses: "Passive Perception 10",
  languages: "--",
  challenge: "1/4 (50 XP)",
  actions: "",
  img_url: PLACEHOLDER_IMAGES.humanoid,
  provenance: "homebrew",
};

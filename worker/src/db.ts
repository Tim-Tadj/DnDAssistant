// Thin helpers over the D1 prepared-statement API so route code reads
// like the old NamedParameterJdbcTemplate calls. D1 uses positional `?`
// placeholders bound in order.

export async function all<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  ...params: unknown[]
): Promise<T[]> {
  const { results } = await db
    .prepare(sql)
    .bind(...params)
    .all<T>();
  return results ?? [];
}

export async function first<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  ...params: unknown[]
): Promise<T | null> {
  const row = await db
    .prepare(sql)
    .bind(...params)
    .first<T>();
  return row ?? null;
}

export async function run(
  db: D1Database,
  sql: string,
  ...params: unknown[]
): Promise<D1Result> {
  return db
    .prepare(sql)
    .bind(...params)
    .run();
}

/** Coerce null/undefined to '' — mirrors the backend's nullToEmpty. */
export const str = (v: unknown): string => (v == null ? '' : String(v));

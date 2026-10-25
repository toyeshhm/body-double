// Postgres for Tiger Data (TimescaleDB), used when DATABASE_URL is set. Server-only.
// Two kinds of data, kept apart on purpose:
//   rooms       one row per live village, wiped when the tale ends, swept after 2 hours idle (privacy)
//   wolf_votes  an anonymous time series: one row per vote, just (time, chapter, fooled). No names,
//               no answers, no room code. It powers the "the Wolf gets smarter each chapter" curve.
//   voice_budget  one row per day (Austin time): spoken answers sent to speech-to-text across every game.
import postgres from "postgres";
import { log } from "../log";

let client: postgres.Sql | null = null;
let ready: Promise<boolean> | null = null;

export function db(): postgres.Sql | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  // prepare:false keeps us compatible with transaction-mode connection poolers (Tiger Cloud, Vercel functions).
  client ??= postgres(url, { max: 3, idle_timeout: 20, connect_timeout: 10, prepare: false, onnotice: () => undefined });
  return client;
}

const CORE = `
create table if not exists rooms (
  code text primary key,
  version integer not null default 0,
  state jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists rooms_updated_at_idx on rooms (updated_at);
create table if not exists wolf_votes (
  time timestamptz not null default now(),
  chapter smallint not null,
  fooled boolean not null
);
create table if not exists voice_budget (
  day date primary key,
  uses integer not null default 0
);`;

// TimescaleDB features. Each is idempotent; on plain Postgres they fail and the curve falls back to raw SQL.
const TIMESCALE = [
  `select create_hypertable('wolf_votes', by_range('time', interval '1 day'), if_not_exists => true)`,
  `alter table wolf_votes set (timescaledb.compress, timescaledb.compress_segmentby = 'chapter', timescaledb.compress_orderby = 'time desc')`,
  `select add_compression_policy('wolf_votes', interval '7 days', if_not_exists => true)`,
  `create materialized view if not exists wolf_curve
     with (timescaledb.continuous, timescaledb.materialized_only = false) as
   select time_bucket(interval '15 minutes', time) as bucket, chapter,
          count(*)::int as votes, (count(*) filter (where fooled))::int as fooled
   from wolf_votes group by bucket, chapter with no data`,
  `select add_continuous_aggregate_policy('wolf_curve', start_offset => interval '3 days',
     end_offset => interval '1 minute', schedule_interval => interval '1 minute', if_not_exists => true)`,
];

/**
 * Creates the schema once per process. Resolves true when TimescaleDB features are on.
 * An advisory lock stops two cold-starting functions from racing on the same DDL.
 */
export function ensureSchema(sql: postgres.Sql): Promise<boolean> {
  ready ??= (async () => {
    await sql.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(7731)`;
      await tx.unsafe(CORE);
    });
    let timescale = true;
    for (const stmt of TIMESCALE) {
      try {
        await sql.unsafe(stmt);
      } catch (err) {
        // Re-running on an existing setup can refuse a no-op change; only a missing hypertable turns features off.
        if (stmt.includes("create_hypertable")) timescale = false;
        log.warn("db.timescale_step", { ok: false, error: String(err).slice(0, 160) });
      }
    }
    log.info("db.ready", { timescale });
    return timescale;
  })().catch((err: unknown) => {
    ready = null; // let the next request try again instead of failing forever
    throw err;
  });
  return ready;
}

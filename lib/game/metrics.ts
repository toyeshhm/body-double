// "Is the Wolf getting smarter?" Every revealed vote becomes one anonymous event (chapter, fooled);
// the curve is the fooled-rate per chapter across every village in the last 24 hours.
// Tiger Data (TimescaleDB) stores it as a hypertable with a continuous aggregate; locally it lives in memory.
import { log } from "../log";
import { db, ensureSchema } from "./db";
import { activeTarget, currentRound, realChoice } from "./machine";
import type { Phase, Room } from "./types";

export type CurvePoint = { chapter: number; votes: number; fooled: number };
type Vote = { chapter: number; fooled: boolean };
type Snapshot = { phase: Phase; rounds: number; active: number };

const DAY_MS = 24 * 60 * 60 * 1000;
const memo = globalThis as typeof globalThis & { __bodyDoubleVotes?: (Vote & { at: number })[] };
const memory = (memo.__bodyDoubleVotes ??= []);

export function snapshot(room: Room): Snapshot {
  return { phase: room.phase, rounds: room.rounds.length, active: currentRound(room)?.active ?? 0 };
}

/** The votes that were just revealed, if this change moved the room into a new REVEAL. */
export function revealedVotes(before: Snapshot, room: Room): Vote[] {
  const round = currentRound(room);
  if (room.phase !== "REVEAL" || !round) return [];
  if (before.phase === "REVEAL" && before.rounds === room.rounds.length && before.active === round.active) return [];
  const target = activeTarget(round);
  const real = target ? realChoice(round, target) : undefined;
  if (!target || !real) return [];
  return Object.values(round.votes[target] ?? {}).map((choice) => ({ chapter: round.n, fooled: choice !== real }));
}

/** Never throws: losing a data point must not break a game. */
export async function recordVotes(votes: Vote[]): Promise<void> {
  if (votes.length === 0) return;
  const sql = db();
  if (!sql) {
    const now = Date.now();
    memory.push(...votes.map((v) => ({ ...v, at: now })));
    return;
  }
  try {
    await ensureSchema(sql);
    await sql`insert into wolf_votes ${sql(votes, "chapter", "fooled")}`;
  } catch (err) {
    log.warn("metrics.record", { ok: false, error: String(err).slice(0, 160) });
  }
}

export async function wolfCurve(): Promise<CurvePoint[]> {
  const sql = db();
  if (!sql) {
    const since = Date.now() - DAY_MS;
    const byChapter = new Map<number, CurvePoint>();
    for (const v of memory.filter((m) => m.at > since)) {
      const p = byChapter.get(v.chapter) ?? { chapter: v.chapter, votes: 0, fooled: 0 };
      p.votes += 1;
      if (v.fooled) p.fooled += 1;
      byChapter.set(v.chapter, p);
    }
    return [...byChapter.values()].sort((a, b) => a.chapter - b.chapter);
  }
  const timescale = await ensureSchema(sql);
  const rows = timescale
    ? await sql<CurvePoint[]>`
        select chapter::int, sum(votes)::int as votes, sum(fooled)::int as fooled
        from wolf_curve where bucket > now() - interval '24 hours'
        group by chapter order by chapter`
    : await sql<CurvePoint[]>`
        select chapter::int, count(*)::int as votes, (count(*) filter (where fooled))::int as fooled
        from wolf_votes where time > now() - interval '24 hours'
        group by chapter order by chapter`;
  return [...rows];
}

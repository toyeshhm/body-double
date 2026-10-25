// Tonight's budgets across every game (Austin time), so scripted rooms can't drain the paid APIs.
// voice: speech-to-text, on top of the per-player and per-room caps in lib/game/http.ts.
// places: SerpApi searches for the quests (lib/ai/places.ts), about 4 per finished game.
import { log } from "../log";
import { db, ensureSchema } from "./db";

// ponytail: flat numbers for the whole site. A HackTX night is a few dozen games; raise them if real groups hit them.
export const NIGHTLY = { voice: 300, places: 100 } as const;
const TABLE = { voice: "voice_budget", places: "place_budget" } as const;
type Kind = keyof typeof NIGHTLY;

const memo = globalThis as typeof globalThis & { __bodyDoubleBudget?: Record<string, { day: string; uses: number }> };
const austinDay = (): string => new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });

/** Takes one use from tonight's budget. False once it's spent, or when the database can't say (fail closed). */
export async function takeBudget(kind: Kind): Promise<boolean> {
  const sql = db();
  if (!sql) {
    const day = austinDay();
    const budgets = (memo.__bodyDoubleBudget ??= {});
    const uses = budgets[kind]?.day === day ? budgets[kind].uses : 0;
    if (uses >= NIGHTLY[kind]) return false;
    budgets[kind] = { day, uses: uses + 1 };
    return true;
  }
  try {
    await ensureSchema(sql);
    // One statement, so parallel games can't both take the last use.
    const rows = await sql`
      insert into ${sql(TABLE[kind])} as b (day, uses) values ((now() at time zone 'America/Chicago')::date, 1)
      on conflict (day) do update set uses = b.uses + 1 where b.uses < ${NIGHTLY[kind]}
      returning uses`;
    return rows.length === 1;
  } catch (err) {
    log.warn("budget", { kind, ok: false, error: String(err).slice(0, 160) });
    return false;
  }
}

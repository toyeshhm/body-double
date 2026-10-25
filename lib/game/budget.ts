// Tonight's speech-to-text budget across every game (Austin time), so scripted rooms can't drain the AI credits.
// Sits on top of the per-player and per-room caps in lib/game/http.ts.
import { log } from "../log";
import { db, ensureSchema } from "./db";

// ponytail: one flat number for the whole site. A HackTX night is a few dozen games; raise it if real groups hit it.
export const MAX_VOICE_PER_NIGHT = 300;

const memo = globalThis as typeof globalThis & { __bodyDoubleVoice?: { day: string; uses: number } };
const austinDay = (): string => new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });

/** Takes one recording from tonight's budget. False once it's spent, or when the database can't say (fail closed). */
export async function takeVoiceBudget(): Promise<boolean> {
  const sql = db();
  if (!sql) {
    const day = austinDay();
    const uses = memo.__bodyDoubleVoice?.day === day ? memo.__bodyDoubleVoice.uses : 0;
    if (uses >= MAX_VOICE_PER_NIGHT) return false;
    memo.__bodyDoubleVoice = { day, uses: uses + 1 };
    return true;
  }
  try {
    await ensureSchema(sql);
    // One statement, so parallel games can't both take the last recording.
    const rows = await sql`
      insert into voice_budget (day, uses) values ((now() at time zone 'America/Chicago')::date, 1)
      on conflict (day) do update set uses = voice_budget.uses + 1 where voice_budget.uses < ${MAX_VOICE_PER_NIGHT}
      returning uses`;
    return rows.length === 1;
  } catch (err) {
    log.warn("voice.budget", { ok: false, error: String(err).slice(0, 160) });
    return false;
  }
}

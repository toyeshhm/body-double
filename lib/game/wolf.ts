// The Wolf's background work (spec 6, 8). The machine stays timer-free: a phase change saved by a
// request starts this work after the response, via waitUntil on Vercel (a plain floating promise locally),
// and results land through updateRoom like any other write. Any AI failure falls back to the stub fake.
import { setTimeout as sleep } from "node:timers/promises";
import { waitUntil } from "@vercel/functions";
import { learnStyle, moderate, paintPoster, writeFake, writePlans, writeRecap } from "../ai/prompts";
import { log } from "../log";
import { currentRound, deliverFake, deliverPlans, deliverRecap, list, skipAnswer } from "./machine";
import { updateRoom } from "./store";
import { fakeAnswer, stubPlans, stubRecap } from "./stubs";
import type { Phase, Player, Room } from "./types";

const DRESS_MS = 2400; // the "Wolf is dressing" beat always plays, even when the stub answers instantly
// Room for one provider timeout plus the fallback (or ~3 calls of the local Claude CLI). The machine's
// 25s GENERATING deadline is the backstop if this work is lost entirely.
const BUDGET_MS = 20_000;
// Plans and recap start when MAP opens. Whatever isn't ready when the host turns the page is replaced by the stub.
const ENDING_BUDGET_MS = 45_000;

function describe(err: unknown): string {
  return (err instanceof Error ? `${err.name}: ${err.message}` : String(err)).slice(0, 200);
}

function background(name: string, work: Promise<void>): void {
  waitUntil(
    work.catch((err: unknown) => {
      log.error("wolf.failed", { job: name, error: describe(err) });
    }),
  );
}

function within<T>(ms: number, work: Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const late = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`over ${String(ms)}ms budget`));
    }, ms);
  });
  return Promise.race([work, late]).finally(() => {
    clearTimeout(timer);
  });
}

/**
 * Called after every saved room write with the phase it started from. Kicks off spec 6a after each
 * answer batch (warmup, then each round), 6b on entering GENERATING, and 6d/6e plus the recap on
 * entering MAP. Only the request whose write made the change sees it, so each job starts once.
 */
export function afterWrite(from: { phase: Phase; round: number }, room: Room): void {
  const n = room.rounds.length;
  if (room.phase === "ENDED") return;
  if (room.phase === "MAP" && from.phase !== "MAP") background("ending", writeEnding(room));
  const fakes = room.phase === "GENERATING" && (from.phase !== "GENERATING" || n !== from.round) ? writeFakes(room) : null;
  if (fakes) background("fakes", fakes);
  const batch =
    from.phase === "WARMUP" && room.phase !== "WARMUP"
      ? 0
      : from.phase === "ANSWERING" && (room.phase !== "ANSWERING" || n !== from.round)
        ? from.round
        : null;
  if (batch === null) return;
  // Profiles wait for the fakes so they never compete with them for the provider's rate limit.
  // A fakes failure is already logged by its own background() above.
  const afterFakes = fakes ? fakes.catch(() => undefined) : Promise.resolve();
  background("style", afterFakes.then(() => learnStyles(room, batch)));
}

/** Spec 6b + 8 for every target of the current round. Each fake is written the moment it is ready. */
async function writeFakes(room: Room): Promise<void> {
  const round = currentRound(room);
  if (!round) return;
  const started = Date.now();
  await Promise.all(
    round.targetIds.map(async (id) => {
      const target = room.players[id];
      const real = round.answers[id];
      if (!target || real === undefined) return;
      const others = Object.entries(round.answers)
        .filter(([pid]) => pid !== id)
        .map(([, text]) => text);
      const [[realBlocked = false], fake] = await Promise.all([
        moderate([real]).catch(() => [false]), // fail open on a player's own words; the fake fails closed below
        fakeOrStub(target, real, () => writeFake({ question: round.prompt.text, round: round.n, target, real, others })),
      ]);
      await sleep(Math.max(0, started + DRESS_MS - Date.now()));
      await updateRoom(room.code, (r) => {
        const skipped = realBlocked && skipAnswer(r, id, round.prompt.id, real);
        const delivered = deliverFake(r, round.n, id, realBlocked ? fakeAnswer(target, real) : fake);
        return { result: null, dirty: skipped || delivered };
      });
    }),
  );
}

async function fakeOrStub(target: Player, real: string, write: () => Promise<string>): Promise<string> {
  const started = Date.now();
  try {
    const fake = await within(
      BUDGET_MS,
      write().then(async (text) => ((await moderate([text]))[0] ? null : text)),
    );
    log.info("wolf.fake", { source: fake === null ? "stub_blocked" : "ai", ms: Date.now() - started });
    return fake ?? fakeAnswer(target, real);
  } catch (err) {
    log.warn("wolf.fake", { source: "stub_fallback", ms: Date.now() - started, error: describe(err) });
    return fakeAnswer(target, real);
  }
}

/** Spec 8 then 6a for one answer batch (round 0 is the warmup): moderate every new answer, then refresh each writer's profile. */
async function learnStyles(room: Room, round: number): Promise<void> {
  const writers = list(room).filter((p) => p.answers.some((a) => a.round === round));
  if (writers.length === 0) return;
  const fresh = writers.flatMap((p) => p.answers.filter((a) => a.round === round).map((a) => ({ playerId: p.id, ...a })));
  const verdicts = await moderate(fresh.map((a) => a.text)).catch(() => fresh.map(() => false)); // fail open, as above
  const blocked = fresh.filter((_, i) => verdicts[i]);
  const isBlocked = (p: Player, a: Player["answers"][number]): boolean =>
    blocked.some((b) => b.playerId === p.id && b.promptId === a.promptId && b.text === a.text);
  const profiles = await Promise.all(
    writers.map(async (p) => {
      try {
        return { id: p.id, profile: await learnStyle({ ...p, answers: p.answers.filter((a) => !isBlocked(p, a)) }) };
      } catch (err) {
        log.warn("wolf.style", { ok: false, error: describe(err) });
        return null;
      }
    }),
  );
  const learned = profiles.filter((p) => p !== null);
  log.info("wolf.style", { room: room.code, round, players: learned.length, blocked: blocked.length });
  if (blocked.length === 0 && learned.length === 0) return;
  await updateRoom(room.code, (r) => {
    if (r.phase === "ENDED") return { result: null, dirty: false }; // the tale is over and wiped: learn nothing
    for (const b of blocked) skipAnswer(r, b.playerId, b.promptId, b.text);
    for (const { id, profile } of learned) {
      const player = r.players[id];
      if (player) Object.assign(player.style, profile);
    }
    return { result: null, dirty: true };
  });
}

/** M3: plans then poster (spec 6d, 6e) and the recap, written while the room looks at the map. */
async function writeEnding(room: Room): Promise<void> {
  const code = room.code;
  const plansThenPoster = async (): Promise<void> => {
    const plans = await within(ENDING_BUDGET_MS, writePlans(room)).catch((err: unknown) => {
      log.warn("wolf.plans", { source: "stub_fallback", error: describe(err) });
      return stubPlans(room);
    });
    const out = await updateRoom(code, (r) => ({ result: null, dirty: deliverPlans(r, plans) }));
    // Paint whichever plans the room ended up showing: the Wolf's, or the stub if the host moved on first.
    const prompt = out?.room.phase === "ENDED" ? undefined : out?.room.plans?.groupPlan.posterPrompt;
    if (!prompt) return;
    const url = await paintPoster(prompt).catch((err: unknown) => {
      log.warn("wolf.poster", { ok: false, error: describe(err) });
      return null;
    });
    if (!url) return;
    await updateRoom(code, (r) => {
      const plan = r.phase === "ENDED" ? undefined : r.plans?.groupPlan;
      if (plan?.posterPrompt !== prompt) return { result: null, dirty: false };
      plan.posterUrl = url;
      return { result: null, dirty: true };
    });
  };
  const recap = async (): Promise<void> => {
    const story = await within(ENDING_BUDGET_MS, writeRecap(room)).catch((err: unknown) => {
      log.warn("wolf.recap", { source: "stub_fallback", error: describe(err) });
      return stubRecap(room);
    });
    await updateRoom(code, (r) => ({ result: null, dirty: deliverRecap(r, story) }));
  };
  await Promise.all([plansThenPoster(), recap()]);
}

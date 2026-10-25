// The game state machine (spec 4):
//   LOBBY -> WARMUP -> [ROUND x N] -> MAP -> NOTEBOOK -> PLANS -> RECAP -> ENDED
//   ROUND = PROMPT -> ANSWERING -> GENERATING -> VOTING -> REVEAL -> TELLS
// No timers: deadlines and bot moves are stored on the room and applied by tick(), which every
// request runs first. That keeps it correct on serverless (Vercel), where nothing outlives a request.
import { PROMPTS, WARMUP_PROMPTS } from "../../data/prompts";
import { log } from "../log";
import { botAnswer, botTell, botVote } from "./bots";
import { knownBy } from "./map";
import { pickOne, shuffle } from "./random";
import { fakeAnswer, stubPlans, stubRecap } from "./stubs";
import { SKIPPED, updateStyleStats } from "./style";
import type { Choice, Phase, Plans, Player, Recap, Room, Round } from "./types";

const PROMPT_MS = 4500;
// Fallback only: lib/game/wolf.ts writes the fakes in the background. If that work is lost (a killed
// serverless instance), the stub fakes go up after this long so the game never stalls.
const GENERATING_MS = 25_000;
const STALE_MS = 20_000; // a phone silent this long no longer holds up answering or voting
export const MAX_ANSWER = 140;
export const MAX_TELL = 80;

// ---- helpers

export function list(room: Room): Player[] {
  return Object.values(room.players);
}
export function isConnected(p: Player, now = Date.now()): boolean {
  return p.isBot || now - p.lastSeen < STALE_MS;
}
function present(p: Player): boolean {
  return p.consented && isConnected(p);
}
export function currentRound(room: Room): Round | undefined {
  return room.rounds.at(-1);
}
export function activeTarget(round: Round): string | undefined {
  return round.targetIds[round.active];
}
export function realChoice(round: Round, targetId: string): Choice | undefined {
  const slots = round.slots[targetId];
  if (!slots) return undefined;
  return slots.A === "real" ? "A" : "B";
}
export function warmupDone(room: Room, p: Player): boolean {
  return room.warmup.every((w) => p.answers.some((a) => a.promptId === w.id));
}

// ---- time

/** Applies whatever is due: bot moves, then an expired deadline. Returns true if the room changed. */
export function tick(room: Room, now = Date.now()): boolean {
  let changed = false;
  for (let guard = 0; guard < 50; guard++) {
    const due = room.botQueue.filter((m) => m.at <= now);
    if (due.length > 0) {
      room.botQueue = room.botQueue.filter((m) => m.at > now);
      for (const move of due) if (room.phase === move.phase && room.rounds.length === move.round) botMove(room, move.botId);
      changed = true;
      continue;
    }
    const round = currentRound(room);
    if (room.phase === "GENERATING" && round && round.targetIds.length > 0 && round.targetIds.every((id) => round.fakes[id] !== undefined)) {
      enter(room, "VOTING");
      changed = true;
      continue;
    }
    if (room.deadline !== null && room.deadline <= now) {
      expire(room);
      changed = true;
      continue;
    }
    return changed;
  }
  return changed;
}

function expire(room: Room): void {
  room.deadline = null;
  const round = currentRound(room);
  if (room.phase === "PROMPT") enter(room, "ANSWERING");
  else if (room.phase === "ANSWERING") enter(room, "GENERATING");
  else if (room.phase === "VOTING") enter(room, "REVEAL");
  else if (room.phase === "GENERATING" && round) {
    fillFakes(room, round);
    enter(room, "VOTING");
  }
}

function queueBots(room: Room): void {
  const now = Date.now();
  room.botQueue = list(room)
    .filter((p) => p.isBot)
    .map((bot) => ({ at: now + 900 + Math.random() * 3600, botId: bot.id, phase: room.phase, round: room.rounds.length }));
}

function botMove(room: Room, botId: string): void {
  const bot = room.players[botId];
  const round = currentRound(room);
  if (!bot) return;
  if (room.phase === "WARMUP") {
    room.warmup.forEach((w) => submitAnswer(room, bot.id, w.id, botAnswer(bot)));
    return;
  }
  if (!round) return;
  const targetId = activeTarget(round);
  const real = targetId ? realChoice(round, targetId) : undefined;
  if (room.phase === "ANSWERING") submitAnswer(room, bot.id, round.prompt.id, botAnswer(bot));
  else if (room.phase === "VOTING" && targetId && real && bot.id !== targetId) submitVote(room, bot.id, targetId, botVote(real));
  else if (room.phase === "REVEAL" && targetId && round.votes[targetId]?.[bot.id] === real) {
    const tell = botTell(bot);
    if (tell) submitTell(room, bot.id, targetId, tell);
  }
}

// ---- transitions

function enter(room: Room, phase: Phase): void {
  const now = Date.now();
  room.phase = phase;
  room.deadline = null;
  room.botQueue = [];
  room.lastActive = now;
  switch (phase) {
    case "PROMPT":
      room.deadline = now + PROMPT_MS;
      break;
    case "ANSWERING":
      room.deadline = now + room.settings.answerSeconds * 1000;
      break;
    case "GENERATING":
      dressTheWolf(room, now);
      break;
    case "VOTING":
      room.deadline = now + room.settings.voteSeconds * 1000;
      break;
    case "REVEAL":
      scoreActive(room);
      break;
    case "PLANS":
      room.plans ??= stubPlans(room); // the Wolf's plans if they landed during MAP, else the stub: never block the host
      break;
    case "RECAP":
      room.recap ??= stubRecap(room);
      break;
    case "ENDED":
      forgetEverything(room);
      break;
    case "LOBBY":
    case "WARMUP":
    case "TELLS":
    case "MAP":
    case "NOTEBOOK":
      break;
  }
  if (["WARMUP", "ANSWERING", "VOTING", "REVEAL"].includes(phase)) queueBots(room);
  log.info("phase", { room: room.code, phase, round: room.rounds.length });
}

/** Privacy (spec 8): the moment the tale ends, every answer, profile, vote and name is wiped. */
function forgetEverything(room: Room): void {
  room.players = {};
  room.rounds = [];
  room.warmup = [];
  room.knows = {};
  room.plans = null;
  room.recap = null;
  room.wolf = { fooled: 0, total: 0 };
}

export function startGame(room: Room): string | null {
  if (room.phase !== "LOBBY") return "The tale has already begun.";
  const ready = list(room).filter(present);
  if (ready.length < 2) return "At least two villagers need to agree before the tale can begin.";
  if (!ready.some((p) => p.canBeTarget)) return "Someone has to let the Wolf borrow their voice.";
  room.warmup = [...WARMUP_PROMPTS];
  enter(room, "WARMUP");
  return null;
}

/** host:next. Moves the story forward one beat from wherever it is (and skips any timer). */
export function advance(room: Room): string | null {
  const round = currentRound(room);
  switch (room.phase) {
    case "LOBBY":
      return startGame(room);
    case "WARMUP":
      startRound(room);
      return null;
    case "PROMPT":
      enter(room, "ANSWERING");
      return null;
    case "ANSWERING":
      enter(room, "GENERATING");
      return null;
    case "GENERATING":
      if (!round || round.targetIds.length === 0) finishRound(room);
      else {
        fillFakes(room, round);
        enter(room, "VOTING");
      }
      return null;
    case "VOTING":
      enter(room, "REVEAL");
      return null;
    case "REVEAL":
      enter(room, "TELLS");
      return null;
    case "TELLS":
      if (round && round.active < round.targetIds.length - 1) {
        round.active += 1;
        enter(room, "VOTING");
      } else finishRound(room);
      return null;
    case "MAP":
      enter(room, "NOTEBOOK");
      return null;
    case "NOTEBOOK":
      enter(room, "PLANS");
      return null;
    case "PLANS":
      enter(room, "RECAP");
      return null;
    case "RECAP":
      enter(room, "ENDED");
      return null;
    case "ENDED":
      return "The tale has ended.";
  }
}

function startRound(room: Room): void {
  const n = room.rounds.length + 1;
  const fresh = PROMPTS.filter((p) => !room.usedPrompts.includes(p.id));
  const prompt = pickOne(fresh.length > 0 ? fresh : PROMPTS);
  const { ids, reason } = pickTargets(room, n);
  if (!prompt || ids.length === 0) {
    enter(room, "MAP");
    return;
  }
  room.usedPrompts.push(prompt.id);
  room.rounds.push({
    n,
    prompt,
    targetIds: ids,
    active: 0,
    targetReason: reason,
    answers: {},
    fakes: {},
    slots: {},
    votes: {},
    tells: {},
    vetoed: [],
  });
  enter(room, "PROMPT");
}

function finishRound(room: Room): void {
  if (room.rounds.length >= room.settings.rounds) enter(room, "MAP");
  else startRound(room);
}

/** Rounds 1-2: random, no repeats until everyone has gone. Round 3+: lean toward whoever the room knows least. */
function pickTargets(room: Room, n: number): { ids: string[]; reason: string | null } {
  const pool = list(room).filter((p) => present(p) && p.canBeTarget);
  const count = list(room).filter(present).length >= 7 ? 2 : 1;
  let fresh = pool.filter((p) => !room.usedTargets.includes(p.id));
  if (fresh.length < count) {
    room.usedTargets = [];
    fresh = pool;
  }
  let chosen = shuffle(fresh).slice(0, count);
  let reason: string | null = null;
  if (n >= 3) {
    const scored = shuffle(fresh).map((p) => ({ p, k: knownBy(room, p.id) ?? 0 }));
    chosen = scored
      .sort((x, y) => x.k - y.k)
      .slice(0, count)
      .map((s) => s.p);
    const first = scored.find((s) => s.p === chosen[0]);
    if (first && first.k < 0.5) reason = `The Wolf noticed nobody really knows ${first.p.name} yet. ${first.p.name} is up.`;
  }
  room.usedTargets.push(...chosen.map((p) => p.id));
  return { ids: chosen.map((p) => p.id), reason };
}

function dressTheWolf(room: Room, now: number): void {
  const round = currentRound(room);
  if (!round) return;
  // A target who stayed silent can't be impersonated this round.
  round.targetIds = round.targetIds.filter((id) => round.answers[id] !== undefined);
  if (round.targetIds.length === 0) {
    finishRound(room);
    return;
  }
  room.deadline = now + GENERATING_MS;
}

function setFake(round: Round, targetId: string, text: string): void {
  round.fakes[targetId] = text;
  round.slots[targetId] = Math.random() < 0.5 ? { A: "real", B: "fake" } : { A: "fake", B: "real" };
}

/** Stub fakes for any target the Wolf hasn't finished (spec 6b fallback). */
function fillFakes(room: Room, round: Round): void {
  for (const id of round.targetIds) {
    const target = room.players[id];
    if (target && round.fakes[id] === undefined) setFake(round, id, fakeAnswer(target, round.answers[id] ?? ""));
  }
}

/** A fake the Wolf finished in the background. Ignored once round `n` has moved past GENERATING. */
export function deliverFake(room: Room, n: number, targetId: string, text: string): boolean {
  const round = currentRound(room);
  if (room.phase !== "GENERATING" || round?.n !== n || round.fakes[targetId] !== undefined) return false;
  setFake(round, targetId, text);
  tick(room); // the last fake in moves the room to VOTING
  return true;
}

/** Spec 6d plans from the background. Taken until the quests page opens; after that the stub stands. */
export function deliverPlans(room: Room, plans: Plans): boolean {
  if ((room.phase !== "MAP" && room.phase !== "NOTEBOOK") || room.plans) return false;
  room.plans = plans;
  return true;
}

/** The AI recap, taken until the RECAP page opens. */
export function deliverRecap(room: Room, recap: Recap): boolean {
  if ((room.phase !== "MAP" && room.phase !== "NOTEBOOK" && room.phase !== "PLANS") || room.recap) return false;
  room.recap = recap;
  return true;
}

/** Spec 8: replaces a blocked answer everywhere it is kept, so it is never shown or fed to a prompt again. */
export function skipAnswer(room: Room, playerId: string, promptId: string, text: string): boolean {
  const player = room.players[playerId];
  const kept = player?.answers.find((a) => a.promptId === promptId && a.text === text);
  if (!player || !kept) return false;
  kept.text = SKIPPED;
  updateStyleStats(player);
  const round = currentRound(room);
  if (round?.prompt.id === promptId && round.answers[playerId] === text) round.answers[playerId] = SKIPPED;
  return true;
}

/** Spec 4 scoring: +100 per voter who finds the real answer, +50 to the target for each of them. */
function scoreActive(room: Room): void {
  const round = currentRound(room);
  const targetId = round && activeTarget(round);
  const real = round && targetId ? realChoice(round, targetId) : undefined;
  const target = targetId ? room.players[targetId] : undefined;
  if (!round || !targetId || !real || !target) return;
  for (const [voterId, choice] of Object.entries(round.votes[targetId] ?? {})) {
    const voter = room.players[voterId];
    if (!voter) continue;
    const right = choice === real;
    const row = (room.knows[voterId] ??= {});
    const cell = (row[targetId] ??= { correct: 0, total: 0 });
    cell.total += 1;
    room.wolf.total += 1;
    if (right) {
      voter.score += 100;
      target.score += 50;
      cell.correct += 1;
    } else room.wolf.fooled += 1;
  }
}

// ---- player actions (each returns an error message for the player, or null)

function record(player: Player, promptId: string, text: string, round: number): void {
  player.answers = player.answers.filter((a) => a.promptId !== promptId);
  player.answers.push({ promptId, text, round });
  updateStyleStats(player);
}

export function submitAnswer(room: Room, playerId: string, promptId: string, raw: string): string | null {
  const player = room.players[playerId];
  if (!player?.consented) return "Agree to the rules of the woods first.";
  const text = raw.trim().slice(0, MAX_ANSWER);
  if (!text) return "Write something first.";
  room.lastActive = Date.now();

  if (room.phase === "WARMUP") {
    if (!room.warmup.some((w) => w.id === promptId)) return "That page has already turned.";
    record(player, promptId, text, 0);
    if (list(room).filter(present).every((p) => warmupDone(room, p))) startRound(room);
    return null;
  }

  const round = currentRound(room);
  if (room.phase !== "ANSWERING" || round?.prompt.id !== promptId) return "That page has already turned.";
  round.answers[playerId] = text;
  record(player, promptId, text, round.n);
  if (list(room).filter(present).every((p) => round.answers[p.id] !== undefined)) enter(room, "GENERATING");
  return null;
}

export function submitVote(room: Room, voterId: string, targetId: string, choice: Choice): string | null {
  const round = currentRound(room);
  if (room.phase !== "VOTING" || !round || activeTarget(round) !== targetId) return "Voting has closed.";
  if (voterId === targetId) return "You can't vote on your own answer.";
  if (!room.players[voterId]?.consented) return "Agree to the rules of the woods first.";
  const votes = (round.votes[targetId] ??= {});
  votes[voterId] = choice;
  room.lastActive = Date.now();
  const waiting = list(room).filter((p) => present(p) && p.id !== targetId && votes[p.id] === undefined);
  if (waiting.length === 0) enter(room, "REVEAL");
  return null;
}

export function submitTell(room: Room, playerId: string, targetId: string, raw: string): string | null {
  const round = currentRound(room);
  if ((room.phase !== "REVEAL" && room.phase !== "TELLS") || !round || activeTarget(round) !== targetId)
    return "That page has already turned.";
  const choice = round.votes[targetId]?.[playerId];
  if (!choice || choice !== realChoice(round, targetId)) return "Only villagers who spotted the Wolf can say what gave it away.";
  const text = raw.trim().slice(0, MAX_TELL);
  if (!text) return "Write something first.";
  (round.tells[targetId] ??= []).push(text);
  // Spec 6c: the Wolf learns from what gave it away. Dedupe, keep the last 5.
  const target = room.players[targetId];
  if (target) target.style.caughtTells = [...target.style.caughtTells.filter((t) => t !== text), text].slice(-5);
  return null;
}

export function vetoFake(room: Room, playerId: string, targetId: string): string | null {
  const round = currentRound(room);
  if (playerId !== targetId) return "Only the real villager can hide this one.";
  if ((room.phase !== "REVEAL" && room.phase !== "TELLS") || !round?.targetIds.includes(targetId))
    return "That page has already turned.";
  if (!round.vetoed.includes(targetId)) round.vetoed.push(targetId);
  return null;
}


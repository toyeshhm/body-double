// Dev-only: builds a room parked in any phase by driving the real state machine with sample villagers,
// so every screen can be previewed and screenshotted without playing a whole game (app/preview).
import { PROMPTS } from "../../data/prompts";
import { giveConsent, joinPlayer } from "../game/lobby";
import { advance, currentRound, startGame, submitAnswer, submitTell, submitVote } from "../game/machine";
import { newRoom } from "../game/store";
import type { Phase, Player, Role, Room, StyleProfile } from "../game/types";

const CAST: { name: string; avatar: string; role: Role }[] = [
  { name: "Maya", avatar: "slipper", role: "bard" },
  { name: "Jordan", avatar: "lamp", role: "woodcutter" },
  { name: "Priya", avatar: "potion", role: "witch" },
  { name: "Sam", avatar: "eat-me", role: "baker" },
  { name: "Theo", avatar: "frog-prince", role: "knight" },
];

const SHORT = {
  real: "i will reorganize your spice rack while you shower and call it love",
  fake: "overthinking a text for 40 minutes then just sending 'k' 💀",
};
const LONG = {
  real: "i will reorganize your entire spice rack alphabetically while you shower, label everything, and call it love language",
  fake: "overthinking a single text for forty whole minutes, rewriting it nine times, then just sending 'k' and turning my phone over",
};
const OTHERS = ["telling everyone my plans then cancelling", "eating the last slice and leaving the box", "replying with voice notes only", "starting 4 books at once"];
// Chapter II, notebook preview only: the Wolf wears Jordan's voice and does better.
const JORDAN = { real: "ngl watering my plants and pretending they missed me", fake: "my plants perking up when i walk in lol" };
// What learnStyle (Gemini) would have written down by the end. Theo is left to the computed stats.
const LEARNED: Record<string, Partial<StyleProfile>> = {
  maya: { interests: ["spice racks", "slow mornings"], humor: "deadpan with a dramatic streak", slang: ["lowkey"], punctuation: "no capitals, no full stops" },
  jordan: { interests: ["houseplants", "late-night tacos"], humor: "self-roasting", slang: ["ngl", "lol"] },
  priya: { interests: ["thrifting", "horror movies"], humor: "dry" },
  sam: { interests: ["baking"], humor: "chaotic good" },
};

export const SCENARIO_PHASES = ["CONSENT", "LOBBY", "WARMUP", "PROMPT", "ANSWERING", "GENERATING", "VOTING", "REVEAL", "TELLS", "MAP", "NOTEBOOK", "PLANS", "RECAP", "ENDED"] as const;

/** Returns the room plus the ids previews can view it as. Maya is always the target. */
export function scenario(phase: (typeof SCENARIO_PHASES)[number], long = false): { room: Room; ids: Record<string, string> } {
  const room = newRoom("HXQR");
  room.settings.rounds = phase === "NOTEBOOK" ? 2 : 1;
  const ids: Record<string, string> = {};
  for (const c of CAST) {
    const res = joinPlayer(room, c);
    if ("error" in res) throw new Error(res.error);
    ids[c.name.toLowerCase()] = res.player.id;
    if (!(phase === "CONSENT" && c.name === "Maya")) giveConsent(room, res.player.id, true);
  }
  const at = (p: Phase): boolean => room.phase === p;
  const id = (name: string): string => ids[name] ?? "";
  const people = (): Player[] => Object.values(room.players);
  if (phase === "CONSENT" || phase === "LOBBY") return { room, ids };

  startGame(room);
  room.warmup.slice(0, 1).forEach((w) => { ["maya", "jordan"].forEach((n) => submitAnswer(room, id(n), w.id, "a slow morning and a long walk")); });
  if (phase === "WARMUP") return { room, ids };
  for (const p of people()) for (const w of room.warmup) submitAnswer(room, p.id, w.id, OTHERS[0] ?? "x");

  // Pin the round so every preview shows the same moment: Maya is up, prompt "Your toxic trait, but make it cute".
  const round = currentRound(room);
  if (!round || !at("PROMPT")) throw new Error(`expected PROMPT, got ${room.phase}`);
  round.prompt = PROMPTS.find((p) => p.id === "p11") ?? round.prompt;
  round.targetIds = [id("maya")];
  round.targetReason = null;
  if (phase === "PROMPT") return { room, ids };

  advance(room); // ANSWERING
  const text = long ? LONG : SHORT;
  submitAnswer(room, id("maya"), round.prompt.id, text.real);
  submitAnswer(room, id("jordan"), round.prompt.id, OTHERS[1] ?? "x");
  if (phase === "ANSWERING") return { room, ids };
  ["priya", "sam", "theo"].forEach((n, i) => submitAnswer(room, id(n), round.prompt.id, OTHERS[i + 1] ?? "x"));
  if (phase === "GENERATING") return { room, ids };

  advance(room); // VOTING, with a fixed fake in slot B
  round.fakes[id("maya")] = text.fake;
  round.slots[id("maya")] = { A: "real", B: "fake" };
  submitVote(room, id("jordan"), id("maya"), "A");
  submitVote(room, id("priya"), id("maya"), "B");
  if (phase === "VOTING") return { room, ids };
  submitVote(room, id("sam"), id("maya"), "A");
  submitVote(room, id("theo"), id("maya"), "B");
  if (phase === "REVEAL") return { room, ids };

  advance(room); // TELLS
  submitTell(room, id("jordan"), id("maya"), "maya would never use a skull emoji");
  submitTell(room, id("sam"), id("maya"), "too dramatic for her");
  if (phase === "TELLS") return { room, ids };
  if (phase === "NOTEBOOK") {
    chapterTwo(room, id);
    for (const [name, learned] of Object.entries(LEARNED)) Object.assign(room.players[id(name)]?.style ?? {}, learned);
    advance(room); // MAP
    advance(room); // NOTEBOOK
    return { room, ids };
  }

  advance(room); // one-round game: straight to MAP
  if (phase === "MAP") return { room, ids };
  advance(room);
  if (phase === "PLANS") return { room, ids };
  advance(room);
  if (phase === "RECAP") return { room, ids };
  advance(room);
  return { room, ids };
}

/** A second chapter for the notebook preview: Jordan is up, and the Wolf fools three of four. */
function chapterTwo(room: Room, id: (name: string) => string): void {
  advance(room); // chapter I TELLS -> chapter II PROMPT
  const round = currentRound(room);
  if (!round || room.phase !== "PROMPT") throw new Error(`expected PROMPT, got ${room.phase}`);
  round.prompt = PROMPTS.find((p) => p.id === "p10") ?? round.prompt;
  round.targetIds = [id("jordan")];
  round.targetReason = null;
  advance(room); // ANSWERING
  submitAnswer(room, id("jordan"), round.prompt.id, JORDAN.real);
  ["maya", "priya", "sam", "theo"].forEach((n, i) => submitAnswer(room, id(n), round.prompt.id, OTHERS[i] ?? "x")); // -> GENERATING
  advance(room); // VOTING, with a fixed fake in slot A
  round.fakes[id("jordan")] = JORDAN.fake;
  round.slots[id("jordan")] = { A: "fake", B: "real" };
  ["maya", "priya", "sam"].forEach((n) => submitVote(room, id(n), id("jordan"), "A"));
  submitVote(room, id("theo"), id("jordan"), "B"); // -> REVEAL
  advance(room); // TELLS
  submitTell(room, id("theo"), id("jordan"), "jordan never says perking");
}

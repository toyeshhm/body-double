// Request handling for the room API routes (app/api/rooms/**). Server-only.
import { networkInterfaces } from "node:os";
import { transcribe } from "../ai/provider";
import { MAX_SECONDS, wavInfo } from "../ai/wav";
import { log } from "../log";
import { takeBudget } from "./budget";
import { Action, HEADER, JoinInput } from "./events";
import { giveConsent, joinPlayer, updateSettings } from "./lobby";
import { MAX_ANSWER, advance, startGame, submitAnswer, submitTell, submitVote, tick, vetoFake } from "./machine";
import { createRoom, loadRoom, updateRoom } from "./store";
import type { Phase, Room } from "./types";
import { viewFor } from "./view";
import { afterWrite } from "./wolf";

const SEEN_EVERY_MS = 5000; // how often a polling phone's "still here" is written

export function fail(status: number, error: string): Response {
  return Response.json({ error }, { status, headers: { "cache-control": "no-store" } });
}

function ok(body: unknown): Response {
  return Response.json(body, { headers: { "cache-control": "no-store" } });
}

/** Where phones should go: PUBLIC_URL, else this request's origin (LAN address when it's localhost, so phones can scan). */
export function joinBase(req: Request): string {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
  const proto = req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  const [name, port] = host.split(":");
  if (name === "localhost" || name === "127.0.0.1") {
    const lan = Object.values(networkInterfaces())
      .flat()
      .find((a) => a?.family === "IPv4" && !a.internal);
    if (lan) return `${proto}://${lan.address}${port ? `:${port}` : ""}`;
  }
  return `${proto}://${host}`;
}

/** Resolves who is calling: "host", a player id, or null when the keys don't match this room. */
function caller(room: Room, req: Request): string | null {
  const hostKey = req.headers.get(HEADER.hostKey);
  if (hostKey) return hostKey === room.hostKey ? "host" : null;
  const id = req.headers.get(HEADER.playerId);
  const player = id ? room.players[id] : undefined;
  const key = req.headers.get(HEADER.playerKey);
  return player !== undefined && key !== null && player.key === key ? player.id : null;
}

/** updateRoom, then starts any AI work the saved change calls for. Only the attempt that saved sets `from` last. */
async function write<T>(code: string, change: (room: Room) => { result: T; dirty: boolean }): Promise<{ room: Room; version: number; result: T } | null> {
  const from: { phase: Phase; round: number } = { phase: "LOBBY", round: 0 };
  const out = await updateRoom<T>(code, (room) => {
    from.phase = room.phase;
    from.round = room.rounds.length;
    return change(room);
  });
  if (out) afterWrite(from, out.room);
  return out;
}

export async function handleCreate(): Promise<Response> {
  const room = await createRoom();
  return ok({ code: room.code, hostKey: room.hostKey });
}

export async function handleJoin(req: Request, code: string): Promise<Response> {
  const body = await readJson(req);
  const input = JoinInput.safeParse(typeof body === "object" && body !== null ? { ...body, code } : { code });
  if (!input.success) return fail(400, "Pick a name (up to 20 letters) and an avatar.");
  const out = await write(input.data.code, (room) => {
    tick(room);
    return { result: joinPlayer(room, input.data), dirty: true };
  });
  if (!out) return fail(404, "No village with that code. Check the big screen.");
  if ("error" in out.result) return fail(409, out.result.error);
  return ok({ playerId: out.result.player.id, playerKey: out.result.player.key });
}

/** GET: the caller's view. Runs due timers/bots first. `?v=` lets an unchanged poll return 204. */
export async function handleRead(req: Request, code: string): Promise<Response> {
  const known = Number(new URL(req.url).searchParams.get("v") ?? "-1");
  const now = Date.now();
  const out = await write<{ who: string | null }>(code, (room) => {
    if (room.phase === "ENDED") return { result: { who: "host" }, dirty: false }; // the wiped room is public
    const who = caller(room, req);
    if (!who) return { result: { who: null }, dirty: false };
    const changed = tick(room, now);
    const me = room.players[who];
    const seen = me !== undefined && now - me.lastSeen > SEEN_EVERY_MS;
    if (me && seen) me.lastSeen = now;
    return { result: { who }, dirty: changed || seen };
  });
  if (!out) return fail(404, "No village with that code.");
  const { who } = out.result;
  if (!who) return fail(401, "This phone isn't part of that village.");
  if (out.version === known) return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
  return ok(viewFor(out.room, who === "host" ? null : who, joinBase(req), out.version));
}

/** POST: one action from the host or a phone. Returns the caller's fresh view, or the rule it broke. */
export async function handleAction(req: Request, code: string): Promise<Response> {
  const action = Action.safeParse(await readJson(req));
  if (!action.success) return fail(400, "That didn't fit on the page.");
  const a = action.data;
  const out = await write<{ who: string | null; error: string | null }>(code, (room) => {
    const who = caller(room, req);
    if (!who) return { result: { who, error: "This phone isn't part of that village." }, dirty: false };
    tick(room);
    const asPlayer = (run: (id: string) => string | null): string | null =>
      who === "host" ? "Only villagers can do that." : run(who);
    const asHost = (run: () => string | null): string | null => (who === "host" ? run() : "Only the storyteller can do that.");
    const error = ((): string | null => {
      switch (a.type) {
        case "host:settings":
          return asHost(() => updateSettings(room, a.settings));
        case "host:start":
          return asHost(() => startGame(room));
        case "host:next":
          return asHost(() => advance(room));
        case "player:consent":
          return asPlayer((id) => giveConsent(room, id, a.canBeTarget));
        case "player:answer":
          return asPlayer((id) => submitAnswer(room, id, a.promptId, a.text));
        case "player:vote":
          return asPlayer((id) => submitVote(room, id, a.targetId, a.choice));
        case "player:tell":
          return asPlayer((id) => submitTell(room, id, a.targetId, a.text));
        case "player:notMe":
          return asPlayer((id) => vetoFake(room, id, a.targetId));
      }
    })();
    return { result: { who, error }, dirty: true };
  });
  if (!out) return fail(404, "That village is gone. Scan the code again.");
  const { who, error } = out.result;
  if (!who) return fail(401, error ?? "This phone isn't part of that village.");
  if (error) return fail(422, error);
  if (out.room.phase === "ENDED") log.info("room_wiped", { room: out.room.code });
  return ok(viewFor(out.room, who === "host" ? null : who, joinBase(req), out.version));
}

const MAX_AUDIO_BYTES = 2_000_000; // 30s of 16 kHz mono WAV is about 960 KB
// ponytail: a flat cap per player per game. The default game has 9 answers (3 warmup + 6 chapters), so this
// allows about two tries each; raise it if long games (up to 12 chapters) hit it in practice.
export const MAX_VOICE_PER_PLAYER = 20;
// The room's own budget, so joining as many villagers as the room allows can't multiply the per-player cap.
export const MAX_VOICE_PER_ROOM = 120;

/**
 * POST audio/wav from a phone (lib/ai/wav.ts format): the spoken answer as text, which the player edits and
 * submits as usual, so moderation still runs on what they send. Read-only: the audio is never stored or logged.
 */
export async function handleTranscribe(req: Request, code: string): Promise<Response> {
  // Check the declared size before reading anything: phones always send it (fetch with a Blob body), and the
  // server holds the body to that length, so a huge or unsized upload is never buffered.
  const size = Number(req.headers.get("content-length"));
  if (!size) return fail(411, "The Wolf couldn't make out that recording. Try again, or type it.");
  if (size > MAX_AUDIO_BYTES) return fail(413, "Keep it under 30 seconds.");
  const stored = await loadRoom(code);
  if (!stored) return fail(404, "That village is gone. Scan the code again.");
  const who = caller(stored.room, req);
  if (!who || who === "host") return fail(401, "This phone isn't part of that village.");
  if (stored.room.phase !== "WARMUP" && stored.room.phase !== "ANSWERING") return fail(409, "That page has already turned.");
  const audio = new Uint8Array(await req.arrayBuffer());
  const wav = wavInfo(audio);
  if (!wav || wav.seconds > MAX_SECONDS + 1) return fail(400, "The Wolf couldn't make out that recording. Try again, or type it.");
  // Counted before the model call, so failed attempts count too. Optimistic versioning keeps parallel uploads honest.
  const counted = await updateRoom(code, (room) => {
    const player = room.players[who];
    if (!player) return { result: "gone" as const, dirty: false };
    if (player.voiceUses >= MAX_VOICE_PER_PLAYER || room.voiceUses >= MAX_VOICE_PER_ROOM) return { result: "spent" as const, dirty: false };
    player.voiceUses += 1;
    room.voiceUses += 1;
    return { result: "ok" as const, dirty: true };
  });
  if (counted?.result !== "ok") {
    return counted?.result === "spent" ? fail(429, "The Wolf has listened enough for one night. Type the rest.") : fail(409, "That page has already turned.");
  }
  if (!(await takeBudget("voice"))) return fail(429, "The Wolf has run out of voice for tonight. Type your answer instead.");
  try {
    const text = await transcribe({ audio, mime: "audio/wav" });
    log.info("transcribe", { room: stored.room.code, seconds: Math.round(wav.seconds), heard: text.length > 0 });
    return ok({ text: text.slice(0, MAX_ANSWER) });
  } catch {
    return fail(503, "The Wolf can't listen right now. Type your answer instead."); // provider failures are logged in lib/ai/provider.ts
  }
}

async function readJson(req: Request): Promise<unknown> {
  try {
    return (await req.json()) as unknown;
  } catch {
    return null; // empty or malformed body: the schema check right after reports it to the caller
  }
}

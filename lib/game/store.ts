// Where rooms live between requests.
// - Local dev / single server: process memory (no database at all).
// - Vercel: a Supabase table (set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY), because serverless
//   instances share nothing. Either way a room is wiped when the tale ends and deleted after 2 hours idle.
// Writes use optimistic versioning so two phones voting at the same instant can't overwrite each other.
import { randomUUID } from "node:crypto";
import { log } from "../log";
import type { Room } from "./types";

const LETTERS = "ABCDEFGHJKMNPQRSTUVWXYZ"; // no I, L, O: hard to read off a projector
const IDLE_MS = 2 * 60 * 60 * 1000;

type Stored = { room: Room; version: number };
type Backend = {
  load: (code: string) => Promise<Stored | null>;
  /** Saves only if the stored version is still `version`. False means someone else wrote first. */
  save: (room: Room, version: number) => Promise<boolean>;
  insert: (room: Room) => Promise<boolean>;
  sweep: (olderThan: number) => Promise<void>;
};

// ---- memory backend (survives Next dev hot reloads via globalThis)

const memo = globalThis as typeof globalThis & { __bodyDoubleRooms?: Map<string, { json: string; version: number }> };
const memory = (memo.__bodyDoubleRooms ??= new Map<string, { json: string; version: number }>());

const memoryBackend: Backend = {
  load: (code) => {
    const hit = memory.get(code);
    return Promise.resolve(hit ? { room: JSON.parse(hit.json) as Room, version: hit.version } : null);
  },
  save: (room, version) => {
    const hit = memory.get(room.code);
    if (hit?.version !== version) return Promise.resolve(false);
    memory.set(room.code, { json: JSON.stringify(room), version: version + 1 });
    return Promise.resolve(true);
  },
  insert: (room) => {
    if (memory.has(room.code)) return Promise.resolve(false);
    memory.set(room.code, { json: JSON.stringify(room), version: 0 });
    return Promise.resolve(true);
  },
  sweep: (olderThan) => {
    for (const [code, { json }] of memory) if ((JSON.parse(json) as Room).lastActive < olderThan) memory.delete(code);
    return Promise.resolve();
  },
};

// ---- Supabase backend (PostgREST over fetch; table in supabase/migrations)

function supabaseBackend(url: string, key: string): Backend {
  const rest = `${url.replace(/\/$/, "")}/rest/v1/rooms`;
  const headers: Record<string, string> = { apikey: key, "content-type": "application/json" };
  if (key.startsWith("eyJ")) headers.authorization = `Bearer ${key}`; // legacy JWT service_role key
  const call = async (path: string, method: string, extra: Record<string, string> = {}, body?: string): Promise<Response> => {
    const res = await fetch(`${rest}${path}`, { method, headers: { ...headers, ...extra }, body, cache: "no-store" });
    if (!res.ok && res.status !== 409) throw new Error(`supabase ${method} ${String(res.status)}`);
    return res;
  };
  return {
    load: async (code) => {
      const rows = (await (await call(`?code=eq.${code}&select=version,state`, "GET")).json()) as {
        version: number;
        state: Room;
      }[];
      const row = rows[0];
      return row ? { room: row.state, version: row.version } : null;
    },
    save: async (room, version) => {
      const res = await call(
        `?code=eq.${room.code}&version=eq.${String(version)}`,
        "PATCH",
        { prefer: "return=representation" },
        JSON.stringify({ state: room, version: version + 1, updated_at: new Date().toISOString() }),
      );
      return ((await res.json()) as unknown[]).length === 1;
    },
    insert: async (room) => {
      const res = await call("", "POST", { prefer: "return=minimal" }, JSON.stringify({ code: room.code, version: 0, state: room }));
      return res.status !== 409;
    },
    sweep: async (olderThan) => {
      await call(`?updated_at=lt.${new Date(olderThan).toISOString()}`, "DELETE");
    },
  };
}

function pickBackend(): Backend {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) return supabaseBackend(url, key);
  // Serverless instances don't share memory: rooms would vanish between requests.
  if (process.env.VERCEL) throw new Error("On Vercel, set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env.example).");
  return memoryBackend;
}

const backend = pickBackend();

// ---- public API

/** A fresh village in the lobby. Pure: the store decides where it lives. */
export function newRoom(code: string, now = Date.now()): Room {
  return {
    code,
    hostKey: randomUUID(),
    phase: "LOBBY",
    players: {},
    warmup: [],
    rounds: [],
    settings: { rounds: 6, answerSeconds: 60, voteSeconds: 20, demoMode: false },
    knows: {},
    wolf: { fooled: 0, total: 0 },
    usedTargets: [],
    usedPrompts: [],
    plans: null,
    recap: null,
    deadline: null,
    botQueue: [],
    createdAt: now,
    lastActive: now,
  };
}

export async function createRoom(): Promise<Room> {
  const now = Date.now();
  await backend.sweep(now - IDLE_MS);
  for (;;) {
    const code = Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join("");
    const room = newRoom(code, now);
    if (await backend.insert(room)) {
      log.info("room_created", { room: code });
      return room;
    }
  }
}

export async function loadRoom(code: string): Promise<Stored | null> {
  return backend.load(code.trim().toUpperCase());
}

/**
 * Load, run `change`, save. Retries when another request wrote in between, so every change
 * is applied to the latest room. `change` returns false to skip the write (nothing changed).
 */
export async function updateRoom<T>(
  code: string,
  change: (room: Room) => { result: T; dirty: boolean },
): Promise<{ room: Room; version: number; result: T } | null> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const stored = await loadRoom(code);
    if (!stored) return null;
    const { result, dirty } = change(stored.room);
    if (!dirty) return { ...stored, result };
    if (await backend.save(stored.room, stored.version)) return { room: stored.room, version: stored.version + 1, result };
  }
  log.warn("room_write_contended", { room: code });
  throw new Error("The village is busy. Try again.");
}

/** Test hook for the idle rule: runs the same sweep createRoom does, at a chosen time. */
export async function sweepIdle(now: number): Promise<void> {
  await backend.sweep(now - IDLE_MS);
}

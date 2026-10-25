// Where rooms live between requests.
// - Local dev / single server: process memory (no database at all).
// - Vercel: Postgres on Tiger Data (set DATABASE_URL), because serverless instances share nothing.
// Either way a room is wiped when the tale ends and deleted after 2 hours idle.
// Writes use optimistic versioning so two phones voting at the same instant can't overwrite each other.
import { randomUUID } from "node:crypto";
import { log } from "../log";
import { db, ensureSchema } from "./db";
import { recordVotes, revealedVotes, snapshot } from "./metrics";
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

// ---- Postgres backend (Tiger Data in production; any Postgres works)

function postgresBackend(sql: NonNullable<ReturnType<typeof db>>): Backend {
  return {
    load: async (code) => {
      await ensureSchema(sql);
      const rows = await sql<{ version: number; state: Room }[]>`select version, state from rooms where code = ${code}`;
      const row = rows[0];
      return row ? { room: row.state, version: row.version } : null;
    },
    save: async (room, version) => {
      const rows = await sql`
        update rooms set state = ${JSON.stringify(room)}::text::jsonb, version = version + 1, updated_at = now()
        where code = ${room.code} and version = ${version} returning code`;
      return rows.length === 1;
    },
    insert: async (room) => {
      await ensureSchema(sql);
      const rows = await sql`
        insert into rooms (code, version, state) values (${room.code}, 0, ${JSON.stringify(room)}::text::jsonb)
        on conflict (code) do nothing returning code`;
      return rows.length === 1;
    },
    sweep: async (olderThan) => {
      await ensureSchema(sql);
      await sql`delete from rooms where updated_at < ${new Date(olderThan)}`;
    },
  };
}

function pickBackend(): Backend {
  const sql = db();
  if (sql) return postgresBackend(sql);
  // Serverless instances don't share memory: rooms would vanish between requests.
  if (process.env.VERCEL) throw new Error("On Vercel, set DATABASE_URL to the Tiger Data connection string (see .env.example).");
  return memoryBackend;
}

// Chosen on first use, not at import: `next build` imports the routes and must not need runtime secrets.
let chosen: Backend | null = null;
function store(): Backend {
  chosen ??= pickBackend();
  return chosen;
}

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
    voiceUses: 0,
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
  await store().sweep(now - IDLE_MS);
  for (;;) {
    const code = Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join("");
    const room = newRoom(code, now);
    if (await store().insert(room)) {
      log.info("room_created", { room: code });
      return room;
    }
  }
}

export async function loadRoom(code: string): Promise<Stored | null> {
  return store().load(code.trim().toUpperCase());
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
    const before = snapshot(stored.room);
    const { result, dirty } = change(stored.room);
    if (!dirty) return { ...stored, result };
    if (await store().save(stored.room, stored.version)) {
      // Only the attempt that actually saved reports its reveal, so retries never double count.
      await recordVotes(revealedVotes(before, stored.room));
      return { room: stored.room, version: stored.version + 1, result };
    }
  }
  log.warn("room_write_contended", { room: code });
  throw new Error("The village is busy. Try again.");
}

/** Test hook for the idle rule: runs the same sweep createRoom does, at a chosen time. */
export async function sweepIdle(now: number): Promise<void> {
  await store().sweep(now - IDLE_MS);
}

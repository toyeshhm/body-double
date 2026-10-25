// Integration test: the real API route handlers (app/api/rooms/**) and state machine, called with
// real Request objects against the in-memory store, through every phase of spec section 4. No mocks.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { z } from "zod";
import { GET as readRoute, POST as actRoute } from "../app/api/rooms/[code]/route";
import { POST as joinRoute } from "../app/api/rooms/[code]/join/route";
import { POST as createRoute } from "../app/api/rooms/route";
import { type Action, type Auth, authHeaders } from "../lib/game/events";
import { loadRoom, sweepIdle } from "../lib/game/store";
import type { ClientState, Phase } from "../lib/game/types";

const BASE = "http://village.test";

// The game must play end to end with no AI at all: every fake falls back to the stub (tests/live covers real calls).
delete process.env.MUSE_API_KEY;
delete process.env.GEMINI_API_KEY;

class Screen {
  latest: ClientState | null = null;
  constructor(
    readonly code: string,
    readonly auth: Auth,
  ) {}

  get state(): ClientState {
    assert.ok(this.latest, "no state yet");
    return this.latest;
  }

  async poll(version = -1): Promise<Response> {
    const req = new Request(`${BASE}/api/rooms/${this.code}?v=${String(version)}`, { headers: authHeaders(this.auth) });
    const res = await readRoute(req, { params: { code: this.code } });
    if (res.status === 200) this.latest = (await res.json()) as ClientState;
    return res;
  }

  async send(action: z.input<typeof Action>): Promise<{ status: number; error: string | null }> {
    const req = new Request(`${BASE}/api/rooms/${this.code}`, {
      method: "POST",
      headers: { ...authHeaders(this.auth), "content-type": "application/json" },
      body: JSON.stringify(action),
    });
    const res = await actRoute(req, { params: { code: this.code } });
    const body = (await res.json()) as ClientState | { error: string };
    if ("error" in body) return { status: res.status, error: body.error };
    this.latest = body;
    return { status: res.status, error: null };
  }

  async until(pred: (s: ClientState) => boolean, ms = 8000): Promise<ClientState> {
    const end = Date.now() + ms;
    for (;;) {
      await this.poll();
      if (pred(this.state)) return this.state;
      if (Date.now() > end) throw new Error(`timed out; last phase ${this.state.phase}`);
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  phase(p: Phase, ms?: number): Promise<ClientState> {
    return this.until((s) => s.phase === p, ms);
  }
}

async function host(): Promise<Screen> {
  const res = await createRoute();
  const { code, hostKey } = (await res.json()) as { code: string; hostKey: string };
  const screen = new Screen(code, { role: "host", key: hostKey });
  await screen.poll();
  return screen;
}

async function joinRaw(code: string, body: unknown): Promise<Response> {
  return joinRoute(new Request(`${BASE}/api/rooms/${code}/join`, { method: "POST", body: JSON.stringify(body) }), {
    params: { code },
  });
}

async function phone(code: string, name: string, canBeTarget = true): Promise<Screen> {
  const res = await joinRaw(code, { name, avatar: "slipper", role: "bard" });
  assert.equal(res.status, 200, `join failed for ${name}`);
  const { playerId, playerKey } = (await res.json()) as { playerId: string; playerKey: string };
  const screen = new Screen(code, { role: "player", id: playerId, key: playerKey });
  assert.equal((await screen.send({ type: "player:consent", agree: true, canBeTarget })).error, null);
  return screen;
}

void test("a full tale: lobby, warmup, rounds, reveal, tells, map, plans, recap, ended", async () => {
  const board = await host();
  const code = board.code;
  assert.match(code, /^[A-Z]{4}$/);
  assert.equal(board.state.joinUrl, `${BASE}/play/${code}`);
  await board.send({ type: "host:settings", settings: { rounds: 2 } });
  assert.equal(board.state.settings.rounds, 2);

  const [ana, ben, cat] = await Promise.all([phone(code, "Ana"), phone(code, "Ben"), phone(code, "Cat", false)]);
  await board.poll();
  assert.equal(board.state.players.length, 3, "concurrent joins all land (optimistic versioning retries)");
  assert.equal(board.state.me, null, "host view carries no player profile");
  assert.equal((await board.poll(board.state.version)).status, 204, "an unchanged poll costs nothing");

  assert.equal((await ana.send({ type: "host:next" })).status, 422, "phones can't drive the story");
  await board.send({ type: "host:start" });
  assert.equal(board.state.phase, "WARMUP");
  for (const p of [ana, ben, cat]) {
    await p.poll();
    for (const w of p.state.warmup) await p.send({ type: "player:answer", promptId: w.id, text: `warmup ${w.id}` });
  }
  const prompt = await board.phase("PROMPT");
  assert.equal(prompt.round?.n, 1);
  const targetId = prompt.round.activeTargetId ?? "";
  assert.notEqual(targetId, cat.state.me?.id, "opted-out players are never impersonated");

  await board.send({ type: "host:next" });
  assert.equal(board.state.phase, "ANSWERING");
  assert.ok(board.state.deadline !== null, "answering is timed");
  const promptId = board.state.round?.prompt.id ?? "";
  const byId = new Map([ana, ben, cat].map((p) => [p.state.me?.id ?? "", p]));
  for (const [id, p] of byId) await p.send({ type: "player:answer", promptId, text: `real answer from ${id.slice(0, 6)}` });

  await board.phase("GENERATING");
  const voting = await board.phase("VOTING", 6000);
  const pair = voting.round?.pair;
  assert.ok(pair);
  assert.equal(voting.round?.reveal, null, "truth is hidden while voting");
  const realText = `real answer from ${targetId.slice(0, 6)}`;
  const realSlot = pair.A === realText ? "A" : "B";
  const fakeSlot = realSlot === "A" ? "B" : "A";
  assert.equal(pair[realSlot], realText);
  assert.ok(pair[fakeSlot], "a fake was written");
  for (const p of [board, ana, ben, cat]) {
    await p.poll();
    const raw = JSON.stringify(p.latest);
    assert.ok(!raw.includes("slots") && !raw.includes("fakes") && !raw.includes('"real"'), "no slot leak before reveal");
    assert.ok(!raw.includes('"key"') && !raw.includes("hostKey"), "no secrets in any view");
  }

  const target = byId.get(targetId);
  assert.ok(target);
  assert.match((await target.send({ type: "player:vote", targetId, choice: "A" })).error ?? "", /own answer/);
  const [right, wrong] = [...byId].filter(([id]) => id !== targetId).map(([, p]) => p);
  assert.ok(right && wrong);
  await right.send({ type: "player:vote", targetId, choice: realSlot });
  await wrong.send({ type: "player:vote", targetId, choice: fakeSlot });

  const reveal = await board.phase("REVEAL");
  assert.equal(reveal.round?.reveal?.real, realSlot);
  const score = (id: string | undefined): number => reveal.players.find((p) => p.id === id)?.score ?? -1;
  assert.equal(score(right.state.me?.id), 100);
  assert.equal(score(wrong.state.me?.id), 0);
  assert.equal(score(targetId), 50);
  assert.deepEqual(reveal.wolf, { fooled: 1, total: 2 });
  assert.equal(reveal.edges.length, 2);

  assert.match((await wrong.send({ type: "player:tell", targetId, text: "guessing" })).error ?? "", /spotted the Wolf/);
  await right.send({ type: "player:tell", targetId, text: "too many commas" });
  assert.ok(right.state.round?.tells.includes("too many commas"));
  await target.poll();
  assert.ok(target.state.me?.style.caughtTells.includes("too many commas"), "the Wolf learns its tells");

  await target.send({ type: "player:notMe", targetId });
  assert.equal(target.state.round?.pair?.vetoed, true);
  assert.equal(target.state.round.pair[fakeSlot], null, "vetoed fake is hidden");

  // Rejoin by name from a new device keeps the same villager and score (spec 10).
  const names = new Map([
    [ana, "Ana"],
    [ben, "Ben"],
    [cat, "Cat"],
  ]);
  const again = await joinRaw(code, { name: names.get(right), avatar: "lamp", role: "knight" });
  assert.equal(((await again.json()) as { playerId: string }).playerId, right.state.me?.id);

  await board.send({ type: "host:next" });
  assert.equal(board.state.phase, "TELLS");
  await board.send({ type: "host:next" });
  assert.equal(board.state.round?.n, 2);
  // Round 2: nobody answers, so the target is silent and the round closes straight into the map.
  await board.send({ type: "host:next" });
  await board.send({ type: "host:next" });
  assert.equal(board.state.phase, "MAP");
  await board.send({ type: "host:next" });
  assert.ok((board.state.plans?.pairPlans.length ?? 0) > 0);
  await board.send({ type: "host:next" });
  assert.match(board.state.recap?.story ?? "", /^Once upon a time/);
  await board.send({ type: "host:next" });
  assert.equal(board.state.phase, "ENDED");

  const wiped = await loadRoom(code);
  assert.ok(wiped);
  assert.deepEqual([Object.keys(wiped.room.players).length, wiped.room.rounds.length, wiped.room.knows], [0, 0, {}]);
  assert.equal((await ana.phase("ENDED")).players.length, 0, "phones still learn the tale ended");
  assert.equal((await joinRaw(code, { name: "Dee", avatar: "frog-prince", role: "witch" })).status, 409);
});

void test("demo mode adds three bot villagers who play along", async () => {
  const board = await host();
  await board.send({ type: "host:settings", settings: { demoMode: true } });
  assert.deepEqual(board.state.players.map((p) => p.name).sort(), ["Hazel", "Juniper", "Rowan"]);
  const solo = await phone(board.code, "Solo");
  await board.send({ type: "host:start" });
  await solo.poll();
  for (const w of solo.state.warmup) await solo.send({ type: "player:answer", promptId: w.id, text: `solo ${w.id}` });
  await board.phase("PROMPT", 7000);
});

void test("bad input and wrong keys are rejected at the boundary", async () => {
  const board = await host();
  assert.equal((await joinRaw(board.code, { name: "", avatar: "slipper", role: "bard" })).status, 400);
  assert.equal((await joinRaw("ZZZZ", { name: "Nobody", avatar: "slipper", role: "bard" })).status, 404);
  const forged = new Screen(board.code, { role: "host", key: "not-the-host-key" });
  assert.equal((await forged.poll()).status, 401);
  assert.equal((await forged.send({ type: "host:start" })).status, 401);
});

void test("rooms idle for two hours are deleted", async () => {
  const board = await host();
  await sweepIdle(Date.now() + 2 * 60 * 60 * 1000 + 1);
  assert.equal(await loadRoom(board.code), null);
});

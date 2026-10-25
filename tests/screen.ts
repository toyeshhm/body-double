// Drives the real API route handlers (app/api/rooms/**) with real Request objects, like a host screen or phone would.
import assert from "node:assert/strict";
import type { z } from "zod";
import { GET as readRoute, POST as actRoute } from "../app/api/rooms/[code]/route";
import { POST as joinRoute } from "../app/api/rooms/[code]/join/route";
import { POST as createRoute } from "../app/api/rooms/route";
import { type Action, type Auth, authHeaders } from "../lib/game/events";
import type { ClientState, Phase } from "../lib/game/types";

export const BASE = "http://village.test";

export class Screen {
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

export async function host(): Promise<Screen> {
  const res = await createRoute();
  const { code, hostKey } = (await res.json()) as { code: string; hostKey: string };
  const screen = new Screen(code, { role: "host", key: hostKey });
  await screen.poll();
  return screen;
}

export async function joinRaw(code: string, body: unknown): Promise<Response> {
  return joinRoute(new Request(`${BASE}/api/rooms/${code}/join`, { method: "POST", body: JSON.stringify(body) }), {
    params: { code },
  });
}

export async function phone(code: string, name: string, canBeTarget = true): Promise<Screen> {
  const res = await joinRaw(code, { name, avatar: "slipper", role: "bard" });
  assert.equal(res.status, 200, `join failed for ${name}`);
  const { playerId, playerKey } = (await res.json()) as { playerId: string; playerKey: string };
  const screen = new Screen(code, { role: "player", id: playerId, key: playerKey });
  assert.equal((await screen.send({ type: "player:consent", agree: true, canBeTarget })).error, null);
  return screen;
}

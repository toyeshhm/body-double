// Spoken answers without any model: the WAV format the phone sends, and every guard on the transcribe route.
// The happy path needs a real provider: tests/live/voice.test.ts.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { POST as transcribeRoute } from "../app/api/rooms/[code]/transcribe/route";
import { encodeWav, wavInfo } from "../lib/ai/wav";
import { authHeaders, type Auth } from "../lib/game/events";
import { MAX_VOICE_PER_PLAYER, MAX_VOICE_PER_ROOM } from "../lib/game/http";
import { BASE, host, phone } from "./screen";

delete process.env.MUSE_API_KEY;
delete process.env.GEMINI_API_KEY;
delete process.env.AI_PROVIDER;

const spoken = new Uint8Array(readFileSync(new URL("./fixtures/spoken.wav", import.meta.url)));

/** Like a phone's fetch, which always declares the size. `sized: false` sends a body without one. */
async function send(code: string, auth: Auth, body: Uint8Array<ArrayBuffer>, sized = true): Promise<{ status: number; body: unknown }> {
  const length: Record<string, string> = sized ? { "content-length": String(body.length) } : {};
  const req = new Request(`${BASE}/api/rooms/${code}/transcribe`, {
    method: "POST",
    headers: { ...authHeaders(auth), "content-type": "audio/wav", ...length },
    body,
  });
  const res = await transcribeRoute(req, { params: { code } });
  return { status: res.status, body: (await res.json()) as unknown };
}

void test("encodeWav writes the one format Muse accepts, and wavInfo reads it back", () => {
  const wav = encodeWav(new Float32Array(16_000).fill(0.25));
  assert.deepEqual(wavInfo(wav), { sampleRate: 16_000, seconds: 1 });
  assert.deepEqual(wavInfo(spoken)?.sampleRate, 16_000, "the ffmpeg-made fixture has the same canonical header");
  const stereo = wav.slice();
  new DataView(stereo.buffer).setUint16(22, 2, true);
  const at8k = wav.slice();
  new DataView(at8k.buffer).setUint32(24, 8_000, true);
  for (const bad of [stereo, at8k, new TextEncoder().encode("not audio at all, just some words padding it out to 44+")])
    assert.equal(wavInfo(bad), null);
});

void test("the transcribe route: players only, answer pages only, WAV only, 30s cap, 503 with no provider, per-game limit", async () => {
  const board = await host();
  const ana = await phone(board.code, "Ana");
  await phone(board.code, "Ben");
  const player = ana.auth;
  const short = encodeWav(new Float32Array(8_000));

  assert.equal((await send(board.code, player, short)).status, 409, "lobby: nothing to answer yet");
  await board.send({ type: "host:start" });
  assert.equal((await send(board.code, board.auth, short)).status, 401, "the host screen can't use it");
  assert.equal((await send(board.code, { role: "player", id: "nobody", key: "x" }, short)).status, 401);
  assert.equal((await send("ZZZZ", player, short)).status, 404);
  assert.equal((await send(board.code, player, new TextEncoder().encode("hello"))).status, 400, "not a WAV");
  assert.equal((await send(board.code, player, encodeWav(new Float32Array(16_000 * 70)))).status, 413, "over 2 MB");
  assert.equal((await send(board.code, player, short, false)).status, 411, "no declared size: never buffered");
  assert.equal((await send(board.code, player, encodeWav(new Float32Array(16_000 * 35)))).status, 400, "over 30s");
  const out = await send(board.code, player, spoken);
  assert.equal(out.status, 503, "no keys: the phone is told to type instead");
  assert.match(JSON.stringify(out.body), /Type your answer/);

  // Only recordings that pass every check count, failed ones included (the one above was the first).
  for (let used = 1; used < MAX_VOICE_PER_PLAYER; used++) assert.equal((await send(board.code, player, short)).status, 503);
  const spent = await send(board.code, player, short);
  assert.equal(spent.status, 429, "one phone can't burn the AI credits");
  assert.match(JSON.stringify(spent.body), /Type the rest/);
  const other = (await phone(board.code, "Cy")).auth;
  assert.equal((await send(board.code, other, short)).status, 503, "another player still has their own allowance");

  // ...but extra villagers can't multiply it: the room has a budget of its own.
  let used = MAX_VOICE_PER_PLAYER + 1;
  for (let n = 0; used < MAX_VOICE_PER_ROOM; n++) {
    const extra = (await phone(board.code, `Extra ${String(n)}`)).auth;
    for (let i = 0; i < MAX_VOICE_PER_PLAYER && used < MAX_VOICE_PER_ROOM; i++, used++) await send(board.code, extra, short);
  }
  const late = (await phone(board.code, "Late")).auth;
  assert.equal((await send(board.code, late, short)).status, 429, "the room's budget is spent for everyone");
});

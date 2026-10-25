// Live: a real spoken clip through the transcribe route, Muse Voice Transcribe first, Gemini as fallback.
// Needs MUSE_API_KEY or GEMINI_API_KEY in .env.local (the Claude test mode has no speech model). `npm run test:ai`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { POST as transcribeRoute } from "../../app/api/rooms/[code]/transcribe/route";
import { authHeaders } from "../../lib/game/events";
import { BASE, host, phone } from "../screen";

void test("a spoken warmup answer comes back as text", async () => {
  const board = await host();
  const ana = await phone(board.code, "Ana");
  await phone(board.code, "Ben");
  await board.send({ type: "host:start" });
  const req = new Request(`${BASE}/api/rooms/${board.code}/transcribe`, {
    method: "POST",
    headers: { ...authHeaders(ana.auth), "content-type": "audio/wav" },
    body: new Uint8Array(readFileSync(new URL("../fixtures/spoken.wav", import.meta.url))),
  });
  const res = await transcribeRoute(req, { params: { code: board.code } });
  const body = (await res.json()) as { text?: string; error?: string };
  assert.equal(res.status, 200, body.error);
  assert.match(body.text ?? "", /tacos at midnight/i, "the clip says: tacos at midnight, every single time");
});

// Live end to end: a demo game through the real route handlers with the real Wolf (lib/game/wolf.ts).
// Same model requirements as ai.test.ts. Checks that AI output, not the stub, reaches every screen in time.
import assert from "node:assert/strict";
import { test } from "node:test";
import { loadRoom } from "../../lib/game/store";
import { EMOJI } from "../../lib/game/style";
import { STOCK_FAKES } from "../../lib/game/stubs";
import { host, phone } from "../screen";

const isStub = (fake: string): boolean =>
  STOCK_FAKES.some((s) => s.replace(EMOJI, "").trim().toLowerCase() === fake.replace(EMOJI, "").trim().toLowerCase());

void test("a demo game with the real Wolf: AI fake in time for voting, then AI plans and recap", async () => {
  const board = await host();
  await board.send({ type: "host:settings", settings: { demoMode: true, rounds: 1 } });
  const solo = await phone(board.code, "Solo");
  await board.send({ type: "host:start" });
  await solo.poll();
  const warmup = ["sleeping in then a long bike ride to get pho", "who wants to get boba later", "cilantro tastes like soap and i stand by it"];
  for (const [i, w] of solo.state.warmup.entries()) await solo.send({ type: "player:answer", promptId: w.id, text: warmup[i] ?? "ok" });
  await board.phase("PROMPT", 15_000);
  await board.send({ type: "host:next" });
  const promptId = board.state.round?.prompt.id ?? "";
  await solo.send({ type: "player:answer", promptId, text: "honestly parallel parking on the first try" });

  const voting = await board.phase("VOTING", 30_000);
  const targetId = voting.round?.activeTargetId ?? "";
  const fake = (await loadRoom(board.code))?.room.rounds[0]?.fakes[targetId] ?? "";
  assert.ok(fake && !isStub(fake), "the Wolf's own fake made it before the vote");

  await board.send({ type: "host:next" }); // REVEAL
  await board.send({ type: "host:next" }); // TELLS
  await board.send({ type: "host:next" }); // last round: MAP
  assert.equal(board.state.phase, "MAP");
  // A host who lingers on the map gets the Wolf's plans and recap; one who doesn't gets the stubs (flow.test.ts).
  const ready = await board.until((s) => s.plans !== null && s.recap !== null, 45_000);
  assert.ok(ready.plans && ready.plans.pairPlans.length > 0, "plans landed during MAP");
  assert.notEqual(ready.plans.groupPlan.title, "Lantern Night at Zilker", "AI plans, not the stub");
  await board.send({ type: "host:next" });
  assert.equal(board.state.plans?.groupPlan.title, ready.plans.groupPlan.title, "PLANS shows the Wolf's plans");
  await board.send({ type: "host:next" });
  assert.ok(board.state.recap?.story.startsWith("Once upon a time"));
  await board.send({ type: "host:next" });
  assert.equal(board.state.phase, "ENDED");
});

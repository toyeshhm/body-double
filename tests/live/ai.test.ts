// Live integration test: the real provider adapter and the spec 6/8 prompts, no mocks.
// Needs MUSE_API_KEY and/or GEMINI_API_KEY in .env.local. Run with `npm run test:ai` (not part of `npm test`).
import assert from "node:assert/strict";
import { test } from "node:test";
import { learnStyle, moderate, writeFake } from "../../lib/ai/prompts";
import { makeBots } from "../../lib/game/bots";
import { updateStyleStats } from "../../lib/game/style";
import type { Player } from "../../lib/game/types";

function hazel(): Player {
  const bot = makeBots().find((b) => b.name === "Hazel");
  assert.ok(bot);
  bot.answers = [
    { promptId: "w1", text: "thrifting then a nap then tacos at 11pm", round: 0 },
    { promptId: "w2", text: "ok but who took my charger", round: 0 },
    { promptId: "w3", text: "pineapple on pizza is correct and i will not be taking questions", round: 0 },
    { promptId: "p10", text: "lowkey reorganizing my bookshelf by color again", round: 1 },
  ];
  bot.style.caughtTells = ["too many commas"];
  updateStyleStats(bot);
  return bot;
}

void test("moderation passes normal answers and blocks a sexual one, in one batch", async () => {
  const verdicts = await moderate(["tacos at midnight, every time", "send me nudes and let's have sex tonight", "cereal is a soup"]);
  assert.deepEqual(verdicts, [false, true, false]);
});

void test("style profile comes back in the validated shape", async () => {
  const profile = await learnStyle(hazel().answers);
  assert.ok(profile.slang.length <= 5 && profile.interests.length <= 6);
  assert.ok(profile.humor.length > 0 || profile.interests.length > 0, "the model learned something");
});

void test("fakes come back post-processed at every difficulty", async () => {
  const target = hazel();
  const real = "a frog in a tiny hat";
  for (const round of [1, 2, 4]) {
    const fake = await writeFake({ question: "What would you name a pet rock?", round, target, real, others: ["Rocky.", "DWAYNE!!"] });
    assert.ok(fake.length > 0 && fake.length <= Math.round(real.length * 1.2), `round ${String(round)} length ${String(fake.length)}`);
    assert.equal(fake, fake.toLowerCase(), "mirrors the real answer's lowercase");
    assert.ok(!/[.!?]$/.test(fake), "mirrors the real answer's bare ending");
  }
});

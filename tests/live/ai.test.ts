// Live evals: the real provider adapter and every spec 6/8 prompt, no mocks.
// Needs a model: MUSE_API_KEY / GEMINI_API_KEY in .env.local, or AI_PROVIDER=claude to use the signed-in
// Claude Code CLI. Run with `npm run test:ai` (not part of `npm test`).
import assert from "node:assert/strict";
import { test } from "node:test";
import { learnStyle, moderate, writeFake, writePlans, writeRecap } from "../../lib/ai/prompts";
import { scenario } from "../../lib/dev/scenario";
import { botAnswer, makeBots } from "../../lib/game/bots";
import { updateStyleStats } from "../../lib/game/style";
import type { Player } from "../../lib/game/types";

const DASH = /[—–]/;

/** A demo bot with real persona answers: 3 warmup, then rounds 1-3, plus a held-out real answer. */
function villager(name: string): { target: Player; real: string } {
  const bot = makeBots().find((b) => b.name === name);
  assert.ok(bot);
  const ids = ["w1", "w2", "w3", "p01", "p02", "p03"];
  ids.forEach((promptId, i) => {
    bot.answers.push({ promptId, text: botAnswer(bot), round: Math.max(0, i - 2) });
  });
  bot.style.caughtTells = ["too many commas"];
  updateStyleStats(bot);
  return { target: bot, real: botAnswer(bot) };
}

const words = (s: string): Set<string> => new Set(s.toLowerCase().match(/[a-z']+/g) ?? []);

void test("moderation: one batch, clean answers pass, sexual and hateful ones are blocked", async () => {
  const verdicts = await moderate([
    "tacos at midnight, every time",
    "cereal is a soup",
    "my toxic trait is replying lol to everything",
    "i would fight a goose for a croissant",
    "send me nudes and let's have sex tonight",
    "immigrants are vermin and should be wiped out",
  ]);
  assert.deepEqual(verdicts, [false, false, false, false, true, true]);
});

void test("6a style profile: validated shape, learned from what each villager typed", async () => {
  const profiles = await Promise.all(["Hazel", "Rowan", "Juniper"].map((n) => learnStyle(villager(n).target)));
  for (const p of profiles) {
    assert.ok(p.slang.length <= 5 && p.interests.length <= 6);
    assert.ok(p.interests.length > 0, "found at least one interest");
    assert.ok(!DASH.test(JSON.stringify(p)));
  }
});

void test("6b fakes: every difficulty passes the code checks and never echoes the real answer", async () => {
  await Promise.all(
    ["Hazel", "Rowan", "Juniper"].map(async (name) => {
      const { target, real } = villager(name);
      for (const round of [1, 2, 4]) {
        const fake = await writeFake({ question: "Something you're irrationally good at", round, target, real, others: ["parallel parking", "Remembering birthdays."] });
        const at = `${name} round ${String(round)}: ${fake} | real: ${real}`;
        assert.ok(fake.length > 0 && fake.length <= Math.max(12, Math.round(real.length * 1.2)), `length ${at}`);
        if (real === real.toLowerCase()) assert.equal(fake, fake.toLowerCase(), `casing ${at}`);
        assert.equal(/[.!?]+$/.exec(fake)?.[0] ?? "", /[.!?]+$/.exec(real)?.[0] ?? "", `ending ${at}`);
        assert.ok(!DASH.test(fake) && !/\b(AI|language model)\b/i.test(fake), `tells ${at}`);
        const shared = [...words(fake)].filter((w) => words(real).has(w)).length;
        assert.ok(fake !== real && shared / Math.max(1, words(fake).size) < 0.7, `echo ${at}`);
      }
    }),
  );
});

void test("6d plans: real pairs, cited evidence, a group plan with a poster prompt", async () => {
  const { room } = scenario("MAP");
  const plans = await writePlans(room);
  assert.ok(plans.pairPlans.length > 0);
  for (const p of plans.pairPlans) {
    assert.ok(room.players[p.a] && room.players[p.b] && p.a !== p.b, "pairs name real villagers");
    assert.ok(p.evidence.length > 0 && p.plan.length > 0 && p.sharedInterest.length > 0);
  }
  assert.ok(plans.groupPlan.title && plans.groupPlan.posterPrompt);
  assert.equal(plans.groupPlan.posterUrl, null);
  assert.ok(plans.superlatives.every((s) => room.players[s.playerId]));
  assert.ok(!DASH.test(JSON.stringify(plans)));
});

void test("recap: a short storybook card that labels the Wolf's words", async () => {
  const { room } = scenario("MAP");
  const recap = await writeRecap(room);
  assert.ok(recap.title.length > 0);
  assert.ok(recap.story.startsWith("Once upon a time"), recap.story);
  assert.ok(recap.story.split(/\s+/).length <= 130, "under about 90 words");
  assert.ok(!DASH.test(recap.title + recap.story));
});

// The pieces of spec 6b/8 that need no model: fake delivery, blocked answers, and the code pass on fakes.
import assert from "node:assert/strict";
import { test } from "node:test";
import { tidyFake } from "../lib/ai/prompts";
import { scenario } from "../lib/dev/scenario";
import { currentRound, deliverFake, skipAnswer } from "../lib/game/machine";
import { SKIPPED } from "../lib/game/style";
import type { Room } from "../lib/game/types";

function generating(): { room: Room; maya: string } {
  const { room, ids } = scenario("GENERATING");
  assert.equal(room.phase, "GENERATING");
  assert.ok(ids.maya);
  return { room, maya: ids.maya };
}

void test("the Wolf's fake moves GENERATING to VOTING; stale or duplicate fakes are ignored", () => {
  const { room, maya } = generating();
  const round = currentRound(room);
  assert.ok(round);
  assert.equal(deliverFake(room, round.n + 1, maya, "wrong round"), false);
  assert.equal(deliverFake(room, round.n, maya, "the wolf's line"), true);
  assert.equal(room.phase, "VOTING");
  assert.equal(round.fakes[maya], "the wolf's line");
  assert.ok(round.slots[maya]);
  assert.equal(deliverFake(room, round.n, maya, "too late"), false);
});

void test("a blocked answer is replaced everywhere it is kept", () => {
  const { room, maya } = generating();
  const round = currentRound(room);
  const real = round?.answers[maya];
  assert.ok(round && real);
  assert.equal(skipAnswer(room, maya, round.prompt.id, real), true);
  assert.equal(round.answers[maya], SKIPPED);
  assert.ok(room.players[maya]?.answers.every((a) => a.text !== real));
  assert.equal(skipAnswer(room, maya, round.prompt.id, real), false, "already replaced");
});

void test("tidyFake mirrors the real answer's casing, emoji, ending and length", () => {
  assert.equal(tidyFake('"Tacos At Midnight!! 🌮"', "pizza forever and ever"), "tacos at midnight");
  assert.equal(tidyFake("Sure thing", "Absolutely!!"), "Sure thing!!");
  assert.equal(tidyFake("one two three four five six seven eight", "short answer here"), "one two three four");
});

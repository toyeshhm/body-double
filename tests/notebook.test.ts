// The Wolf's notebook on a two-chapter game built by the real state machine (lib/dev/scenario.ts). No mocks.
import assert from "node:assert/strict";
import { test } from "node:test";
import { scenario } from "../lib/dev/scenario";
import { notebookFor } from "../lib/game/notebook";

void test("the notebook sets the first fake beside the last, and phones see only their own page", () => {
  const { room, ids } = scenario("NOTEBOOK");
  assert.equal(room.phase, "NOTEBOOK");
  const book = notebookFor(room, null);
  assert.ok(book);
  assert.deepEqual(
    [book.first?.round, book.first?.targetId, book.first?.fooled, book.first?.votes],
    [1, ids.maya, 2, 4],
    "chapter I: the Wolf as Maya fooled 2 of 4",
  );
  assert.deepEqual([book.last?.round, book.last?.targetId, book.last?.fooled, book.last?.votes], [2, ids.jordan, 3, 4], "chapter II: 3 of 4");
  assert.ok(book.first?.real && book.first.fake !== book.first.real);
  assert.deepEqual(book.pages.slice(0, 2).map((p) => p.playerId).sort(), [ids.jordan, ids.maya].sort(), "most-worn voices first");
  assert.ok(book.pages.find((p) => p.playerId === ids.jordan)?.style.caughtTells.includes("jordan never says perking"));

  const mine = notebookFor(room, ids.priya ?? "");
  assert.deepEqual(mine, { pages: [{ playerId: ids.priya, style: room.players[ids.priya ?? ""]?.style, fooled: 0, votes: 0 }], first: null, last: null });
  assert.equal(notebookFor(scenario("MAP").room, null), null, "nothing outside the notebook page");
});

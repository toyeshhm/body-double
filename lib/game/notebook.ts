// The Wolf's notebook (after the map): what it learned about each villager it impersonated, and one early
// fake next to one late fake so the room can see it get better. Built from the room at read time.
import { list, realChoice } from "./machine";
import type { FakeSample, Notebook, NotebookPage, Room } from "./types";

/** Every fake that reached a vote. Vetoed fakes still count toward the stats but are never shown again. */
function showdowns(room: Room): { sample: FakeSample; vetoed: boolean }[] {
  return room.rounds.flatMap((r) =>
    r.targetIds.flatMap((id) => {
      const fake = r.fakes[id];
      const real = r.answers[id];
      const truth = realChoice(r, id);
      const votes = Object.values(r.votes[id] ?? {});
      if (fake === undefined || real === undefined || !truth || votes.length === 0) return [];
      const fooled = votes.filter((v) => v !== truth).length;
      return [{ sample: { round: r.n, targetId: id, question: r.prompt.text, real, fake, fooled, votes: votes.length }, vetoed: r.vetoed.includes(id) }];
    }),
  );
}

/** Null outside NOTEBOOK. viewerId null is the host screen (every page); a phone sees only its own page. */
export function notebookFor(room: Room, viewerId: string | null): Notebook | null {
  if (room.phase !== "NOTEBOOK") return null;
  const all = showdowns(room);
  const pages: NotebookPage[] = list(room)
    .filter((p) => p.canBeTarget && (viewerId === null || p.id === viewerId))
    .map((p) => {
      const mine = all.filter((s) => s.sample.targetId === p.id).map((s) => s.sample);
      return { playerId: p.id, style: p.style, fooled: mine.reduce((n, s) => n + s.fooled, 0), votes: mine.reduce((n, s) => n + s.votes, 0) };
    })
    .sort((a, b) => b.votes - a.votes);
  if (viewerId !== null) return { pages, first: null, last: null };
  const shown = all.filter((s) => !s.vetoed).map((s) => s.sample);
  const first = shown[0] ?? null;
  const last = first ? (shown.findLast((s) => s.round > first.round) ?? null) : null;
  return { pages, first, last };
}

// The fallbacks for every AI call (lib/game/wolf.ts): used whenever the Wolf is late, fails, or has no keys.
// Signatures are what the machine expects; keep them.
import { friendshipEdges } from "./map";
import { pickOne } from "./random";
import { SKIPPED } from "./style";
import type { Player, Plans, Recap, Room } from "./types";

export const STOCK_FAKES = [
  "honestly anything with a good playlist and zero plans",
  "Probably sleeping in, then pretending to be productive.",
  "tacos. the answer is always tacos",
  "Anything outdoors as long as there's coffee after!!",
  "a long walk and a longer nap",
  "Rewatching the same show for the fifth time, no regrets.",
];

/** Stub fake in the target's voice: the stock line closest in length, plus spec 6b's cheap casing/emoji rules. */
export function fakeAnswer(target: Player, realAnswer: string): string {
  const closest = [...STOCK_FAKES].sort(
    (x, y) => Math.abs(x.length - realAnswer.length) - Math.abs(y.length - realAnswer.length),
  );
  let text = pickOne(closest.slice(0, 2)) ?? "something cozy";
  if (target.style.casing === "lower") text = text.toLowerCase();
  if (!target.style.usesEmoji) text = text.replace(/\p{Extended_Pictographic}/gu, "").trim();
  return text;
}

function nameOf(room: Room, id: string): string {
  return room.players[id]?.name ?? "a villager";
}

/** Shown on screen whenever the Wolf's plans are late, so its evidence is only what villagers really typed. */
function lastWords(room: Room, id: string): string[] {
  const said = room.players[id]?.answers.filter((a) => a.text !== SKIPPED).at(-1)?.text;
  return said ? [`${nameOf(room, id)}: "${said}"`] : [];
}

function sharedInterest(room: Room, a: string, b: string): string {
  const theirs = room.players[b]?.style.interests.map((i) => i.toLowerCase()) ?? [];
  return room.players[a]?.style.interests.find((i) => theirs.includes(i.toLowerCase())) ?? "getting to know each other";
}

export function stubPlans(room: Room): Plans {
  const ids = Object.keys(room.players);
  const weakest = friendshipEdges(room)
    .sort((x, y) => x.score - y.score)
    .slice(0, 2);
  const pairs = weakest.length > 0 ? weakest : ids.length >= 2 ? [{ a: ids[0] ?? "", b: ids[1] ?? "" }] : [];
  const top = Object.values(room.players).sort((x, y) => y.score - x.score)[0];
  return {
    pairPlans: pairs.map(({ a, b }) => ({
      a,
      b,
      why: `The village barely knows how ${nameOf(room, a)} and ${nameOf(room, b)} think yet.`,
      sharedInterest: sharedInterest(room, a, b),
      evidence: [...lastWords(room, a), ...lastWords(room, b)],
      plan: "Tacos on Thursday at 9pm, and each of you picks one song for the walk there.",
      placeQuery: "late night tacos",
      place: null,
    })),
    groupPlan: {
      title: "Lantern Night at Zilker",
      why: "Everyone played tonight. The easiest next step is doing something together, outside the game.",
      plan: "Saturday at sunset: blankets, one dish each, and a round of Body Double played out loud.",
      posterPrompt: "storybook illustration, watercolor, warm lantern light, picnic blankets in a meadow at dusk",
      posterUrl: null,
      placeQuery: "Zilker Park",
      place: null,
    },
    superlatives: top ? [{ title: "Sharpest eyes in the village", playerId: top.id }] : [],
  };
}

export function stubRecap(room: Room): Recap {
  const names = Object.values(room.players).map((p) => p.name);
  const rate = room.wolf.total === 0 ? 0 : Math.round((room.wolf.fooled / room.wolf.total) * 100);
  return {
    title: `The Tale of Village ${room.code}`,
    story: `Once upon a time, ${String(names.length)} villagers (${names.join(", ")}) gathered at the edge of the woods. A Wolf crept among them wearing their words, and fooled the village ${String(rate)}% of the time. By the end of the night they knew each other a little better than when they arrived.`,
  };
}

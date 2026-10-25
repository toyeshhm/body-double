// ponytail: M1 stand-ins for every AI call. M2 swaps fakeAnswer for the two-pass pipeline (spec 6b),
// M3 swaps plans/recap for spec 6d/6e. Signatures are what the machine expects; keep them.
import { friendshipEdges } from "./map";
import { pickOne } from "./random";
import type { Player, Plans, Recap, Room } from "./types";

const STOCK_FAKES = [
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
      sharedInterest: "late-night tacos",
      evidence: ["(stub) both mentioned food after dark"],
      plan: "Tacos on Thursday at 9pm, and each of you picks one song for the walk there.",
    })),
    groupPlan: {
      title: "Lantern Night at Zilker",
      why: "(stub) Half the village said their perfect Saturday happens outside.",
      plan: "Saturday at sunset: blankets, one dish each, and a round of Body Double played out loud.",
      posterPrompt: "storybook illustration, watercolor, warm lantern light, picnic blankets in a meadow at dusk",
      posterUrl: null,
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

import { pickOne } from "./random";
import { emptyStyle } from "./style";
import type { Choice, Player, Role } from "./types";

type Persona = { name: string; avatar: string; role: Role; answers: string[]; tells: string[] };

// Demo mode villagers (spec 11). Three distinct texting fingerprints so fakes have something to copy.
const PERSONAS: Persona[] = [
  {
    name: "Hazel",
    avatar: "potion",
    role: "witch",
    answers: [
      "thrifting then a nap then tacos at 11pm 🌮",
      "ok but who took my charger",
      "pineapple on pizza is correct and i will not be taking questions",
      "barton springs at 7am before anyone else is awake",
      "lowkey reorganizing my bookshelf by color again",
      "a frog in a tiny hat 🐸",
      "iced oat latte, the barista knows my name now",
      "a candle-making class, i would be so good at it",
    ],
    tells: ["too many commas", "hazel never says lowkey", "way too polite"],
  },
  {
    name: "Rowan",
    avatar: "tree",
    role: "woodcutter",
    answers: [
      "Bouldering in the morning, then a long breakfast. Phone stays off.",
      "Who's up for climbing Thursday.",
      "Cereal is a soup. I have made my peace with this.",
      "A trail I haven't run yet, and a burger after.",
      "Building a chair out of one piece of oak. Slowly.",
      "Something with a map and no Wi-Fi.",
      "Black coffee. Fewer decisions.",
      "Knots. I know too many knots.",
    ],
    tells: ["rowan uses periods", "too short even for rowan", "no way he'd mention wifi"],
  },
  {
    name: "Juniper",
    avatar: "eat-me",
    role: "baker",
    answers: [
      "BAKING SOURDOUGH AND SCREAMING AT RUPAUL'S DRAG RACE!!",
      "GUYS. GUYS. the bakery on 6th has pistachio croissants!!",
      "Cake is better the second day and I'll fight anyone about it!!",
      "Karaoke!!! Every single time!!!",
      "A tiny cafe that only sells pie!!",
      "DOLLY PARTON, front row, no notes!!",
      "Making 40 cookies for people who didn't ask!!",
      "a farmers market and an unreasonable amount of peaches!!",
    ],
    tells: ["not enough exclamation marks", "juniper always yells", "too calm"],
  },
];

export const BOT_COUNT = PERSONAS.length;

export function makeBots(): Player[] {
  return PERSONAS.map((p, i) => ({
    id: `bot-${String(i + 1)}`,
    name: p.name,
    avatar: p.avatar,
    role: p.role,
    isBot: true,
    key: "",
    lastSeen: 0,
    consented: true,
    canBeTarget: true,
    score: 0,
    voiceUses: 0,
    answers: [],
    style: emptyStyle(),
  }));
}

function persona(bot: Player): Persona | undefined {
  return PERSONAS.find((p) => p.name === bot.name);
}

/** Picks an answer this bot hasn't used yet (falls back to any once the pool runs out). */
export function botAnswer(bot: Player): string {
  const pool = persona(bot)?.answers ?? ["the woods are quiet tonight"];
  const used = new Set(bot.answers.map((a) => a.text));
  return pickOne(pool.filter((a) => !used.has(a))) ?? pickOne(pool) ?? "the woods are quiet tonight";
}

/** Votes randomly with a slight bias toward the real answer (spec 11). */
export function botVote(real: Choice): Choice {
  const other: Choice = real === "A" ? "B" : "A";
  return Math.random() < 0.62 ? real : other;
}

export function botTell(bot: Player): string | undefined {
  return Math.random() < 0.6 ? pickOne(persona(bot)?.tells ?? []) : undefined;
}

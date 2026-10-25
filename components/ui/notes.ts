import type { StyleProfile } from "@/lib/game/types";

// The Wolf's notes on one villager, from their style profile (lib/game/style.ts, lib/ai/prompts.ts learnStyle).

const CASING = { lower: "all lowercase", sentence: "Sentence case", mixed: "a bit of everything" } as const;

/** Labeled rows for the phone ("What the Wolf knows about you", and your notebook page). Null = not learned yet. */
export function notes(style: StyleProfile): { label: string; value: string | null }[] {
  const seen = style.avgLength > 0;
  const list = (items: string[]): string | null => (items.length > 0 ? items.join(", ") : null);
  return [
    { label: "Typical length", value: seen ? `About ${String(style.avgLength)} characters` : null },
    { label: "Casing", value: seen ? CASING[style.casing] : null },
    { label: "Emoji", value: style.usesEmoji ? style.emojiExamples.join(" ") : seen ? "None so far" : null },
    { label: "Punctuation", value: style.punctuation || null },
    { label: "Slang", value: list(style.slang) },
    { label: "Humor", value: style.humor || null },
    { label: "Interests", value: list(style.interests) },
  ];
}

/** Short scribbles for the big-screen notebook, most telling first. What the model learned leads; computed stats fill in. */
export function scribbles(style: StyleProfile): string[] {
  const seen = style.avgLength > 0;
  const lines = [
    style.interests.length > 0 && `into ${style.interests.slice(0, 3).join(", ")}`,
    style.humor && `humor: ${style.humor}`,
    style.slang.length > 0 && `says ${style.slang.slice(0, 3).map((s) => `"${s}"`).join(", ")}`,
    seen && (style.casing === "lower" ? "types in all lowercase" : style.casing === "sentence" ? "capitalizes like a grown-up" : "capitals all over the place"),
    seen && (style.usesEmoji ? `emoji: ${style.emojiExamples.slice(0, 3).join(" ")}` : "never uses emoji"),
    style.punctuation,
    seen && `about ${String(style.avgLength)} characters a reply`,
  ];
  return lines.filter((l): l is string => typeof l === "string" && l.length > 0);
}

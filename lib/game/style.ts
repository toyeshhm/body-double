import type { Player, StyleProfile } from "./types";

export const EMOJI = /\p{Extended_Pictographic}/gu;
/** Stands in for an answer moderation blocked (spec 8). Never counts as a writing sample. */
export const SKIPPED = "answer skipped";

export function emptyStyle(): StyleProfile {
  return {
    avgLength: 0,
    casing: "mixed",
    usesEmoji: false,
    emojiExamples: [],
    punctuation: "",
    slang: [],
    humor: "",
    interests: [],
    caughtTells: [],
  };
}

/** Spec 6a: length, casing and emoji stats are computed in code, not by the model. */
export function updateStyleStats(player: Player): void {
  const texts = player.answers.map((a) => a.text).filter((t) => t !== SKIPPED);
  if (texts.length === 0) return;
  const letters = texts.join(" ").replace(/[^a-zA-Z]/g, "");
  const lowerShare = letters.length === 0 ? 0 : letters.replace(/[^a-z]/g, "").length / letters.length;
  const startsUpper = texts.filter((t) => /^[A-Z]/.test(t.trim())).length / texts.length;
  const emoji = texts.flatMap((t) => t.match(EMOJI) ?? []);

  player.style.avgLength = Math.round(texts.reduce((sum, t) => sum + t.length, 0) / texts.length);
  player.style.casing = lowerShare > 0.97 ? "lower" : startsUpper > 0.7 ? "sentence" : "mixed";
  player.style.usesEmoji = emoji.length > 0;
  player.style.emojiExamples = [...new Set(emoji)].slice(0, 6);
}

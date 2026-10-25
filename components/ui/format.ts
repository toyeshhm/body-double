import type { ClientState, PublicPlayer } from "@/lib/game/types";

const NUMERALS: [number, string][] = [
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

/** Chapter numbers: 1 -> I, 6 -> VI, 12 -> XII. */
export function roman(n: number): string {
  let left = n;
  let out = "";
  for (const [value, glyph] of NUMERALS) {
    while (left >= value) {
      out += glyph;
      left -= value;
    }
  }
  return out;
}

export function playerById(state: ClientState, id: string | null | undefined): PublicPlayer | undefined {
  return id ? state.players.find((p) => p.id === id) : undefined;
}

/** "The Wolf fooled the village X% of the time". */
export function wolfRate(state: ClientState): number {
  return state.wolf.total === 0 ? 0 : Math.round((state.wolf.fooled / state.wolf.total) * 100);
}

/** Villagers ranked for "Village Heroes". */
export function heroes(state: ClientState): PublicPlayer[] {
  return [...state.players].sort((a, b) => b.score - a.score);
}

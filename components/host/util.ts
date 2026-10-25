import { playerById } from "@/components/ui/format";
import type { ClientState, PublicPlayer } from "@/lib/game/types";

export const EASE = [0.22, 1, 0.36, 1] as const;

/** Mirrors the server's idea of who is playing right now (agreed, and connected or a bot). */
export function present(p: PublicPlayer): boolean {
  return p.consented && (p.connected || p.isBot);
}

/** "Maya", or "Maya and Jordan" when two villagers share a round. */
export function targetNames(state: ClientState): string {
  const names = targets(state).map((p) => p.name);
  return names.length === 0 ? "A villager" : names.join(" and ");
}

export function targets(state: ClientState): PublicPlayer[] {
  return (state.round?.targetIds ?? []).map((id) => playerById(state, id)).filter((p): p is PublicPlayer => p !== undefined);
}

import { friendshipEdges } from "./map";
import { activeTarget, currentRound, isConnected, list, realChoice, warmupDone } from "./machine";
import type { Choice, ClientState, PairView, RevealView, Room, RoundView, SlotKind } from "./types";
import { ROUND_PHASES } from "./types";

/**
 * Sanitized state for one recipient (spec 10). viewerId null = the host screen.
 * Never reveals which slot is real before REVEAL; never includes another player's style profile.
 */
export function viewFor(room: Room, viewerId: string | null, joinUrl: string, version: number): ClientState {
  const round = currentRound(room);
  const inRound = round !== undefined && ROUND_PHASES.includes(room.phase);
  const targetId = round && inRound ? (activeTarget(round) ?? null) : null;
  const revealed = room.phase === "REVEAL" || room.phase === "TELLS";

  let pair: PairView | null = null;
  let reveal: RevealView | null = null;
  const slots = round && targetId ? round.slots[targetId] : undefined;
  if (round && targetId && slots && (room.phase === "VOTING" || revealed)) {
    const hidden = revealed && round.vetoed.includes(targetId);
    const text = (kind: SlotKind): string | null =>
      kind === "real" ? (round.answers[targetId] ?? null) : hidden ? null : (round.fakes[targetId] ?? null);
    pair = { targetId, A: text(slots.A), B: text(slots.B), vetoed: hidden };
    const real = realChoice(round, targetId);
    if (revealed && real) {
      const votes: Record<Choice, string[]> = { A: [], B: [] };
      for (const [voterId, choice] of Object.entries(round.votes[targetId] ?? {})) votes[choice].push(voterId);
      reveal = { targetId, real, votes };
    }
  }

  const roundView: RoundView | null =
    round && inRound
      ? {
          n: round.n,
          total: room.settings.rounds,
          prompt: round.prompt,
          targetIds: round.targetIds,
          activeTargetId: targetId,
          targetReason: round.targetReason,
          pair,
          reveal,
          tells: targetId && revealed ? (round.tells[targetId] ?? []) : [],
        }
      : null;

  const me = viewerId ? room.players[viewerId] : undefined;
  const now = Date.now();
  // Only timed phases show a countdown; PROMPT and GENERATING advance on their own without one.
  const shownDeadline = room.phase === "ANSWERING" || room.phase === "VOTING" ? room.deadline : null;
  return {
    version,
    code: room.code,
    phase: room.phase,
    joinUrl: `${joinUrl}/play/${room.code}`,
    settings: room.settings,
    serverTime: now,
    deadline: shownDeadline,
    players: list(room).map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      role: p.role,
      score: p.score,
      connected: isConnected(p, now),
      isBot: p.isBot,
      consented: p.consented,
      canBeTarget: p.canBeTarget,
      answered: room.phase === "WARMUP" ? warmupDone(room, p) : round?.answers[p.id] !== undefined,
      voted: targetId ? round?.votes[targetId]?.[p.id] !== undefined : false,
    })),
    warmup: room.warmup,
    round: roundView,
    edges: friendshipEdges(room),
    wolf: room.wolf,
    plans: room.plans,
    recap: room.recap,
    me: me
      ? {
          id: me.id,
          consented: me.consented,
          canBeTarget: me.canBeTarget,
          answeredPromptIds: me.answers.map((a) => a.promptId),
          vote: targetId ? (round?.votes[targetId]?.[me.id] ?? null) : null,
          style: me.style,
        }
      : null,
  };
}

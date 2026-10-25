import type { MapEdge, Room } from "./types";

/** Spec 7: knowsScore = correct / total, averaged over whichever directions have data. No data, no edge. */
export function friendshipEdges(room: Room): MapEdge[] {
  const ids = Object.keys(room.players);
  const edges: MapEdge[] = [];
  for (const [i, a] of ids.entries()) {
    for (const b of ids.slice(i + 1)) {
      const cells = [room.knows[a]?.[b], room.knows[b]?.[a]].filter(
        (c): c is { correct: number; total: number } => c !== undefined && c.total > 0,
      );
      if (cells.length === 0) continue;
      const score = cells.reduce((sum, c) => sum + c.correct / c.total, 0) / cells.length;
      edges.push({ a, b, score, samples: cells.reduce((sum, c) => sum + c.total, 0) });
    }
  }
  return edges;
}

/** How well the room knows this player (incoming score). Null until someone has voted on them. */
export function knownBy(room: Room, playerId: string): number | null {
  let correct = 0;
  let total = 0;
  for (const row of Object.values(room.knows)) {
    const cell = row[playerId];
    if (!cell) continue;
    correct += cell.correct;
    total += cell.total;
  }
  return total === 0 ? null : correct / total;
}

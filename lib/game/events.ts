// The HTTP contract, shared by API routes and the browser (spec 10's events, carried over fetch).
// Payloads are validated with these schemas on the server: phones are a trust boundary.
import { z } from "zod";
import { AVATARS, ROLES } from "./types";

export const SettingsInput = z
  .object({
    rounds: z.number().int().min(1).max(12),
    answerSeconds: z.number().int().min(15).max(180),
    voteSeconds: z.number().int().min(10).max(90),
    demoMode: z.boolean(),
  })
  .partial();

export const JoinInput = z.object({
  code: z.string().trim().toUpperCase().length(4),
  name: z.string().trim().min(1).max(20),
  avatar: z.enum(AVATARS),
  role: z.enum(ROLES),
  /** Proof for rejoining: the id and key this phone got when it first joined. */
  playerId: z.string().max(64).optional(),
  playerKey: z.string().max(64).optional(),
});

const TargetId = z.string().min(1).max(64);

/** Everything a screen can ask the room to do. `type` keeps the spec's event names. */
export const Action = z.discriminatedUnion("type", [
  z.object({ type: z.literal("host:settings"), settings: SettingsInput }),
  z.object({ type: z.literal("host:start") }),
  z.object({ type: z.literal("host:next") }),
  z.object({ type: z.literal("player:consent"), agree: z.literal(true), canBeTarget: z.boolean() }),
  z.object({ type: z.literal("player:answer"), promptId: z.string().min(1).max(16), text: z.string().max(400) }),
  z.object({ type: z.literal("player:vote"), targetId: TargetId, choice: z.enum(["A", "B"]) }),
  z.object({ type: z.literal("player:tell"), targetId: TargetId, text: z.string().max(200) }),
  z.object({ type: z.literal("player:notMe"), targetId: TargetId }),
]);

/** Who is asking. Sent as headers so secrets never land in URLs or access logs. */
export const HEADER = { hostKey: "x-bd-host-key", playerId: "x-bd-player-id", playerKey: "x-bd-player-key" } as const;

export type Auth = { role: "host"; key: string } | { role: "player"; id: string; key: string };

export function authHeaders(auth: Auth): Record<string, string> {
  return auth.role === "host" ? { [HEADER.hostKey]: auth.key } : { [HEADER.playerId]: auth.id, [HEADER.playerKey]: auth.key };
}

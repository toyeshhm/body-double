import { randomUUID } from "node:crypto";
import { makeBots } from "./bots";
import { list } from "./machine";
import { emptyStyle } from "./style";
import type { Player, Role, Room, Settings } from "./types";

const MAX_PLAYERS = 40;

/**
 * Join, or rejoin and keep your score (spec 10). Rejoining needs the id and key this phone was given,
 * so knowing someone's name and the room code is not enough to take over their villager.
 */
export function joinPlayer(
  room: Room,
  input: { name: string; avatar: string; role: Role; playerId?: string | undefined; playerKey?: string | undefined },
): { player: Player } | { error: string } {
  const now = Date.now();
  const existing = list(room).find((p) => !p.isBot && p.name.toLowerCase() === input.name.toLowerCase());
  if (existing) {
    if (input.playerId !== existing.id || input.playerKey !== existing.key)
      return { error: "Someone in the village already goes by that name. Pick another." };
    existing.avatar = input.avatar;
    existing.role = input.role;
    existing.lastSeen = now;
    return { player: existing };
  }
  if (room.phase === "ENDED") return { error: "This tale has already ended." };
  if (list(room).some((p) => p.isBot && p.name.toLowerCase() === input.name.toLowerCase()))
    return { error: "A demo villager already has that name. Pick another." };
  if (list(room).length >= MAX_PLAYERS) return { error: "The village is full." };
  const player: Player = {
    id: randomUUID(),
    name: input.name,
    avatar: input.avatar,
    role: input.role,
    isBot: false,
    key: randomUUID(),
    lastSeen: now,
    consented: false,
    canBeTarget: true,
    score: 0,
    voiceUses: 0,
    answers: [],
    style: emptyStyle(),
  };
  room.players[player.id] = player;
  room.lastActive = now;
  return { player };
}

export function giveConsent(room: Room, playerId: string, canBeTarget: boolean): string | null {
  const player = room.players[playerId];
  if (!player) return "Join the village first.";
  player.consented = true;
  player.canBeTarget = canBeTarget;
  return null;
}

export function updateSettings(room: Room, patch: Partial<Settings>): string | null {
  if (room.phase !== "LOBBY") return "Settings are locked once the tale begins.";
  const demoWas = room.settings.demoMode;
  room.settings = { ...room.settings, ...patch };
  if (room.settings.demoMode && !demoWas) for (const bot of makeBots()) room.players[bot.id] = bot;
  if (!room.settings.demoMode && demoWas)
    for (const bot of list(room).filter((p) => p.isBot)) Reflect.deleteProperty(room.players, bot.id);
  return null;
}

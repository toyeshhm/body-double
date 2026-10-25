import { JoinInput } from "@/lib/game/events";
import type { Avatar, Role } from "@/lib/game/types";

const IdentitySchema = JoinInput.omit({ code: true });
export type Identity = { name: string; avatar: Avatar; role: Role };

const key = (code: string): string => `bd:join:${code}`;

/** Who this phone joined as, so a refresh or dropped connection rejoins by name (spec 10). */
export function loadIdentity(code: string): Identity | null {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(key(code));
  } catch {
    return null; // storage blocked (private mode): the player types their name again
  }
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    forgetIdentity(code);
    return null;
  }
  const result = IdentitySchema.safeParse(parsed);
  if (!result.success) {
    forgetIdentity(code);
    return null;
  }
  return result.data;
}

export function saveIdentity(code: string, identity: Identity): boolean {
  try {
    window.localStorage.setItem(key(code), JSON.stringify(identity));
    return true;
  } catch {
    return false;
  }
}

export function forgetIdentity(code: string): void {
  try {
    window.localStorage.removeItem(key(code));
  } catch {
    // nothing stored to forget
  }
}

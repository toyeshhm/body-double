"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { type Action, type Auth, authHeaders } from "@/lib/game/events";
import type { ClientState } from "@/lib/game/types";

// ponytail: polling, not sockets, so the whole game runs on Vercel's serverless functions.
// An unchanged poll is a 204 with no body. Upgrade path: a Supabase Realtime "poke" that triggers the fetch.
const POLL_MS = 900;

const ErrorBody = z.object({ error: z.string() });
const Created = z.object({ code: z.string().length(4), hostKey: z.string().min(8) });
const Joined = z.object({ playerId: z.string().min(1), playerKey: z.string().min(1) });

/** Our own API's state payload. A shallow check: the server is the one that built it. */
function isState(v: unknown): v is ClientState {
  return typeof v === "object" && v !== null && "version" in v && "phase" in v && "players" in v;
}

async function errorOf(res: Response): Promise<string> {
  const body = ErrorBody.safeParse(await res.json().catch(() => null));
  return body.success ? body.data.error : "Something went wrong in the woods. Try again.";
}

export async function createVillage(): Promise<z.infer<typeof Created>> {
  const res = await fetch("/api/rooms", { method: "POST" });
  if (!res.ok) throw new Error(await errorOf(res));
  return Created.parse(await res.json());
}

export async function joinVillage(
  code: string,
  identity: { name: string; avatar: string; role: string },
): Promise<{ ok: true; playerId: string; playerKey: string } | { ok: false; status: number; error: string }> {
  try {
    const res = await fetch(`/api/rooms/${code}/join`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(identity),
    });
    if (!res.ok) return { ok: false, status: res.status, error: await errorOf(res) };
    return { ok: true, ...Joined.parse(await res.json()) };
  } catch {
    return { ok: false, status: 0, error: "Couldn't reach the village. Check your connection." };
  }
}

/**
 * Keeps one screen in sync with its room. Polls while the tab is visible; `send` posts an action
 * and applies the returned state right away. `deadline` comes back converted to this device's clock.
 * `gone` is "missing" when the room no longer exists and "unauthorized" when these keys don't fit it.
 */
export function useRoom(code: string | null, auth: Auth | null) {
  const [state, setState] = useState<ClientState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(true);
  const [gone, setGone] = useState<"missing" | "unauthorized" | null>(null);
  const version = useRef(-1);

  const accept = useCallback((body: unknown): void => {
    if (!isState(body) || body.version < version.current) return; // ignore a poll that lost a race with an action
    version.current = body.version;
    const skew = Date.now() - body.serverTime;
    setState({ ...body, deadline: body.deadline === null ? null : body.deadline + skew });
  }, []);

  useEffect(() => {
    if (!code || !auth) return;
    version.current = -1;
    setGone(null);
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async (): Promise<void> => {
      clearTimeout(timer);
      try {
        const res = await fetch(`/api/rooms/${code}?v=${String(version.current)}`, { headers: authHeaders(auth), cache: "no-store" });
        setConnected(true);
        if (res.status === 200) accept(await res.json());
        else if (res.status === 404) setGone("missing");
        else if (res.status === 401) setGone("unauthorized");
      } catch {
        setConnected(false); // offline or server restarting: keep trying
      }
      if (!stopped && !document.hidden) timer = setTimeout(() => void poll(), POLL_MS);
    };
    const onVisibility = (): void => {
      if (!document.hidden) void poll();
    };
    void poll();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [code, auth, accept]);

  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => {
      setError(null);
    }, 4500);
    return () => {
      clearTimeout(id);
    };
  }, [error]);

  const send = useCallback(
    async (action: z.input<typeof Action>): Promise<void> => {
      if (!code || !auth) return;
      try {
        const res = await fetch(`/api/rooms/${code}`, {
          method: "POST",
          headers: { ...authHeaders(auth), "content-type": "application/json" },
          body: JSON.stringify(action),
        });
        if (res.ok) accept(await res.json());
        else if (res.status === 404) setGone("missing");
        else setError(await errorOf(res));
      } catch {
        setError("Couldn't reach the village. Check your connection.");
      }
    },
    [code, auth, accept],
  );

  return { state, error, setError, connected, gone, send };
}

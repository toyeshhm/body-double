"use client";
import { useCallback, useEffect, useState } from "react";
import { Missing, Opening } from "@/components/play/bits";
import { forgetIdentity, loadIdentity, saveIdentity, type Identity } from "@/components/play/identity";
import { JoinForm } from "@/components/play/JoinForm";
import { PlayScreen } from "@/components/play/PlayScreen";
import { Notice } from "@/components/ui/Notice";
import { joinVillage, useRoom } from "@/components/useGame";
import type { Auth } from "@/lib/game/events";

type Gate = "checking" | "form" | "submitting" | "rejoining" | "missing";

export default function PlayPage({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase().slice(0, 4);
  const [gate, setGate] = useState<Gate>("checking");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [auth, setAuth] = useState<Auth | null>(null);

  const join = useCallback(
    async (identity: Identity, mode: "submitting" | "rejoining"): Promise<void> => {
      setGate(mode);
      setJoinError(null);
      // Re-entering the same name on this phone reuses its saved key, so the server knows it's really you.
      const saved = loadIdentity(code);
      const proof = saved?.name.toLowerCase() === identity.name.toLowerCase() ? { playerId: saved.playerId, playerKey: saved.playerKey } : {};
      const res = await joinVillage(code, { ...identity, ...proof });
      if (res.ok) {
        saveIdentity(code, { ...identity, playerId: res.playerId, playerKey: res.playerKey });
        setAuth({ role: "player", id: res.playerId, key: res.playerKey });
        return;
      }
      const gone = res.status === 404 || /already ended/i.test(res.error);
      if (gone) forgetIdentity(code);
      setJoinError(res.error);
      setGate(gone ? "missing" : "form");
    },
    [code],
  );

  // A saved identity rejoins by name on load (spec 10); otherwise show the join form.
  useEffect(() => {
    const saved = loadIdentity(code);
    if (saved) void join(saved, "rejoining");
    else setGate("form");
  }, [code, join]);

  const { state, error, connected, gone, send } = useRoom(code, auth);

  useEffect(() => {
    if (gone === "missing") setGate("missing");
    if (gone !== "unauthorized") return;
    // Keys no longer fit (e.g. the server restarted): rejoin by name, which keeps the score.
    setAuth(null);
    const saved = loadIdentity(code);
    if (saved) void join(saved, "rejoining");
    else setGate("form");
  }, [gone, code, join]);

  const joined = state !== null && (state.me !== null || state.phase === "ENDED");
  let body;
  if (joined) body = <PlayScreen state={state} connected={connected} send={send} />;
  else if (gate === "missing") {
    const message = joinError && /already ended/i.test(joinError) ? joinError : null;
    body = <Shell><Missing code={code} message={message} /></Shell>;
  } else if (gate === "form" || gate === "submitting")
    body = (
      <JoinForm
        code={code}
        error={joinError}
        busy={gate === "submitting"}
        onJoin={(identity) => {
          void join(identity, "submitting");
        }}
      />
    );
  else body = <Shell><Opening offline={!connected} /></Shell>;

  return (
    <>
      {body}
      <Notice message={error} />
    </>
  );
}

/** Same column as PlayScreen for the screens before you've joined. */
function Shell({ children }: { children: React.ReactNode }) {
  return <main className="relative z-[2] mx-auto flex min-h-dvh w-full max-w-[30rem] flex-col overflow-x-clip px-4 pb-6">{children}</main>;
}

"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { nextLabel } from "@/components/host/Frame";
import { HostScreen } from "@/components/host/HostScreen";
import { Notice } from "@/components/ui/Notice";
import { Icon } from "@/components/ui/Villager";
import { createVillage, useRoom } from "@/components/useGame";
import type { Auth } from "@/lib/game/events";

const KEY = "bd:host";
const Saved = z.object({ code: z.string().length(4), hostKey: z.string().min(8) });

/** The room this tab hosted before a refresh, so a projector reload doesn't lose the game. */
function savedHost(): z.infer<typeof Saved> | undefined {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return undefined;
  try {
    const parsed = Saved.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : undefined;
  } catch {
    sessionStorage.removeItem(KEY); // corrupt entry: open a fresh village instead
    return undefined;
  }
}

export default function HostPage() {
  const [code, setCode] = useState<string | null>(null);
  const [auth, setAuth] = useState<Auth | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const opening = useRef(false);

  /** Opens a fresh village and remembers it for this tab, so a projector refresh resumes the same game. */
  const open = useCallback(async (): Promise<void> => {
    if (opening.current) return; // strict mode runs effects twice; one village per tab
    opening.current = true;
    try {
      const made = await createVillage();
      sessionStorage.setItem(KEY, JSON.stringify(made));
      setCode(made.code);
      setAuth({ role: "host", key: made.hostKey });
      setOpenError(null);
    } catch (e) {
      setOpenError(e instanceof Error ? e.message : "Couldn't open a village.");
    } finally {
      opening.current = false;
    }
  }, []);

  useEffect(() => {
    const saved = savedHost();
    if (saved) {
      setCode(saved.code);
      setAuth({ role: "host", key: saved.hostKey });
    } else void open();
  }, [open]);

  const { state, error, gone, send } = useRoom(code, auth);

  // The saved village expired or the server restarted: open a new one instead of a dead page.
  useEffect(() => {
    if (!gone) return;
    sessionStorage.removeItem(KEY);
    void open();
  }, [gone, open]);

  const next = useCallback(() => {
    void send({ type: "host:next" });
  }, [send]);
  const canTurn = state !== null && nextLabel(state) !== null;

  // Space or → turns the page, unless the host is typing or Space would press a focused button.
  useEffect(() => {
    if (!canTurn) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.repeat || (e.key !== " " && e.key !== "ArrowRight")) return;
      const el = e.target instanceof Element ? e.target : null;
      if (el?.closest("input, select, textarea, [contenteditable='true']")) return;
      if (e.key === " " && el?.closest("button, a")) return;
      e.preventDefault();
      next();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [canTurn, next]);

  if (!state) {
    return (
      <div className="grid min-h-dvh place-items-center px-6">
        <p role="status" className="voice flex items-center gap-4 text-[clamp(1.6rem,3vw,2.2rem)] text-ink-soft">
          <Icon id="storybook" className="w-16 animate-bob" />
          Opening the book...
        </p>
        <Notice message={error ?? openError} />
      </div>
    );
  }

  return (
    <>
      <HostScreen
        state={state}
        onNext={next}
        onStart={() => {
          void send({ type: "host:start" });
        }}
        onSettings={(patch) => {
          void send({ type: "host:settings", settings: patch });
        }}
        onRestart={() => {
          sessionStorage.removeItem(KEY);
          window.location.reload();
        }}
      />
      <Notice message={error} />
    </>
  );
}

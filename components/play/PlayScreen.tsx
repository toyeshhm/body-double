"use client";
import { MotionConfig, motion } from "framer-motion";
import { useState, type ReactNode } from "react";
import type { z } from "zod";
import { playerById } from "@/components/ui/format";
import type { Action } from "@/lib/game/events";
import type { ClientState } from "@/lib/game/types";
import { AnswerForm } from "./AnswerForm";
import { Brewing, Ended, Opening } from "./bits";
import { Consent } from "./Consent";
import { Finale } from "./Finale";
import { Header } from "./Header";
import { KnowsDrawer } from "./KnowsDrawer";
import { Lobby } from "./Lobby";
import { Reveal } from "./Reveal";
import { VotePad } from "./VotePad";
import { Warmup } from "./Warmup";

/**
 * Everything a phone sees once it has joined: header, consent, every phase, the Wolf's-notes drawer
 * and the reconnecting banner. Pure view over `state`; actions go out through `send`.
 */
export function PlayScreen({
  state,
  connected,
  send,
}: {
  state: ClientState;
  connected: boolean;
  send: (action: z.input<typeof Action>) => void | Promise<void>;
}) {
  const [knowsOpen, setKnowsOpen] = useState(false);
  const me = state.me;
  const round = state.round;
  const target = round?.activeTargetId ?? null;
  const live = me !== null && state.phase !== "ENDED";

  function screen(): { key: string; node: ReactNode } {
    if (state.phase === "ENDED") return { key: "ended", node: <Ended /> };
    if (!me) return { key: "opening", node: <Opening offline={!connected} /> };
    if (!me.consented)
      return {
        key: "consent",
        node: (
          <Consent
            onAgree={(canBeTarget) => {
              void send({ type: "player:consent", agree: true, canBeTarget });
            }}
          />
        ),
      };

    const answer = (promptId: string, text: string): void => {
      void send({ type: "player:answer", promptId, text });
    };
    const n = round?.n ?? 0;
    switch (state.phase) {
      case "LOBBY":
        return { key: "lobby", node: <Lobby state={state} me={me} /> };
      case "WARMUP":
        return { key: "warmup", node: <Warmup prompts={state.warmup} me={me} onAnswer={answer} /> };
      case "PROMPT":
      case "ANSWERING":
        return {
          key: `answer-${String(n)}`,
          node: round ? <AnswerForm state={state} round={round} me={me} onAnswer={answer} /> : <Opening offline={false} />,
        };
      case "GENERATING": {
        const names = (round?.targetIds ?? []).map((id) => playerById(state, id)?.name ?? "a villager").join(" and ");
        return { key: `brew-${String(n)}`, node: <Brewing isTarget={round?.targetIds.includes(me.id) ?? false} names={names} /> };
      }
      case "VOTING":
        return {
          key: `vote-${String(n)}-${target ?? ""}`,
          node: round ? (
            <VotePad
              state={state}
              round={round}
              me={me}
              onVote={(choice) => {
                if (target) void send({ type: "player:vote", targetId: target, choice });
              }}
            />
          ) : null,
        };
      case "REVEAL":
      case "TELLS":
        return {
          key: `reveal-${String(n)}-${target ?? ""}`,
          node: round ? (
            <Reveal
              state={state}
              round={round}
              me={me}
              onTell={(text) => {
                if (target) void send({ type: "player:tell", targetId: target, text });
              }}
              onNotMe={() => {
                if (target) void send({ type: "player:notMe", targetId: target });
              }}
            />
          ) : null,
        };
      case "MAP":
      case "PLANS":
      case "RECAP":
        return { key: state.phase, node: <Finale state={state} me={me} /> };
    }
  }

  const { key, node } = screen();
  const score = live ? (state.players.find((p) => p.id === me.id)?.score ?? null) : null;

  return (
    <MotionConfig reducedMotion="user">
      <main className="relative z-[2] mx-auto flex min-h-dvh w-full max-w-[30rem] flex-col overflow-x-clip px-4">
        <Header
          code={state.code}
          score={score}
          onOpenKnows={
            live
              ? () => {
                  setKnowsOpen(true);
                }
              : null
          }
        />
        {live && !connected && (
          <p role="status" className="card-sm mt-2 px-4 py-2 text-center text-[0.9rem] font-bold text-ink">
            Reconnecting to the village...
          </p>
        )}
        {/* Keyed lift-in, never hidden: content is readable even if animation frames stall. */}
        <motion.section
          key={key}
          initial={{ opacity: 0.5, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-1 flex-col pb-6 pt-5"
        >
          {node}
        </motion.section>
        {me && (
          <KnowsDrawer
            open={knowsOpen && live}
            onClose={() => {
              setKnowsOpen(false);
            }}
            style={me.style}
          />
        )}
      </main>
    </MotionConfig>
  );
}

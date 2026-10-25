"use client";
import { MotionConfig, motion } from "framer-motion";
import type { ClientState, Settings } from "@/lib/game/types";
import { Answering, Generating, PromptView, Warmup } from "./Chapter";
import { Ended, Recap } from "./Finale";
import { ForestMap } from "./ForestMap";
import { HostFrame } from "./Frame";
import { Lobby } from "./Lobby";
import { Notebook } from "./Notebook";
import { Quests } from "./Quests";
import { Showdown } from "./Showdown";
import { Tells } from "./Tells";

/** VOTING and REVEAL share a view so the mirrors stay put while the truth lands on them. */
function viewKey(s: ClientState): string {
  const phase = s.phase === "REVEAL" ? "VOTING" : s.phase;
  return `${phase}-${String(s.round?.n ?? 0)}-${s.round?.activeTargetId ?? ""}`;
}

function PhaseView({ state, onStart, onSettings, onRestart }: { state: ClientState; onStart: () => void; onSettings: (patch: Partial<Settings>) => void; onRestart: () => void }) {
  switch (state.phase) {
    case "LOBBY":
      return <Lobby state={state} onStart={onStart} onSettings={onSettings} />;
    case "WARMUP":
      return <Warmup state={state} />;
    case "PROMPT":
      return <PromptView state={state} />;
    case "ANSWERING":
      return <Answering state={state} />;
    case "GENERATING":
      return <Generating state={state} />;
    case "VOTING":
    case "REVEAL":
      return <Showdown state={state} />;
    case "TELLS":
      return <Tells state={state} />;
    case "MAP":
      return <ForestMap state={state} />;
    case "NOTEBOOK":
      return <Notebook state={state} />;
    case "PLANS":
      return <Quests state={state} />;
    case "RECAP":
      return <Recap state={state} />;
    case "ENDED":
      return <Ended onRestart={onRestart} />;
  }
}

/** Everything the host sees once a room exists: the frame plus the current phase. */
export function HostScreen(props: { state: ClientState; onNext: () => void; onStart: () => void; onSettings: (patch: Partial<Settings>) => void; onRestart: () => void }) {
  const { state, onNext } = props;
  return (
    <MotionConfig reducedMotion="user">
      <HostFrame state={state} onNext={onNext}>
        {/* Keyed lift-in, never hidden: content is readable even if animation frames stall. */}
        <motion.div
          key={viewKey(state)}
          className="flex w-full flex-1 flex-col"
          initial={{ opacity: 0.5, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <PhaseView {...props} />
        </motion.div>
      </HostFrame>
    </MotionConfig>
  );
}

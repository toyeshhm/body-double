import type { ReactNode } from "react";
import { ClockTower } from "@/components/ui/ClockTower";
import { roman } from "@/components/ui/format";
import type { ClientState } from "@/lib/game/types";

/** What the "turn the page" control does from each phase. Null = no control (lobby has its own start). */
export function nextLabel(state: ClientState): string | null {
  const round = state.round;
  switch (state.phase) {
    case "LOBBY":
    case "ENDED":
      return null;
    case "WARMUP":
      return "Begin chapter I";
    case "PROMPT":
      return "Start answering";
    case "ANSWERING":
      return "Close the answers";
    case "GENERATING":
      return "Show the answers";
    case "VOTING":
      return "Reveal the truth";
    case "REVEAL":
      return "Ask what gave it away";
    case "TELLS": {
      if (!round) return "Next chapter";
      const at = round.activeTargetId ? round.targetIds.indexOf(round.activeTargetId) : -1;
      if (at >= 0 && at < round.targetIds.length - 1) return "Next villager";
      return round.n < round.total ? "Next chapter" : "Into the forest";
    }
    case "MAP":
      return "See the quests";
    case "PLANS":
      return "Read the tale";
    case "RECAP":
      return "Close the book";
  }
}

/** Gold corner ornaments: one SVG, mirrored into each corner. */
function Corners() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
      <span className="corner left-3 top-3" />
      <span className="corner right-3 top-3 -scale-x-100" />
      <span className="corner bottom-3 left-3 -scale-y-100" />
      <span className="corner bottom-3 right-3 -scale-100" />
    </div>
  );
}

/** The host page around every phase: brand, chapter, village code, clock tower, and the page-turn button. */
export function HostFrame({ state, onNext, children }: { state: ClientState; onNext: () => void; children: ReactNode }) {
  const label = nextLabel(state);
  const round = state.round;
  const total = state.phase === "ANSWERING" ? state.settings.answerSeconds : state.settings.voteSeconds;
  return (
    // overflow-x-clip: tilted stickers and the reveal's ribbons may poke past the edge on a phone; clip, never scroll sideways.
    <div className="relative min-h-dvh overflow-x-clip">
      <Corners />
      <div className="relative z-[1] mx-auto flex min-h-dvh max-w-[1680px] flex-col px-[clamp(16px,3.6vw,64px)] pt-[clamp(14px,2.4vh,30px)]">
        <header className="flex min-h-14 flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <h1 className="brand text-[clamp(1.5rem,2.1vw,2rem)]">
            Body <b>Double</b>
          </h1>
          <div className="flex flex-wrap items-center gap-x-[clamp(14px,2vw,32px)] gap-y-2">
            {round && (
              <p className="voice text-[clamp(1.1rem,1.6vw,1.6rem)] text-gold-text">
                Chapter {roman(round.n)} of {roman(round.total)}
              </p>
            )}
            <p className="code-chip">
              <small className="voice text-[0.85rem] text-[#e9dcb8]">Village</small>
              <span className="foil text-[1.35rem] tracking-[0.06em]">{state.code}</span>
            </p>
            <ClockTower deadline={state.deadline} totalSeconds={total} size="sm" caption={false} />
          </div>
        </header>
        <main className="flex flex-1 flex-col py-[clamp(10px,2vh,24px)]">{children}</main>
        {label && (
          <footer className="sticky bottom-0 -mx-4 flex items-center justify-end gap-5 bg-gradient-to-t from-paper-ground from-60% to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:static md:mx-0 md:bg-none md:px-0 md:pb-[clamp(14px,2.6vh,32px)] md:pt-0">
            <span className="voice hidden text-[1rem] text-ink-soft [@media(hover:hover)]:lg:inline">Space or → turns the page</span>
            <button type="button" className="btn btn-primary w-full min-h-[3.75rem] px-9 text-[clamp(1.1rem,1.5vw,1.45rem)] md:w-auto" onClick={onNext}>
              {label}
              <svg viewBox="0 0 20 12" className="h-3 w-5" aria-hidden="true">
                <path d="M1 6 H18 M13 1 L18 6 L13 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}

import { useRef } from "react";
import { playerById, wolfRate } from "@/components/ui/format";
import { SaveImage } from "@/components/ui/SaveImage";
import { Icon } from "@/components/ui/Villager";
import type { ClientState } from "@/lib/game/types";
import { HeroesCard } from "./Heroes";

export function Recap({ state }: { state: ClientState }) {
  const card = useRef<HTMLElement>(null);
  const recap = state.recap;
  const superlatives = state.plans?.superlatives ?? [];
  return (
    <div className="grid flex-1 items-start gap-x-[clamp(28px,4vw,64px)] gap-y-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
      <article ref={card} className="card p-[clamp(22px,3vw,48px)]">
        <div className="flex items-center gap-4">
          <Icon id="storybook" className="w-[clamp(3.5rem,6vw,5.5rem)] -rotate-6" />
          <h2 className="break-words font-display text-[clamp(2rem,3.4vw,3.4rem)] font-bold leading-tight [font-variation-settings:'SOFT'_100]">{recap?.title ?? "The Tale"}</h2>
        </div>
        <p className="dropcap mt-6 font-display text-[clamp(1.25rem,1.8vw,1.9rem)] leading-[1.55] [font-variation-settings:'SOFT'_50]">
          {recap?.story ?? "Once upon a time, a village gathered at the edge of the woods."}
        </p>
        <p className="mt-8 border-t-2 border-dashed border-gold/60 pt-5 font-display text-[clamp(1.4rem,2.2vw,2.2rem)] font-bold [font-variation-settings:'SOFT'_100]">
          The Wolf fooled the village <span className="text-rasp-deep">{wolfRate(state)}%</span> of the time.
        </p>
      </article>
      <aside className="space-y-6">
        <HeroesCard state={state} className="rotate-[1.2deg]" />
        {superlatives.length > 0 && (
          <ul className="card-sm space-y-1 px-5 py-4">
            {superlatives.map((s) => (
              <li key={`${s.title}-${s.playerId}`} className="text-[clamp(1.1rem,1.4vw,1.35rem)] font-semibold">
                <span className="voice font-medium text-ink-soft">{s.title}:</span> {playerById(state, s.playerId)?.name ?? "a villager"}
              </li>
            ))}
          </ul>
        )}
        <p className="text-[1rem] font-semibold text-ink-soft">Every Wolf answer tonight was written by an AI, never a real quote.</p>
        <SaveImage target={card} fileName={`body-double-${state.code}.png`} className="max-w-sm" />
      </aside>
    </div>
  );
}

export function Ended({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="m-auto flex flex-col items-center gap-6 py-10 text-center">
      <Icon id="storybook" cut="lg" className="w-[clamp(6rem,12vw,10rem)]" />
      <h2 className="cut-letters text-[clamp(4.5rem,10vw,8.5rem)]">The End</h2>
      <p className="voice max-w-[32rem] text-[clamp(1.35rem,2vw,1.9rem)] text-ink-soft">Every answer has been forgotten. The village is gone.</p>
      <button type="button" className="btn btn-primary mt-2 min-h-[4rem] px-10 text-[1.3rem]" onClick={onRestart}>
        Open a new village
      </button>
    </div>
  );
}

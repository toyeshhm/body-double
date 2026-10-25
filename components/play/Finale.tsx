import { useRef } from "react";
import { heroes, playerById, wolfRate } from "@/components/ui/format";
import { SaveImage } from "@/components/ui/SaveImage";
import { Icon, Token } from "@/components/ui/Villager";
import type { ClientState, MeView } from "@/lib/game/types";
import { Lede, Pause, Title, Voice } from "./bits";

const SOFT = { fontVariationSettings: '"SOFT" 100' } as const;

function Paths({ state, me }: { state: ClientState; me: MeView }) {
  const mine = state.edges.filter((e) => e.a === me.id || e.b === me.id).sort((x, y) => y.score - x.score);
  const other = (a: string, b: string) => playerById(state, a === me.id ? b : a);
  const strongest = mine[0];
  const weakest = mine.length > 1 ? mine.at(-1) : undefined;
  const row = (label: string, a: string, b: string) => {
    const p = other(a, b);
    return (
      <div className="flex items-center gap-3">
        {p && <Token player={p} size="md" />}
        <div>
          <dt className="text-[0.9rem] font-bold text-ink-soft">{label}</dt>
          <dd className="font-display text-[1.5rem] font-bold text-ink" style={SOFT}>
            {p?.name ?? "a villager"}
          </dd>
        </div>
      </div>
    );
  };
  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <Voice>The Enchanted Forest</Voice>
          <Title>Your paths through the woods</Title>
        </div>
        <Icon id="tree" className="size-20 shrink-0" />
      </div>
      {strongest ? (
        <dl className="card flex flex-col gap-4 p-5">
          {row("Your brightest path", strongest.a, strongest.b)}
          {weakest && row("Your most overgrown trail", weakest.a, weakest.b)}
        </dl>
      ) : (
        <Lede>No paths through the forest for you yet. They grow with every vote.</Lede>
      )}
      <Lede>The whole map is on the big screen.</Lede>
    </div>
  );
}

function Quests({ state, me }: { state: ClientState; me: MeView }) {
  if (!state.plans) return <Pause art={<Icon id="lamp" className="size-28 animate-bob" />} title="The storyteller is writing your quests..." />;
  const mine = state.plans.pairPlans.filter((p) => p.a === me.id || p.b === me.id);
  const group = state.plans.groupPlan;
  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <Voice>Quests</Voice>
          <Title>{mine.length > 0 ? "A quest with your name on it" : "The village quest"}</Title>
        </div>
        <Icon id="lamp" className="size-20 shrink-0 -rotate-6" />
      </div>
      {mine.map((q) => {
        const friend = playerById(state, q.a === me.id ? q.b : q.a);
        return (
          <article key={`${q.a}-${q.b}`} className="card p-5">
            <div className="flex items-center gap-3">
              {friend && <Token player={friend} size="sm" />}
              <h2 className="font-display text-[1.35rem] font-bold leading-tight text-ink" style={SOFT}>
                You and {friend?.name ?? "a villager"}
              </h2>
            </div>
            <p className="mt-3 font-medium leading-relaxed text-ink">{q.plan}</p>
            <p className="mt-3 text-[0.95rem] font-medium text-ink-soft">
              Shared interest: {q.sharedInterest}. {q.why}
            </p>
          </article>
        );
      })}
      <article className="scroll mx-3 my-3">
        <Voice className="!text-rasp-deep">For the whole village</Voice>
        <h2 className="mt-1 font-display text-[1.5rem] font-bold leading-tight text-ink" style={SOFT}>
          {group.title}
        </h2>
        <p className="mt-2 font-medium leading-relaxed text-ink">{group.plan}</p>
        <p className="mt-3 text-[0.95rem] font-medium text-ink-soft">{group.why}</p>
      </article>
    </div>
  );
}

function Story({ state, me }: { state: ClientState; me: MeView }) {
  const card = useRef<HTMLElement>(null);
  const ranked = heroes(state);
  const rank = ranked.findIndex((p) => p.id === me.id) + 1;
  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <Voice>Village Heroes</Voice>
          <Title>{rank === 1 ? "You saved the village." : `You finished #${String(rank)} of ${String(ranked.length)}.`}</Title>
        </div>
        <Icon id="crown" className="size-20 shrink-0 rotate-6" />
      </div>
      <Lede>
        The Wolf fooled the village <span className="font-sans font-extrabold tabular-nums text-rasp-deep">{wolfRate(state)}%</span> of the time.
      </Lede>
      {state.recap && (
        <article ref={card} className="card p-6">
          <div className="flex items-center gap-3">
            <Icon id="storybook" cut="sm" className="size-12 shrink-0" />
            <h2 className="font-display text-[1.4rem] font-bold leading-tight text-ink" style={SOFT}>
              {state.recap.title}
            </h2>
          </div>
          <p className="dropcap mt-4 font-display text-[1.15rem] leading-relaxed text-ink">{state.recap.story}</p>
          <p className="mt-4 text-sm font-medium text-ink-soft">Anything the Wolf wrote was AI-written, never a real quote.</p>
        </article>
      )}
      {state.recap && <SaveImage target={card} fileName={`body-double-${state.code}.png`} />}
    </div>
  );
}

/** End of the night on the phone: MAP, PLANS, RECAP. */
export function Finale({ state, me }: { state: ClientState; me: MeView }) {
  if (state.phase === "MAP") return <Paths state={state} me={me} />;
  if (state.phase === "PLANS") return <Quests state={state} me={me} />;
  return <Story state={state} me={me} />;
}

"use client";
import { motion } from "framer-motion";
import { playerById } from "@/components/ui/format";
import { Icon, Token } from "@/components/ui/Villager";
import type { ClientState, MapEdge, PublicPlayer } from "@/lib/game/types";
import { EASE } from "./util";

// ponytail: fixed ellipse around the enchanted tree. M3 may swap in react-force-graph-2d; keep it this one component.
const W = 1000;
const H = 600;

function placeOnEllipse(ids: string[]): Map<string, { x: number; y: number }> {
  const spots = new Map<string, { x: number; y: number }>();
  ids.forEach((id, i) => {
    const a = (i / ids.length) * Math.PI * 2 - Math.PI / 2;
    spots.set(id, { x: W / 2 + Math.cos(a) * 380, y: H / 2 + Math.sin(a) * 205 });
  });
  return spots;
}

/** A path that bows toward the tree in the middle. */
function trail(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  return `M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${(mx + (W / 2 - mx) * 0.35).toFixed(1)} ${(my + (H / 2 - my) * 0.35).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}

function Pair({ state, edge }: { state: ClientState; edge: MapEdge }) {
  const a = playerById(state, edge.a);
  const b = playerById(state, edge.b);
  return (
    <p className="flex items-center gap-2">
      {a && <Token player={a} size="sm" />}
      {b && <Token player={b} size="sm" className="-ml-4" />}
      <span className="font-display text-[clamp(1.2rem,1.6vw,1.6rem)] font-bold [font-variation-settings:'SOFT'_100]">
        {a?.name ?? "?"} &amp; {b?.name ?? "?"}
      </span>
    </p>
  );
}

const pct = (score: number): string => `${String(Math.round(score * 100))}%`;

export function ForestMap({ state }: { state: ClientState }) {
  const spots = placeOnEllipse(state.players.map((p) => p.id));
  const ranked = [...state.edges].sort((x, y) => y.score - x.score);
  const strongest = ranked[0];
  const blind = ranked.slice(1).reverse().slice(0, 2);

  return (
    <div className="grid flex-1 gap-x-[clamp(24px,3vw,48px)] gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
      <div className="flex min-w-0 flex-col">
        <h2 className="flex items-center gap-4 font-display text-[clamp(2.2rem,4vw,4rem)] font-bold leading-none [font-variation-settings:'SOFT'_100]">
          <Icon id="map" className="w-[clamp(3rem,5vw,4.5rem)] -rotate-6" />
          The Enchanted Forest
        </h2>
        <p className="voice mt-3 text-[clamp(1.15rem,1.5vw,1.45rem)] text-ink-soft">Every vote lights a path. The brighter the lantern, the better two villagers know each other.</p>

        <div className="card relative mt-6 aspect-[5/3] w-[min(100%,calc((100dvh-19rem)*5/3))] overflow-hidden">
          <Icon id="tree" cut="lg" className="absolute left-1/2 top-1/2 w-[17%] -translate-x-1/2 -translate-y-1/2 opacity-95" />
          <svg viewBox={`0 0 ${String(W)} ${String(H)}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
            {state.edges.map((e, i) => {
              const a = spots.get(e.a);
              const b = spots.get(e.b);
              if (!a || !b) return null;
              const bright = e.score >= 0.5;
              const top = e === strongest;
              const d = trail(a, b);
              return (
                <g key={`${e.a}-${e.b}`}>
                  <motion.path
                    d={d}
                    fill="none"
                    stroke={bright ? "#f2db94" : "#c9d2b4"}
                    strokeWidth={bright ? 10 + e.score * 10 : 6}
                    strokeLinecap="round"
                    opacity={bright ? 0.55 : 0.5}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.1, delay: 0.2 + i * 0.12, ease: EASE }}
                  />
                  <motion.path
                    d={d}
                    fill="none"
                    stroke={bright ? (top ? "#b88d40" : "#dbb35e") : "#83a06c"}
                    strokeWidth={bright ? (top ? 9 : 6) : 3}
                    strokeLinecap="round"
                    strokeDasharray={bright ? "0.1 16" : "10 12"}
                    style={bright ? { filter: "drop-shadow(0 0 6px rgba(242,214,128,.9))" } : undefined}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 1 + i * 0.12 }}
                  />
                </g>
              );
            })}
          </svg>
          {state.players.map((p: PublicPlayer, i) => {
            const s = spots.get(p.id);
            if (!s) return null;
            return (
              <motion.figure
                key={p.id}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                style={{ left: `${String((s.x / W) * 100)}%`, top: `${String((s.y / H) * 100)}%` }}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.45, delay: i * 0.08, ease: EASE }}
              >
                <Token player={p} size="md" className="size-[clamp(2.75rem,5vw,4.5rem)]" />
                <figcaption className="tag -mt-1 px-2 pb-0.5 pt-3 text-[clamp(0.85rem,1.2vw,1.1rem)] font-bold">{p.name}</figcaption>
              </motion.figure>
            );
          })}
          {state.edges.length === 0 && (
            <p className="voice absolute inset-x-0 bottom-[8%] text-center text-[clamp(1.1rem,1.6vw,1.5rem)] text-ink-soft">The paths are still overgrown. Play a chapter and the lanterns light up.</p>
          )}
        </div>
      </div>

      <aside className="card flex flex-col gap-6 self-end p-[clamp(18px,2vw,28px)]">
        <section>
          <h3 className="flex items-center gap-2 font-display text-[1.35rem] font-bold text-gold-text [font-variation-settings:'SOFT'_100]">
            <Icon id="lantern" cut="sm" className="w-8" />
            Strongest bond
          </h3>
          {strongest ? (
            <div className="mt-2">
              <Pair state={state} edge={strongest} />
              <p className="mt-1 text-[1.05rem] font-medium text-ink-soft">Spotted each other {pct(strongest.score)} of the time. A lantern-lit path.</p>
            </div>
          ) : (
            <p className="voice mt-2 text-[1.1rem] text-ink-soft">No paths yet.</p>
          )}
        </section>
        <section>
          <h3 className="flex items-center gap-2 font-display text-[1.35rem] font-bold text-sage-deep [font-variation-settings:'SOFT'_100]">
            <Icon id="key" cut="sm" className="w-8" />
            Biggest blind spots
          </h3>
          {blind.length === 0 ? (
            <p className="voice mt-2 text-[1.1rem] text-ink-soft">Not enough votes to tell yet.</p>
          ) : (
            <ul className="mt-2 space-y-3">
              {blind.map((e) => (
                <li key={`${e.a}-${e.b}`}>
                  <Pair state={state} edge={e} />
                  <p className="mt-1 text-[1.05rem] font-medium text-ink-soft">An overgrown trail: right {pct(e.score)} of the time.</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}

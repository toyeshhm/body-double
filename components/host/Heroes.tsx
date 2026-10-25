import { heroes, roman } from "@/components/ui/format";
import { Icon, Token } from "@/components/ui/Villager";
import type { ClientState } from "@/lib/game/types";

/** "Village Heroes" on a calling card with the crown. `limit` for the reveal, all for the recap. */
export function HeroesCard({ state, limit, compact = false, className = "" }: { state: ClientState; limit?: number; compact?: boolean; className?: string }) {
  const top = heroes(state).slice(0, limit ?? state.players.length);
  if (compact) {
    // one line for the reveal page, so the mirrors keep the height
    return (
      <section aria-label="Village Heroes" className={`card flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3 ${className}`}>
        <h3 className="flex items-center gap-2 font-display text-[clamp(1.15rem,1.5vw,1.45rem)] font-bold text-gold-text [font-variation-settings:'SOFT'_100]">
          <Icon id="crown" cut="sm" className="w-8" />
          Village Heroes
        </h3>
        <ol className="flex flex-wrap gap-x-5 gap-y-1">
          {top.map((p) => (
            <li key={p.id} className="flex items-center gap-2">
              <Token player={p} size="sm" />
              <span className="leading-tight">
                <span className="block text-[1.05rem] font-bold">{p.name}</span>
                <span className="block font-display text-[1.2rem] font-bold leading-none text-rasp-deep tabular-nums">{p.score}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    );
  }
  return (
    <section aria-label="Village Heroes" className={`card px-5 py-4 ${className}`}>
      <h3 className="flex items-center gap-2 font-display text-[clamp(1.25rem,1.6vw,1.6rem)] font-bold text-gold-text [font-variation-settings:'SOFT'_100]">
        <Icon id="crown" cut="sm" className="w-9" />
        Village Heroes
      </h3>
      <ol className="mt-2 space-y-1.5">
        {top.map((p, i) => (
          <li key={p.id} className="grid grid-cols-[2rem_2.6rem_1fr_auto] items-center gap-2">
            <span className="font-display text-[1.15rem] font-bold text-rasp-deep">{roman(i + 1)}</span>
            <Token player={p} size="sm" />
            <span className="truncate text-[clamp(1.05rem,1.4vw,1.35rem)] font-bold">{p.name}</span>
            <span className="font-display text-[clamp(1.15rem,1.5vw,1.5rem)] font-bold tabular-nums">{p.score}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

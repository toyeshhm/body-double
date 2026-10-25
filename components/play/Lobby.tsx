import { Token } from "@/components/ui/Villager";
import type { ClientState, MeView } from "@/lib/game/types";
import { Lede, Title } from "./bits";

export function Lobby({ state, me }: { state: ClientState; me: MeView }) {
  const self = state.players.find((p) => p.id === me.id);
  const others = state.players.filter((p) => p.id !== me.id);
  return (
    <div className="flex flex-1 flex-col items-center gap-7 text-center">
      <div className="mt-4 flex flex-col items-center gap-3">
        {self && <Token player={self} size="xl" className="-rotate-3" />}
        {self && (
          <p className="tag -mt-3 min-w-[10rem] rotate-2 px-5">
            <span className="block font-display text-[1.4rem] font-semibold text-ink" style={{ fontVariationSettings: '"SOFT" 100' }}>
              {self.name}
            </span>
            <span className="block text-[0.95rem] font-semibold text-ink-soft">the {self.role}</span>
          </p>
        )}
        <Title className="mt-2">You&rsquo;re in the village</Title>
      </div>

      <Lede>
        Waiting for the storyteller to begin the tale.
        {!me.canBeTarget && " The Wolf won't borrow your voice, but you'll still play and vote."}
      </Lede>

      {others.length > 0 && (
        <section aria-label="Other villagers" className="w-full">
          <h2 className="voice mb-3 text-[1.05rem] text-gold-text">
            {others.length === 1 ? "1 other villager has arrived" : `${String(others.length)} other villagers have arrived`}
          </h2>
          <ul className="flex flex-wrap justify-center gap-x-4 gap-y-3">
            {others.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <Token player={p} size="sm" />
                <span className="max-w-[7rem] truncate text-[0.95rem] font-bold text-ink">{p.name}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

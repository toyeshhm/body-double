"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { playerById } from "@/components/ui/format";
import { Mirror, type Verdict } from "@/components/ui/Mirror";
import { Token } from "@/components/ui/Villager";
import type { Avatar, Choice, ClientState, PublicPlayer } from "@/lib/game/types";
import { AVATARS } from "@/lib/game/types";
import { HeroesCard } from "./Heroes";
import { EASE, present } from "./util";

/** Turns true `delayMs` after `on` does: votes land first, then the truth. */
function useVerdict(on: boolean, delayMs: number): boolean {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!on) {
      setShown(false);
      return;
    }
    const id = setTimeout(
      () => {
        setShown(true);
      },
      reduce ? 0 : delayMs,
    );
    return () => {
      clearTimeout(id);
    };
  }, [on, delayMs, reduce]);
  return shown;
}

/** Voters' tokens landing under the mirror they picked. */
function VoteDrop({ state, ids, slot, real, ownerName }: { state: ClientState; ids: string[]; slot: Choice; real: boolean | null; ownerName: string }) {
  const voters = ids.map((id) => playerById(state, id)).filter((p): p is PublicPlayer => p !== undefined);
  const names = voters.map((p) => p.name);
  const said = names.length === 0 ? "Nobody" : names.length === 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names.at(-1) ?? ""}`;
  return (
    <div aria-label={`Votes for ${slot}: ${names.join(", ") || "none"}`} className="mt-[clamp(10px,2vh,24px)] flex min-h-12 items-center justify-center gap-3">
      <ul className="flex">
        {voters.map((p, i) => (
          <motion.li key={p.id} className="-ml-3 first:ml-0" initial={{ y: -40, opacity: 0, rotate: -12 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ delay: 0.15 + i * 0.12, duration: 0.5, ease: EASE }}>
            <Token player={p} size="sm" />
          </motion.li>
        ))}
      </ul>
      <p className="text-[clamp(1.05rem,1.4vw,1.4rem)] font-semibold text-ink-soft">
        <b className="font-bold text-ink">{said}</b> {real === null ? "picked this" : real ? `knew ${ownerName}` : voters.length === 1 ? "was fooled" : "were fooled"}
      </p>
    </div>
  );
}

function avatarOf(p: PublicPlayer | undefined): Avatar {
  return AVATARS.find((a) => a === p?.avatar) ?? "key";
}

export function Showdown({ state }: { state: ClientState }) {
  const round = state.round;
  const pair = round?.pair ?? null;
  const reveal = state.phase === "REVEAL" ? (round?.reveal ?? null) : null;
  const votes = reveal ? reveal.votes.A.length + reveal.votes.B.length : 0;
  const truth = useVerdict(reveal !== null, 900 + votes * 120);

  if (!round || !pair) {
    return <p className="voice m-auto text-[1.8rem] text-ink-soft">The mirrors are still misty...</p>;
  }

  const owner = playerById(state, pair.targetId);
  const name = owner?.name ?? "A villager";
  const voters = state.players.filter((p) => present(p) && p.id !== pair.targetId);
  const voted = voters.filter((p) => p.voted).length;
  const fooled = reveal ? reveal.votes[reveal.real === "A" ? "B" : "A"].length : 0;
  const knew = reveal ? reveal.votes[reveal.real].map((id) => playerById(state, id)?.name).filter((n): n is string => n !== undefined) : [];
  const verdict = (slot: Choice): Verdict => (reveal && truth ? (slot === reveal.real ? "real" : "wolf") : null);

  // VOTING and REVEAL keep the same heights row for row (header, mirrors, vote row, bottom row),
  // so the mirrors never resize at the dramatic moment: the tally takes over the prompt's place.
  return (
    <div className="flex flex-1 flex-col">
      <header aria-live="polite" className="min-h-[clamp(5.5rem,13vh,8.5rem)] text-center">
        {reveal ? (
          <>
            <h2 className="font-display text-[clamp(1.9rem,3.6vw,3.4rem)] font-bold leading-[1.05] text-rasp-deep [font-variation-settings:'SOFT'_100]">
              {truth ? `The Wolf fooled ${String(fooled)} of ${String(votes)}.` : "The votes are in..."}
            </h2>
            {truth && (
              <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.3, ease: EASE }} className="mt-2 text-[clamp(1.1rem,1.7vw,1.6rem)] font-medium leading-snug text-ink-soft">
                {knew.length > 0 && <b className="font-bold text-ink">+100 to {knew.join(" and ")}. </b>}
                {name} earns +{knew.length * 50} (+50 for each friend who knew them).
              </motion.p>
            )}
          </>
        ) : (
          <>
            <h2 className="break-words font-display text-[clamp(1.9rem,3.6vw,3.4rem)] font-bold leading-[1.05] [font-variation-settings:'SOFT'_100,'opsz'_96]">{round.prompt.text}</h2>
            <p className="voice mt-2 inline-flex items-center gap-3 text-[clamp(1.25rem,2vw,1.9rem)] text-ink-soft">
              {owner && <Token player={owner} size="sm" className="-rotate-6" />}
              Mirror, mirror, which one is really {name}?
            </p>
          </>
        )}
      </header>

      <div className="mx-auto mt-[clamp(6px,1.5vh,20px)] grid w-full max-w-[1320px] grid-cols-1 gap-x-[clamp(24px,5vw,96px)] gap-y-10 md:grid-cols-2">
        {(["A", "B"] as const).map((slot) => (
          <div key={slot} className="mx-auto w-[min(100%,calc((77dvh-17rem)*1.266))] min-w-[16rem]">
            <Mirror label={slot} text={pair[slot]} ownerName={name} ownerAvatar={avatarOf(owner)} verdict={verdict(slot)} size="stage">
              {reveal ? (
                <VoteDrop state={state} ids={reveal.votes[slot]} slot={slot} real={truth ? slot === reveal.real : null} ownerName={name} />
              ) : (
                <div className="mt-[clamp(10px,2vh,24px)] hidden min-h-12 md:block" aria-hidden="true" />
              )}
            </Mirror>
          </div>
        ))}
      </div>

      <div className="mt-auto flex min-h-[4.5rem] flex-wrap items-end justify-between gap-x-10 gap-y-5 pt-3">
        {reveal ? (
          truth && <HeroesCard state={state} limit={3} compact className="rotate-[1deg]" />
        ) : (
          <div aria-live="polite" className="flex flex-wrap items-center gap-4">
            <p className="font-display text-[clamp(1.8rem,2.6vw,2.6rem)] font-bold tabular-nums">
              {voted} <span className="font-sans text-[0.6em] font-semibold text-ink-soft">of {voters.length} voted</span>
            </p>
            <ul className="flex flex-wrap gap-2">
              {voters.map((p) => (
                <li key={p.id} className={p.voted ? "" : "opacity-45"}>
                  <Token player={p} size="sm" tick={p.voted} />
                </li>
              ))}
            </ul>
            <p className="voice text-[clamp(1.1rem,1.5vw,1.45rem)] text-ink-soft">Vote on your phone. One of these is the Wolf.</p>
          </div>
        )}
      </div>
    </div>
  );
}

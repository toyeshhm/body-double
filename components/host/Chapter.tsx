"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { roman } from "@/components/ui/format";
import { Icon, Token, Villager } from "@/components/ui/Villager";
import type { ClientState, PublicPlayer, RoundView } from "@/lib/game/types";
import { EASE, present, targetNames, targets } from "./util";

/** "Chapter III" and the prompt, set large. */
function ChapterHead({ round }: { round: RoundView }) {
  return (
    <header className="min-w-0">
      <p className="voice text-[clamp(1.3rem,2vw,2rem)] text-gold-text">Chapter {roman(round.n)}</p>
      <h2 className="mt-2 break-words font-display text-[clamp(2.4rem,4.6vw,4.6rem)] font-bold leading-[1.04] [font-variation-settings:'SOFT'_100,'opsz'_96]">{round.prompt.text}</h2>
    </header>
  );
}

/** "4 of 6 answered" with every villager's token; the ones still writing sit dimmed. */
function Roll({ players, done, label }: { players: PublicPlayer[]; done: (p: PublicPlayer) => boolean; label: string }) {
  const count = players.filter(done).length;
  const big = players.length <= 8;
  return (
    <section className="card p-[clamp(18px,2.4vw,32px)]">
      <p aria-live="polite" className="font-display text-[clamp(2rem,3vw,3rem)] font-bold tabular-nums leading-none text-ink">
        {count} <span className="font-sans text-[0.55em] font-semibold text-ink-soft">of {players.length} {label}</span>
      </p>
      <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-5">
        {players.map((p) => (
          <li key={p.id} className={`transition-opacity duration-200 ${done(p) ? "" : "opacity-50"}`}>
            <Villager player={p} size={big ? "lg" : "md"} tick={done(p)} showRole={false} />
          </li>
        ))}
      </ul>
    </section>
  );
}

const twoCol = "grid flex-1 items-center gap-x-[clamp(28px,4vw,72px)] gap-y-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]";

export function Warmup({ state }: { state: ClientState }) {
  return (
    <div className={twoCol}>
      <div className="min-w-0">
        <p className="voice text-[clamp(1.3rem,2vw,2rem)] text-gold-text">Before the tale begins...</p>
        <h2 className="mt-2 font-display text-[clamp(2.4rem,4.4vw,4.4rem)] font-bold leading-[1.04] [font-variation-settings:'SOFT'_100]">Three quick ones</h2>
        <p className="mt-3 max-w-[34rem] text-[clamp(1.15rem,1.5vw,1.45rem)] font-medium leading-snug text-ink-soft">
          Every villager answers so the Wolf can learn how you talk. Nobody is impersonated yet.
        </p>
        <ol className="scroll mt-10 max-w-[38rem] -rotate-1 space-y-3">
          {state.warmup.map((w, i) => (
            <li key={w.id} className="flex gap-4 text-[clamp(1.25rem,1.7vw,1.6rem)] font-semibold leading-snug">
              <span className="w-10 shrink-0 font-display font-bold text-rasp-deep">{roman(i + 1)}.</span>
              {w.text}
            </li>
          ))}
        </ol>
      </div>
      <Roll players={state.players.filter(present)} done={(p) => p.answered} label="villagers ready" />
    </div>
  );
}

export function PromptView({ state }: { state: ClientState }) {
  const round = state.round;
  if (!round) return null;
  const who = targets(state);
  return (
    <div className={twoCol}>
      <ChapterHead round={round} />
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="flex gap-6">
          {who.map((p, i) => (
            <motion.span key={p.id} initial={{ scale: 0.5, rotate: -12, opacity: 0 }} animate={{ scale: 1, rotate: i % 2 === 0 ? -4 : 4, opacity: 1 }} transition={{ duration: 0.5, ease: EASE, delay: 0.1 + i * 0.12 }}>
              <Token player={p} size={who.length > 1 ? "xl" : "hero"} />
            </motion.span>
          ))}
        </div>
        <p className="font-display text-[clamp(2.2rem,3.6vw,3.6rem)] font-bold leading-tight [font-variation-settings:'SOFT'_100]">{targetNames(state)} is up.</p>
        {round.targetReason && <p className="voice max-w-[32rem] text-[clamp(1.3rem,1.8vw,1.8rem)] text-rasp-deep">{round.targetReason}</p>}
        <p className="max-w-[30rem] text-[clamp(1.1rem,1.4vw,1.35rem)] font-medium text-ink-soft">
          Everyone answers. For {targetNames(state)}, the Wolf writes one too.
        </p>
      </div>
    </div>
  );
}

export function Answering({ state }: { state: ClientState }) {
  const round = state.round;
  if (!round) return null;
  return (
    <div className={twoCol}>
      <div className="min-w-0">
        <ChapterHead round={round} />
        <p className="mt-8 flex items-center gap-4 text-[clamp(1.15rem,1.5vw,1.45rem)] font-medium text-ink-soft">
          <Icon id="quill" className="w-16 shrink-0 -rotate-6" />
          Answer on your phone. The Wolf reads over everyone&rsquo;s shoulder, not just {targetNames(state)}&rsquo;s.
        </p>
      </div>
      <Roll players={state.players.filter(present)} done={(p) => p.answered} label="answered" />
    </div>
  );
}

/** Bubbles rising out of the potion. */
function Bubbles() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-[30%] top-0 h-1/2">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span
          key={i}
          className="absolute bottom-0 rounded-full border-2 border-blue-deep/50 bg-blue-light/70"
          style={{ left: `${String(10 + i * 18)}%`, width: 10 + (i % 3) * 7, height: 10 + (i % 3) * 7 }}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: -160, opacity: [0, 1, 0] }}
          transition={{ duration: 2.4, delay: i * 0.45, repeat: Infinity, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

export function Generating({ state }: { state: ClientState }) {
  const name = targetNames(state);
  const lines = [`studying ${name}'s texting habits...`, `stirring in ${name}'s punctuation...`, `bottling ${name}'s favourite words...`];
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setI((x) => (x + 1) % 3);
    }, 1600);
    return () => {
      clearInterval(id);
    };
  }, []);
  return (
    <div className={twoCol}>
      <div className="relative mx-auto grid w-[min(100%,26rem)] place-items-center pt-16">
        <Bubbles />
        <Icon id="potion" cut="lg" className="w-full animate-bob" />
      </div>
      <div className="min-w-0">
        <h2 aria-live="polite" className="break-words font-display text-[clamp(2.2rem,4vw,4rem)] font-bold leading-[1.06] [font-variation-settings:'SOFT'_100]">
          The Wolf is brewing {name}&rsquo;s voice...
        </h2>
        <div className="mt-5 min-h-12" aria-hidden="true">
          <AnimatePresence mode="wait">
            <motion.p key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }} className="voice text-[clamp(1.4rem,2vw,2rem)] text-ink-soft">
              {lines[i]}
            </motion.p>
          </AnimatePresence>
        </div>
        <Icon id="wolf" className="mt-6 w-24 -rotate-6" />
      </div>
    </div>
  );
}

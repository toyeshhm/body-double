"use client";
import { motion } from "framer-motion";
import { playerById } from "@/components/ui/format";
import { Icon } from "@/components/ui/Villager";
import type { ClientState } from "@/lib/game/types";
import { EASE } from "./util";

export function Tells({ state }: { state: ClientState }) {
  const round = state.round;
  const pair = round?.pair ?? null;
  const reveal = round?.reveal ?? null;
  const name = playerById(state, pair?.targetId)?.name ?? "the villager";
  const tells = round?.tells ?? [];
  const realText = pair && reveal ? pair[reveal.real] : null;
  const fakeText = pair && reveal ? pair[reveal.real === "A" ? "B" : "A"] : null;

  return (
    <div className="grid flex-1 items-start gap-x-[clamp(28px,4vw,72px)] gap-y-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <div className="min-w-0">
        <p className="voice text-[clamp(2rem,3.6vw,3.6rem)] leading-tight text-gold-text">What big eyes you have...</p>
        <h2 className="mt-2 font-display text-[clamp(2.2rem,4vw,4rem)] font-bold leading-[1.04] [font-variation-settings:'SOFT'_100]">What gave the Wolf away?</h2>
        {tells.length === 0 ? (
          <p aria-live="polite" className="voice mt-10 max-w-[30rem] text-[clamp(1.3rem,1.7vw,1.6rem)] text-ink-soft">
            Villagers who spotted the Wolf are writing what gave it away.
          </p>
        ) : (
          <ul aria-live="polite" className="mt-10 flex flex-wrap content-start gap-6">
            {tells.map((t, i) => (
              <motion.li
                key={`${String(i)}-${t}`}
                initial={{ opacity: 0, scale: 0.7, rotate: i % 2 === 0 ? -8 : 8 }}
                animate={{ opacity: 1, scale: 1, rotate: i % 2 === 0 ? -2 : 2.5 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="card-sm max-w-full px-6 py-5 text-[clamp(1.2rem,1.6vw,1.5rem)] font-semibold leading-snug sm:max-w-[22rem]"
              >
                &ldquo;{t}&rdquo;
              </motion.li>
            ))}
          </ul>
        )}
      </div>

      <aside className="card space-y-8 p-[clamp(20px,2.4vw,34px)]">
        <div className="flex gap-4">
          <Icon id="mirror" className="w-14 shrink-0" />
          <div className="min-w-0">
            <h3 className="font-display text-[clamp(1.3rem,1.7vw,1.7rem)] font-bold text-gold-text [font-variation-settings:'SOFT'_100]">The real {name}</h3>
            <blockquote className="mt-1 break-words text-[clamp(1.25rem,1.8vw,1.8rem)] font-semibold leading-snug">{realText ? `“${realText}”` : "..."}</blockquote>
          </div>
        </div>
        <div className="flex gap-4">
          <Icon id="wolf" className="w-14 shrink-0" />
          <div className="min-w-0">
            <h3 className="font-display text-[clamp(1.3rem,1.7vw,1.7rem)] font-bold text-rasp-deep [font-variation-settings:'SOFT'_100]">The Wolf wrote</h3>
            <p className="mt-1 break-words text-[clamp(1.15rem,1.6vw,1.6rem)] font-medium leading-snug text-ink-soft">
              {fakeText === null ? `${name} hid this one.` : `“${fakeText}”`}
            </p>
            <p className="mt-2 inline-block rounded-full bg-paper-deep px-3 py-0.5 text-[0.95rem] font-bold text-ink-soft">AI-written. Never a real quote.</p>
          </div>
        </div>
        <p className="voice text-[clamp(1.1rem,1.4vw,1.35rem)] text-ink-soft">The Wolf remembers what gave it away.</p>
      </aside>
    </div>
  );
}

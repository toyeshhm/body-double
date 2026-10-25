"use client";
import { AnimatePresence, motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Icon, Villager } from "@/components/ui/Villager";
import type { ClientState, Settings } from "@/lib/game/types";
import { RulesForm } from "./RulesForm";
import { Sparkle } from "./Sparkle";
import { EASE } from "./util";

/** The room code in gold foil, inside the deep-night glass of a tall magic mirror. */
function CodeMirror({ code }: { code: string }) {
  const letters = Array.from(code).join(" ");
  return (
    <div className="st-lg relative aspect-[622.4/732.4] w-full [container-type:inline-size]">
      <div
        className="absolute left-[16.2%] top-[18.7%] h-[65%] w-[67.5%] overflow-hidden rounded-[50%] bg-night"
        style={{ boxShadow: "inset 14px 18px 0 rgba(120,160,200,.12), inset -18px -22px 0 rgba(0,0,0,.22)" }}
      >
        <span className="absolute left-[5%] top-[18%] h-[4%] w-[40%] -rotate-[38deg] rounded-full bg-white/10" />
        <span className="absolute left-[10%] top-[25%] h-[1.6%] w-[26%] -rotate-[38deg] rounded-full bg-white/10" />
        <Sparkle className="absolute left-[72%] top-[20%] w-[6%] animate-twinkle text-gold-light opacity-80" />
        <Sparkle className="absolute left-[22%] top-[70%] w-[4%] animate-twinkle text-gold-light opacity-70 [animation-delay:.8s]" />
        <Sparkle className="absolute left-[78%] top-[80%] w-[3%] animate-twinkle text-blue opacity-80 [animation-delay:1.4s]" />
        <p className="voice absolute inset-x-0 top-[24%] text-center text-[4.8cqw] text-[#f1e3bf]">Mirror, mirror, the code is</p>
        <p className="absolute inset-x-0 top-[35%] text-center drop-shadow-[0_4px_0_#152338]" aria-label={`Room code ${letters}`}>
          <span className="foil text-[19.6cqw] leading-none tracking-[0.035em]">{code}</span>
        </p>
        <img src="/art/storybook/flourish.svg" alt="" className="absolute left-1/2 top-[65%] w-[57%] -translate-x-1/2" />
        <p className="absolute inset-x-0 top-[76%] text-center text-[3.7cqw] font-semibold text-[#d9e4ec]">Type it on your phone</p>
      </div>
      <img src="/art/storybook/mirror-tall.svg" alt="" className="absolute inset-0 size-full" />
    </div>
  );
}

// The card's bottom-right corner is cut away (filter border included) so the peel shows through.
const PEEL = "polygon(-30px -30px, calc(100% + 30px) -30px, calc(100% + 30px) calc(100% - 36px), calc(100% - 36px) calc(100% + 30px), -30px calc(100% + 30px))";

/** QR on a calling card with a peeled corner, pinned with a sparkle. */
function CallingCard({ url }: { url: string }) {
  return (
    <div className="relative w-[clamp(10.5rem,15vw,14rem)] rotate-[4deg] [@media(max-height:820px)]:w-[9.5rem]">
      <div className="card px-4 pb-6 pt-4 text-center" style={{ clipPath: PEEL }}>
        <QRCodeSVG value={url} size={240} level="M" fgColor="#2e2421" bgColor="#fffaf0" className="h-auto w-full rounded-md" title="Scan to enter the village" />
        <p className="mt-2 text-[clamp(1rem,1.3vw,1.2rem)] font-bold text-ink">Scan to enter</p>
      </div>
      <span aria-hidden="true" className="absolute bottom-[-2px] right-[-2px] size-7 drop-shadow-[-3px_-3px_3px_rgba(74,50,32,.35)]">
        <i className="absolute inset-0 bg-[#efe6d3] shadow-[inset_4px_4px_0_#fffaf0] [clip-path:polygon(0_0,100%_0,0_100%)]" />
      </span>
      <Icon id="sparkles" className="absolute -left-6 -top-7 w-16 -rotate-12" />
    </div>
  );
}

export function Lobby({ state, onStart, onSettings }: { state: ClientState; onStart: () => void; onSettings: (patch: Partial<Settings>) => void }) {
  const players = state.players;
  const agreed = players.filter((p) => p.consented);
  const reason =
    agreed.length < 2 ? "Waiting for two villagers to agree to the rules." : agreed.some((p) => p.canBeTarget) ? null : "Someone has to let the Wolf borrow their voice.";
  const shownUrl = state.joinUrl.replace(/^https?:\/\//, "");
  const crowd = players.length > 8;

  return (
    <div className="grid flex-1 gap-x-[clamp(24px,3vw,56px)] gap-y-8 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
      {/* the magic mirror, with the Wolf behind a tree eyeing it */}
      <div className="relative mx-auto w-full max-w-[34rem] lg:mx-0 lg:max-w-none">
        <div className="mx-auto w-[min(100%,calc((100dvh-9rem)*0.85))]">
          <CodeMirror code={state.code} />
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-2 -left-4 hidden w-[38%] max-w-[15rem] sm:block lg:-left-10">
          <Icon id="wolf" alt="" className="absolute bottom-[18%] left-[52%] w-[62%] rotate-[14deg]" />
          <Icon id="tree" cut="lg" className="relative w-full" />
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-[clamp(14px,2.2vh,28px)]">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="voice -mb-1 ml-2 text-[clamp(1.6rem,3vw,2.7rem)] text-gold-text [@media(max-height:820px)]:text-[1.6rem]">The</p>
            <h2 className="cut-letters text-[clamp(3.6rem,7vw,6.6rem)] [@media(max-height:820px)]:text-[4.2rem]">Village</h2>
            <p className="mt-3 max-w-[30rem] text-[clamp(1.05rem,1.45vw,1.4rem)] font-medium leading-snug text-ink-soft">
              Enter at <b className="break-all font-bold text-ink sm:whitespace-nowrap sm:break-normal">{shownUrl}</b> or scan the card with your phone.
            </p>
          </div>
          <div className="shrink-0 pt-2">
            <CallingCard url={state.joinUrl} />
          </div>
        </div>

        <section aria-labelledby="square">
          <h3 id="square" className="voice ml-1 text-[clamp(1.4rem,2vw,2rem)] text-ink">
            Villagers in the square
            <span aria-live="polite" className="ml-3 font-sans text-[clamp(1rem,1.3vw,1.3rem)] font-bold not-italic text-gold-text">
              {players.length === 1 ? "1 has arrived" : `${String(players.length)} have arrived`}
            </span>
          </h3>
          {players.length === 0 ? (
            <div className="mt-4 flex items-center gap-5">
              <Icon id="castle" className="w-24 opacity-80" />
              <p className="voice max-w-[24rem] text-[1.35rem] text-ink-soft">Scan the card to enter the village. Villagers appear here.</p>
            </div>
          ) : (
            <ul className="mt-3 flex flex-wrap content-start gap-x-3 gap-y-4 [&_figure]:min-w-[7rem] [@media(max-height:820px)]:[&_figure>span:first-child]:size-16">
              <AnimatePresence>
                {players.map((p, i) => (
                  <motion.li
                    key={p.id}
                    layout
                    initial={{ opacity: 0, scale: 0.55, rotate: i % 2 === 0 ? -10 : 10 }}
                    animate={{ opacity: 1, scale: 1, rotate: i % 2 === 0 ? -2 : 2 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.45, ease: EASE }}
                    className={p.consented ? "" : "opacity-60"}
                  >
                    <Villager player={p} size={crowd ? "md" : "lg"} showRole={p.consented} />
                    {!p.consented && <p className="voice mt-1 text-center text-[0.95rem] text-ink-soft">reading the rules</p>}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </section>

        <div className="mt-auto flex flex-wrap items-end gap-x-8 gap-y-6">
          <div className="relative w-full max-w-[20rem] -rotate-[1.5deg]">
            <RulesForm settings={state.settings} onChange={onSettings} />
            <Icon id="clock-tower" className="absolute -right-14 -top-10 hidden w-20 rotate-[8deg] sm:block" />
          </div>
          <div className="ml-auto flex flex-col items-end gap-3">
            <p className="voice text-[clamp(1.2rem,1.6vw,1.6rem)] text-gold-text">When the village is ready,</p>
            <button type="button" className="btn btn-primary min-h-[4.5rem] px-10 text-[clamp(1.3rem,1.9vw,1.8rem)]" disabled={reason !== null} onClick={onStart}>
              Begin the tale
            </button>
            {reason && <p className="max-w-[20rem] text-right text-[1rem] font-semibold text-ink-soft">{reason}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

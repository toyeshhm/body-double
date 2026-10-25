"use client";
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import type { Avatar } from "@/lib/game/types";
import { Icon } from "./Villager";

// "Mirror, mirror, which one is really Maya?" Both answers sit in identical mirrors; only the words differ
// until the reveal. The tilt follows the slot (A left, B right), never the truth.
// Verdict "real": the glass warms, a gold glory and sparkles, ribbon "The real Maya".
// Verdict "wolf": the glass clouds and cracks, the Wolf's reflection rises behind the words, ribbon "It was the Wolf!".

export type Verdict = "real" | "wolf" | null;
const EASE = [0.22, 1, 0.36, 1] as const;

/** Long answers step the type down so they always fit the glass. */
function stageFont(text: string | null): string {
  const n = text?.length ?? 0;
  return n > 110 ? "4.2cqw" : n > 75 ? "4.7cqw" : "5.3cqw";
}

function Ribbon({ verdict, ownerName, ownerAvatar, className }: { verdict: "real" | "wolf"; ownerName: string; ownerAvatar: Avatar; className: string }) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <Icon id={verdict === "real" ? ownerAvatar : "wolf"} className="relative z-[1] -mr-[0.9em] size-[2.6em] -rotate-6" />
      <span className="ribbon-wrap">
        <span className={`ribbon ${verdict === "real" ? "ribbon-gold" : "ribbon-burg"}`}>{verdict === "real" ? `The real ${ownerName}` : "It was the Wolf!"}</span>
      </span>
    </span>
  );
}

export function Mirror({
  label,
  text,
  ownerName,
  ownerAvatar,
  verdict = null,
  size = "stage",
  delay = 0,
  children,
}: {
  label: "A" | "B";
  text: string | null;
  ownerName: string;
  ownerAvatar: Avatar;
  verdict?: Verdict;
  size?: "stage" | "hand";
  delay?: number;
  children?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const words = text ?? `${ownerName} hid this one. It wasn't them.`;
  const glass = verdict === "real" ? "bg-[#f3f6f2]" : verdict === "wolf" ? "bg-[#c9d5dd]" : "bg-glass";
  const wolfText = verdict === "wolf" ? "[text-shadow:0_0_3px_#c9d5dd,0_0_8px_#c9d5dd,0_0_14px_#c9d5dd]" : "";
  const appear = (extra: number) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: -18, rotate: -4 },
    animate: { opacity: 1, y: 0, rotate: 0 },
    transition: { duration: 0.45, delay: delay + extra, ease: EASE },
  });

  if (size === "hand") {
    return (
      <div className="relative">
        <div className="pmirror">
          <img src="/art/storybook/crest.svg" alt="" className="absolute -top-[26px] left-1/2 w-[84px] -translate-x-1/2" />
          <span className="slot absolute -left-2 -top-3 z-[1] size-10 text-[1.3rem]" aria-hidden="true">
            {label}
          </span>
          <div className={`pglass grid min-h-[7.5rem] place-items-center px-5 py-4 text-center transition-colors duration-500 ${glass}`}>
            {verdict === "wolf" && (
              <>
                <motion.img src="/art/icons/wolf.svg" alt="" className="absolute -bottom-10 -right-5 w-24 saturate-50" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 0.38, y: 0 }} transition={{ duration: 0.5, delay: delay + 0.2, ease: EASE }} />
                <motion.img src="/art/storybook/cracks-phone.svg" alt="" className="absolute inset-0 size-full" initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35, delay, ease: EASE }} />
              </>
            )}
            <p className={`relative text-[1.1rem] font-semibold leading-snug text-ink ${text === null ? "voice text-ink-soft" : ""} ${wolfText}`}>
              <span className="sr-only">Answer {label}: </span>
              {words}
            </p>
          </div>
        </div>
        {verdict && (
          <motion.div className="-mt-3 flex justify-center text-[0.95rem]" {...appear(0.5)}>
            <Ribbon verdict={verdict} ownerName={ownerName} ownerAvatar={ownerAvatar} className="" />
          </motion.div>
        )}
        {children}
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ rotate: label === "A" ? "-1.5deg" : "1.5deg" }}>
      <div className="relative aspect-[608.8/480.8] [container-type:inline-size]">
        {verdict === "real" && (
          <motion.div
            aria-hidden="true"
            className="absolute left-[12%] top-[21%] h-[60%] w-[76%] rounded-[50%]"
            style={{ boxShadow: "0 0 70px 34px rgba(242,214,128,.75), 0 0 140px 70px rgba(242,214,128,.35)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay }}
          />
        )}
        <div className="st-lg absolute inset-0">
          <div
            className={`absolute left-[14%] top-[24.5%] h-[54.5%] w-[72%] overflow-hidden rounded-[50%] transition-colors duration-500 ${glass}`}
            style={{ boxShadow: "inset 10px 14px 0 rgba(255,255,255,.55), inset -12px -16px 0 rgba(86,120,154,.16)" }}
          >
            {verdict === "wolf" && (
              <>
                <motion.img src="/art/icons/wolf.svg" alt="" className="absolute -bottom-[44%] -right-[3%] w-[44%] saturate-50" initial={{ opacity: 0, y: "20%" }} animate={{ opacity: 0.4, y: 0 }} transition={{ duration: 0.5, delay: delay + 0.3, ease: EASE }} />
                <motion.img src="/art/storybook/cracks-wide.svg" alt="" className="absolute inset-0 size-full" initial={{ opacity: 0, scale: 1.12 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay, ease: EASE }} />
              </>
            )}
          </div>
          <p
            className={`absolute left-[20%] top-[28.5%] grid h-[46%] w-[60%] place-items-center text-center font-sans font-semibold leading-[1.22] text-ink ${text === null ? "voice text-ink-soft" : ""} ${wolfText}`}
            style={{ fontSize: stageFont(text) }}
          >
            <span>
              <span className="sr-only">Answer {label}: </span>
              {words}
            </span>
          </p>
          <img src="/art/storybook/mirror-wide.svg" alt="" className="absolute inset-0 size-full" />
        </div>
        <span className="slot absolute left-[5.5%] top-[8%] size-[9.6cqw] text-[5.4cqw]" aria-hidden="true">
          {label}
        </span>
        {verdict === "real" && (
          <motion.span className="absolute right-[1%] top-[1%] w-[16%]" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: delay + 0.2, ease: EASE }}>
            <Icon id="sparkles" className="w-full rotate-6 animate-twinkle" />
          </motion.span>
        )}
        {verdict && (
          <motion.div className="absolute inset-x-0 top-[78%] flex justify-center text-[5.4cqw]" {...appear(0.55)}>
            <Ribbon verdict={verdict} ownerName={ownerName} ownerAvatar={ownerAvatar} className="" />
          </motion.div>
        )}
      </div>
      {children}
    </div>
  );
}

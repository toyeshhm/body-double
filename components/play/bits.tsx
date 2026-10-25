import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Villager";
import { AVATARS, type Avatar } from "@/lib/game/types";

/** A player's avatar as a kit token id (old saves fall back to the golden key, like Token does). */
export function avatarOf(avatar: string | undefined): Avatar {
  return AVATARS.find((a) => a === avatar) ?? "key";
}

const SOFT = { fontVariationSettings: '"SOFT" 100, "opsz" 72' } as const;

/** Sticky bottom action area that stays above the home indicator and the keyboard. */
export function Dock({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-[3] -mx-4 mt-auto bg-gradient-to-t from-paper-ground from-60% to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8">
      {children}
    </div>
  );
}

/** The storyteller's lead-in line above a heading ("Chapter III of VI", "What big eyes you have..."). */
export function Voice({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`voice text-[1.05rem] leading-snug text-gold-text ${className}`}>{children}</p>;
}

export function Title({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h1 className={`font-display text-[2rem] font-bold leading-[1.08] text-ink ${className}`} style={SOFT}>
      {children}
    </h1>
  );
}

export function Lede({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-[1.05rem] font-medium leading-relaxed text-ink-soft ${className}`}>{children}</p>;
}

/** Centered waiting moment: a sticker, a title, one line. */
export function Pause({ art, title, line }: { art?: ReactNode; title: ReactNode; line?: ReactNode }) {
  return (
    <div className="my-auto flex flex-col items-center gap-5 py-10 text-center">
      {art}
      <Title>{title}</Title>
      {line && <Lede>{line}</Lede>}
    </div>
  );
}

/** "+100" on a gold seal. Figtree numerals: Fraunces old-style figures read as "+1oo". */
export function Seal({ points, className = "" }: { points: number; className?: string }) {
  return (
    <span className={`relative grid size-[6.5rem] shrink-0 -rotate-[8deg] place-items-center ${className}`}>
      <img src="/art/storybook/seal.svg" alt="" className="st absolute inset-0 size-full" />
      <span className="relative font-sans text-[1.9rem] font-extrabold tabular-nums text-[#5a3d0e] [text-shadow:0_1.5px_0_rgba(255,240,200,.7)]">
        +{points}
      </span>
    </span>
  );
}

export function Opening({ offline }: { offline: boolean }) {
  return (
    <Pause
      art={<Icon id="castle" className="size-28 animate-bob" />}
      title="Opening the gate..."
      line={offline ? "Can't reach the village yet. Check the Wi-Fi and stay on this page." : "Finding your seat by the fire."}
    />
  );
}

export function Missing({ code, message }: { code: string; message: string | null }) {
  return (
    <Pause
      art={<Icon id="wolf" className="size-28 -rotate-6" />}
      title={`No village called ${code}`}
      line={
        <>
          {message ?? "Check the code on the big screen and try again."}{" "}
          <Link href="/" className="font-bold text-rasp-deep underline underline-offset-4">
            Back to the edge of the woods
          </Link>
        </>
      }
    />
  );
}

/** GENERATING: the potion bubbles while the Wolf brews someone's voice. */
export function Brewing({ isTarget, names }: { isTarget: boolean; names: string }) {
  return (
    <Pause
      art={
        <span className="relative">
          <Icon id="potion" className="size-36 animate-bob" />
          <Icon id="sparkles" cut="sm" className="absolute -right-6 -top-4 size-14 animate-twinkle" />
        </span>
      }
      title={isTarget ? "The Wolf is practising being you..." : `The Wolf is brewing ${names}'s voice...`}
      line="Keep your eyes on the big screen."
    />
  );
}

export function Ended() {
  return (
    <Pause
      art={<Icon id="storybook" className="size-32 -rotate-3" />}
      title="The book is closed."
      line={
        <>
          Everything you wrote has been forgotten.{" "}
          <Link href="/" className="font-bold text-rasp-deep underline underline-offset-4">
            Start a new tale
          </Link>
        </>
      }
    />
  );
}

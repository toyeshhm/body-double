"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/ui/Villager";

export default function Landing() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const ready = code.length === 4;

  return (
    <main className="relative z-[2] min-h-dvh overflow-x-clip">
      <span className="corner left-3 top-3" />
      <span className="corner right-3 top-3 -scale-x-100" />
      <span className="corner bottom-3 left-3 -scale-y-100" />
      <span className="corner bottom-3 right-3 -scale-100" />

      <div className="relative mx-auto grid min-h-dvh max-w-6xl items-center gap-10 px-5 py-16 md:grid-cols-[1.1fr_0.9fr] md:gap-6 md:px-10">
        <div className="flex flex-col gap-7">
          <header className="flex flex-col gap-4">
            <p className="voice text-[1.15rem] text-gold-text">A fairy-tale party game</p>
            <h1 className="cut-letters text-[clamp(3.6rem,13vw,6rem)]">Body Double</h1>
            <p className="max-w-[36ch] font-display text-[1.3rem] font-medium leading-snug text-ink-soft" style={{ fontVariationSettings: '"SOFT" 100' }}>
              The Wolf learns to answer like your friends. Spot the real one, and see how well your village really knows each other.
            </p>
          </header>

          <form
            className="card flex max-w-md flex-col gap-3 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (ready) router.push(`/play/${code}`);
            }}
          >
            <label htmlFor="code" className="font-bold text-ink">
              Got a code from the big screen?
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4));
                }}
                maxLength={4}
                inputMode="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="ABCD"
                aria-describedby="code-hint"
                className="field min-w-0 flex-1 text-center font-display text-[1.9rem] font-bold uppercase tracking-[0.3em] placeholder:text-ink/25"
              />
              <button type="submit" className="btn btn-quiet w-full shrink-0 sm:w-auto" disabled={!ready}>
                Enter the village
              </button>
            </div>
            <p id="code-hint" className="text-sm font-medium text-ink-soft">
              Four letters, shown in the magic mirror.
            </p>
          </form>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href="/host" className="btn btn-primary">
              <img src="/art/icons/castle.svg" alt="" className="size-8" />
              Open a new village
            </Link>
            <span className="text-[0.95rem] font-medium text-ink-soft">on the laptop or projector everyone can see</span>
          </div>

          <p className="text-sm font-medium text-ink-soft">18+ only. Everything is deleted when the game ends.</p>
        </div>

        {/* a little scene of stickers: the mirror, the slipper, and the Wolf peeking from behind the tree */}
        <div aria-hidden="true" className="relative mx-auto hidden aspect-square w-full max-w-[26rem] md:block">
          <Icon id="mirror" cut="lg" className="absolute left-[18%] top-[6%] w-[58%] -rotate-3" />
          <Icon id="tree" cut="lg" className="absolute bottom-[2%] left-0 w-[46%]" />
          <Icon id="wolf" className="absolute bottom-[12%] left-[30%] w-[26%] rotate-6" />
          <Icon id="slipper" className="absolute bottom-[4%] right-[2%] w-[34%] -rotate-6" />
          <Icon id="sparkles" cut="sm" className="absolute right-[6%] top-[4%] w-[18%] animate-twinkle" />
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute right-4 top-6 flex gap-1 md:hidden">
          <Icon id="slipper" cut="sm" className="size-14 -rotate-6" />
          <Icon id="wolf" cut="sm" className="size-14 rotate-6" />
        </div>
      </div>
    </main>
  );
}

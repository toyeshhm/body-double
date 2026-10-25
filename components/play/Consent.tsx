"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/Villager";
import { Dock, Title } from "./bits";

/** Spec 8: required consent at join. The real terms stay plain and clear. */
export function Consent({ onAgree }: { onAgree: (canBeTarget: boolean) => void }) {
  const [agree, setAgree] = useState(false);
  const [impersonate, setImpersonate] = useState(true);

  return (
    <form
      className="flex flex-1 flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (agree) onAgree(impersonate);
      }}
    >
      <div className="flex items-end justify-between gap-3">
        <Title>Before you enter the woods...</Title>
        <Icon id="key" className="size-16 shrink-0 rotate-12" />
      </div>

      <div className="card p-5">
        <p className="text-[1.1rem] font-medium leading-relaxed text-ink">
          Body Double uses your answers during this game to imitate you. Everything is deleted when the game ends.
        </p>
        <label className="mt-5 flex min-h-12 cursor-pointer items-center gap-3 font-bold text-ink">
          <input
            type="checkbox"
            required
            checked={agree}
            onChange={(e) => {
              setAgree(e.target.checked);
            }}
            className="size-6 shrink-0 accent-[#963248]"
          />
          I understand and agree
        </label>
      </div>

      <label className="card-sm flex cursor-pointer items-start justify-between gap-4 p-4">
        <span>
          <span className="block font-bold text-ink">Let the AI impersonate me</span>
          <span className="mt-1 block text-[0.95rem] font-medium leading-snug text-ink-soft">
            Turn this off and you still play and vote. The Wolf just won&rsquo;t borrow your voice.
          </span>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={impersonate}
          onChange={(e) => {
            setImpersonate(e.target.checked);
          }}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className="relative mt-0.5 h-8 w-14 shrink-0 rounded-full bg-[#cdbd9c] transition duration-200 ease-out-quint after:absolute after:left-1 after:top-1 after:size-6 after:rounded-full after:bg-paper-cut after:shadow after:transition after:duration-200 peer-checked:bg-rasp-deep peer-checked:after:translate-x-6 peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-rasp-deep"
        />
      </label>

      <Dock>
        <button type="submit" className="btn btn-primary w-full text-[1.15rem]" disabled={!agree}>
          Enter the woods
        </button>
      </Dock>
    </form>
  );
}

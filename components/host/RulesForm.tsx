"use client";
import { useId } from "react";
import type { Settings } from "@/lib/game/types";

const ROUNDS = Array.from({ length: 12 }, (_, i) => i + 1);
const ANSWER = [30, 45, 60, 90, 120];
const VOTE = [10, 15, 20, 30, 45];

function Pick({ label, value, options, unit, onPick }: { label: string; value: number; options: number[]; unit: string; onPick: (n: number) => void }) {
  const id = useId();
  return (
    <>
      <label htmlFor={id} className="text-[1.05rem] font-semibold text-ink-soft">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => {
          onPick(Number(e.target.value));
        }}
        className="cursor-pointer appearance-none rounded-md bg-transparent text-right font-display text-[1.3rem] font-bold text-ink [font-variation-settings:'SOFT'_100] hover:bg-paper/60 focus:outline-none focus-visible:ring-4 focus-visible:ring-gold/60"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
            {unit}
          </option>
        ))}
      </select>
    </>
  );
}

/** Host settings (spec 3) on a parchment scroll: rounds, answer timer, vote timer, demo mode. Locked once the tale begins. */
export function RulesForm({ settings, onChange }: { settings: Settings; onChange: (patch: Partial<Settings>) => void }) {
  return (
    <fieldset className="scroll px-6 py-4">
      <legend className="sr-only">Rules of the tale</legend>
      <div className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-0.5">
        <Pick label="Chapters" value={settings.rounds} options={ROUNDS} unit="" onPick={(rounds) => { onChange({ rounds }); }} />
        <Pick label="Answer time" value={settings.answerSeconds} options={ANSWER} unit="s" onPick={(answerSeconds) => { onChange({ answerSeconds }); }} />
        <Pick label="Vote time" value={settings.voteSeconds} options={VOTE} unit="s" onPick={(voteSeconds) => { onChange({ voteSeconds }); }} />
        <span className="col-span-2 my-1 h-0.5 bg-[repeating-linear-gradient(90deg,#c9ae7c_0_8px,transparent_8px_14px)] opacity-80" />
        <label className="contents cursor-pointer">
          <span className="text-[1.05rem] font-semibold leading-tight text-ink-soft">
            Demo mode
            <span className="block text-[0.85rem] font-medium">Adds three practice villagers</span>
          </span>
          <span className="flex items-center justify-end">
            <input
              type="checkbox"
              role="switch"
              checked={settings.demoMode}
              onChange={(e) => {
                onChange({ demoMode: e.target.checked });
              }}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className="relative h-8 w-14 rounded-full bg-[#d4ba86] shadow-[inset_0_2px_3px_rgba(70,40,20,.3)] transition duration-200 ease-out-quint after:absolute after:left-1 after:top-1 after:size-6 after:rounded-full after:bg-paper-cut after:shadow after:transition after:duration-200 after:ease-out-quint peer-checked:bg-rasp-deep peer-checked:after:translate-x-6 peer-focus-visible:ring-4 peer-focus-visible:ring-gold/60"
            />
          </span>
        </label>
      </div>
    </fieldset>
  );
}

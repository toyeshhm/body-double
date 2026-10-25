"use client";
import { useEffect, useRef } from "react";
import { notes } from "@/components/ui/notes";
import { Icon } from "@/components/ui/Villager";
import type { StyleProfile } from "@/lib/game/types";

/** The Wolf's notes on you: labeled rows, then the tells that caught it. Shared by the drawer and your notebook page. */
export function StyleNotes({ style, unknown = "Still watching." }: { style: StyleProfile; unknown?: string }) {
  return (
    <>
      <dl className="mt-5 divide-y divide-dashed divide-[#c9ae7c] border-y border-dashed border-[#c9ae7c]">
        {notes(style).map((n) => (
          <div key={n.label} className="flex items-baseline justify-between gap-4 py-3">
            <dt className="shrink-0 font-bold">{n.label}</dt>
            <dd className={`text-right font-medium ${n.value ? "" : "voice text-ink-soft"}`}>{n.value ?? unknown}</dd>
          </div>
        ))}
      </dl>
      {style.caughtTells.length > 0 && (
        <div className="mt-5">
          <h3 className="font-bold">Friends caught the Wolf because:</h3>
          <ul className="mt-2 flex flex-col gap-1.5">
            {style.caughtTells.map((t) => (
              <li key={t} className="voice text-[1.15rem]">
                &ldquo;{t}&rdquo;
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

/** "What the AI knows about you" (spec 3): only ever your own profile, as a native bottom-sheet dialog. */
/** `shared`: the Wolf reads this page to the group at the end (players it may impersonate). */
export function KnowsDrawer({ open, onClose, style, shared }: { open: boolean; onClose: () => void; style: StyleProfile; shared: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const empty = style.avgLength === 0 && style.caughtTells.length === 0;
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="knows-title"
      className="fixed inset-x-0 bottom-0 top-auto m-0 mx-auto max-h-[85dvh] w-full max-w-[30rem] overflow-visible bg-transparent p-0 text-ink backdrop:bg-[#2e2421]/55"
    >
      <div className="max-h-[85dvh] overflow-y-auto rounded-t-[26px] bg-paper px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5" style={{ backgroundImage: "url(/art/storybook/paper.svg)" }}>
        <div className="flex items-start gap-3">
          <Icon id="crystal-ball" className="size-14 shrink-0 -rotate-6" />
          <h2 id="knows-title" className="flex-1 font-display text-[1.6rem] font-bold leading-tight" style={{ fontVariationSettings: '"SOFT" 100' }}>
            What the Wolf knows about you
          </h2>
          <button type="button" onClick={onClose} className="btn btn-quiet min-h-12 shrink-0 px-4 text-[0.95rem]">
            Close
          </button>
        </div>
        <p className="mt-2 text-[0.95rem] font-medium text-ink-soft">
          {shared
            ? "Only you can see these notes until the end, when the Wolf reads its notebook to the group. Then they vanish."
            : "Only you can see these notes. They vanish when the game ends."}
        </p>

        {empty ? (
          <p className="voice my-8 text-[1.25rem] text-ink-soft">Nothing yet. Answer a prompt and the Wolf starts taking notes.</p>
        ) : (
          <StyleNotes style={style} />
        )}
      </div>
    </dialog>
  );
}

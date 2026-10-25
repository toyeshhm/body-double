/** Slim sticky header: brand, your score, the village code chip, and the crystal ball that opens "What the Wolf knows". */
export function Header({ code, score, onOpenKnows }: { code: string; score: number | null; onOpenKnows: (() => void) | null }) {
  return (
    <header className="sticky top-0 z-sticky -mx-4 flex items-center justify-between gap-2 bg-paper-ground/95 px-4 pb-2 pt-[max(0.6rem,env(safe-area-inset-top))]">
      <span className="brand whitespace-nowrap text-[1.1rem]">
        Body <b>Double</b>
      </span>
      <div className="flex items-center gap-2">
        {score !== null && <span className="whitespace-nowrap font-sans text-[0.95rem] font-extrabold tabular-nums text-ink-soft">{score} pts</span>}
        <span className="code-chip shrink-0 px-3" aria-label={`Village ${code}`}>
          <span className="foil text-[1.2rem] tracking-[0.06em]" aria-hidden="true">
            {code}
          </span>
        </span>
        {onOpenKnows && (
          <button
            type="button"
            onClick={onOpenKnows}
            aria-label="What the Wolf knows about you"
            title="What the Wolf knows about you"
            className="st grid size-12 shrink-0 place-items-center rounded-full bg-paper transition duration-150 ease-out-quint active:translate-y-px"
          >
            <img src="/art/icons/crystal-ball.svg" alt="" className="size-9" />
          </button>
        )}
      </div>
    </header>
  );
}

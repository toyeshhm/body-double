import { playerById, roman } from "@/components/ui/format";
import { scribbles } from "@/components/ui/notes";
import { Icon, Token } from "@/components/ui/Villager";
import type { ClientState, FakeSample, NotebookPage } from "@/lib/game/types";

const MAX_PAGES = 5; // past this the rest are on their owners' phones, so the page never scrolls
const pct = (s: FakeSample): number => Math.round((s.fooled / s.votes) * 100);
const chapter = (s: FakeSample): string => `Chapter ${roman(s.round)}`;

/** What the Wolf had to go on for a chapter's fake. Mirrors the difficulty levels in lib/ai/prompts.ts writeFake. */
function knew(round: number): string {
  if (round >= 4) return "It knew their style, every earlier answer, the room's answers, and the tells that caught it.";
  if (round >= 2) return "It knew every earlier answer and their style.";
  return "It knew only the warmup answers.";
}

/** The headline: did the Wolf get better between the first and last fake? Honest either way. */
function lesson(first: FakeSample | null, last: FakeSample | null): string {
  if (!first) return "The Wolf never got to wear anyone's voice tonight.";
  if (!last) return "One chapter of fakes is all it wrote. Play more chapters to watch it learn.";
  const [a, b] = [pct(first), pct(last)];
  if (b > a) return `It learned. ${chapter(first)} fooled ${String(a)}% of you. ${chapter(last)} fooled ${String(b)}%.`;
  if (b < a) return `You learned faster. ${chapter(first)} fooled ${String(a)}% of you, ${chapter(last)} only ${String(b)}%.`;
  return `Dead even: ${chapter(first)} and ${chapter(last)} both fooled ${String(a)}% of you.`;
}

function Fake({ state, sample, className }: { state: ClientState; sample: FakeSample; className: string }) {
  const who = playerById(state, sample.targetId);
  const name = who?.name ?? "a villager";
  return (
    <article className={`card flex min-w-0 flex-col px-[clamp(16px,1.8vw,28px)] py-[clamp(12px,min(1.6vw,2.4vh),24px)] ${className}`}>
      <div className="flex items-center gap-3">
        <span className="tag">{chapter(sample)}</span>
        {who && <Token player={who} size="sm" className="size-10" />}
        <span className="min-w-0 truncate font-semibold text-ink-soft">The Wolf as {name}</span>
      </div>
      <p className="mt-3 text-[clamp(0.95rem,1.1vw,1.15rem)] font-semibold text-ink-soft [@media(max-height:920px)]:hidden">{sample.question}</p>
      <blockquote className="mt-2.5 font-display text-[clamp(1.35rem,1.9vw,2.1rem)] font-semibold leading-snug [font-variation-settings:'SOFT'_100]">
        &ldquo;{sample.fake}&rdquo;
      </blockquote>
      <p className="mt-2 text-[clamp(0.95rem,1.1vw,1.15rem)] text-ink-soft [@media(max-height:820px)]:hidden">
        {name} really wrote: &ldquo;{sample.real}&rdquo;
      </p>
      <div className="mt-auto pt-4">
        <div className="flex items-baseline justify-between gap-4 border-t-2 border-dashed border-gold/60 pt-3">
          <p className="voice text-[clamp(0.95rem,1.1vw,1.15rem)] leading-snug text-ink-soft">{knew(sample.round)}</p>
          <p className="shrink-0 font-display text-[clamp(1.2rem,1.6vw,1.65rem)] font-bold [font-variation-settings:'SOFT'_100]">
            fooled <span className="text-rasp-deep">{`${String(sample.fooled)} of ${String(sample.votes)}`}</span>
          </p>
        </div>
      </div>
    </article>
  );
}

function Page({ state, page }: { state: ClientState; page: NotebookPage }) {
  const who = playerById(state, page.playerId);
  if (!who) return null;
  const lines = scribbles(page.style).slice(0, 3);
  const tell = page.style.caughtTells.at(-1);
  return (
    <article className="card-sm flex min-w-0 flex-col px-4 py-3">
      <div className="flex items-center gap-2.5">
        <Token player={who} size="sm" className="size-10" />
        <div className="min-w-0">
          <h4 className="truncate font-display text-[clamp(1.1rem,1.3vw,1.35rem)] font-bold leading-tight [font-variation-settings:'SOFT'_100]">{who.name}</h4>
          <p className="text-[0.85rem] font-bold leading-tight tabular-nums text-ink-soft">
            {page.votes > 0 ? `fooled ${String(page.fooled)} of ${String(page.votes)}` : "never worn"}
          </p>
        </div>
      </div>
      {lines.length > 0 ? (
        <ul className="voice mt-2 space-y-0.5 text-[clamp(1rem,1.15vw,1.2rem)] leading-snug">
          {lines.map((l, i) => (
            <li key={l} className={i >= 2 ? "[@media(max-height:820px)]:hidden" : ""}>
              {l}
            </li>
          ))}
        </ul>
      ) : (
        <p className="voice mt-2 text-ink-soft">Still a mystery.</p>
      )}
      {tell && <p className="mt-2 text-[0.95rem] font-semibold leading-snug text-rasp-deep">Caught by &ldquo;{tell}&rdquo;</p>}
    </article>
  );
}

/** After the map: what the Wolf learned about each villager, and one early fake next to one late fake. */
export function Notebook({ state }: { state: ClientState }) {
  const book = state.notebook;
  if (!book) return <p className="voice m-auto text-[1.8rem] text-ink-soft">The Wolf is finding its notebook...</p>;
  const pages = book.pages.slice(0, MAX_PAGES);
  const more = book.pages.length - pages.length;
  return (
    <div className="flex flex-1 flex-col gap-[clamp(14px,2.2vh,28px)]">
      <div className="flex items-center gap-5">
        <Icon id="quill" cut="lg" className="w-[clamp(3.4rem,min(6vw,9vh),5.5rem)] -rotate-6" />
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-7 gap-y-1">
          <h2 className="cut-letters text-[clamp(2.2rem,min(4.4vw,7vh),4.2rem)]">The Wolf&rsquo;s Notebook</h2>
          <p className="voice text-[clamp(1.15rem,1.6vw,1.6rem)] text-ink">{lesson(book.first, book.last)}</p>
        </div>
      </div>

      {book.first && (
        <div className={`grid items-stretch gap-[clamp(16px,2vw,32px)] ${book.last ? "md:grid-cols-2" : "max-w-3xl"}`}>
          <Fake state={state} sample={book.first} className="-rotate-[0.6deg]" />
          {book.last && <Fake state={state} sample={book.last} className="rotate-[0.6deg]" />}
        </div>
      )}

      <section aria-labelledby="notebook-pages">
        <h3 id="notebook-pages" className="voice text-[clamp(1.3rem,1.7vw,1.7rem)] text-gold-text [@media(max-height:880px)]:sr-only">
          Its notes on each of you
        </h3>
        {pages.length > 0 ? (
          <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-[clamp(12px,1.4vw,20px)] md:auto-cols-[minmax(0,1fr)] md:grid-flow-col md:grid-cols-none [@media(max-height:880px)]:mt-0">
            {pages.map((p) => (
              <Page key={p.playerId} state={state} page={p} />
            ))}
          </div>
        ) : (
          <p className="voice mt-3 text-[1.2rem] text-ink-soft">Nobody let the Wolf borrow their voice, so its pages are blank.</p>
        )}
        {more > 0 && (
          <p className="mt-2 font-semibold text-ink-soft">
            {more} more {more === 1 ? "page is" : "pages are"} on their owners&rsquo; phones.
          </p>
        )}
      </section>
    </div>
  );
}

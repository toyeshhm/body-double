"use client";
import { useEffect, useState } from "react";
import { z } from "zod";
import { roman } from "./format";
import { Icon } from "./Villager";

// "Is the Wolf getting smarter?" The fooled-rate per chapter across every village in the last 24 hours,
// from the anonymous vote time series in Tiger Data (/api/curve). One series, so no legend: the title names it.

const Curve = z.object({
  points: z.array(z.object({ chapter: z.number(), votes: z.number(), fooled: z.number() })),
});
type Point = z.infer<typeof Curve>["points"][number];

const W = 320;
const PAD = { l: 30, r: 14, t: 12, b: 22 };
const pct = (p: Point): number => (p.votes === 0 ? 0 : Math.round((p.fooled / p.votes) * 100));

/** `row` puts the words beside the chart, for wide, short spots like the host recap. */
export function WolfCurve({ className = "", row = false }: { className?: string; row?: boolean }) {
  const H = row ? 92 : 120; // the row layout sits in short spots, so its chart is flatter
  const [points, setPoints] = useState<Point[] | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async (): Promise<void> => {
      try {
        const res = await fetch("/api/curve", { cache: "no-store" });
        const body = Curve.safeParse(await res.json());
        if (alive) setPoints(body.success ? body.data.points : []);
      } catch {
        if (alive) setPoints([]); // offline or no database yet: show the empty state, never an error wall
      }
    };
    void load();
    const id = setInterval(() => void load(), 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const data = (points ?? []).filter((p) => p.votes > 0);
  const total = data.reduce((s, p) => s + p.votes, 0);
  const first = data[0];
  const last = data.at(-1);
  const maxChapter = Math.max(6, last?.chapter ?? 0);
  const x = (c: number): number => PAD.l + ((c - 1) / (maxChapter - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number): number => PAD.t + (1 - v / 100) * (H - PAD.t - PAD.b);
  const line = data.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.chapter).toFixed(1)},${y(pct(p)).toFixed(1)}`).join(" ");
  const shown = hover === null ? null : data.find((p) => p.chapter === hover);

  const footer = (
    <p className="mt-2 text-[0.78rem] font-medium text-ink-soft">
      {total > 0
        ? `${String(total)} anonymous votes across every village, live from Tiger Data.`
        : "Anonymous: no names, no answers, just whether the Wolf won."}
    </p>
  );

  return (
    <section
      className={`card px-5 ${row ? "grid items-center gap-x-6 py-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]" : "pb-4 pt-5"} ${className}`}
      aria-labelledby="wolf-curve-title"
    >
      <div>
        <div className="flex items-start gap-3">
          <Icon id="wolf" cut="sm" className="size-11 shrink-0 -rotate-6" />
          <div className="min-w-0">
            <h2 id="wolf-curve-title" className="font-display text-[1.25rem] font-bold leading-tight [font-variation-settings:'SOFT'_100]">
              Is the Wolf getting smarter?
            </h2>
            <p className="mt-1 text-[0.95rem] font-medium leading-snug text-ink-soft">
              {points === null
                ? "Counting tonight's votes..."
                : first && last && last.chapter > first.chapter
                  ? `Tonight it fooled villages ${String(pct(first))}% of the time in Chapter ${roman(first.chapter)} and ${String(pct(last))}% by Chapter ${roman(last.chapter)}.`
                  : first
                    ? `Chapter ${roman(first.chapter)} so far: fooled ${String(pct(first))}% of the time.`
                    : "No votes yet tonight. Play a round and watch it learn."}
            </p>
          </div>
        </div>
        {row && footer}
      </div>

      {data.length > 0 && (
        <div className={`relative mt-3 ${row ? "md:mt-0" : ""}`}>
          <svg viewBox={`0 0 ${String(W)} ${String(H)}`} className="w-full" role="img" aria-label="Fooled rate by chapter, last 24 hours">
            {[0, 50, 100].map((v) => (
              <g key={v}>
                <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="#c9ae7c" strokeOpacity=".55" strokeDasharray="3 4" />
                <text x={PAD.l - 6} y={y(v) + 4} textAnchor="end" className="fill-ink-soft font-sans text-[9px] font-semibold">
                  {v}%
                </text>
              </g>
            ))}
            {Array.from({ length: maxChapter }, (_, i) => i + 1).map((c) => (
              <text key={c} x={x(c)} y={H - 6} textAnchor="middle" className="fill-ink-soft font-display text-[10px] font-semibold">
                {roman(c)}
              </text>
            ))}
            <path d={line} fill="none" stroke="#963248" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {data.map((p) => (
              <g key={p.chapter}>
                <circle cx={x(p.chapter)} cy={y(pct(p))} r="5" fill="#963248" stroke="#f8f0de" strokeWidth="2" />
                {/* hit target larger than the mark */}
                <circle
                  cx={x(p.chapter)}
                  cy={y(pct(p))}
                  r="14"
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`Chapter ${roman(p.chapter)}: ${String(pct(p))}% fooled across ${String(p.votes)} votes`}
                  onMouseEnter={() => {
                    setHover(p.chapter);
                  }}
                  onMouseLeave={() => {
                    setHover(null);
                  }}
                  onFocus={() => {
                    setHover(p.chapter);
                  }}
                  onBlur={() => {
                    setHover(null);
                  }}
                />
              </g>
            ))}
            {last && (
              <text x={x(last.chapter)} y={y(pct(last)) - 10} textAnchor="middle" className="fill-ink font-sans text-[10px] font-extrabold">
                {pct(last)}%
              </text>
            )}
          </svg>
          {shown && (
            <p
              role="status"
              className="card-sm pointer-events-none absolute -translate-x-1/2 -translate-y-full whitespace-nowrap px-3 py-1.5 text-[0.8rem] font-semibold"
              style={{
                left: `${String((x(shown.chapter) / W) * 100)}%`,
                top: `${String((y(pct(shown)) / H) * 100)}%`,
              }}
            >
              Chapter {roman(shown.chapter)}: {pct(shown)}% fooled, {shown.votes} votes
            </p>
          )}
          <table className="sr-only">
            <caption>Fooled rate by chapter, last 24 hours</caption>
            <thead>
              <tr>
                <th>Chapter</th>
                <th>Fooled</th>
                <th>Votes</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.chapter}>
                  <td>{roman(p.chapter)}</td>
                  <td>{pct(p)}%</td>
                  <td>{p.votes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!row && footer}
    </section>
  );
}

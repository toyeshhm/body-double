// Real spots for the quests: SerpApi's Google Maps search near UT Austin, where HackTX runs. Server-only.
// Only the Wolf's short place query goes out ("climbing gym"): never names, answers or the room code.
import { z } from "zod";
import type { Place } from "../game/types";

const NEAR_UT = "@30.2849,-97.7341,13z"; // ponytail: UT Austin; take the host's city if this ever ships wider
const TIMEOUT_MS = 8000;

const Result = z.object({
  title: z.string().min(1),
  address: z.string().min(1),
  place_id: z.string().optional(),
  rating: z.number().optional(),
  reviews: z.number().optional(),
  open_state: z.string().optional(),
});
type Result = z.infer<typeof Result>;
// A broad search ("climbing gym") returns local_results; a named place ("Zilker Park") returns one place_results.
const Reply = z.object({ local_results: z.array(z.unknown()).optional(), place_results: z.unknown().optional() });

const trusted = (r: Result): boolean => (r.rating ?? 0) >= 4 && (r.reviews ?? 0) >= 20;

/** The most relevant result that people actually rate well (else the most relevant one with an address). */
export function pickPlace(reply: unknown): Place | null {
  const parsed = Reply.safeParse(reply).data;
  const raw = parsed?.place_results === undefined ? (parsed?.local_results ?? []) : [parsed.place_results];
  const results = raw.flatMap((r) => {
    const one = Result.safeParse(r);
    return one.success ? [one.data] : [];
  });
  const best = results.find(trusted) ?? results[0];
  if (!best) return null;
  const maps = new URLSearchParams({ api: "1", query: `${best.title}, ${best.address}` });
  if (best.place_id) maps.set("query_place_id", best.place_id);
  return {
    name: best.title,
    address: best.address,
    rating: best.rating ?? null,
    reviews: best.reviews ?? null,
    openState: best.open_state ?? null,
    mapsUrl: `https://www.google.com/maps/search/?${maps.toString()}`,
  };
}

/** One Maps search. Null without a key or when nothing fits; throws on a failed request (never with the URL: it holds the key). */
export async function findPlace(query: string): Promise<Place | null> {
  const key = process.env.SERPAPI_API_KEY;
  if (!key) return null;
  const params = new URLSearchParams({ engine: "google_maps", type: "search", q: query, ll: NEAR_UT, hl: "en", api_key: key });
  const res = await fetch(`https://serpapi.com/search.json?${params.toString()}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`SerpApi HTTP ${String(res.status)}`);
  return pickPlace(await res.json());
}

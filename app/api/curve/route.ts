import { log } from "@/lib/log";
import { wolfCurve } from "@/lib/game/metrics";

export const dynamic = "force-dynamic";

/** Anonymous fooled-rate per chapter across every village in the last 24 hours (Tiger Data continuous aggregate). */
export async function GET(): Promise<Response> {
  try {
    const points = await wolfCurve();
    return Response.json({ points }, { headers: { "cache-control": "public, s-maxage=15, stale-while-revalidate=60" } });
  } catch (err) {
    log.warn("curve.read", { ok: false, error: String(err).slice(0, 160) });
    return Response.json({ points: [] }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}

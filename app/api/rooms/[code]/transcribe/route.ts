import { handleTranscribe } from "@/lib/game/http";

export const dynamic = "force-dynamic";

/** A phone's spoken answer (audio/wav, up to 30s) back as { text }. Players only, WARMUP or ANSWERING. */
export async function POST(req: Request, { params }: { params: { code: string } }): Promise<Response> {
  return handleTranscribe(req, params.code);
}

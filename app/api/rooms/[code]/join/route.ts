import { handleJoin } from "@/lib/game/http";

export const dynamic = "force-dynamic";

/** Join, or rejoin by name. Returns { playerId, playerKey } for this phone's later requests. */
export async function POST(req: Request, { params }: { params: { code: string } }): Promise<Response> {
  return handleJoin(req, params.code);
}

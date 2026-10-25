import { handleCreate } from "@/lib/game/http";

export const dynamic = "force-dynamic";

/** Open a new village. Returns { code, hostKey }; the host keeps the key to drive the game. */
export async function POST(): Promise<Response> {
  return handleCreate();
}

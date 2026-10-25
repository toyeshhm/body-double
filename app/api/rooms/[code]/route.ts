import { handleAction, handleRead } from "@/lib/game/http";

export const dynamic = "force-dynamic";

/** The caller's sanitized view of the room (host or one phone, chosen by auth headers). */
export async function GET(req: Request, { params }: { params: { code: string } }): Promise<Response> {
  return handleRead(req, params.code);
}

/** One action: host:settings | host:start | host:next | player:consent | player:answer | player:vote | player:tell | player:notMe. */
export async function POST(req: Request, { params }: { params: { code: string } }): Promise<Response> {
  return handleAction(req, params.code);
}

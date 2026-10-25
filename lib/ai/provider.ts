// Server-only: runs inside the Node custom server, never in the browser.
// Privacy: never log prompts or model output. They contain players' answers.
import OpenAI from "openai";
import { log } from "../log";

type Provider = "muse" | "gemini";

const TIMEOUT_MS = 12_000;
const GEMINI_BASE = "https://generativelanguage.googleapis.com";

// ponytail: `||` on purpose, so the blank `KEY=` lines from .env.example fall back to the default.
const env = (name: string, fallback: string): string => process.env[name] || fallback;

function client(provider: Provider, apiKey: string): OpenAI {
  const baseURL =
    provider === "muse" ? env("MUSE_BASE_URL", "https://api.meta.ai/v1") : `${GEMINI_BASE}/v1beta/openai/`;
  return new OpenAI({ apiKey, baseURL, maxRetries: 0, timeout: TIMEOUT_MS });
}

// Log only the error's name and message, never the request or response body.
function describe(err: unknown): string {
  return (err instanceof Error ? `${err.name}: ${err.message}` : String(err)).slice(0, 200);
}

async function withFallback(
  kind: "text" | "image",
  call: (provider: Provider, apiKey: string) => Promise<string>,
): Promise<string> {
  const order: Provider[] = process.env.AI_PROVIDER === "gemini" ? ["gemini", "muse"] : ["muse", "gemini"];
  const failures: string[] = [];
  for (const provider of order) {
    const apiKey = env(provider === "muse" ? "MUSE_API_KEY" : "GEMINI_API_KEY", "");
    if (!apiKey) {
      log.warn("ai.skip", { provider, kind, reason: "no_api_key" });
      failures.push(`${provider}: no API key`);
      continue;
    }
    const started = Date.now();
    try {
      const out = await call(provider, apiKey);
      log.info("ai.call", { provider, kind, ok: true, ms: Date.now() - started });
      return out;
    } catch (err) {
      const reason = describe(err);
      log.warn("ai.call", { provider, kind, ok: false, ms: Date.now() - started, error: reason });
      failures.push(`${provider}: ${reason}`);
    }
  }
  log.error("ai.failed", { kind });
  throw new Error(`AI ${kind} failed on both providers (${failures.join("; ")})`);
}

export async function generateText(opts: {
  system: string;
  user: string;
  json?: boolean;
  temperature?: number;
}): Promise<string> {
  return withFallback("text", async (provider, apiKey) => {
    const res = await client(provider, apiKey).chat.completions.create(
      {
        model:
          provider === "muse"
            ? env("MUSE_TEXT_MODEL", "muse-spark-1.3")
            : env("GEMINI_TEXT_MODEL", "gemini-3.8-flash"),
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
        temperature: opts.temperature,
        // Both models always reason. "low" keeps us inside 12s. Muse rejects "none"; gemini-3.8-flash rejects "minimal".
        reasoning_effort: "low",
        response_format: opts.json ? { type: "json_object" } : undefined,
      },
      { signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    const text = res.choices[0]?.message.content;
    if (!text) throw new Error("empty completion");
    return text;
  });
}

async function museImage(apiKey: string, prompt: string): Promise<string> {
  // Muse-only extras ride along in the body; the SDK forwards them untouched.
  const body: OpenAI.ImageGenerateParamsNonStreaming & {
    reasoning_strength: "low";
    tool_enablement: Record<string, boolean>;
  } = {
    model: env("MUSE_IMAGE_MODEL", "muse-image-1.0"),
    prompt,
    n: 1,
    reasoning_strength: "low", // single pass, no self-refinement: needed to fit in 12s
    // No web or image search (that would send players' answers to search) and no code sandbox.
    tool_enablement: { enable_image_search: false, enable_web_search: false, enable_shell: false },
  };
  const res = await client("muse", apiKey).images.generate(body, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  const img = res.data?.[0];
  if (img?.url) return img.url;
  if (img?.b64_json) return `data:image/${res.output_format ?? "webp"};base64,${img.b64_json}`;
  throw new Error("no image in response");
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const field = (v: unknown, key: string): unknown => (isRecord(v) ? v[key] : undefined);
const first = (v: unknown): unknown => (Array.isArray(v) ? v[0] : undefined);

// Native generateContent. The OpenAI-compat images endpoint only documents gemini-2.5-flash-image,
// and Google now limits 2.5 models to accounts that already used them.
async function geminiImage(apiKey: string, prompt: string): Promise<string> {
  const model = env("GEMINI_IMAGE_MODEL", "gemini-3.1-flash-lite-image");
  const res = await fetch(`${GEMINI_BASE}/v1/models/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE"] },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const candidate = first(field(await res.json(), "candidates"));
  const rawParts = field(field(candidate, "content"), "parts");
  const parts: unknown[] = Array.isArray(rawParts) ? rawParts : [];
  for (const part of parts) {
    const inline = field(part, "inlineData");
    const data = field(inline, "data");
    const mime = field(inline, "mimeType");
    if (typeof data === "string" && typeof mime === "string") return `data:${mime};base64,${data}`;
  }
  throw new Error(`no image in response (finishReason=${String(field(candidate, "finishReason"))})`);
}

export async function generateImage(opts: { prompt: string }): Promise<string> {
  return withFallback("image", (provider, apiKey) =>
    provider === "muse" ? museImage(apiKey, opts.prompt) : geminiImage(apiKey, opts.prompt),
  );
}

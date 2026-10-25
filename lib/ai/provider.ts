// Server-only: runs inside the Node custom server, never in the browser.
// Privacy: never log prompts or model output. They contain players' answers.
import { spawn } from "node:child_process";
import OpenAI from "openai";
import { log } from "../log";

type Provider = "muse" | "gemini" | "claude";

const TIMEOUT_MS = 12_000;
const CLAUDE_CLI_TIMEOUT_MS = 30_000; // local testing only: the CLI's own startup eats several seconds
const GEMINI_BASE = "https://generativelanguage.googleapis.com";

// ponytail: `||` on purpose, so the blank `KEY=` lines from .env.example fall back to the default.
const env = (name: string, fallback: string): string => process.env[name] || fallback;

function muse(apiKey: string): OpenAI {
  return new OpenAI({ apiKey, baseURL: env("MUSE_BASE_URL", "https://api.meta.ai/v1"), maxRetries: 0, timeout: TIMEOUT_MS });
}

// Log only the error's name and message, never the request or response body.
function describe(err: unknown): string {
  return (err instanceof Error ? `${err.name}: ${err.message}` : String(err)).slice(0, 200);
}

/** `prefer` gives a job to one provider even when the default (AI_PROVIDER, else Muse) is healthy. */
async function withFallback(
  kind: "text" | "image" | "audio",
  call: (provider: Provider, apiKey: string) => Promise<string>,
  prefer?: "muse" | "gemini",
): Promise<string> {
  const choice = process.env.AI_PROVIDER;
  const lead = prefer ?? (choice === "gemini" ? "gemini" : "muse");
  const order: Provider[] = choice === "claude" && kind === "text" ? ["claude"] : lead === "gemini" ? ["gemini", "muse"] : ["muse", "gemini"];
  const failures: string[] = [];
  for (const provider of order) {
    const apiKey = provider === "claude" ? "" : env(provider === "muse" ? "MUSE_API_KEY" : "GEMINI_API_KEY", "");
    if (provider !== "claude" && !apiKey) {
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
  throw new Error(`AI ${kind} failed (${failures.join("; ")})`);
}

export async function generateText(opts: {
  system: string;
  user: string;
  json?: boolean;
  temperature?: number;
  /** Who leads for this job: Gemini runs moderation and style profiles (lib/ai/prompts.ts). */
  prefer?: "muse" | "gemini";
}): Promise<string> {
  return withFallback(
    "text",
    async (provider, apiKey) => {
      if (provider === "claude") return claudeText(opts.system, opts.user);
      if (provider === "gemini") {
        const parts = await gemini(apiKey, env("GEMINI_TEXT_MODEL", "gemini-2.5-flash"), {
          systemInstruction: { parts: [{ text: opts.system }] },
          contents: [{ role: "user", parts: [{ text: opts.user }] }],
          generationConfig: {
            temperature: opts.temperature,
            responseMimeType: opts.json ? "application/json" : "text/plain",
            thinkingConfig: { thinkingBudget: 0 }, // short structured jobs: no thinking keeps them fast and cheap
          },
        });
        const text = textOf(parts);
        if (!text) throw new Error("empty completion");
        return text;
      }
      const res = await muse(apiKey).chat.completions.create(
        {
          model: env("MUSE_TEXT_MODEL", "muse-spark-1.3"),
          messages: [
            { role: "system", content: opts.system },
            { role: "user", content: opts.user },
          ],
          temperature: opts.temperature,
          reasoning_effort: "low", // Muse always reasons and rejects "none"; "low" keeps us inside 12s
          response_format: opts.json ? { type: "json_object" } : undefined,
        },
        { signal: AbortSignal.timeout(TIMEOUT_MS) },
      );
      const text = res.choices[0]?.message.content;
      if (!text) throw new Error("empty completion");
      return text;
    },
    opts.prefer,
  );
}

/**
 * Local testing with no API keys (AI_PROVIDER=claude, text only): the signed-in Claude Code CLI is the model.
 * Never used on Vercel. Answers go in on stdin, not argv; no session is saved to disk (spec 8);
 * user settings, hooks, tools and MCP servers are all skipped so a call takes about 5s.
 */
function claudeText(system: string, user: string): Promise<string> {
  const args = ["-p", "--model", env("CLAUDE_TEXT_MODEL", "haiku"), "--system-prompt", system, "--output-format", "text"];
  args.push("--no-session-persistence", "--setting-sources", "", "--strict-mcp-config", "--tools", "", "--disable-slash-commands");
  return new Promise((resolve, reject) => {
    const child = spawn("claude", args, { timeout: CLAUDE_CLI_TIMEOUT_MS, stdio: ["pipe", "pipe", "ignore"] });
    let out = "";
    child.stdout.on("data", (chunk: Buffer) => {
      out += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0 && out.trim()) resolve(out);
      else reject(new Error(`claude CLI exited with ${String(code)}`));
    });
    child.stdin.end(user);
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
  const res = await muse(apiKey).images.generate(body, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  const img = res.data?.[0];
  if (img?.url) return img.url;
  if (img?.b64_json) return `data:image/${res.output_format ?? "webp"};base64,${img.b64_json}`;
  throw new Error("no image in response");
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const field = (v: unknown, key: string): unknown => (isRecord(v) ? v[key] : undefined);
const first = (v: unknown): unknown => (Array.isArray(v) ? v[0] : undefined);

/**
 * Gemini's native generateContent, returning the first candidate's parts. Native, not OpenAI-compatible:
 * the compat endpoint only takes the key as a Bearer token, which "AQ." keys are rejected for (401).
 */
async function gemini(apiKey: string, model: string, body: Record<string, unknown>): Promise<unknown[]> {
  const res = await fetch(`${GEMINI_BASE}/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${String(res.status)}`);
  const candidate = first(field(await res.json(), "candidates"));
  const raw = field(field(candidate, "content"), "parts");
  if (!Array.isArray(raw)) throw new Error(`no content (finishReason=${String(field(candidate, "finishReason"))})`);
  const parts: unknown[] = raw;
  return parts;
}

const textOf = (parts: unknown[]): string =>
  parts
    .map((p) => field(p, "text"))
    .filter((t): t is string => typeof t === "string")
    .join("");

async function geminiImage(apiKey: string, prompt: string): Promise<string> {
  const parts = await gemini(apiKey, env("GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image"), {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ["IMAGE"] },
  });
  for (const part of parts) {
    const inline = field(part, "inlineData");
    const data = field(inline, "data");
    const mime = field(inline, "mimeType");
    if (typeof data === "string" && typeof mime === "string") return `data:${mime};base64,${data}`;
  }
  throw new Error("no image in response");
}

export async function generateImage(opts: { prompt: string }): Promise<string> {
  return withFallback("image", (provider, apiKey) =>
    provider === "muse" ? museImage(apiKey, opts.prompt) : geminiImage(apiKey, opts.prompt),
  );
}

// ---- speech to text (spoken answers). Input is always the WAV that lib/ai/wav.ts describes.

async function museTranscribe(apiKey: string, audio: Uint8Array, mime: string): Promise<string> {
  const settings = { model: env("MUSE_TRANSCRIBE_MODEL", "muse-voice-transcribe-1.0"), audioEncoding: "WAV", mode: "PUSH_TO_TALK" };
  const form = new FormData();
  form.append("request", new Blob([JSON.stringify(settings)], { type: "application/json" }));
  form.append("audio", new Blob([new Uint8Array(audio)], { type: mime }), "answer.wav");
  const base = env("MUSE_BASE_URL", "https://api.meta.ai/v1").replace(/\/$/, "");
  const res = await fetch(`${base}/asr/transcribe`, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, accept: "application/json" },
    body: form,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${String(res.status)}`);
  const transcript = field(await res.json(), "transcript");
  if (typeof transcript !== "string") throw new Error("no transcript in response");
  return transcript;
}

async function geminiTranscribe(apiKey: string, audio: Uint8Array, mime: string): Promise<string> {
  const parts = await gemini(apiKey, env("GEMINI_TEXT_MODEL", "gemini-2.5-flash"), {
    contents: [
      {
        role: "user",
        parts: [
          { text: "Transcribe this short spoken answer word for word. Reply with only the transcript. If nobody speaks, reply with nothing." },
          { inlineData: { mimeType: mime, data: Buffer.from(audio).toString("base64") } },
        ],
      },
    ],
    generationConfig: { temperature: 0, thinkingConfig: { thinkingBudget: 0 } },
  });
  return textOf(parts);
}

/** Muse Voice Transcribe, then Gemini. "" means nobody spoke. Never log the audio or the transcript. */
export async function transcribe(opts: { audio: Uint8Array; mime: string }): Promise<string> {
  const text = await withFallback("audio", (provider, apiKey) =>
    provider === "gemini" ? geminiTranscribe(apiKey, opts.audio, opts.mime) : museTranscribe(apiKey, opts.audio, opts.mime),
  );
  return text.trim();
}

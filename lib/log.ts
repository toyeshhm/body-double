// The one logger for the server. Structured JSON lines to stdout.
// Privacy rule: never pass answer text, fakes, or prompts in fields.

type Level = "info" | "warn" | "error";

function emit(level: Level, event: string, fields: Record<string, string | number | boolean> = {}): void {
  const line = JSON.stringify({ t: new Date().toISOString(), level, event, ...fields });
  if (level === "error") console.error(line);
  else console.log(line);
}

export const log = {
  info: (event: string, fields?: Record<string, string | number | boolean>) => {
    emit("info", event, fields);
  },
  warn: (event: string, fields?: Record<string, string | number | boolean>) => {
    emit("warn", event, fields);
  },
  error: (event: string, fields?: Record<string, string | number | boolean>) => {
    emit("error", event, fields);
  },
};

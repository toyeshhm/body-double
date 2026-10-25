"use client";
import { useEffect, useRef, useState } from "react";
import { transcribeVoice } from "@/components/useGame";
import { MAX_SECONDS, WAV_RATE, encodeWav } from "@/lib/ai/wav";

/** A paper textarea with a live "12/140" counter. Same UI every round so answers look alike. */
export function Scribe({
  id,
  label,
  value,
  onChange,
  max,
  rows = 3,
  hideLabel = false,
  placeholder,
  voiceRoom,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  max: number;
  rows?: number;
  hideLabel?: boolean;
  placeholder?: string;
  /** Room code. When set, a mic button lets the player speak the answer into the field (Muse Voice Transcribe). */
  voiceRoom?: string | undefined;
}) {
  const full = value.length >= max;
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className={hideLabel ? "sr-only" : "font-display text-[1.3rem] font-semibold leading-snug text-ink"}
        style={hideLabel ? undefined : { fontVariationSettings: '"SOFT" 100' }}
      >
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value.slice(0, max));
        }}
        maxLength={max}
        rows={rows}
        placeholder={placeholder}
        aria-describedby={`${id}-count`}
        className="field resize-none leading-snug"
      />
      <div className="flex items-start justify-between gap-3">
        {voiceRoom ? (
          <Mic
            room={voiceRoom}
            onHeard={(text) => {
              const before = value.trim();
              onChange((before ? `${before} ${text}` : text).slice(0, max));
            }}
          />
        ) : (
          <span />
        )}
        <span
          id={`${id}-count`}
          aria-live={full ? "polite" : "off"}
          className={`pt-3 text-sm font-semibold tabular-nums ${full ? "text-rasp-deep" : "text-ink-soft"}`}
        >
          {value.length}/{max}
        </span>
      </div>
    </div>
  );
}

const canRecord = (): boolean => "MediaRecorder" in window && "mediaDevices" in navigator && "OfflineAudioContext" in window;

/** webm/opus on Chrome and Firefox, mp4/aac on iOS Safari. Undefined lets the browser choose. */
function recordingType(): string | undefined {
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"].find((t) => MediaRecorder.isTypeSupported(t));
}

/** Muse only takes 16-bit mono PCM WAV, so decode whatever the phone recorded and re-encode at 16 kHz. */
async function toWav(recording: Blob): Promise<Blob> {
  const decoded = await new OfflineAudioContext(1, 1, WAV_RATE).decodeAudioData(await recording.arrayBuffer());
  const mono = new Float32Array(Math.min(decoded.length, MAX_SECONDS * WAV_RATE));
  for (let c = 0; c < decoded.numberOfChannels; c++) {
    const channel = decoded.getChannelData(c);
    for (let i = 0; i < mono.length; i++) mono[i] = (mono[i] ?? 0) + (channel[i] ?? 0) / decoded.numberOfChannels;
  }
  return new Blob([encodeWav(mono)], { type: "audio/wav" });
}

function MicGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
    </svg>
  );
}

/** Tap to speak, tap again to stop (30s at most). The words land in the field to edit; nothing is kept. */
function Mic({ room, onHeard }: { room: string; onHeard: (text: string) => void }) {
  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState<"idle" | "recording" | "listening">("idle");
  const [seconds, setSeconds] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const heard = useRef(onHeard);
  heard.current = onHeard;

  useEffect(() => {
    setSupported(canRecord());
    return () => {
      // Leaving the page mid-recording releases the mic and sends nothing.
      const rec = recorder.current;
      if (!rec) return;
      rec.onstop = null;
      rec.stream.getTracks().forEach((t) => {
        t.stop();
      });
      rec.stop();
    };
  }, []);

  useEffect(() => {
    if (status !== "recording") return;
    const started = Date.now();
    const tick = setInterval(() => {
      const s = Math.floor((Date.now() - started) / 1000);
      setSeconds(s);
      if (s >= MAX_SECONDS) recorder.current?.stop();
    }, 250);
    return () => {
      clearInterval(tick);
    };
  }, [status]);

  if (!supported) return null;

  const finish = async (recording: Blob): Promise<void> => {
    setStatus("listening");
    let wav: Blob;
    try {
      wav = await toWav(recording);
    } catch {
      setStatus("idle");
      setNote("The Wolf couldn't make out that recording. Try again, or type it.");
      return;
    }
    const out = await transcribeVoice(room, wav);
    setStatus("idle");
    if (!out.ok) setNote(out.error);
    else if (!out.text) setNote("The Wolf didn't catch any words. Try again a little closer.");
    else heard.current(out.text);
  };

  const start = async (): Promise<void> => {
    setNote(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const denied = err instanceof DOMException && err.name === "NotAllowedError";
      setNote(denied ? "The Wolf needs your microphone for that. Allow it in your browser, or just type." : "No microphone found. Type it instead.");
      return;
    }
    const type = recordingType();
    const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    rec.onstop = () => {
      stream.getTracks().forEach((t) => {
        t.stop();
      });
      recorder.current = null;
      void finish(new Blob(chunks, { type: rec.mimeType }));
    };
    rec.start();
    recorder.current = rec;
    setSeconds(0);
    setStatus("recording");
  };

  const recording = status === "recording";
  return (
    <div className="flex min-w-0 flex-col items-start gap-1.5">
      <button
        type="button"
        className="chip flex items-center gap-2 !px-4 disabled:opacity-60"
        aria-pressed={recording}
        disabled={status === "listening"}
        onClick={() => {
          if (recording) recorder.current?.stop();
          else void start();
        }}
      >
        {recording ? <span aria-hidden="true" className="size-3 shrink-0 animate-pulse rounded-full bg-paper-cut" /> : <MicGlyph />}
        {recording ? `Done, 0:${String(seconds).padStart(2, "0")}` : status === "listening" ? "The Wolf is listening..." : "Say it"}
      </button>
      <p role="status" className="text-sm leading-snug text-ink-soft">
        {note}
      </p>
    </div>
  );
}

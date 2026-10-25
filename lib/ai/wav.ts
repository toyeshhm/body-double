// The one audio format Muse Voice Transcribe accepts: RIFF/WAVE, mono, 16-bit PCM, 16 or 24 kHz.
// Phones record webm/opus or mp4/aac, so the browser decodes and re-encodes to this before upload
// (components/play/Scribe.tsx). Pure: runs in the browser and on the server.

export const WAV_RATE = 16_000;
export const MAX_SECONDS = 30;

/** Mono float samples (-1..1) to a 16-bit PCM WAV file. */
export function encodeWav(samples: Float32Array, sampleRate = WAV_RATE): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const ascii = (at: number, text: string): void => {
    for (let i = 0; i < text.length; i++) view.setUint8(at + i, text.charCodeAt(i));
  };
  ascii(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  ascii(36, "data");
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((s, i) => {
    const clamped = Math.max(-1, Math.min(1, s));
    view.setInt16(44 + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  });
  return bytes;
}

/**
 * Reads the header of a WAV this app would send. Null unless it is the canonical 44-byte header
 * encodeWav writes, mono 16-bit PCM at 16 or 24 kHz: anything else is rejected at the API boundary.
 */
export function wavInfo(bytes: Uint8Array): { sampleRate: number; seconds: number } | null {
  if (bytes.length < 44) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (at: number, n: number): string => String.fromCharCode(...bytes.subarray(at, at + n));
  if (ascii(0, 4) !== "RIFF" || ascii(8, 4) !== "WAVE" || ascii(12, 4) !== "fmt " || ascii(36, 4) !== "data") return null;
  const pcm = view.getUint16(20, true) === 1 && view.getUint16(22, true) === 1 && view.getUint16(34, true) === 16;
  const sampleRate = view.getUint32(24, true);
  if (!pcm || (sampleRate !== 16_000 && sampleRate !== 24_000)) return null;
  return { sampleRate, seconds: (bytes.length - 44) / (sampleRate * 2) };
}

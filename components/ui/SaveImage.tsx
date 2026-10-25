"use client";
import { toPng } from "html-to-image";
import { useState, type RefObject } from "react";

/**
 * Saves a card as a PNG (spec: recap export). On phones that can share files it opens the share sheet
 * (save to Photos, send to the group chat); elsewhere it downloads.
 */
export function SaveImage({
  target,
  fileName,
  label = "Save the tale as a picture",
  className = "",
}: {
  target: RefObject<HTMLElement>;
  fileName: string;
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const save = async (): Promise<void> => {
    const node = target.current;
    if (!node) return;
    setBusy(true);
    setFailed(false);
    try {
      const url = await toPng(node, { pixelRatio: 2, cacheBust: true, backgroundColor: "#eadfc7" });
      const file = new File([await (await fetch(url)).blob()], fileName, { type: "image/png" });
      const phone = window.matchMedia("(pointer: coarse)").matches; // desktops download; phones get the share sheet
      if (phone && "canShare" in navigator && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Body Double" });
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
      }
    } catch (err) {
      // A dismissed share sheet is not a failure; anything else tells the player to screenshot instead.
      if (!(err instanceof DOMException && err.name === "AbortError")) setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <button type="button" className="btn btn-quiet w-full" onClick={() => void save()} disabled={busy}>
        {busy ? "Painting the page..." : label}
      </button>
      {failed && (
        <p role="status" className="mt-2 text-center text-sm font-semibold text-rasp-deep">
          Couldn&rsquo;t save the picture. A screenshot works too.
        </p>
      )}
    </div>
  );
}

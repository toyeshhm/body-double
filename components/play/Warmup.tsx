"use client";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/ui/Villager";
import type { MeView, Prompt } from "@/lib/game/types";
import { Dock, Lede, Pause, Title, Voice } from "./bits";
import { Scribe } from "./Scribe";

const MAX = 140;

/** Spec 4 WARMUP: three quick answers that seed your style profile. Nobody is impersonated yet. */
export function Warmup({
  prompts,
  me,
  onAnswer,
}: {
  prompts: Prompt[];
  me: MeView;
  onAnswer: (promptId: string, text: string) => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const { code } = useParams<{ code?: string }>(); // /play/[code]; absent in /preview, which hides the mic
  const done = prompts.every((p) => me.answeredPromptIds.includes(p.id));
  const ready = prompts.every((p) => (drafts[p.id] ?? "").trim().length > 0);

  if (done) {
    return (
      <Pause
        art={<Icon id="scroll" className="size-28 -rotate-6" />}
        title="The storyteller has your pages."
        line="Waiting for the rest of the village to finish their warmup."
      />
    );
  }

  return (
    <form
      className="flex flex-1 flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready) return;
        for (const p of prompts) onAnswer(p.id, drafts[p.id] ?? "");
      }}
    >
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Voice>Before the tale begins</Voice>
          <Title>Three quick ones</Title>
        </div>
        <Icon id="quill" className="size-16 shrink-0 rotate-6" />
      </div>
      <Lede>Answer like you&rsquo;d text. The Wolf is reading, but nobody gets impersonated yet.</Lede>
      {prompts.map((p) => (
        <div key={p.id} className="card p-4">
          <Scribe
            id={`warmup-${p.id}`}
            label={p.text}
            value={drafts[p.id] ?? ""}
            max={MAX}
            rows={2}
            voiceRoom={code}
            onChange={(text) => {
              setDrafts((d) => ({ ...d, [p.id]: text }));
            }}
          />
        </div>
      ))}
      <Dock>
        <button type="submit" className="btn btn-primary w-full text-[1.1rem]" disabled={!ready}>
          Hand these to the storyteller
        </button>
      </Dock>
    </form>
  );
}

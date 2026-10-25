"use client";
import { useState } from "react";
import { ClockTower } from "@/components/ui/ClockTower";
import { playerById, roman } from "@/components/ui/format";
import { Icon, Token } from "@/components/ui/Villager";
import type { ClientState, MeView, RoundView } from "@/lib/game/types";
import { Dock, Lede, Title, Voice } from "./bits";
import { Scribe } from "./Scribe";

const MAX = 140;

/** PROMPT announces the chapter; ANSWERING collects one answer. Same box every round. */
export function AnswerForm({
  state,
  round,
  me,
  onAnswer,
}: {
  state: ClientState;
  round: RoundView;
  me: MeView;
  onAnswer: (promptId: string, text: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const isTarget = round.targetIds.includes(me.id);
  const targets = round.targetIds.map((id) => playerById(state, id)).filter((p) => p !== undefined);
  const names = targets.map((p) => p.name).join(" and ") || "A villager";
  const submitted = me.answeredPromptIds.includes(round.prompt.id);
  const answering = state.phase === "ANSWERING";

  return (
    <form
      className="flex flex-1 flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!draft.trim()) return;
        onAnswer(round.prompt.id, draft);
        setEditing(false);
      }}
    >
      {answering && (
        <div className="card flex items-center px-4 py-3">
          <ClockTower deadline={state.deadline} totalSeconds={state.settings.answerSeconds} />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <Voice>
          Chapter {roman(round.n)} of {roman(round.total)}
        </Voice>
        <Title className="text-[2.1rem]">{round.prompt.text}</Title>
      </div>
      {answering ? (
        <div className="flex items-center gap-3">
          {isTarget ? <Icon id="wolf" className="size-12 shrink-0 -rotate-6" /> : targets.map((p) => <Token key={p.id} player={p} size="sm" />)}
          <Lede className="!leading-snug">
            {isTarget ? "The Wolf is studying you this round. Answer like yourself." : `${names} ${targets.length > 1 ? "are" : "is"} up.`}
          </Lede>
        </div>
      ) : (
        <div className="my-auto flex flex-col items-center gap-4 py-6 text-center">
          <span className="relative">
            {isTarget ? <Icon id="wolf" className="size-32 -rotate-6" /> : targets.map((p) => <Token key={p.id} player={p} size="xl" className="-rotate-3" />)}
            <Icon id="sparkles" cut="sm" className="absolute -right-5 -top-3 size-12 animate-twinkle" />
          </span>
          <h2 className="font-display text-[1.8rem] font-bold leading-tight text-ink" style={{ fontVariationSettings: '"SOFT" 100' }}>
            {isTarget ? "The Wolf is studying you." : `${names} ${targets.length > 1 ? "are" : "is"} up.`}
          </h2>
          <Lede>{isTarget ? "Answer like yourself when the clock starts." : "Everyone answers. The Wolf writes one more, in their voice."}</Lede>
        </div>
      )}

      {answering &&
        (submitted && !editing ? (
          <div className="mt-4 flex flex-col items-center gap-4 text-center">
            <Icon id="scroll" className="size-20 rotate-6" />
            <Title className="text-[1.7rem]">Tucked away.</Title>
            <Lede>Waiting for the rest of the village.</Lede>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => {
                setEditing(true);
              }}
            >
              Edit answer
            </button>
          </div>
        ) : (
          <>
            <Scribe id="answer" label="Your answer" hideLabel value={draft} onChange={setDraft} max={MAX} rows={4} placeholder="Type it the way you'd text it" />
            <Dock>
              <button type="submit" className="btn btn-primary w-full text-[1.15rem]" disabled={!draft.trim()}>
                Tuck it away
              </button>
            </Dock>
          </>
        ))}
    </form>
  );
}

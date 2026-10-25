"use client";
import { useState } from "react";
import { playerById } from "@/components/ui/format";
import { Mirror } from "@/components/ui/Mirror";
import { Icon } from "@/components/ui/Villager";
import type { Choice, ClientState, MeView, RoundView } from "@/lib/game/types";
import { avatarOf, Lede, Seal, Title, Voice } from "./bits";

const MAX_TELL = 80; // matches the server cap in lib/game/machine.ts
const CHOICES: readonly Choice[] = ["A", "B"];

/** Both answers with the truth on them, so a group without a big screen still sees the reveal. */
function Truth({ round, name, avatar }: { round: RoundView; name: string; avatar: string | undefined }) {
  const pair = round.pair;
  const reveal = round.reveal;
  if (!pair || !reveal) return null;
  return (
    <div className="flex flex-col gap-9 pt-6">
      {CHOICES.map((c) => {
        const wolf = c !== reveal.real;
        return (
          <div key={c} className="relative" style={{ rotate: c === "A" ? "-1deg" : "1deg" }}>
            <Mirror label={c} text={pair[c]} ownerName={name} ownerAvatar={avatarOf(avatar)} size="hand" verdict={wolf ? "wolf" : "real"} delay={c === "A" ? 0 : 0.15} />
            {wolf && pair[c] !== null && (
              <span className="card-sm absolute -bottom-2 right-2 rotate-3 px-2.5 py-1 text-[0.8rem] font-extrabold text-burg">AI-written</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** REVEAL and TELLS on the phone: your result, the "What gave it away?" line, and the target's "Not me". */
export function Reveal({
  state,
  round,
  me,
  onTell,
  onNotMe,
}: {
  state: ClientState;
  round: RoundView;
  me: MeView;
  onTell: (text: string) => void;
  onNotMe: () => void;
}) {
  const [tell, setTell] = useState("");
  const [sent, setSent] = useState(false);
  const reveal = round.reveal;
  const target = playerById(state, round.activeTargetId);
  const name = target?.name ?? "this villager";
  const score = playerById(state, me.id)?.score ?? 0;
  if (!reveal) return null;

  const scoreLine = (
    <p className="mt-1 text-[1rem] font-bold text-ink-soft">
      Your score: <span className="font-sans text-[1.15rem] font-extrabold tabular-nums text-rasp-deep">{score}</span>
    </p>
  );

  if (round.activeTargetId === me.id) {
    const spotted = reveal.votes[reveal.real].length;
    const voters = spotted + reveal.votes[reveal.real === "A" ? "B" : "A"].length;
    return (
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-center gap-4">
          <Icon id="mirror" className="size-20 shrink-0 -rotate-6" />
          <div>
            <Voice>The village has spoken</Voice>
            <Title className="text-[1.75rem]">
              {spotted} of {voters} found the real you.
            </Title>
            {scoreLine}
          </div>
        </div>
        <Lede>You earn +50 for each friend who saw through the Wolf.</Lede>
        <Truth round={round} name={name} avatar={target?.avatar} />
        <div className="card mt-auto p-4">
          {round.pair?.vetoed ? (
            <p className="voice text-[1.2rem] text-ink">Hidden from every screen.</p>
          ) : (
            <>
              <p className="text-[0.95rem] font-medium leading-snug text-ink-soft">
                Did the Wolf&rsquo;s answer feel wrong for you? Hide it from every screen.
              </p>
              <button type="button" className="btn btn-quiet mt-3 w-full" onClick={onNotMe}>
                Not me
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const right = me.vote !== null && me.vote === reveal.real;
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center gap-4">
        {right ? <Seal points={100} /> : <Icon id={me.vote === null ? "clock-tower" : "wolf"} className="size-20 shrink-0 -rotate-6" />}
        <div className="min-w-0">
          <Title className="text-[1.75rem]">
            {me.vote === null ? "You didn't pick this time." : right ? `You found the real ${name}.` : "The Wolf fooled you."}
          </Title>
          {scoreLine}
        </div>
      </div>
      {!right && <Lede>The real {name} was answer {reveal.real}.</Lede>}
      <Truth round={round} name={name} avatar={target?.avatar} />

      {right &&
        (sent ? (
          <p className="voice mt-4 text-center text-[1.25rem] text-ink">Noted. The Wolf won&rsquo;t make that mistake again.</p>
        ) : (
          <form
            className="mt-4 flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!tell.trim()) return;
              onTell(tell);
              setSent(true);
            }}
          >
            <div>
              <Voice>What big eyes you have...</Voice>
              <label htmlFor="tell" className="font-display text-[1.5rem] font-bold text-ink" style={{ fontVariationSettings: '"SOFT" 100' }}>
                What gave the Wolf away?
              </label>
            </div>
            <input
              id="tell"
              className="field"
              value={tell}
              maxLength={MAX_TELL}
              onChange={(e) => {
                setTell(e.target.value.slice(0, MAX_TELL));
              }}
              enterKeyHint="send"
              placeholder="One line. Optional."
            />
            <button type="submit" className="btn btn-primary w-full" disabled={!tell.trim()}>
              Tell the village
            </button>
          </form>
        ))}
    </div>
  );
}

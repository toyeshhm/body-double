import { ClockTower } from "@/components/ui/ClockTower";
import { playerById, roman } from "@/components/ui/format";
import { Mirror } from "@/components/ui/Mirror";
import { Icon } from "@/components/ui/Villager";
import type { Choice, ClientState, MeView, RoundView } from "@/lib/game/types";
import { avatarOf, Pause, Title, Voice } from "./bits";

const CHOICES: readonly Choice[] = ["A", "B"];

/**
 * Spec 3: two big buttons, A and B. Each is a hand mirror holding its answer, so a group can play without
 * a big screen. Both mirrors are identical in every way but the words; tilt follows the slot, never the truth.
 */
export function VotePad({
  state,
  round,
  me,
  onVote,
}: {
  state: ClientState;
  round: RoundView;
  me: MeView;
  onVote: (choice: Choice) => void;
}) {
  const target = playerById(state, round.activeTargetId);
  const name = target?.name ?? "this villager";
  const timer = (
    <div className="card flex items-center px-4 py-3">
      <ClockTower deadline={state.deadline} totalSeconds={state.settings.voteSeconds} />
    </div>
  );

  if (round.activeTargetId === me.id) {
    return (
      <div className="flex flex-1 flex-col gap-5">
        {timer}
        <Pause
          art={<Icon id="mirror" className="size-28 -rotate-3" />}
          title="Your friends are deciding which one is really you."
          line="Keep a straight face."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      {timer}
      <div className="flex flex-col gap-1">
        <Voice>
          Chapter {roman(round.n)}: {round.prompt.text}
        </Voice>
        <Title className="break-words">
          Mirror, mirror, which one is really {name}?
        </Title>
      </div>

      <div className="flex flex-col gap-9 pt-6" role="group" aria-label={`Which answer is really ${name}`}>
        {CHOICES.map((c) => {
          const picked = me.vote === c;
          return (
            <button
              key={c}
              type="button"
              aria-pressed={picked}
              aria-label={`Answer ${c}: ${round.pair?.[c] ?? ""}`}
              onClick={() => {
                onVote(c);
              }}
              className={`relative w-full rounded-[26px] text-left transition duration-200 ease-out-quint active:translate-y-0.5 ${
                me.vote !== null && !picked ? "opacity-75" : ""
              }`}
              style={{ rotate: c === "A" ? "-1deg" : "1deg" }}
            >
              <span className={`block rounded-[26px] transition duration-200 ${picked ? "shadow-[0_0_0_5px_#fffaf0,0_0_0_10px_#963248]" : ""}`}>
                <Mirror label={c} text={round.pair?.[c] ?? null} ownerName={name} ownerAvatar={avatarOf(target?.avatar)} size="hand" />
              </span>
              {picked && (
                <span className="ribbon-wrap absolute -right-1.5 -top-5 z-[3] rotate-6">
                  <span className="ribbon px-6 py-1.5 font-sans text-[1.05rem] font-extrabold">Your pick</span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-center text-[0.95rem] font-semibold text-ink-soft">You can change your pick until time runs out.</p>
    </div>
  );
}

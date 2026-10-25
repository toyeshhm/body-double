import Image from "next/image";
import { playerById } from "@/components/ui/format";
import { PlaceLine } from "@/components/ui/Place";
import { Icon, Token } from "@/components/ui/Villager";
import type { ClientState, GroupPlan } from "@/lib/game/types";
import { Sparkle } from "./Sparkle";

/** The group poster. Spec 6e: no text in the image, so the title is always HTML on top. */
function Poster({ plan }: { plan: GroupPlan }) {
  return (
    <div className="st-lg relative aspect-[4/3] w-[min(100%,calc(40dvh*4/3))] overflow-hidden rounded-[18px] bg-night">
      {plan.posterUrl ? (
        <Image src={plan.posterUrl} alt="" fill unoptimized sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
      ) : (
        // ponytail: a sticker scene until Muse Image (M3) paints the real poster.
        <div aria-hidden="true" className="absolute inset-0" style={{ background: "radial-gradient(60% 55% at 50% 60%, rgba(242,214,128,.42), #263a55 70%)" }}>
          <Sparkle className="absolute left-[12%] top-[14%] w-7 animate-twinkle text-gold-light" />
          <Sparkle className="absolute right-[18%] top-[10%] w-5 animate-twinkle text-gold-light [animation-delay:.7s]" />
          <Sparkle className="absolute right-[10%] top-[36%] w-4 animate-twinkle text-blue [animation-delay:1.3s]" />
          <Icon id="castle" className="absolute bottom-[26%] left-1/2 w-[34%] -translate-x-1/2" />
          <Icon id="tree" className="absolute bottom-[14%] left-[6%] w-[24%] -rotate-3" />
          <Icon id="lantern" className="absolute bottom-[18%] right-[12%] w-[13%] rotate-6" />
          <Icon id="cottage" className="absolute bottom-[10%] right-[26%] w-[18%]" />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-night via-night/80 to-transparent px-5 pb-4 pt-14">
        <p className="font-display text-[clamp(1.6rem,2.6vw,2.6rem)] font-bold leading-tight text-paper-cut [font-variation-settings:'SOFT'_100]">{plan.title}</p>
      </div>
    </div>
  );
}

export function Quests({ state }: { state: ClientState }) {
  const plans = state.plans;
  if (!plans) {
    return <p className="voice m-auto text-[1.8rem] text-ink-soft">The Wolf is reading everything you wrote...</p>;
  }
  return (
    <div className="grid flex-1 items-start gap-x-[clamp(28px,4vw,64px)] gap-y-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.85fr)]">
      <div className="min-w-0">
        <div className="flex items-center gap-5">
          <Icon id="lamp" cut="lg" className="w-[clamp(3.8rem,min(7.5vw,11vh),6.5rem)] -rotate-6" />
          <div>
            <h2 className="cut-letters text-[clamp(2.6rem,min(5.4vw,8.5vh),5rem)]">Quests</h2>
            <p className="voice mt-1 text-[clamp(1.1rem,1.5vw,1.4rem)] text-ink-soft [@media(max-height:820px)]:hidden">The lamp grants the village three wishes. Make them come true this week.</p>
          </div>
        </div>
        <div className="mt-[clamp(12px,2.2vh,24px)] space-y-[clamp(9px,1.5vh,20px)]">
          {plans.pairPlans.map((q, i) => {
            const a = playerById(state, q.a);
            const b = playerById(state, q.b);
            return (
              <article key={`${q.a}-${q.b}`} className={`card px-[clamp(16px,1.8vw,26px)] py-[clamp(9px,min(1.6vw,1.7vh),22px)] ${i % 2 === 0 ? "-rotate-[0.8deg]" : "rotate-[0.8deg]"}`}>
                <div className="flex items-center gap-3">
                  <span className="flex shrink-0">
                    {a && <Token player={a} size="sm" className="size-12" />}
                    {b && <Token player={b} size="sm" className="-ml-4 size-12" />}
                  </span>
                  <h3 className="font-display text-[clamp(1.3rem,1.7vw,1.7rem)] font-bold leading-tight [font-variation-settings:'SOFT'_100]">
                    Clear the path: {a?.name ?? "a villager"} &amp; {b?.name ?? "a villager"}
                  </h3>
                </div>
                <p className="mt-2 text-[clamp(1.1rem,1.35vw,1.3rem)] font-semibold leading-snug">{q.plan}</p>
                {q.place && <PlaceLine place={q.place} className="mt-2 text-[clamp(1rem,1.2vw,1.2rem)]" />}
                <p className="voice mt-1.5 text-[clamp(1rem,1.2vw,1.15rem)] text-ink-soft [@media(max-height:960px)]:hidden">
                  Shared interest: {q.sharedInterest}. {q.why}
                </p>
              </article>
            );
          })}
        </div>
      </div>
      <aside className="min-w-0 space-y-5">
        <h3 className="voice text-[clamp(1.4rem,1.9vw,1.9rem)] text-gold-text">The village quest</h3>
        <Poster plan={plans.groupPlan} />
        <p className="text-[clamp(1.15rem,1.5vw,1.45rem)] font-semibold leading-snug">{plans.groupPlan.plan}</p>
        {plans.groupPlan.place && <PlaceLine place={plans.groupPlan.place} className="text-[clamp(1.05rem,1.3vw,1.3rem)]" />}
        <p className="voice text-[clamp(1.05rem,1.3vw,1.25rem)] text-ink-soft [@media(max-height:760px)]:hidden">{plans.groupPlan.why}</p>
      </aside>
    </div>
  );
}

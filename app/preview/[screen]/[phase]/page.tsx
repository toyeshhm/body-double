import { notFound } from "next/navigation";
import { Preview } from "@/components/dev/Preview";
import { SCENARIO_PHASES, scenario } from "@/lib/dev/scenario";
import { viewFor } from "@/lib/game/view";

export const dynamic = "force-dynamic";

/**
 * Dev-only screen previews: /preview/host/REVEAL, /preview/phone/VOTING?as=jordan, /preview/phone/JOIN, add &long=1 for long answers.
 * Maya is always the target; view a phone as maya (target) or jordan/priya/sam/theo (voters).
 */
export default function PreviewPage({ params, searchParams }: { params: { screen: string; phase: string }; searchParams: { as?: string; long?: string } }) {
  if (process.env.NODE_ENV === "production") notFound();
  const phase = SCENARIO_PHASES.find((p) => p === params.phase.toUpperCase());
  const screen = params.screen === "host" || params.screen === "phone" ? params.screen : null;
  if (!screen || (!phase && params.phase.toUpperCase() !== "JOIN")) notFound();
  if (!phase) return <Preview screen="phone" join />;
  const { room, ids } = scenario(phase, searchParams.long === "1");
  const viewer = screen === "host" ? null : (ids[searchParams.as ?? "maya"] ?? null);
  return <Preview screen={screen} state={viewFor(room, viewer, "http://bodydouble.tech", 1)} />;
}

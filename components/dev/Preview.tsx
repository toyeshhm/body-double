"use client";
import { HostScreen } from "@/components/host/HostScreen";
import { JoinForm } from "@/components/play/JoinForm";
import { PlayScreen } from "@/components/play/PlayScreen";
import type { ClientState } from "@/lib/game/types";

const noop = (): void => undefined;

/** Renders one real screen from a scenario state, with every action disabled (dev previews only). */
export function Preview(props: { screen: "host" | "phone"; state?: ClientState; join?: boolean }) {
  if (props.join) return <JoinForm code="HXQR" error={null} busy={false} onJoin={noop} />;
  if (!props.state) return null;
  // Freeze timed phases at a readable value instead of counting down from the server's real deadline.
  const state = { ...props.state, deadline: props.state.deadline === null ? null : Date.now() + 14_000 };
  return props.screen === "host" ? (
    <HostScreen state={state} onNext={noop} onStart={noop} onSettings={noop} onRestart={noop} />
  ) : (
    <PlayScreen state={state} connected send={noop} />
  );
}

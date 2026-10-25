"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/Villager";
import { AVATARS, ROLES, type Avatar, type Role } from "@/lib/game/types";
import { Dock } from "./bits";
import type { Identity } from "./identity";

/** Spoken names for the 16 tokens (screen readers and the "You'll be..." line). */
const TOKEN_NAMES: Record<Avatar, string> = {
  potion: "Potion",
  "eat-me": "Eat Me Cake",
  lamp: "Wishing Lamp",
  slipper: "Glass Slipper",
  mirror: "Magic Mirror",
  tree: "Enchanted Tree",
  apple: "Poison Apple",
  spindle: "Spindle",
  "frog-prince": "Frog Prince",
  pumpkin: "Pumpkin",
  "golden-egg": "Golden Egg",
  beanstalk: "Beanstalk",
  "crystal-ball": "Crystal Ball",
  "red-hood": "Red Hood",
  wand: "Wand",
  key: "Golden Key",
};

const TILTS = ["-rotate-[5deg]", "rotate-[4deg]", "rotate-0"] as const;

export function JoinForm({
  code,
  error,
  busy,
  onJoin,
}: {
  code: string;
  error: string | null;
  busy: boolean;
  onJoin: (identity: Identity) => void;
}) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<Avatar>("slipper");
  const [role, setRole] = useState<Role>(ROLES[0]);
  const trimmed = name.trim();

  return (
    <form
      className="relative z-[2] mx-auto flex min-h-dvh w-full max-w-[30rem] flex-col gap-6 overflow-x-clip px-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (trimmed) onJoin({ name: trimmed, avatar, role });
      }}
    >
      <div className="flex items-center justify-between gap-3 pt-[max(0.6rem,env(safe-area-inset-top))]">
        <span className="brand text-[1.2rem]">
          Body <b>Double</b>
        </span>
        <span className="code-chip" aria-label={`Village ${code}`}>
          <small className="voice text-[0.8rem] text-[#e9dcb8]" aria-hidden="true">
            Village
          </small>
          <span className="foil text-[1.2rem] tracking-[0.06em]" aria-hidden="true">
            {code}
          </span>
        </span>
      </div>

      <h1 className="cut-letters text-[2.6rem]">Enter the village</h1>

      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="text-[0.95rem] font-bold text-ink-soft">
          Your name
        </label>
        <input
          id="name"
          className="field"
          value={name}
          onChange={(e) => {
            setName(e.target.value.slice(0, 20));
          }}
          maxLength={20}
          autoComplete="nickname"
          autoCapitalize="words"
          enterKeyHint="go"
          placeholder="What your friends call you"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "join-error" : undefined}
        />
        {error && (
          <p id="join-error" role="alert" className="text-[0.95rem] font-bold text-rasp-deep">
            {error}
          </p>
        )}
      </div>

      <fieldset>
        <legend className="mb-1 text-[0.95rem] font-bold text-ink-soft">Pick your token</legend>
        <div className="grid grid-cols-4 gap-y-1">
          {AVATARS.map((a, i) => (
            <label key={a} className="relative grid h-[4.75rem] cursor-pointer place-items-center">
              <input
                type="radio"
                name="avatar"
                value={a}
                checked={avatar === a}
                onChange={() => {
                  setAvatar(a);
                }}
                className="peer sr-only"
              />
              {/* the gold medallion behind the chosen token */}
              <span
                aria-hidden="true"
                className="absolute size-[4.4rem] scale-75 rounded-full bg-gold opacity-0 transition duration-200 ease-out-quint peer-checked:scale-100 peer-checked:opacity-100"
                style={{ boxShadow: "inset -4px -5px 0 #b88d40, inset 3px 3px 0 #f2db94, 0 0 0 4px #fffaf0, 0 4px 8px 4px rgba(74,50,32,.2)" }}
              />
              <span className="absolute size-[4.4rem] rounded-full peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-rasp-deep" />
              <Icon
                id={a}
                cut="sm"
                alt={TOKEN_NAMES[a]}
                className={`relative size-[3.6rem] transition duration-200 ease-out-quint peer-checked:size-[3.9rem] ${TILTS[i % 3] ?? ""}`}
              />
              {avatar === a && (
                <span aria-hidden="true" className="st-sm absolute right-1 top-0 grid size-6 place-items-center rounded-full bg-rasp-deep text-paper-cut">
                  <svg viewBox="0 0 12 12" className="size-3.5">
                    <path d="M2 6.5 L5 9 L10 3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
            </label>
          ))}
        </div>
        <p className="voice mt-1 text-center text-[1rem] text-gold-text">You&rsquo;ll be the {TOKEN_NAMES[avatar]}</p>
      </fieldset>

      <fieldset>
        <legend className="mb-2.5 text-[0.95rem] font-bold text-ink-soft">
          Your role in the tale <span className="font-medium">(just for fun)</span>
        </legend>
        <div className="grid grid-cols-3 gap-2.5">
          {ROLES.map((r, i) => (
            <label key={r} className={`cursor-pointer ${i % 2 === 1 ? "rotate-[1.2deg]" : i % 3 === 2 ? "-rotate-[1.4deg]" : ""}`}>
              <input
                type="radio"
                name="role"
                value={r}
                checked={role === r}
                onChange={() => {
                  setRole(r);
                }}
                className="peer sr-only"
              />
              <span className="chip peer-checked:bg-rasp-deep peer-checked:text-paper-cut peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-rasp-deep">
                {r}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Dock>
        <button type="submit" className="btn btn-primary w-full text-[1.15rem]" disabled={!trimmed || busy}>
          {busy ? "Opening the gate..." : "Enter the village"}
        </button>
        <p className="mt-3 text-center text-[0.85rem] font-medium text-ink-soft">18+ only. Everything is deleted when the game ends.</p>
      </Dock>
    </form>
  );
}

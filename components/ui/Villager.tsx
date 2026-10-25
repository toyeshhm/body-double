import type { Avatar, PublicPlayer } from "@/lib/game/types";
import { AVATARS } from "@/lib/game/types";

/** Story and UI icons from the fantasy kit (public/art/icons). Avatars are the other 16. */
export const STORY_ICONS = [
  "wolf",
  "clock-tower",
  "castle",
  "scroll",
  "quill",
  "map",
  "crown",
  "lantern",
  "cottage",
  "storybook",
  "sparkles",
  "cracked-mirror",
] as const;

const CUT = { none: "", sm: "st-sm", md: "st", lg: "st-lg" } as const;

/** One kit icon as a die-cut sticker. Decorative by default; pass `alt` when it carries meaning. */
export function Icon({
  id,
  cut = "md",
  alt = "",
  className = "",
}: {
  id: Avatar | (typeof STORY_ICONS)[number];
  cut?: keyof typeof CUT;
  alt?: string;
  className?: string;
}) {
  return <img src={`/art/icons/${id}.svg`} alt={alt} draggable={false} className={`select-none ${CUT[cut]} ${className}`} />;
}

/** Old saves or bad data fall back to a neutral token instead of a broken image. */
function tokenOf(avatar: string): Avatar {
  return AVATARS.find((a) => a === avatar) ?? "key";
}

const SIZES = { sm: "size-10", md: "size-16", lg: "size-24", xl: "size-36", hero: "size-[clamp(9rem,15vw,14rem)]" } as const;

/** A player's fairy-tale token: dimmed while their phone is away, with a raspberry check when they've acted. */
export function Token({
  player,
  size = "md",
  tick = false,
  className = "",
}: {
  player: Pick<PublicPlayer, "avatar" | "name" | "connected">;
  size?: keyof typeof SIZES;
  tick?: boolean;
  className?: string;
}) {
  return (
    <span className={`relative inline-block shrink-0 ${SIZES[size]} ${player.connected ? "" : "opacity-45 grayscale"} ${className}`}>
      <Icon id={tokenOf(player.avatar)} cut={size === "sm" ? "sm" : "md"} className="size-full" />
      {tick && (
        <span className="st-sm absolute -bottom-1 -right-1 grid size-[38%] min-h-5 min-w-5 place-items-center rounded-full bg-rasp-deep text-paper-cut">
          <svg viewBox="0 0 12 12" className="size-[55%]" aria-hidden="true">
            <path d="M2 6.5 L5 9 L10 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </span>
  );
}

/** Token with a punched name tag: "Maya / the bard". */
export function Villager({
  player,
  size = "md",
  tick = false,
  showRole = true,
}: {
  player: PublicPlayer;
  size?: keyof typeof SIZES;
  tick?: boolean;
  showRole?: boolean;
}) {
  return (
    <figure className="flex w-min min-w-[5.5rem] flex-col items-center gap-2 text-center">
      <Token player={player} size={size} tick={tick} />
      <figcaption className="tag w-full min-w-[5.5rem] leading-tight">
        <span className="block max-w-[10rem] truncate font-display text-[1.15rem] font-semibold text-ink" style={{ fontVariationSettings: '"SOFT" 100' }}>
          {player.name}
          {player.isBot && <span className="ml-1 align-middle font-sans text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">bot</span>}
        </span>
        {showRole && <span className="block text-[0.9rem] font-semibold text-ink-soft">the {player.role}</span>}
      </figcaption>
    </figure>
  );
}

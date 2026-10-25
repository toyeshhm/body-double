// Shared by the Socket.IO server and the browser. Keep it free of Node-only imports.

export const PHASES = [
  "LOBBY",
  "WARMUP",
  "PROMPT",
  "ANSWERING",
  "GENERATING",
  "VOTING",
  "REVEAL",
  "TELLS",
  "MAP",
  "NOTEBOOK",
  "PLANS",
  "RECAP",
  "ENDED",
] as const;
export type Phase = (typeof PHASES)[number];

/** Phases that belong to a round (ROUND = PROMPT -> ANSWERING -> GENERATING -> VOTING -> REVEAL -> TELLS). */
export const ROUND_PHASES: readonly Phase[] = ["PROMPT", "ANSWERING", "GENERATING", "VOTING", "REVEAL", "TELLS"];

export const ROLES = ["woodcutter", "baker", "bard", "knight", "witch", "fairy"] as const;
export type Role = (typeof ROLES)[number];

/** Fairy-tale tokens players pick instead of an emoji. Each id is an SVG at /art/icons/<id>.svg. */
export const AVATARS = [
  "potion", "eat-me", "lamp", "slipper", "mirror", "tree", "apple", "spindle",
  "frog-prince", "pumpkin", "golden-egg", "beanstalk", "crystal-ball", "red-hood", "wand", "key",
] as const;
export type Avatar = (typeof AVATARS)[number];

export type Choice = "A" | "B";
export type SlotKind = "real" | "fake";

export type PromptTag = "interest" | "habit" | "opinion" | "texting" | "hypothetical" | "story";
export type Prompt = { id: string; text: string; tags: readonly PromptTag[] };

export type StyleProfile = {
  avgLength: number;
  casing: "lower" | "sentence" | "mixed";
  usesEmoji: boolean;
  emojiExamples: string[];
  punctuation: string;
  slang: string[];
  humor: string;
  interests: string[];
  caughtTells: string[];
};

export type Player = {
  id: string;
  name: string;
  avatar: string;
  role: Role;
  isBot: boolean;
  /** Secret the phone sends with every request. Never leaves the server except to that phone. */
  key: string;
  /** Last poll from this phone (epoch ms). Players silent for a while stop holding up the round. */
  lastSeen: number;
  consented: boolean;
  canBeTarget: boolean;
  score: number;
  /** Spoken answers sent to speech-to-text this game, capped so one phone can't burn the AI credits. */
  voiceUses: number;
  answers: { promptId: string; text: string; round: number }[];
  style: StyleProfile;
};

export type Round = {
  n: number;
  prompt: Prompt;
  targetIds: string[];
  /** Index into targetIds: with 7+ players two targets go back to back on the same prompt. */
  active: number;
  /** Said out loud on the host screen when the target was chosen on purpose. */
  targetReason: string | null;
  answers: Record<string, string>;
  fakes: Record<string, string>;
  slots: Record<string, Record<Choice, SlotKind>>;
  votes: Record<string, Record<string, Choice>>; // targetId -> voterId -> choice
  tells: Record<string, string[]>;
  vetoed: string[]; // targets who pressed "Not me"
};

export type Settings = {
  rounds: number;
  answerSeconds: number;
  voteSeconds: number;
  demoMode: boolean;
};

/** A real spot for a quest: SerpApi's Google Maps search near UT Austin (lib/ai/places.ts). */
export type Place = { name: string; address: string; rating: number | null; reviews: number | null; openState: string | null; mapsUrl: string };

export type PairPlan = {
  a: string;
  b: string;
  why: string;
  sharedInterest: string;
  evidence: string[];
  plan: string;
  /** What to search Maps for ("climbing gym"). Never names or answers. Null when the plan needs no place. */
  placeQuery: string | null;
  /** Filled in by the background lookup after the plans land; null until then, or if nothing fits. */
  place: Place | null;
};
export type GroupPlan = {
  title: string;
  why: string;
  plan: string;
  posterPrompt: string;
  posterUrl: string | null;
  placeQuery: string | null;
  place: Place | null;
};
export type Plans = {
  pairPlans: PairPlan[];
  groupPlan: GroupPlan;
  superlatives: { title: string; playerId: string }[];
};
export type Recap = { title: string; story: string };

/** A demo bot's next move, run by tick() once `at` has passed (no timers: the server may be serverless). */
export type BotMove = { at: number; botId: string; phase: Phase; round: number };

export type Room = {
  code: string;
  hostKey: string;
  phase: Phase;
  players: Record<string, Player>;
  warmup: Prompt[];
  rounds: Round[];
  settings: Settings;
  knows: Record<string, Record<string, { correct: number; total: number }>>; // voter -> target
  wolf: { fooled: number; total: number };
  /** Spoken answers sent to speech-to-text in this room, all players together (see voiceUses on Player). */
  voiceUses: number;
  usedTargets: string[];
  usedPrompts: string[];
  plans: Plans | null;
  recap: Recap | null;
  /** Epoch ms (server clock) when the current phase auto-advances, or null when the host drives it. */
  deadline: number | null;
  botQueue: BotMove[];
  createdAt: number;
  lastActive: number;
};

// ---- What clients receive (room:state). Never contains which slot is real before REVEAL,
// ---- and a phone never gets another player's style profile (the host's notebook shows every page at the end).

export type PublicPlayer = Pick<Player, "id" | "name" | "avatar" | "role" | "score" | "isBot" | "consented" | "canBeTarget"> & {
  connected: boolean;
  answered: boolean;
  voted: boolean;
};

/** The two answers shown for the active target. A fake hidden by "Not me" comes through as null. */
export type PairView = { targetId: string; A: string | null; B: string | null; vetoed: boolean };

export type RevealView = { targetId: string; real: Choice; votes: Record<Choice, string[]> };

export type RoundView = {
  n: number;
  total: number;
  prompt: Prompt;
  targetIds: string[];
  activeTargetId: string | null;
  targetReason: string | null;
  pair: PairView | null;
  reveal: RevealView | null;
  tells: string[];
};

export type MapEdge = { a: string; b: string; score: number; samples: number };

/** One villager's page in the Wolf's notebook: what it learned, and how it did wearing their voice. */
export type NotebookPage = { playerId: string; style: StyleProfile; fooled: number; votes: number };
/** One fake the Wolf wrote, for the early-versus-late comparison. */
export type FakeSample = { round: number; targetId: string; question: string; real: string; fake: string; fooled: number; votes: number };
export type Notebook = { pages: NotebookPage[]; first: FakeSample | null; last: FakeSample | null };

export type MeView = {
  id: string;
  consented: boolean;
  canBeTarget: boolean;
  answeredPromptIds: string[];
  vote: Choice | null;
  style: StyleProfile;
};

export type ClientState = {
  /** Bumps on every saved change; clients send it back so unchanged polls cost nothing. */
  version: number;
  code: string;
  phase: Phase;
  joinUrl: string;
  settings: Settings;
  /** Server clock when this state was sent, so phones with a skewed clock can still count down correctly. */
  serverTime: number;
  deadline: number | null;
  players: PublicPlayer[];
  warmup: Prompt[];
  round: RoundView | null;
  edges: MapEdge[];
  wolf: { fooled: number; total: number };
  plans: Plans | null;
  recap: Recap | null;
  /** NOTEBOOK only. The host gets every page and both fakes; a phone gets only its own page. */
  notebook: Notebook | null;
  me: MeView | null;
};

# Body Double

**A party game where an AI Wolf learns to text like your friends, and the night ends with a plan to hang out.**

Play it: **https://body-double-hacktx.vercel.app** (open it on a TV or laptop, then everyone joins on their phone by scanning the QR code).

Built at HackTX 2026.

## How a game goes

1. **Gather the village.** The host opens the game on a big screen. Friends scan the QR code, pick a name and a storybook token, and agree to the rules (18+, everything deleted at the end).
2. **Warm up.** Everyone answers a few quick questions. The Wolf studies how each person writes: length, casing, emoji, slang, what they care about.
3. **Each chapter:** a question appears ("Your toxic trait, but make it cute"). Everyone answers by typing or speaking. For one player (two in groups of 7 or more), the Wolf writes a fake answer in their voice.
4. **The magic mirror.** The real answer and the Wolf's fake appear side by side. Everyone else votes on which one their friend really wrote.
5. **Reveal and tells.** The mirror shows the truth. Players who spotted the Wolf say what gave it away ("too many commas"). The Wolf remembers, and avoids it next time.
6. **The Wolf gets smarter.** From chapter 3 it goes after whoever the room knows least. From chapter 4 it also sees the room's answers and the tells that caught it.
7. **The forest map.** Every vote is a data point about who knows whom. The map draws it.
8. **The Wolf's notebook.** The Wolf shows its first fake next to its last one, with what it knew each time and how many it fooled, then reads its notes on each villager: interests, humor, slang, how they type, and the tell that caught it. Each phone shows only its owner's page.
9. **Quests.** The Wolf turns what it learned into real plans: one for each pair who barely know each other, built on things they actually wrote, plus a group plan with an illustrated poster.
10. **The tale.** A recap story, village heroes, and a picture to save. Then the book closes and every answer is deleted.

## Where the AI is

The AI is the opponent, not a feature bolted on. Without it there is no game.

| Job | Model | Where |
|---|---|---|
| Write the fake, in two passes: content in the friend's voice, then their exact texting style | Muse (`muse-spark-1.3`), Gemini fallback | `lib/ai/prompts.ts` `writeFake` |
| Learn each player's style profile (humor, slang, punctuation, interests) | Gemini (`gemini-2.5-flash`), Muse fallback | `learnStyle` |
| Moderate every answer before anyone sees it | Gemini, Muse fallback | `moderate` |
| Turn the friendship map into pair quests and a group plan, citing real answers | Muse | `writePlans` |
| Paint the group poster | Muse (`muse-image-1.0`), Gemini fallback | `paintPoster` |
| Write the recap story | Muse | `writeRecap` |
| Turn a spoken answer into text | Muse Voice Transcribe, Gemini fallback | `transcribe` in `lib/ai/provider.ts` |

Difficulty rises each chapter. Chapter 1 sees warmup answers only. Chapters 2 and 3 add every earlier answer and the style profile. Chapter 4 and later add the tells that caught it and the other players' answers, so the fake fits the room.

If every model is down, the game still plays: fakes, plans and the recap fall back to simple stubs, and no screen ever waits on the AI.

## Is the Wolf getting smarter? (Tiger Data)

Every revealed vote becomes one anonymous row: the time, the chapter, and whether the Wolf fooled the voter. No names, no answers, no room code. Those rows live in a TimescaleDB hypertable on Tiger Cloud, and a continuous aggregate rolls them into 15-minute buckets. The landing page and the host's recap show the fooled rate per chapter across every village that night: if the Wolf is learning, the line climbs.

Live rooms are stored in the same database, one row per village, deleted when the tale ends and swept after 2 hours idle.

Spoken answers are capped three ways so nobody can drain the AI credits: 20 per player and 120 per room each game, and 300 a night across every game. The nightly count is one Tiger row per day, taken in a single statement so parallel games can't overshoot.

## Privacy

- 18+ only, with clear consent at join.
- Answers exist only while the game runs. When the tale ends, players, answers, votes and plans are wiped from the room.
- The vote time series is anonymous by design.
- Prompts, answers, model output, audio and transcripts are never logged.
- Fakes are only ever shown as the Wolf's words, never as a quote from a player.
- A player can veto a fake written in their voice with "Not me", which hides it from the board.

## Stack

- **App:** Next.js 14 (App Router), React 18, TypeScript (strict), Tailwind CSS. Hand-drawn SVG art and the Storybook Stickers design system live in `public/art` and `app/globals.css`.
- **Realtime:** serverless-friendly polling. Every request runs a timer-free state machine (`lib/game/machine.ts`); deadlines and bot moves are stored on the room and applied on the next request. Optimistic versioning keeps concurrent votes from clobbering each other.
- **Data:** Postgres on Tiger Cloud via `DATABASE_URL` (`lib/game/db.ts`, `lib/game/metrics.ts`). With no database set, everything runs in memory.
- **AI:** Muse (OpenAI-compatible API) and Gemini (native `generateContent`), behind one adapter with fallback and a 12 second timeout (`lib/ai/provider.ts`).
- **Hosting:** Vercel.

## Run it locally

```bash
npm install
cp .env.example .env.local   # add MUSE_API_KEY and/or GEMINI_API_KEY; leave DATABASE_URL blank for in-memory
npm run dev
```

Open http://localhost:3000 on your laptop. Phones on the same Wi-Fi can join through the QR code (the dev server listens on your LAN address). Turn on **Demo mode** in the rules to add three bot villagers, so you can play the whole game alone.

## Tests

```bash
make check      # eslint (strict), tsc, then the integration tests
npm run test:ai # live tests against the real models (uses credits)
```

The integration tests drive the real API route handlers through every phase with no mocks. They run without any AI key on purpose, to prove the game never depends on a model answering.

## Layout

```
app/            pages and API routes (rooms, join, transcribe, curve)
components/     host/ (big screen), play/ (phone), ui/ (shared)
lib/game/       state machine, store, database, metrics, the Wolf's background work
lib/ai/         model adapter, prompts, WAV encoding
data/prompts.ts the question deck
tests/          integration tests (tests/live: real model calls)
```

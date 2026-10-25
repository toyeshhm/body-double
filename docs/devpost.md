# Devpost submission: Body Double

Paste each section into the matching Devpost field. Links to fill in before submitting are marked TODO.

- **Tagline (60 chars):** An AI Wolf learns to text like your friends. Can you tell?
- **Try it:** https://body-double-hacktx.vercel.app
- **Code:** https://github.com/toyeshhm/body-double (make it public before submitting)
- **Demo video:** TODO (2 to 3 minutes, see docs/demo-script.md)
- **Tracks:** Meta (main), Tiger Data, Gemini, Most Entertaining, Best Overall

---

## Inspiration

Most party games end with a scoreboard. You laugh, you go home, and nothing changes between the people in the room.

We wanted a game where the fun part produces something useful: a clear picture of who in the group actually knows each other, and a reason to hang out again. "Spot the AI" games already exist. Ours ends with a plan.

## What it does

Body Double is a storybook party game for a room of friends (best with 4 to 10): one big screen, everyone else on their phone.

- **The Wolf learns your voice.** Everyone answers a few warmup questions. The AI Wolf studies how each person writes: length, casing, emoji, slang, humor, interests.
- **Each chapter, it wears someone's words.** A question goes up. Everyone answers, by typing or speaking. The Wolf writes a fake answer in one player's voice, and the magic mirror shows both side by side. Everyone else votes on which one their friend really wrote.
- **It learns from getting caught.** After the reveal, players who spotted the fake say what gave it away ("too many commas"). The Wolf avoids those tells next time. From chapter 3 it targets whoever the room knows least: "The Wolf noticed nobody really knows Maya yet."
- **Every vote maps the friendships.** A correct vote means you know that person's voice. The forest map draws who knows whom.
- **The Wolf opens its notebook.** Its first fake sits next to its last, with what it knew each time and how many it fooled, under a headline like "It learned. Chapter I fooled 50% of you. Chapter IV fooled 75%." Then it reads its notes on each of you.
- **The night ends with quests.** The Wolf turns the map into real plans: one for each pair who barely know each other, built on things they actually wrote ("you both mentioned late-night tacos"), plus a group plan with an illustrated poster.
- **Then it forgets everything.** A recap story and a picture to save, and every answer is deleted.

## Role of AI

The AI is the opponent. Without it there is no game.

1. **Muse writes the Wolf's fakes** in two passes: first what this specific friend would say, then a rewrite into their exact texting style. Difficulty climbs each chapter as it sees more of their answers, their style profile, the tells that caught it, and the room's answers.
2. **Gemini is the Wolf's ears.** It moderates every answer before anyone sees it, and builds each player's style profile from what they write.
3. **Muse plans the hangouts.** It reads the friendship map and writes pair quests that must quote real answers as evidence, a group plan, and a poster prompt that Muse Image paints.
4. **Muse Voice turns spoken answers into text,** so players can talk instead of type.

Each model falls back to the other, and if both are down the game still plays with simple stubs. Players can veto any fake written in their voice, fakes are never shown as a player's quote, and nothing players write is logged or kept after the game.

## How we built it

- **Next.js 14, React, TypeScript (strict), Tailwind** on **Vercel.** Phones and the host screen stay in sync by polling a serverless API. The game is a timer-free state machine: deadlines and bot moves are stored on the room and applied on the next request, so nothing needs a long-running server. Optimistic versioning keeps a room full of simultaneous votes consistent.
- **Tiger Data (TimescaleDB on Tiger Cloud)** stores live rooms and an anonymous time series of every vote (time, chapter, fooled or not). A hypertable with a continuous aggregate powers the live "Is the Wolf getting smarter?" chart: the fooled rate per chapter across every village that night.
- **Muse** (text, image, voice transcription) and **Gemini 2.5 Flash** sit behind one adapter with a 12 second timeout and automatic fallback.
- **Design:** we didn't want it to look AI-generated. The Storybook Stickers style uses die-cut sticker SVG filters, gold foil, Fraunces and Figtree type, and 28 hand-built fantasy icons. The vote happens in a magic mirror, and timers are clock towers.
- **Tests:** integration tests drive the real API routes through every phase with no mocks and no AI keys, to prove the game never waits on a model.

## Challenges we ran into

- **Realtime without a server.** We started with Socket.IO, then moved to serverless polling with a timer-free state machine so the whole game runs on Vercel functions.
- **Making the fake hard to spot.** A single prompt sounded generic. Splitting it into a content pass and a style pass, then fixing casing, emoji, punctuation and length in code, made fakes much harder to catch.
- **Phones record in different formats.** Muse Voice needs 16 kHz mono WAV. We decode and re-encode in the browser before uploading.
- **Fitting a projector.** The big-screen layouts are sized to fit projectors and TVs from 720p up without scrolling.

## Accomplishments that we're proud of

- A full game, playable by real groups on real phones, in one weekend.
- A Wolf that measurably adapts, with a live curve to prove it.
- An ending that sends people off with a plan, not a score.
- Privacy by design: consent at join, a veto on fakes, an anonymous vote log, and everything deleted at the end.

## What we learned

- The second AI pass (style) matters more than the first (content). People spot a friend's voice through punctuation and length before meaning.
- Time series fit "is the AI learning?" questions well: an anonymous event per vote and a continuous aggregate answer it without storing anything personal.

## What's next

- Real places in the quests: attach a nearby venue, hours and a calendar invite to each plan.
- Remote play for friends in different cities.

## Built with

nextjs, react, typescript, tailwindcss, vercel, tiger-data, timescaledb, postgresql, muse, meta-ai, gemini, html-to-image, zod

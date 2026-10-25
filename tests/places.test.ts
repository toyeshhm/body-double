// Quest places from real saved SerpApi replies (tests/fixtures/serpapi-*.json). tests/live/places.test.ts makes a real call.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { findPlace, pickPlace } from "../lib/ai/places";
import { NIGHTLY, takeBudget } from "../lib/game/budget";

const fixture = (name: string): unknown => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8")) as unknown;
const maps = fixture("serpapi-maps.json") as { local_results: unknown[] };

void test("pickPlace takes the most relevant well-reviewed spot from a list, or the one named place", () => {
  const gym = pickPlace(maps);
  assert.equal(gym?.name, "Bouldering Project - Springdale");
  assert.equal(gym.rating, 4.8);
  assert.match(gym.mapsUrl, /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=.+&query_place_id=ChIJ/);

  const [first, second, third] = maps.local_results;
  assert.equal(pickPlace({ local_results: [third, second, first] })?.name, "Crux Climbing Center Central - Yoga & Fitness", "2 reviews isn't enough to trust");

  const park = pickPlace(fixture("serpapi-place.json"));
  assert.deepEqual([park?.name, park?.address, park?.reviews], ["Zilker Metropolitan Park", "Austin, TX 78746", 6328]);

  for (const nothing of [{}, { local_results: [] }, { error: "Google hasn't returned any results" }, null]) assert.equal(pickPlace(nothing), null);
});

void test("no key, no search; and tonight's place budget holds", async () => {
  const key = process.env.SERPAPI_API_KEY;
  delete process.env.SERPAPI_API_KEY;
  assert.equal(await findPlace("climbing gym"), null);
  if (key) process.env.SERPAPI_API_KEY = key;

  let taken = 0;
  while (await takeBudget("places")) taken++;
  assert.equal(taken, NIGHTLY.places, "a fresh night allows exactly the cap");
  assert.equal(await takeBudget("places"), false);
});

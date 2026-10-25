// One real SerpApi search (costs a search from the account). Run with npm run test:ai.
import assert from "node:assert/strict";
import { test } from "node:test";
import { findPlace } from "../../lib/ai/places";

void test("a real Maps search near UT Austin returns a rated place with a Maps link", async () => {
  assert.ok(process.env.SERPAPI_API_KEY, "SERPAPI_API_KEY must be set in .env.local");
  const place = await findPlace("late night tacos");
  assert.ok(place, "SerpApi found a place");
  assert.match(place.address, /Austin, TX/);
  assert.ok((place.rating ?? 0) >= 4);
  assert.match(place.mapsUrl, /query_place_id=/);
});

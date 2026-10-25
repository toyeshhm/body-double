import type { Place } from "@/lib/game/types";
import { Icon } from "./Villager";

/** "Bouldering Project · 979 Springdale Rd · ★ 4.8 (1,922)": name, street, rating, review count. */
export function PlaceLine({ place, className = "" }: { place: Place; className?: string }) {
  const street = place.address.split(",")[0] ?? place.address;
  const rating = place.rating === null ? "" : ` · ★ ${place.rating.toFixed(1)}`;
  const reviews = place.reviews === null ? "" : ` (${place.reviews.toLocaleString("en-US")})`;
  return (
    <p className={`flex items-start gap-2 leading-snug ${className}`}>
      <Icon id="map" className="mt-0.5 size-[1.4em] shrink-0" />
      <span className="min-w-0">
        <span className="font-bold text-ink">{place.name}</span>
        <span className="font-medium text-ink-soft">
          {` · ${street}${rating}${reviews}`}
        </span>
      </span>
    </p>
  );
}

/** Google Calendar's prefilled "new event" page: the player picks the day and time. */
function calendarUrl(title: string, details: string, place: Place): string {
  const q = new URLSearchParams({ action: "TEMPLATE", text: title, details, location: `${place.name}, ${place.address}` });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/** The phone's version: the place, then buttons to open it in Maps and to put the quest on a calendar. */
export function PlaceActions({ place, title, plan }: { place: Place; title: string; plan: string }) {
  const link = "btn btn-quiet min-h-11 flex-1 basis-[8.5rem] whitespace-nowrap px-3 text-[0.95rem]";
  return (
    <div className="mt-3">
      <PlaceLine place={place} className="text-[0.98rem]" />
      <div className="mt-3 flex flex-wrap gap-2">
        <a className={link} href={place.mapsUrl} target="_blank" rel="noopener noreferrer">
          Open in Maps
        </a>
        <a className={link} href={calendarUrl(title, plan, place)} target="_blank" rel="noopener noreferrer">
          Add to calendar
        </a>
      </div>
    </div>
  );
}

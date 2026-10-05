// Where a request came from, as coarsely as the host reports it. On Vercel
// every request carries headers naming the visitor's country, state and
// city, and the city's approximate coordinates, which Vercel works out from
// the IP address. Only those are stored; the IP address itself never is.
// Anywhere else (local development) the headers are absent and every field
// is null.
//
// Each check mirrors the CHECK constraint on the column it feeds (migration
// 0008). A value that failed one would make the whole insert fail and lose
// the event, so anything unexpected is dropped here instead.

export type Place = {
  // ISO 3166-1 alpha-2, e.g. "US".
  country: string | null;
  // The part of ISO 3166-2 after the dash, e.g. "FL".
  region: string | null;
  city: string | null;
  // The city's rough position, to one decimal place (about 11 km).
  lat: number | null;
  lon: number | null;
};

type HeaderReader = { get(name: string): string | null };

const NOWHERE: Place = {
  country: null,
  region: null,
  city: null,
  lat: null,
  lon: null,
};

// Vercel percent-encodes the city ("S%C3%A3o%20Paulo").
function cityName(raw: string | null): string | null {
  if (!raw) return null;
  let name: string;
  try {
    name = decodeURIComponent(raw);
  } catch {
    return null;
  }
  name = name
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 100);
  return name || null;
}

function coordinate(raw: string | null, limit: number): number | null {
  if (!raw) return null;
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value) || Math.abs(value) > limit) return null;
  return Math.round(value * 10) / 10;
}

export function placeFromHeaders(headers: HeaderReader): Place {
  const country = headers.get("x-vercel-ip-country")?.toUpperCase() ?? "";
  // No country means no usable location at all: a state or city without one
  // could not be placed.
  if (!/^[A-Z]{2}$/.test(country)) return NOWHERE;
  const region = headers.get("x-vercel-ip-country-region")?.toUpperCase() ?? "";
  return {
    country,
    region: /^[A-Z0-9]{1,3}$/.test(region) ? region : null,
    city: cityName(headers.get("x-vercel-ip-city")),
    lat: coordinate(headers.get("x-vercel-ip-latitude"), 90),
    lon: coordinate(headers.get("x-vercel-ip-longitude"), 180),
  };
}

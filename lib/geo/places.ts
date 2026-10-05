import regionNames from "./region-names.json";
import { projectPoint } from "./project";
import type { OverviewPlace } from "@/lib/types";

// Server-side only: region-names.json is about 90 KB, and the browser needs
// just the handful of names that appear in the data. This turns the rows the
// database returns into what the map component draws.

export type GeoPlace = {
  // Unique across all levels: "US", "US/FL", "US/FL/Miami".
  id: string;
  name: string;
  country: string;
  region: string | null;
  uniqueViews: number;
  uniqueClicks: number;
  signups: number;
  // Cities only: where the dot goes on the map drawing.
  x: number | null;
  y: number | null;
};

export type GeoCounts = Pick<
  GeoPlace,
  "uniqueViews" | "uniqueClicks" | "signups"
>;

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });

function countryName(code: string): string {
  try {
    return countryNames.of(code) ?? code;
  } catch {
    return code;
  }
}

function regionName(country: string, region: string): string {
  const names = regionNames as Record<string, Record<string, string>>;
  return names[country]?.[region] ?? region;
}

const counts = (p: OverviewPlace): GeoCounts => ({
  uniqueViews: p.unique_views,
  uniqueClicks: p.unique_clicks,
  signups: p.signups,
});

export function toGeoPlaces(overview: {
  countries: OverviewPlace[];
  regions: OverviewPlace[];
  cities: OverviewPlace[];
}): {
  countries: GeoPlace[];
  regions: GeoPlace[];
  cities: GeoPlace[];
  // Activity whose location is not known, if there is any.
  unlocated: GeoCounts | null;
} {
  const located = (
    p: OverviewPlace,
  ): p is OverviewPlace & { country: string } => p.country !== null;
  const nowhere = overview.countries.find((p) => p.country === null);

  return {
    countries: overview.countries.filter(located).map((p) => ({
      id: p.country,
      name: countryName(p.country),
      country: p.country,
      region: null,
      ...counts(p),
      x: null,
      y: null,
    })),
    regions: overview.regions.filter(located).map((p) => ({
      id: `${p.country}/${p.region ?? ""}`,
      name: p.region ? regionName(p.country, p.region) : "Region not known",
      country: p.country,
      region: p.region,
      ...counts(p),
      x: null,
      y: null,
    })),
    cities: overview.cities.filter(located).map((p) => {
      const point =
        p.lat !== null && p.lon !== null ? projectPoint(p.lon, p.lat) : null;
      return {
        id: `${p.country}/${p.region ?? ""}/${p.city ?? ""}`,
        name: p.city ?? "City not known",
        country: p.country,
        region: p.region,
        ...counts(p),
        x: point ? point[0] : null,
        y: point ? point[1] : null,
      };
    }),
    unlocated: nowhere ? counts(nowhere) : null,
  };
}

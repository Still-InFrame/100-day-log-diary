import {
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
  subDays,
} from "date-fns";

// The date range the admin overview covers. It lives in the URL, so a reload
// or a shared link keeps it and the page stays server-rendered:
//   (nothing)                       all time
//   ?range=7 | 30 | 90              the last N days, ending today
//   ?from=2026-10-01&to=2026-10-05  exact days, both included

// `days` counts back from today; null means everything on record.
export const PRESETS = [
  { id: "7", label: "7 days", days: 7 },
  { id: "30", label: "30 days", days: 30 },
  { id: "90", label: "90 days", days: 90 },
  { id: "all", label: "All time", days: null },
] as const;

export type PresetId = (typeof PRESETS)[number]["id"];

// All time, so the overview opens on the same totals as the Clicks tab.
export const DEFAULT_PRESET: PresetId = "all";

// The database draws at most this many days (see app_overview()).
const MAX_DAYS = 366;

export type OverviewRange = {
  // The preset in use; null when exact dates were typed in.
  preset: PresetId | null;
  // First day, yyyy-MM-dd; null means from the beginning.
  from: string | null;
  // Last day, included.
  to: string;
};

type Param = string | string[] | undefined;

const first = (value: Param) => (Array.isArray(value) ? value[0] : value);

// A real calendar day in yyyy-MM-dd, or null ("2026-02-31" is rejected).
function day(value: Param): string | null {
  const text = first(value);
  if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  return isValid(parseISO(text)) ? text : null;
}

const daysBefore = (isoDay: string, days: number) =>
  format(subDays(parseISO(isoDay), days), "yyyy-MM-dd");

// `today` is passed in (in the app's timezone) so "the last 7 days" ends on
// the same day the database thinks it is.
export function resolveRange(
  params: { range?: Param; from?: Param; to?: Param },
  today: string,
): OverviewRange {
  let from = day(params.from);
  let to = day(params.to);

  if (from || to) {
    // Typed dates are tidied, not rejected: backwards dates are swapped, a
    // future end becomes today, and an over-long range is cut to a year.
    // ISO days compare correctly as plain text.
    if (from && to && from > to) [from, to] = [to, from];
    if (!to || to > today) to = today;
    if (from && from > to) from = to;
    if (
      from &&
      differenceInCalendarDays(parseISO(to), parseISO(from)) > MAX_DAYS - 1
    ) {
      from = daysBefore(to, MAX_DAYS - 1);
    }
    return { preset: null, from, to };
  }

  const preset =
    PRESETS.find((p) => p.id === first(params.range)) ??
    PRESETS.find((p) => p.id === DEFAULT_PRESET)!;
  return {
    preset: preset.id,
    from: preset.days === null ? null : daysBefore(today, preset.days - 1),
    to: today,
  };
}

export function presetHref(basePath: string, id: PresetId): string {
  return id === DEFAULT_PRESET ? basePath : `${basePath}?range=${id}`;
}

import { differenceInCalendarDays, parseISO, format } from "date-fns";
import { DEFAULT_TIMEZONE } from "./constants";

// Returns yyyy-MM-dd for "today" in the given IANA timezone, defaulting to
// DEFAULT_TIMEZONE. Uses Intl.DateTimeFormat.formatToParts to stay stable
// across Node and browser runtimes (locale-prefixed formats like en-CA can
// vary in separator).
export function todayISO(timeZone: string = DEFAULT_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function dayNumberFor(date: string, startDate: string): number {
  return differenceInCalendarDays(parseISO(date), parseISO(startDate)) + 1;
}

export function formatLongDate(date: string): string {
  return format(parseISO(date), "EEEE, MMMM d, yyyy");
}

export function formatShortDate(date: string): string {
  return format(parseISO(date), "MMM d");
}

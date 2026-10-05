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

export function formatMediumDate(date: string): string {
  return format(parseISO(date), "MMM d, yyyy");
}

// Formats a full timestamp (e.g. a lead's created_at) in the app's timezone.
// Uses Intl with an explicit zone because server rendering runs in UTC.
export function formatDateTime(
  iso: string,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

// The same moment without the year, for tight table cells ("Oct 5, 1:45 AM").
export function formatDateTimeShort(
  iso: string,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

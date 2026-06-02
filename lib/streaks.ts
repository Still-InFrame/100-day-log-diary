import { differenceInCalendarDays, parseISO } from "date-fns";
import type { Entry } from "./types";
import { todayISO } from "./dates";

export type StreakInfo = {
  current: number;
  longest: number;
  loggedToday: boolean;
  totalLogged: number;
  missedDays: number;
};

export function computeStreaks(
  entries: Pick<Entry, "date">[],
  challengeStartDate: string,
): StreakInfo {
  const today = todayISO();
  const dates = new Set(entries.map((e) => e.date));
  const loggedToday = dates.has(today);
  const totalLogged = dates.size;

  const sorted = [...dates].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    if (prev && differenceInCalendarDays(parseISO(d), parseISO(prev)) === 1) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    prev = d;
  }

  let current = 0;
  let cursor = today;
  // If today not logged, streak can still be alive ending yesterday
  if (!loggedToday) {
    const yesterday = new Date(parseISO(today));
    yesterday.setDate(yesterday.getDate() - 1);
    cursor = yesterday.toISOString().slice(0, 10);
  }
  while (dates.has(cursor)) {
    current += 1;
    const prevDate = new Date(parseISO(cursor));
    prevDate.setDate(prevDate.getDate() - 1);
    cursor = prevDate.toISOString().slice(0, 10);
  }

  const daysSinceStart =
    differenceInCalendarDays(parseISO(today), parseISO(challengeStartDate)) + 1;
  const elapsed = Math.max(1, Math.min(daysSinceStart, 100));
  // Today is still in progress — don't count it as "missed" until the day is
  // over. Only fully-elapsed days (start..yesterday) are missable unless today
  // is already logged.
  const countableDays = loggedToday ? elapsed : elapsed - 1;
  const missedDays = Math.max(0, countableDays - totalLogged);

  return { current, longest, loggedToday, totalLogged, missedDays };
}

import type { BadgeType, Entry } from "./types";
import { computeStreaks } from "./streaks";

const DAY_BADGES: Array<{ threshold: number; type: BadgeType }> = [
  { threshold: 10, type: "day_10" },
  { threshold: 25, type: "day_25" },
  { threshold: 50, type: "day_50" },
  { threshold: 75, type: "day_75" },
  { threshold: 100, type: "day_100" },
];

const STREAK_BADGES: Array<{ threshold: number; type: BadgeType }> = [
  { threshold: 7, type: "streak_7" },
  { threshold: 30, type: "streak_30" },
  { threshold: 60, type: "streak_60" },
];

export function computeEarnedBadges(
  entries: Pick<Entry, "date" | "day_number">[],
  challengeStartDate: string,
): BadgeType[] {
  const earned: BadgeType[] = [];
  const maxDay = entries.reduce((m, e) => Math.max(m, e.day_number), 0);
  for (const { threshold, type } of DAY_BADGES) {
    if (maxDay >= threshold) earned.push(type);
  }

  const streaks = computeStreaks(entries, challengeStartDate);
  for (const { threshold, type } of STREAK_BADGES) {
    if (streaks.longest >= threshold) earned.push(type);
  }

  if (maxDay >= 100 && streaks.missedDays === 0) {
    earned.push("no_skip_100");
  }

  return earned;
}

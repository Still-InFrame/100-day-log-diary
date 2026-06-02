import { BADGE_META, type BadgeType } from "@/lib/types";

const ALL_BADGES: BadgeType[] = [
  "day_10",
  "day_25",
  "day_50",
  "day_75",
  "day_100",
  "streak_7",
  "streak_30",
  "streak_60",
  "no_skip_100",
];

export function TrophyCase({ earned }: { earned: Set<BadgeType> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {ALL_BADGES.map((b) => {
        const meta = BADGE_META[b];
        const got = earned.has(b);
        return (
          <div
            key={b}
            className={`flex items-center gap-3 rounded-lg border p-4 transition ${
              got
                ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950"
                : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            }`}
          >
            <div
              className={`text-3xl ${got ? "" : "opacity-30 grayscale"}`}
              aria-hidden
            >
              {meta.emoji}
            </div>
            <div className="min-w-0">
              <div className="font-medium">{meta.label}</div>
              <div className="text-xs text-zinc-500">{meta.description}</div>
              {!got && (
                <div className="mt-1 text-[10px] uppercase tracking-wide text-zinc-400">
                  Locked
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

import type { StreakInfo } from "@/lib/streaks";
import { TOTAL_DAYS } from "@/lib/constants";

export function StreakBanner({ streak }: { streak: StreakInfo }) {
  // Once every day is logged the challenge is over, so the live streak
  // (which counts back from today) would read 0 forever. Show that it was
  // finished instead.
  const complete = streak.totalLogged >= TOTAL_DAYS;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat
        label="Current streak"
        value={
          complete ? (
            // Slightly smaller on phones and never wrapped: at full size the
            // checkmark drops to a second line in the two-column layout.
            <span className="whitespace-nowrap text-xl sm:text-2xl">
              Complete ✓
            </span>
          ) : (
            `${streak.current} 🔥`
          )
        }
      />
      <Stat label="Longest streak" value={`${streak.longest}`} />
      <Stat label="Days logged" value={`${streak.totalLogged}`} />
      <Stat label="Days missed" value={`${streak.missedDays}`} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

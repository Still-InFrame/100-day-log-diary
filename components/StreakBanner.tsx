import type { StreakInfo } from "@/lib/streaks";

export function StreakBanner({ streak }: { streak: StreakInfo }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Current streak" value={`${streak.current} 🔥`} />
      <Stat label="Longest streak" value={`${streak.longest}`} />
      <Stat label="Days logged" value={`${streak.totalLogged}`} />
      <Stat label="Days missed" value={`${streak.missedDays}`} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

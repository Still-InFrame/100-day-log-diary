import { TOTAL_DAYS } from "@/lib/constants";

export function ProgressBar({ current }: { current: number }) {
  const pct = Math.min(100, Math.round((current / TOTAL_DAYS) * 100));
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Day {current} of {TOTAL_DAYS}
        </span>
        <span className="text-sm font-medium tabular-nums">{pct}%</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

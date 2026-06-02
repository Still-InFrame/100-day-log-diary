import Link from "next/link";
import { addDays, format, parseISO } from "date-fns";
import { TOTAL_DAYS } from "@/lib/constants";

type Cell = {
  dayNumber: number;
  date: string;
  hasEntry: boolean;
  intensity: number;
};

export function CalendarHeatmap({
  startDate,
  entries,
}: {
  startDate: string;
  entries: { date: string; time_spent_minutes: number; day_number: number }[];
}) {
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const maxMin = Math.max(60, ...entries.map((e) => e.time_spent_minutes));

  const cells: Cell[] = Array.from({ length: TOTAL_DAYS }, (_, i) => {
    const date = format(addDays(parseISO(startDate), i), "yyyy-MM-dd");
    const e = byDate.get(date);
    const intensity = e ? Math.min(1, e.time_spent_minutes / maxMin) : 0;
    return { dayNumber: i + 1, date, hasEntry: !!e, intensity };
  });

  return (
    <div className="grid grid-cols-10 gap-1.5">
      {cells.map((c) => {
        const bg = !c.hasEntry
          ? "bg-zinc-100 dark:bg-zinc-800"
          : c.intensity > 0.66
            ? "bg-indigo-600"
            : c.intensity > 0.33
              ? "bg-indigo-400"
              : "bg-indigo-200 dark:bg-indigo-900";
        const cell = (
          <div
            className={`flex aspect-square items-center justify-center rounded text-[10px] font-medium ${bg} ${c.hasEntry ? "text-white" : "text-zinc-500"}`}
            title={`Day ${c.dayNumber} • ${c.date}${c.hasEntry ? "" : " (not logged)"}`}
          >
            {c.dayNumber}
          </div>
        );
        return c.hasEntry ? (
          <Link key={c.dayNumber} href={`/entries/${c.dayNumber}`}>
            {cell}
          </Link>
        ) : (
          <div key={c.dayNumber}>{cell}</div>
        );
      })}
    </div>
  );
}

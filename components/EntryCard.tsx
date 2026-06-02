import Link from "next/link";
import type { Entry } from "@/lib/types";
import { formatShortDate } from "@/lib/dates";

export function EntryCard({ entry }: { entry: Entry }) {
  return (
    <Link
      href={`/entries/${entry.day_number}`}
      className="block rounded-lg border border-zinc-200 bg-white p-4 transition hover:border-zinc-400 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-xs font-medium uppercase tracking-wide text-indigo-500">
          Day {entry.day_number}
        </div>
        <div className="text-xs text-zinc-500">
          {formatShortDate(entry.date)}
        </div>
      </div>
      <h3 className="mt-2 truncate text-base font-semibold">{entry.app_name}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
        {entry.description}
      </p>
      <div className="mt-3 flex flex-wrap gap-1">
        {entry.tech_stack.slice(0, 4).map((t) => (
          <span
            key={t}
            className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          >
            {t}
          </span>
        ))}
        {entry.tech_stack.length > 4 && (
          <span className="text-xs text-zinc-500">
            +{entry.tech_stack.length - 4}
          </span>
        )}
      </div>
    </Link>
  );
}

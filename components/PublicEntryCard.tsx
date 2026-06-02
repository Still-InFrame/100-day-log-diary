import Image from "next/image";
import type { Entry } from "@/lib/types";
import { formatLongDate } from "@/lib/dates";

// Read-only entry rendering for the public share page. Shows every field
// (the owner opted into full transparency). Deliberately links nowhere into
// the authenticated app.
export function PublicEntryCard({ entry }: { entry: Entry }) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-xs font-medium uppercase tracking-wide text-indigo-500">
          Day {entry.day_number}
        </div>
        <div className="text-xs text-zinc-500">{formatLongDate(entry.date)}</div>
      </div>

      <h3 className="mt-2 text-xl font-semibold">{entry.app_name}</h3>
      <p className="mt-1 text-zinc-700 dark:text-zinc-300">{entry.description}</p>

      <div className="mt-3 flex flex-wrap gap-1">
        {entry.tech_stack.map((t) => (
          <span
            key={t}
            className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          >
            {t}
          </span>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
        <span>{entry.time_spent_minutes} min</span>
        {entry.mood != null && (
          <span title={`Mood ${entry.mood}/5`}>
            {"★".repeat(entry.mood)}
            {"☆".repeat(5 - entry.mood)}
          </span>
        )}
        <a
          href={entry.repo_url}
          target="_blank"
          rel="noreferrer"
          className="text-indigo-500 hover:underline"
        >
          View code / demo →
        </a>
      </div>

      {entry.screenshot_url && (
        <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <Image
            src={entry.screenshot_url}
            alt={`${entry.app_name} screenshot`}
            width={1600}
            height={1000}
            sizes="(max-width: 768px) 100vw, 42rem"
            className="h-auto w-full"
          />
        </div>
      )}

      {entry.learnings && (
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            What I learned
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">
            {entry.learnings}
          </p>
        </div>
      )}

      {entry.challenges && (
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Challenges &amp; blockers
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">
            {entry.challenges}
          </p>
        </div>
      )}
    </article>
  );
}

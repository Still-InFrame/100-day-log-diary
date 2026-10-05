import type { Entry } from "@/lib/types";
import { formatShortDate } from "@/lib/dates";

// The "Most popular" row at the top of a public page: the apps with the best
// click rate once they clear the bar (see popular_apps() in migration 0005).
// Links carry p=1 so clicks made here are stored separately and kept out of
// the ranking; otherwise an app would hold its place just by being shown
// first. These cards are deliberately NOT marked data-app-day, so they are
// not counted as views either.
export function PopularApps({
  entries,
  handle,
}: {
  // Already in rank order, best first.
  entries: Entry[];
  handle: string;
}) {
  if (entries.length === 0) return null;
  return (
    <section>
      <h2 className="mb-1 text-lg font-semibold">Most popular</h2>
      <p className="mb-3 text-sm text-zinc-500">
        The apps visitors open most often.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {entries.map((entry, i) => {
          const target = entry.live_url ? "live" : "code";
          return (
            <article
              key={entry.id}
              className="flex flex-col rounded-xl border border-indigo-200 bg-white p-4 dark:border-indigo-900 dark:bg-zinc-900"
            >
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="font-semibold text-indigo-500">#{i + 1}</span>
                <span className="text-zinc-500">
                  Day {entry.day_number} · {formatShortDate(entry.date)}
                </span>
              </div>
              <h3 className="mt-2 font-semibold">{entry.app_name}</h3>
              <p className="mt-1 line-clamp-3 flex-1 text-sm text-zinc-600 dark:text-zinc-400">
                {entry.description}
              </p>
              <a
                href={`/go/${handle}/${entry.day_number}?t=${target}&p=1`}
                target="_blank"
                rel="noopener nofollow"
                className="mt-3 self-start rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                {target === "live" ? "Open app →" : "View code →"}
              </a>
            </article>
          );
        })}
      </div>
    </section>
  );
}

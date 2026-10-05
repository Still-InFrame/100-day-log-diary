import { requireUser } from "@/lib/session";
import {
  getEngagementStats,
  getEntries,
  getInterestStats,
  getPopularDays,
  getVisitorTotals,
} from "@/lib/queries";
import {
  POPULAR_COUNT,
  POPULAR_MIN_CLICKERS,
  POPULAR_MIN_VIEWERS,
} from "@/lib/constants";
import { formatDateTime } from "@/lib/dates";
import type { EngagementStat } from "@/lib/types";

// The ranking rule lives in the database (popular_apps()); these helpers
// mirror it so the table can explain where each app stands. Everything here
// counts people, not events.

function qualifies(s: EngagementStat): boolean {
  return (
    s.unique_clicks >= POPULAR_MIN_CLICKERS &&
    s.unique_views >= POPULAR_MIN_VIEWERS
  );
}

// Share of the people who saw an app that clicked it. Capped at 1: a click
// can arrive without its view having been counted (a very fast click, or a
// visitor whose browser blocks the view report).
function rate(clickers: number, viewers: number): number | null {
  return viewers > 0 ? Math.min(1, clickers / viewers) : null;
}

function formatRate(r: number | null): string {
  return r === null ? "—" : `${Math.round(r * 100)}%`;
}

// Clicks beyond each person's first: people coming back to the same app.
function repeatClicks(s: EngagementStat): number {
  return Math.max(0, s.clicks - s.unique_clicks);
}

// What an app still needs before it can be ranked.
function shortfall(s: EngagementStat): string {
  const needs: string[] = [];
  if (s.unique_views < POPULAR_MIN_VIEWERS) {
    needs.push(`${POPULAR_MIN_VIEWERS - s.unique_views} more people to see it`);
  }
  if (s.unique_clicks < POPULAR_MIN_CLICKERS) {
    needs.push(`${POPULAR_MIN_CLICKERS - s.unique_clicks} more people to click`);
  }
  return `Needs ${needs.join(" and ")}`;
}

export default async function AdminClicksPage() {
  const user = await requireUser();
  const [stats, interest, entries, popularDays, totals] = await Promise.all([
    getEngagementStats(),
    getInterestStats(),
    getEntries(user.id),
    getPopularDays(user.id),
    getVisitorTotals(),
  ]);

  const appNames = new Map(entries.map((e) => [e.day_number, e.app_name]));
  const leadsByDay = new Map(interest.map((s) => [s.day_number, s.leads]));
  const popularRank = new Map(popularDays.map((day, i) => [day, i + 1]));

  // Ranked apps first, in the same order the database uses; then the rest by
  // how close they are to having enough data.
  const ranked = [...stats].sort((a, b) => {
    const qa = qualifies(a);
    const qb = qualifies(b);
    if (qa !== qb) return qa ? -1 : 1;
    if (qa) {
      const ra = Math.round((rate(a.unique_clicks, a.unique_views) ?? 0) * 100);
      const rb = Math.round((rate(b.unique_clicks, b.unique_views) ?? 0) * 100);
      return (
        rb - ra ||
        repeatClicks(b) - repeatClicks(a) ||
        (leadsByDay.get(b.day_number) ?? 0) - (leadsByDay.get(a.day_number) ?? 0)
      );
    }
    return (
      b.unique_clicks - a.unique_clicks ||
      b.unique_views - a.unique_views ||
      a.day_number - b.day_number
    );
  });

  const rankedCount = stats.filter(qualifies).length;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile
          label="People who saw an app"
          value={String(totals.people_saw)}
          note={`${totals.views} views in total`}
        />
        <Tile
          label="People who clicked"
          value={String(totals.people_clicked)}
          note={`${totals.clicks} clicks in total`}
        />
        <Tile
          label="Clicked at least one"
          value={formatRate(rate(totals.people_clicked, totals.people_saw))}
          note="of the people who saw an app"
        />
        <Tile
          label="Apps ranked"
          value={String(rankedCount)}
          note={`top ${POPULAR_COUNT} show as Most popular`}
        />
      </div>

      <section>
        <h2 className="mb-1 text-lg font-semibold">Popularity by app</h2>
        <p className="mb-3 text-sm text-zinc-500">
          The big numbers count people: someone who reloads the page or clicks
          the same app five times is one person. The small numbers underneath
          are the raw totals. An app is ranked once {POPULAR_MIN_CLICKERS}{" "}
          different people have clicked it and {POPULAR_MIN_VIEWERS} different
          people have seen it. Ranked apps are ordered by click rate (people
          who clicked out of people who saw it); apps on the same percent are
          ordered by repeat clicks, then signups. The top {POPULAR_COUNT}{" "}
          appear as &ldquo;Most popular&rdquo; on your public page.
        </p>
        <p className="mb-3 text-xs text-zinc-500">
          A &ldquo;person&rdquo; is one browser: the same person on a phone
          and a laptop counts twice. A view is counted when a card has been on
          screen for a second. Visitors see the list in a different order
          each, so position does not decide the result. Known crawlers and
          your own signed-in visits are left out; some automated traffic can
          still slip through.
        </p>
        {ranked.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
            No views or clicks recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3">App</th>
                  <th className="px-4 py-3 text-right">Seen by</th>
                  <th className="px-4 py-3 text-right">Clicked by</th>
                  <th className="px-4 py-3 text-right">Click rate</th>
                  <th className="px-4 py-3 text-right">Repeat clicks</th>
                  <th className="px-4 py-3 text-right">Signups</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last click</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((s) => {
                  const rank = popularRank.get(s.day_number);
                  const isRanked = qualifies(s);
                  return (
                    <tr
                      key={s.day_number}
                      className="border-t border-zinc-100 align-top dark:border-zinc-800"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium">
                          {appNames.get(s.day_number) ?? "Unknown app"}
                        </span>{" "}
                        <span className="text-xs text-zinc-500">
                          Day {s.day_number}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {s.unique_views}
                        <div className="text-xs text-zinc-500">
                          {s.views} views
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {s.unique_clicks}
                        <div className="text-xs text-zinc-500">
                          {s.clicks} clicks
                        </div>
                        {s.popular_clicks > 0 && (
                          <div className="text-xs text-zinc-500">
                            +{s.popular_clicks} from Most popular
                          </div>
                        )}
                      </td>
                      <td
                        className={`px-4 py-3 text-right tabular-nums ${
                          isRanked ? "font-semibold" : "text-zinc-400"
                        }`}
                      >
                        {formatRate(rate(s.unique_clicks, s.unique_views))}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {repeatClicks(s)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {leadsByDay.get(s.day_number) ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        {rank ? (
                          <span className="whitespace-nowrap rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">
                            Most popular #{rank}
                          </span>
                        ) : isRanked ? (
                          <span className="text-xs text-zinc-600 dark:text-zinc-300">
                            Ranked
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-500">
                            {shortfall(s)}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-zinc-500">
                        {s.last_click ? formatDateTime(s.last_click) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Tile({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs text-zinc-500">{note}</div>
    </div>
  );
}

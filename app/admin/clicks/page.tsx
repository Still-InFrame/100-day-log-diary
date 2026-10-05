import { requireUser } from "@/lib/session";
import {
  getEngagementStats,
  getEntries,
  getInterestStats,
  getPopularDays,
} from "@/lib/queries";
import {
  POPULAR_COUNT,
  POPULAR_MIN_CLICKS,
  POPULAR_MIN_VIEWS,
} from "@/lib/constants";
import { formatDateTime } from "@/lib/dates";
import type { EngagementStat } from "@/lib/types";

function qualifies(s: EngagementStat): boolean {
  return s.clicks >= POPULAR_MIN_CLICKS && s.views >= POPULAR_MIN_VIEWS;
}

function rate(s: Pick<EngagementStat, "clicks" | "views">): number | null {
  return s.views > 0 ? s.clicks / s.views : null;
}

function formatRate(r: number | null): string {
  return r === null ? "—" : `${(r * 100).toFixed(1)}%`;
}

// What an app still needs before it can be ranked.
function shortfall(s: EngagementStat): string {
  const needs: string[] = [];
  if (s.views < POPULAR_MIN_VIEWS) {
    needs.push(`${POPULAR_MIN_VIEWS - s.views} more views`);
  }
  if (s.clicks < POPULAR_MIN_CLICKS) {
    needs.push(`${POPULAR_MIN_CLICKS - s.clicks} more clicks`);
  }
  return `Needs ${needs.join(" and ")}`;
}

export default async function AdminClicksPage() {
  const user = await requireUser();
  const [stats, interest, entries, popularDays] = await Promise.all([
    getEngagementStats(),
    getInterestStats(),
    getEntries(user.id),
    getPopularDays(user.id),
  ]);

  const appNames = new Map(entries.map((e) => [e.day_number, e.app_name]));
  const leadsByDay = new Map(interest.map((s) => [s.day_number, s.leads]));
  const popularRank = new Map(popularDays.map((day, i) => [day, i + 1]));

  // Ranked apps first, best click rate on top; then the rest by how close
  // they are to having enough data.
  const ranked = [...stats].sort((a, b) => {
    const qa = qualifies(a);
    const qb = qualifies(b);
    if (qa !== qb) return qa ? -1 : 1;
    if (qa) return (rate(b) ?? 0) - (rate(a) ?? 0) || b.clicks - a.clicks;
    return b.clicks - a.clicks || b.views - a.views || a.day_number - b.day_number;
  });

  const totalViews = stats.reduce((n, s) => n + s.views, 0);
  const totalClicks = stats.reduce((n, s) => n + s.clicks, 0);
  const rankedCount = stats.filter(qualifies).length;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Views" value={String(totalViews)} />
        <Tile label="Clicks" value={String(totalClicks)} />
        <Tile
          label="Click rate"
          value={formatRate(rate({ clicks: totalClicks, views: totalViews }))}
        />
        <Tile label="Apps ranked" value={String(rankedCount)} />
      </div>

      <section>
        <h2 className="mb-1 text-lg font-semibold">Popularity by app</h2>
        <p className="mb-3 text-sm text-zinc-500">
          A view is counted when a card&apos;s title has been on a
          visitor&apos;s screen for a second. Click rate is clicks divided by
          views. An app is ranked once it has at least {POPULAR_MIN_CLICKS}{" "}
          clicks and {POPULAR_MIN_VIEWS} views, and the top {POPULAR_COUNT} by
          click rate appear as &ldquo;Most popular&rdquo; on your public page.
          Visitors see the list in a different order each, so position does
          not decide the result. Known crawlers and your own signed-in visits
          are left out; some automated traffic can still slip through.
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
                  <th className="px-4 py-3 text-right">Views</th>
                  <th className="px-4 py-3 text-right">Clicks</th>
                  <th className="px-4 py-3 text-right">Click rate</th>
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
                      className="border-t border-zinc-100 dark:border-zinc-800"
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
                        {s.views}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {s.clicks}
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
                        {formatRate(rate(s))}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {leadsByDay.get(s.day_number) ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        {rank ? (
                          <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">
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
                      <td className="px-4 py-3 text-zinc-500">
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

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

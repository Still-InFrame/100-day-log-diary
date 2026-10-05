import { requireUser } from "@/lib/session";
import {
  getEngagementStats,
  getEntries,
  getInterestStats,
  getOverview,
  getPopularDays,
} from "@/lib/queries";
import {
  POPULAR_COUNT,
  POPULAR_MIN_CLICKERS,
  POPULAR_MIN_VIEWERS,
} from "@/lib/constants";
import { formatDateTime, formatDateTimeShort, todayISO } from "@/lib/dates";
import { resolveRange } from "@/lib/overview-range";
import {
  PopularityTable,
  type PopularityRow,
} from "@/components/admin/PopularityTable";
import { RangeFilter } from "@/components/admin/RangeFilter";
import type { EngagementStat } from "@/lib/types";

// Two sets of numbers meet on this page:
//  - what the table and tiles COUNT follows the date range at the top;
//  - each app's STATUS, and the order "sort by status" gives, is the site's
//    live ranking, which always uses everything on record. The public page
//    ranks apps that way, so a status worked out from a date range would
//    describe a ranking that exists nowhere.
// The ranking rule itself lives in the database (popular_apps()); the helpers
// below mirror it so the table can explain where each app stands. "Unique"
// counts people (one browser = one person); "total" counts every view or
// click.

type Counts = Pick<
  EngagementStat,
  "views" | "unique_views" | "clicks" | "unique_clicks"
>;

const NO_COUNTS: Counts = {
  views: 0,
  unique_views: 0,
  clicks: 0,
  unique_clicks: 0,
};

function qualifies(s: Pick<Counts, "unique_clicks" | "unique_views">): boolean {
  return (
    s.unique_clicks >= POPULAR_MIN_CLICKERS &&
    s.unique_views >= POPULAR_MIN_VIEWERS
  );
}

// Unique clicks out of unique views. Capped at 1: a click can arrive without
// its view having been counted (a very fast click, or a visitor whose browser
// blocks the view report).
function rate(uniqueClicks: number, uniqueViews: number): number | null {
  return uniqueViews > 0 ? Math.min(1, uniqueClicks / uniqueViews) : null;
}

function formatRate(r: number | null): string {
  return r === null ? "—" : `${Math.round(r * 100)}%`;
}

// Clicks beyond each person's first: people coming back to the app.
const repeatClicks = (s: Counts) => Math.max(0, s.clicks - s.unique_clicks);

// What an app still needs before it can be ranked.
function shortfall(s: Pick<Counts, "unique_clicks" | "unique_views">): string {
  const needs: string[] = [];
  if (s.unique_views < POPULAR_MIN_VIEWERS) {
    needs.push(`${POPULAR_MIN_VIEWERS - s.unique_views} more unique views`);
  }
  if (s.unique_clicks < POPULAR_MIN_CLICKERS) {
    needs.push(`${POPULAR_MIN_CLICKERS - s.unique_clicks} more unique clicks`);
  }
  return `Needs ${needs.join(" and ")}`;
}

export default async function AdminClicksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const today = todayISO();
  const range = resolveRange(await searchParams, today);
  const [inRange, allTimeStats, allTimeLeads, entries, popularDays] =
    await Promise.all([
      getOverview(range.from, range.to),
      getEngagementStats(),
      getInterestStats(),
      getEntries(user.id),
      getPopularDays(user.id),
    ]);
  const allTime = range.preset === "all";

  const rangeByDay = new Map(
    (inRange?.apps ?? []).map((a) => [a.day_number, a]),
  );
  const everByDay = new Map(allTimeStats.map((s) => [s.day_number, s]));
  const leadsEverByDay = new Map(
    allTimeLeads.map((s) => [s.day_number, s.leads]),
  );
  const popularRank = new Map(popularDays.map((day, i) => [day, i + 1]));

  // Every app gets a row, including ones nobody has seen yet.
  const unordered = entries.map((entry) => {
    const shown = rangeByDay.get(entry.day_number);
    const counts: Counts = shown ?? NO_COUNTS;
    const ever: Counts = everByDay.get(entry.day_number) ?? NO_COUNTS;
    const rank = popularRank.get(entry.day_number);
    const ranked = qualifies(ever);
    const lastClick = shown?.last_click ?? null;
    return {
      day: entry.day_number,
      app: entry.app_name,
      uniqueViews: counts.unique_views,
      views: counts.views,
      uniqueClicks: counts.unique_clicks,
      clicks: counts.clicks,
      popularClicks: shown?.popular_clicks ?? 0,
      rate: rate(counts.unique_clicks, counts.unique_views),
      repeat: repeatClicks(counts),
      signups: shown?.signups ?? 0,
      status: rank
        ? ({ kind: "popular", rank } as const)
        : ranked
          ? ({ kind: "ranked" } as const)
          : ({ kind: "needs", text: shortfall(ever) } as const),
      lastClick,
      lastClickLabel: lastClick ? formatDateTimeShort(lastClick) : null,
      lastClickFull: lastClick ? formatDateTime(lastClick) : null,
      // What the ranking order below is worked out from: all-time figures.
      ranked,
      everRate: rate(ever.unique_clicks, ever.unique_views),
      everRepeat: repeatClicks(ever),
      everSignups: leadsEverByDay.get(entry.day_number) ?? 0,
      everUniqueClicks: ever.unique_clicks,
      everUniqueViews: ever.unique_views,
    };
  });

  // The site's ranking order: ranked apps first, in the order the database
  // uses; then the rest by how close they are to having enough data.
  const ordered = [...unordered].sort((a, b) => {
    if (a.ranked !== b.ranked) return a.ranked ? -1 : 1;
    if (a.ranked) {
      return (
        Math.round((b.everRate ?? 0) * 100) -
          Math.round((a.everRate ?? 0) * 100) ||
        b.everRepeat - a.everRepeat ||
        b.everSignups - a.everSignups ||
        a.day - b.day
      );
    }
    return (
      b.everUniqueClicks - a.everUniqueClicks ||
      b.everUniqueViews - a.everUniqueViews ||
      b.everSignups - a.everSignups ||
      a.day - b.day
    );
  });

  const rows: PopularityRow[] = ordered.map((row, i) => ({
    day: row.day,
    app: row.app,
    uniqueViews: row.uniqueViews,
    views: row.views,
    uniqueClicks: row.uniqueClicks,
    clicks: row.clicks,
    popularClicks: row.popularClicks,
    rate: row.rate,
    repeat: row.repeat,
    signups: row.signups,
    status: row.status,
    rankOrder: i,
    lastClick: row.lastClick,
    lastClickLabel: row.lastClickLabel,
    lastClickFull: row.lastClickFull,
  }));

  const rankedCount = unordered.filter((r) => r.ranked).length;
  const totals = inRange?.totals;

  return (
    <div className="space-y-8">
      {/* One filter, above everything it changes. */}
      <div className="space-y-2">
        <RangeFilter range={range} basePath="/admin/clicks" today={today} />
        {!allTime && (
          <p className="text-xs text-zinc-500">
            The counts below are for these dates. Status, and the number of apps
            ranked, always use everything on record, because that is how your
            public page ranks them.
          </p>
        )}
      </div>

      {totals ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Tile label="Total views" value={String(totals.views)} />
          <Tile
            label="Unique views"
            value={String(totals.unique_views)}
            note="people who saw an app"
          />
          <Tile label="Total clicks" value={String(totals.clicks)} />
          <Tile
            label="Unique clicks"
            value={String(totals.unique_clicks)}
            note={`${formatRate(rate(totals.unique_clicks, totals.unique_views))} of unique views`}
          />
          <Tile
            label="Apps ranked"
            value={String(rankedCount)}
            note={`all time; top ${POPULAR_COUNT} show as Most popular`}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          The counts for these dates could not be loaded, so the table below
          shows zeros. Each app’s status is still right. Reload the page to try
          again.
        </div>
      )}

      <section>
        <h2 className="mb-1 text-lg font-semibold">Popularity by app</h2>
        <p className="mb-2 text-sm text-zinc-500">
          Total counts every view or click. Unique counts each person once,
          however often they come back. Click rate is unique clicks out of
          unique views. An app is ranked once it has {POPULAR_MIN_CLICKERS}{" "}
          unique clicks and {POPULAR_MIN_VIEWERS} unique views; ranked apps are
          ordered by click rate, then repeat clicks, then signups, and the top{" "}
          {POPULAR_COUNT} appear as “Most popular” on your public page.
        </p>
        <p className="mb-4 text-xs text-zinc-500">
          A person is one browser, so the same person on a phone and a laptop
          counts twice. A view is counted when a card has been on screen for a
          second. Known crawlers and your own signed-in visits are left out;
          some automated traffic can still slip through.
        </p>
        <PopularityTable rows={rows} />
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
  note?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {note && <div className="mt-0.5 text-xs text-zinc-500">{note}</div>}
    </div>
  );
}

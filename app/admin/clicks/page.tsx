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
import { formatDateTime, formatDateTimeShort } from "@/lib/dates";
import {
  PopularityTable,
  type PopularityRow,
} from "@/components/admin/PopularityTable";
import type { EngagementStat } from "@/lib/types";

// The ranking rule lives in the database (popular_apps()); these helpers
// mirror it so the table can explain where each app stands. "Unique" counts
// people (one browser = one person); "total" counts every view or click.

const NO_ACTIVITY: Omit<EngagementStat, "day_number"> = {
  views: 0,
  clicks: 0,
  live_clicks: 0,
  code_clicks: 0,
  popular_clicks: 0,
  last_click: null,
  unique_views: 0,
  unique_clicks: 0,
};

function qualifies(s: Pick<EngagementStat, "unique_clicks" | "unique_views">): boolean {
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

// What an app still needs before it can be ranked.
function shortfall(s: Pick<EngagementStat, "unique_clicks" | "unique_views">): string {
  const needs: string[] = [];
  if (s.unique_views < POPULAR_MIN_VIEWERS) {
    needs.push(`${POPULAR_MIN_VIEWERS - s.unique_views} more unique views`);
  }
  if (s.unique_clicks < POPULAR_MIN_CLICKERS) {
    needs.push(`${POPULAR_MIN_CLICKERS - s.unique_clicks} more unique clicks`);
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

  const statsByDay = new Map(stats.map((s) => [s.day_number, s]));
  const leadsByDay = new Map(interest.map((s) => [s.day_number, s.leads]));
  const popularRank = new Map(popularDays.map((day, i) => [day, i + 1]));

  // Every app gets a row, including ones nobody has seen yet.
  const unordered = entries.map((entry) => {
    const s = statsByDay.get(entry.day_number) ?? NO_ACTIVITY;
    const rank = popularRank.get(entry.day_number);
    const ranked = qualifies(s);
    return {
      day: entry.day_number,
      app: entry.app_name,
      uniqueViews: s.unique_views,
      views: s.views,
      uniqueClicks: s.unique_clicks,
      clicks: s.clicks,
      popularClicks: s.popular_clicks,
      rate: rate(s.unique_clicks, s.unique_views),
      // Clicks beyond each person's first: people coming back to the app.
      repeat: Math.max(0, s.clicks - s.unique_clicks),
      signups: leadsByDay.get(entry.day_number) ?? 0,
      status: rank
        ? ({ kind: "popular", rank } as const)
        : ranked
          ? ({ kind: "ranked" } as const)
          : ({ kind: "needs", text: shortfall(s) } as const),
      ranked,
      lastClick: s.last_click,
      lastClickLabel: s.last_click ? formatDateTimeShort(s.last_click) : null,
      lastClickFull: s.last_click ? formatDateTime(s.last_click) : null,
    };
  });

  // The site's ranking order: ranked apps first, in the order the database
  // uses; then the rest by how close they are to having enough data.
  const ordered = [...unordered].sort((a, b) => {
    if (a.ranked !== b.ranked) return a.ranked ? -1 : 1;
    if (a.ranked) {
      return (
        Math.round((b.rate ?? 0) * 100) - Math.round((a.rate ?? 0) * 100) ||
        b.repeat - a.repeat ||
        b.signups - a.signups ||
        a.day - b.day
      );
    }
    return (
      b.uniqueClicks - a.uniqueClicks ||
      b.uniqueViews - a.uniqueViews ||
      b.signups - a.signups ||
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

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Tile label="Total views" value={String(totals.views)} />
        <Tile
          label="Unique views"
          value={String(totals.people_saw)}
          note="people who saw an app"
        />
        <Tile label="Total clicks" value={String(totals.clicks)} />
        <Tile
          label="Unique clicks"
          value={String(totals.people_clicked)}
          note={`${formatRate(rate(totals.people_clicked, totals.people_saw))} of unique views`}
        />
        <Tile
          label="Apps ranked"
          value={String(rankedCount)}
          note={`top ${POPULAR_COUNT} show as Most popular`}
        />
      </div>

      <section>
        <h2 className="mb-1 text-lg font-semibold">Popularity by app</h2>
        <p className="mb-2 text-sm text-zinc-500">
          Total counts every view or click. Unique counts each person once,
          however often they come back. Click rate is unique clicks out of
          unique views. An app is ranked once it has {POPULAR_MIN_CLICKERS}{" "}
          unique clicks and {POPULAR_MIN_VIEWERS} unique views; ranked apps
          are ordered by click rate, then repeat clicks, then signups, and
          the top {POPULAR_COUNT} appear as &ldquo;Most popular&rdquo; on your
          public page.
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

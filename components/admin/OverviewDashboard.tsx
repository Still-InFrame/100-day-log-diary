import Link from "next/link";
import { POPULAR_MIN_VIEWERS } from "@/lib/constants";
import { BarList, type BarListItem } from "@/components/admin/BarList";
import { DailyActivityChart } from "@/components/admin/DailyActivityChart";
import { GeoMap } from "@/components/admin/GeoMap";
import { TrafficSources } from "@/components/admin/TrafficSources";
import { toGeoPlaces } from "@/lib/geo/places";
import type { Overview, OverviewApp } from "@/lib/types";

// How many apps each list shows. The Clicks tab has all of them.
const TOP_COUNT = 8;
// Shorter, because this list shares a column with the funnel.
const TOP_SIGNUPS = 5;

// Each measure keeps one color on every tile, chart and list (see .viz in
// globals.css).
const VIEWS = "var(--viz-views)";
const CLICKS = "var(--viz-clicks)";
const SIGNUPS = "var(--viz-signups)";

const whole = new Intl.NumberFormat("en-US");

// Unique clicks out of unique views. Capped at 1: a click can arrive without
// its view having been counted (a very fast click, or a visitor whose browser
// blocks the view report).
function rate(uniqueClicks: number, uniqueViews: number): number | null {
  return uniqueViews > 0 ? Math.min(1, uniqueClicks / uniqueViews) : null;
}

// One decimal below 10% so a small share does not read as a flat "2%".
function formatShare(share: number | null): string {
  if (share === null) return "—";
  const pct = share * 100;
  if (pct > 0 && pct < 10) return `${Number(pct.toFixed(1))}%`;
  return `${Math.round(pct)}%`;
}

export function OverviewDashboard({
  overview,
  appNames,
}: {
  overview: Overview;
  appNames: Map<number, string>;
}) {
  const { totals, daily, apps } = overview;
  const hasActivity = totals.views + totals.clicks + totals.signups > 0;
  const appsWithSignups = apps.filter((a) => a.signups > 0).length;

  const row = (
    app: OverviewApp,
    value: number,
    display: string,
    note?: string,
  ): BarListItem => ({
    key: app.day_number,
    label: appNames.get(app.day_number) ?? "Unknown app",
    hint: `Day ${app.day_number}`,
    value,
    display,
    note,
  });

  const mostClicked = apps
    .filter((a) => a.unique_clicks > 0)
    .sort(
      (a, b) =>
        b.unique_clicks - a.unique_clicks ||
        b.signups - a.signups ||
        a.day_number - b.day_number,
    )
    .slice(0, TOP_COUNT)
    .map((a) => row(a, a.unique_clicks, whole.format(a.unique_clicks)));

  // Same bar the public ranking uses: below it a click rate is mostly luck
  // (1 click out of 2 views is "50%").
  const bestRate = apps
    .filter((a) => a.unique_views >= POPULAR_MIN_VIEWERS)
    .map((a) => ({ app: a, rate: rate(a.unique_clicks, a.unique_views) ?? 0 }))
    .sort(
      (a, b) =>
        b.rate - a.rate ||
        b.app.unique_clicks - a.app.unique_clicks ||
        a.app.day_number - b.app.day_number,
    )
    .slice(0, TOP_COUNT)
    .map(({ app, rate: r }) =>
      row(
        app,
        r,
        formatShare(r),
        `${whole.format(app.unique_clicks)} of ${whole.format(app.unique_views)}`,
      ),
    );

  const mostSignups = apps
    .filter((a) => a.signups > 0)
    .sort(
      (a, b) =>
        b.signups - a.signups ||
        b.unique_clicks - a.unique_clicks ||
        a.day_number - b.day_number,
    )
    .slice(0, TOP_SIGNUPS)
    .map((a) => row(a, a.signups, whole.format(a.signups)));

  const clickedShare = rate(totals.unique_clicks, totals.unique_views);
  const signupShare =
    totals.unique_views > 0 ? totals.signups / totals.unique_views : null;
  const funnel: BarListItem[] = [
    {
      key: "saw",
      label: "Saw an app",
      value: totals.unique_views,
      display: whole.format(totals.unique_views),
      color: VIEWS,
    },
    {
      key: "clicked",
      label: "Clicked an app",
      value: totals.unique_clicks,
      display: whole.format(totals.unique_clicks),
      note: clickedShare === null ? undefined : formatShare(clickedShare),
      color: CLICKS,
    },
    {
      key: "signed",
      label: "Signed up",
      value: totals.signups,
      display: whole.format(totals.signups),
      note: signupShare === null ? undefined : formatShare(signupShare),
      color: SIGNUPS,
    },
  ];

  return (
    <div className="viz space-y-8">
      {/* Listed pair by pair so a phone's two columns read total, unique.
          From sm up the grid fills downwards instead, giving a column each
          for views, clicks and outcomes. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-flow-col sm:grid-cols-3 sm:grid-rows-2 lg:grid-flow-row lg:grid-cols-6 lg:grid-rows-1">
        <Tile
          label="Total views"
          value={whole.format(totals.views)}
          color={VIEWS}
        />
        <Tile
          label="Unique views"
          value={whole.format(totals.unique_views)}
          note="people who saw an app"
          color={VIEWS}
        />
        <Tile
          label="Total clicks"
          value={whole.format(totals.clicks)}
          note={
            totals.clicks > 0
              ? `${whole.format(totals.live_clicks)} Open app, ${whole.format(totals.code_clicks)} View code`
              : undefined
          }
          color={CLICKS}
        />
        <Tile
          label="Unique clicks"
          value={whole.format(totals.unique_clicks)}
          note="people who clicked an app"
          color={CLICKS}
        />
        <Tile
          label="Signups"
          value={whole.format(totals.signups)}
          note={
            appsWithSignups === 0
              ? undefined
              : appsWithSignups === 1
                ? "for 1 app"
                : `across ${whole.format(appsWithSignups)} apps`
          }
          color={SIGNUPS}
        />
        <Tile
          label="Click rate"
          value={formatShare(clickedShare)}
          note="unique clicks out of unique views"
        />
      </div>

      {hasActivity ? (
        <>
          <div className="grid items-start gap-4 lg:grid-cols-3">
            <Card title="Activity by day" className="lg:col-span-2">
              <DailyActivityChart days={daily} />
            </Card>
            <div className="min-w-0 space-y-4">
              <Card title="From seeing to signing up">
                <BarList items={funnel} color={VIEWS} />
                <p className="mt-4 text-xs text-zinc-500">
                  Percentages are out of the people who saw an app. Signups are
                  counted one per signup, so someone who signs up for two apps
                  counts twice.
                </p>
              </Card>
              <Card title="Most signups" subtitle="“Notify me” signups by app">
                {mostSignups.length > 0 ? (
                  <BarList items={mostSignups} color={SIGNUPS} />
                ) : (
                  <Quiet>No signups in this range.</Quiet>
                )}
              </Card>
            </div>
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-2">
            <Card title="Most clicked" subtitle="Unique clicks by app">
              {mostClicked.length > 0 ? (
                <BarList items={mostClicked} color={CLICKS} />
              ) : (
                <Quiet>No clicks in this range.</Quiet>
              )}
            </Card>
            <Card
              title="Best click rate"
              subtitle={`Apps with at least ${POPULAR_MIN_VIEWERS} unique views`}
            >
              {bestRate.length > 0 ? (
                <BarList items={bestRate} color={CLICKS} max={1} />
              ) : (
                <Quiet>
                  No app has {POPULAR_MIN_VIEWERS} unique views in this range
                  yet. Below that a click rate is mostly luck, so it is left out
                  until there is enough to go on.
                </Quiet>
              )}
            </Card>
          </div>

          <Card
            title="Where traffic comes from"
            subtitle="What sent each visit to your page."
          >
            <TrafficSources
              channels={overview.channels}
              sources={overview.sources}
              campaigns={overview.campaigns}
            />
          </Card>

          <Card
            title="Where people are"
            subtitle="Click a country to zoom in, then a state to see its cities."
          >
            <GeoMap {...toGeoPlaces(overview)} />
          </Card>

          <p className="text-sm">
            <Link
              href="/admin/clicks"
              className="font-medium text-indigo-600 hover:underline dark:text-indigo-300"
            >
              See every app in the Clicks tab
            </Link>
          </p>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          Nothing was recorded in this range. Views, clicks and signups appear
          here once people visit your public page.
        </div>
      )}

      <p className="text-xs text-zinc-500">
        Total counts every view or click; unique counts each person (one
        browser) once. Someone active on two days is counted on both in the
        daily chart, so the days can add up to more than the unique total. Views
        and clicks recorded before unique counting was added each count as one
        person, so early unique figures run high. Days run midnight to midnight
        Eastern Time. Clicks made from the &ldquo;Most popular&rdquo; row, known
        crawlers and your own signed-in visits are left out. Location is the
        country, state and city looked up for the visitor&rsquo;s internet
        connection, so a VPN or a phone network can put someone in the wrong
        place.
      </p>
    </div>
  );
}

function Tile({
  label,
  value,
  note,
  color,
}: {
  label: string;
  value: string;
  note?: string;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-zinc-500">
        {color && (
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
        )}
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {note && <div className="mt-0.5 text-xs text-zinc-500">{note}</div>}
    </div>
  );
}

function Card({
  title,
  subtitle,
  className = "",
  children,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    // min-w-0: a grid cell will not shrink below its content otherwise, and
    // a chart inside would push the page wider than a phone screen.
    <section
      className={`min-w-0 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Quiet({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-zinc-500">{children}</p>;
}

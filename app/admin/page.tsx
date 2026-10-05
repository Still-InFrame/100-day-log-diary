import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getEntries, getOverview, getProfile } from "@/lib/queries";
import { formatShortDate, todayISO } from "@/lib/dates";
import { OverviewDashboard } from "@/components/admin/OverviewDashboard";
import { RangeFilter } from "@/components/admin/RangeFilter";
import { resolveRange } from "@/lib/overview-range";
import type { OverviewDay } from "@/lib/types";

// "All time" has no start date to show in the From field, so say when the
// data actually begins.
function sinceLabel(daily: OverviewDay[]): string | null {
  const first = daily.find((d) => d.views + d.clicks + d.signups > 0);
  return first ? `Since ${formatShortDate(first.day)}` : null;
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const today = todayISO();
  const range = resolveRange(await searchParams, today);
  const [overview, entries, profile] = await Promise.all([
    getOverview(range.from, range.to),
    getEntries(user.id),
    getProfile(user.id),
  ]);
  const appNames = new Map(entries.map((e) => [e.day_number, e.app_name]));
  const since =
    overview && range.preset === "all" ? sinceLabel(overview.daily) : null;

  return (
    <div className="space-y-6">
      {!profile?.public_handle && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          Your page is not public yet, so nobody can see or click your apps.{" "}
          <Link href="/profile" className="font-medium underline">
            Publish it from your Profile
          </Link>
          .
        </div>
      )}

      {/* One filter, above everything it changes: every number and chart
          below is for this range. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <RangeFilter range={range} basePath="/admin" today={today} />
        {since && <span className="text-sm text-zinc-500">{since}</span>}
      </div>

      {overview ? (
        <OverviewDashboard overview={overview} appNames={appNames} />
      ) : (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          The overview could not be loaded. Reload the page to try again. The
          Interest and Clicks tabs are not affected.
        </div>
      )}
    </div>
  );
}

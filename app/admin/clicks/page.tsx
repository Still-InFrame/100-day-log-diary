import { requireOwner } from "@/lib/owner";
import { getClickStats, getEntries, getInterestStats } from "@/lib/queries";
import { formatDateTime } from "@/lib/dates";

export default async function AdminClicksPage() {
  const owner = await requireOwner();
  const [clicks, interest, entries] = await Promise.all([
    getClickStats(),
    getInterestStats(),
    getEntries(owner.user.id),
  ]);

  const appNames = new Map(entries.map((e) => [e.day_number, e.app_name]));
  const leadsByDay = new Map(interest.map((s) => [s.day_number, s.leads]));

  // Rank by app opens first: opening the live app is the interest signal;
  // code views are secondary.
  const ranked = [...clicks].sort(
    (a, b) =>
      b.live_clicks - a.live_clicks ||
      b.clicks - a.clicks ||
      a.day_number - b.day_number,
  );
  const totalClicks = clicks.reduce((n, c) => n + c.clicks, 0);
  const totalOpens = clicks.reduce((n, c) => n + c.live_clicks, 0);
  const totalCode = clicks.reduce((n, c) => n + c.code_clicks, 0);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Total clicks" value={totalClicks} />
        <Tile label="App opens" value={totalOpens} />
        <Tile label="Code views" value={totalCode} />
        <Tile label="Apps clicked" value={clicks.length} />
      </div>

      <section>
        <h2 className="mb-1 text-lg font-semibold">Clicks by app</h2>
        <p className="mb-3 text-sm text-zinc-500">
          Counts clicks on &ldquo;Open app&rdquo; and &ldquo;View code&rdquo;
          from the public page. Known crawlers are left out, but some automated
          traffic can still slip through, and your own clicks on the public
          page count too.
        </p>
        {ranked.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
            No clicks recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">App</th>
                  <th className="px-4 py-3 text-right">App opens</th>
                  <th className="px-4 py-3 text-right">Code views</th>
                  <th className="px-4 py-3 text-right">Signups</th>
                  <th className="px-4 py-3">Last click</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((c, i) => (
                  <tr
                    key={c.day_number}
                    className="border-t border-zinc-100 dark:border-zinc-800"
                  >
                    <td className="px-4 py-3 tabular-nums text-zinc-500">
                      {i + 1}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">
                        {appNames.get(c.day_number) ?? "Unknown app"}
                      </span>{" "}
                      <span className="text-xs text-zinc-500">
                        Day {c.day_number}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {c.live_clicks}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {c.code_clicks}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {leadsByDay.get(c.day_number) ?? 0}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {c.last_click ? formatDateTime(c.last_click) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

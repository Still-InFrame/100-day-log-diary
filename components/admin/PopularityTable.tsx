"use client";

import { useMemo, useState } from "react";

// One app's row in the admin "Popularity by app" table. Built on the server
// (app/admin/clicks/page.tsx); this component only searches, filters and
// sorts what it is given.
export type PopularityRow = {
  day: number;
  app: string;
  // People (distinct visitors) and the raw totals behind them.
  uniqueViews: number;
  views: number;
  uniqueClicks: number;
  clicks: number;
  // Clicks made from the "Most popular" row; not part of the click rate.
  popularClicks: number;
  // People who clicked out of people who saw it; null when nobody has seen it.
  rate: number | null;
  repeat: number;
  signups: number;
  status:
    | { kind: "popular"; rank: number }
    | { kind: "ranked" }
    | { kind: "needs"; text: string };
  // Position in the site's own ranking order (0 = best). Sorting by Status
  // uses this, so it matches what the public page does.
  rankOrder: number;
  lastClick: string | null;
  // Short form for the cell ("Oct 5, 1:45 AM"); the full date is its tooltip.
  lastClickLabel: string | null;
  lastClickFull: string | null;
};

type SortKey =
  | "app"
  | "day"
  | "totalViews"
  | "uniqueViews"
  | "totalClicks"
  | "uniqueClicks"
  | "rate"
  | "repeat"
  | "signups"
  | "status"
  | "lastClick";
type SortDir = "asc" | "desc";
type StatusFilter = "all" | "popular" | "ranked" | "needs";
type ActivityFilter = "any" | "seen" | "clicked" | "signups" | "unseen";

// The direction a column sorts in on the first click: text and day read
// naturally ascending; counts, rates and dates are most useful biggest or
// newest first. Status ascending is the ranking order, best first.
const FIRST_DIRECTION: Record<SortKey, SortDir> = {
  app: "asc",
  day: "asc",
  status: "asc",
  totalViews: "desc",
  uniqueViews: "desc",
  totalClicks: "desc",
  uniqueClicks: "desc",
  rate: "desc",
  repeat: "desc",
  signups: "desc",
  lastClick: "desc",
};

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: "app", label: "App", numeric: false },
  { key: "day", label: "Day", numeric: true },
  { key: "totalViews", label: "Total views", numeric: true },
  { key: "uniqueViews", label: "Unique views", numeric: true },
  { key: "totalClicks", label: "Total clicks", numeric: true },
  { key: "uniqueClicks", label: "Unique clicks", numeric: true },
  { key: "rate", label: "Click rate", numeric: true },
  { key: "repeat", label: "Repeat clicks", numeric: true },
  { key: "signups", label: "Signups", numeric: true },
  { key: "status", label: "Status", numeric: false },
  { key: "lastClick", label: "Last click", numeric: false },
];

// Returns the value to sort on, or null for "no value". Rows with no value
// always go to the bottom, whichever direction is chosen.
function sortValue(row: PopularityRow, key: SortKey): number | string | null {
  switch (key) {
    case "app":
      return row.app.toLowerCase();
    case "day":
      return row.day;
    case "totalViews":
      return row.views;
    case "uniqueViews":
      return row.uniqueViews;
    case "totalClicks":
      return row.clicks;
    case "uniqueClicks":
      return row.uniqueClicks;
    case "rate":
      return row.rate;
    case "repeat":
      return row.repeat;
    case "signups":
      return row.signups;
    case "status":
      return row.rankOrder;
    case "lastClick":
      return row.lastClick ? Date.parse(row.lastClick) : null;
  }
}

// Equal values fall back to the site's ranking order, so the result is stable
// and the better-performing app comes first.
function tieBreak(a: PopularityRow, b: PopularityRow): number {
  return a.rankOrder - b.rankOrder;
}

function formatRate(r: number | null): string {
  return r === null ? "—" : `${Math.round(r * 100)}%`;
}

const inputClass =
  "rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950";

export function PopularityTable({ rows }: { rows: PopularityRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [activity, setActivity] = useState<ActivityFilter>("any");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "status",
    dir: "asc",
  });

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    // "day 41" and "41" both find Day 41.
    const dayQuery = q.replace(/^day\s*/, "");

    const filtered = rows.filter((row) => {
      if (q) {
        const matchesName = row.app.toLowerCase().includes(q);
        const matchesDay = dayQuery !== "" && String(row.day) === dayQuery;
        if (!matchesName && !matchesDay) return false;
      }
      if (status !== "all" && row.status.kind !== status) return false;
      if (activity === "seen" && row.uniqueViews === 0) return false;
      if (activity === "clicked" && row.uniqueClicks === 0) return false;
      if (activity === "signups" && row.signups === 0) return false;
      if (activity === "unseen" && row.uniqueViews > 0) return false;
      return true;
    });

    const sign = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = sortValue(a, sort.key);
      const vb = sortValue(b, sort.key);
      if (va === null && vb === null) return tieBreak(a, b);
      if (va === null) return 1;
      if (vb === null) return -1;
      const cmp =
        typeof va === "string" && typeof vb === "string"
          ? va.localeCompare(vb)
          : (va as number) - (vb as number);
      return cmp !== 0 ? cmp * sign : tieBreak(a, b);
    });
  }, [rows, query, status, activity, sort]);

  function sortBy(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: FIRST_DIRECTION[key] },
    );
  }

  const filtersActive = query.trim() !== "" || status !== "all" || activity !== "any";
  const customSort = sort.key !== "status" || sort.dir !== "asc";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by app name or day"
          aria-label="Search apps"
          className={`${inputClass} min-w-0 flex-1 basis-56`}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          aria-label="Filter by status"
          className={inputClass}
        >
          <option value="all">All statuses</option>
          <option value="popular">Most popular</option>
          <option value="ranked">Ranked</option>
          <option value="needs">Needs more data</option>
        </select>
        <select
          value={activity}
          onChange={(e) => setActivity(e.target.value as ActivityFilter)}
          aria-label="Filter by activity"
          className={inputClass}
        >
          <option value="any">Any activity</option>
          <option value="seen">Has views</option>
          <option value="clicked">Has clicks</option>
          <option value="signups">Has signups</option>
          <option value="unseen">No views yet</option>
        </select>
        {(filtersActive || customSort) && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setStatus("all");
              setActivity("any");
              setSort({ key: "status", dir: "asc" });
            }}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Reset
          </button>
        )}
        <span className="ml-auto text-xs text-zinc-500">
          Showing {visible.length} of {rows.length} apps
        </span>
      </div>

      {/* The table scrolls inside this box so the header row can stay in
          view. A header cannot stick to the top of the PAGE from inside a
          box that scrolls sideways, and the table needs to scroll sideways
          on narrow screens. */}
      <div className="max-h-[70vh] overflow-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr>
              {COLUMNS.map((col) => {
                const active = sort.key === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={
                      active
                        ? sort.dir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                    className={`sticky top-0 border-b border-zinc-200 bg-zinc-50 px-2.5 py-2 align-bottom text-xs uppercase tracking-wide dark:border-zinc-800 dark:bg-zinc-950 ${
                      col.numeric ? "text-right" : "text-left"
                    } ${
                      // The App column is pinned on both axes, so it sits above
                      // the other header cells and the pinned body cells.
                      col.key === "app" ? "left-0 z-30" : "z-20"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => sortBy(col.key)}
                      title={`Sort by ${col.label.toLowerCase()}`}
                      className={`inline-flex items-end gap-1 rounded py-1 leading-tight uppercase tracking-wide hover:text-zinc-900 dark:hover:text-zinc-100 ${
                        col.numeric ? "text-right" : "text-left"
                      } ${
                        active
                          ? "font-semibold text-zinc-900 dark:text-zinc-100"
                          : "font-medium text-zinc-500"
                      }`}
                    >
                      {col.label}
                      <span aria-hidden className="w-2 text-[10px]">
                        {active ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td
                  colSpan={COLUMNS.length}
                  className="px-4 py-10 text-center text-sm text-zinc-500"
                >
                  No apps match. Try a different search or filter.
                </td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr key={row.day} className="align-top">
                  <td className="sticky left-0 z-10 max-w-[11rem] border-b border-zinc-100 bg-white px-2.5 py-2.5 font-medium dark:border-zinc-800 dark:bg-zinc-900">
                    {row.app}
                  </td>
                  <td className="border-b border-zinc-100 px-2.5 py-2.5 text-right tabular-nums text-zinc-500 dark:border-zinc-800">
                    {row.day}
                  </td>
                  <td className="border-b border-zinc-100 px-2.5 py-2.5 text-right tabular-nums dark:border-zinc-800">
                    {row.views}
                  </td>
                  <td className="border-b border-zinc-100 px-2.5 py-2.5 text-right font-medium tabular-nums dark:border-zinc-800">
                    {row.uniqueViews}
                  </td>
                  <td className="border-b border-zinc-100 px-2.5 py-2.5 text-right tabular-nums dark:border-zinc-800">
                    {row.clicks}
                    {row.popularClicks > 0 && (
                      <span
                        className="ml-1 cursor-help text-xs text-zinc-500"
                        title={`${row.popularClicks} more ${row.popularClicks === 1 ? "click" : "clicks"} came from the Most popular row. They are not included here or in the click rate.`}
                      >
                        (+{row.popularClicks})
                      </span>
                    )}
                  </td>
                  <td className="border-b border-zinc-100 px-2.5 py-2.5 text-right font-medium tabular-nums dark:border-zinc-800">
                    {row.uniqueClicks}
                  </td>
                  <td
                    className={`border-b border-zinc-100 px-2.5 py-2.5 text-right tabular-nums dark:border-zinc-800 ${
                      row.status.kind === "needs"
                        ? "text-zinc-400"
                        : "font-semibold"
                    }`}
                  >
                    {formatRate(row.rate)}
                  </td>
                  <td className="border-b border-zinc-100 px-2.5 py-2.5 text-right tabular-nums dark:border-zinc-800">
                    {row.repeat}
                  </td>
                  <td className="border-b border-zinc-100 px-2.5 py-2.5 text-right tabular-nums dark:border-zinc-800">
                    {row.signups}
                  </td>
                  <td className="border-b border-zinc-100 px-2.5 py-2.5 dark:border-zinc-800">
                    {row.status.kind === "popular" ? (
                      <span className="whitespace-nowrap rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">
                        Most popular #{row.status.rank}
                      </span>
                    ) : row.status.kind === "ranked" ? (
                      <span className="text-xs text-zinc-600 dark:text-zinc-300">
                        Ranked
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-500">
                        {row.status.text}
                      </span>
                    )}
                  </td>
                  <td
                    className="whitespace-nowrap border-b border-zinc-100 px-2.5 py-2.5 text-zinc-500 dark:border-zinc-800"
                    title={row.lastClickFull ?? undefined}
                  >
                    {row.lastClickLabel ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

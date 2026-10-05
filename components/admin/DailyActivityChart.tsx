"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { OverviewDay } from "@/lib/types";

type MeasureKey = "unique_views" | "unique_clicks" | "signups";

// Three charts stacked on one shared date axis, not three lines on one chart:
// views run far higher than signups, so on a single scale the signups line
// would sit flat on the floor, and a second scale on the right is easy to
// misread. Stacked, each keeps its own scale and the days still line up.
const PANELS: {
  key: MeasureKey;
  label: string;
  color: string;
  totalKey?: "views" | "clicks";
}[] = [
  {
    key: "unique_views",
    label: "Unique views",
    color: "var(--viz-views)",
    totalKey: "views",
  },
  {
    key: "unique_clicks",
    label: "Unique clicks",
    color: "var(--viz-clicks)",
    totalKey: "clicks",
  },
  { key: "signups", label: "Signups", color: "var(--viz-signups)" },
];

const SYNC_ID = "daily-activity";
const PLOT_HEIGHT = 96;
const AXIS_BAND = 26;
// Room under a chart that has no date axis, so its "0" label is not cut off.
const ZERO_LABEL_ROOM = 8;
// Above this many days the per-day dots would touch each other.
const MAX_DAYS_WITH_DOTS = 14;

// Which days get a date label: all of them for a week, otherwise five spread
// evenly from the first day to the last, so the labels are regularly spaced
// whatever the range.
function dateTicks(days: OverviewDay[]): string[] {
  const n = days.length;
  if (n <= 7) return days.map((d) => d.day);
  const count = 5;
  return Array.from(
    { length: count },
    (_, i) => days[Math.round((i * (n - 1)) / (count - 1))].day,
  );
}

// A round number at or above the largest value, chosen so the halfway
// gridline is a whole number too (0 / 5 / 10, 0 / 100 / 200).
function axisTop(max: number): number {
  if (max <= 10) return Math.max(2, 2 * Math.ceil(max / 2));
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 3, 4, 5, 6, 8, 10].find((s) => s * magnitude >= max);
  return (step ?? 10) * magnitude;
}

const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const whole = new Intl.NumberFormat("en-US");

export function DailyActivityChart({ days }: { days: OverviewDay[] }) {
  // The crosshair shows on all three charts at once; the readout box shows
  // only on the one being pointed at, so it is not drawn three times.
  const [pointedAt, setPointedAt] = useState<MeasureKey | null>(null);
  const showDots = days.length <= MAX_DAYS_WITH_DOTS;
  const ticks = dateTicks(days);

  return (
    <div>
      <div className="space-y-4">
        {PANELS.map((panel, i) => {
          const last = i === PANELS.length - 1;
          const peak = days.reduce(
            (best, d) => (d[panel.key] > best[panel.key] ? d : best),
            days[0],
          );
          const top = axisTop(peak ? peak[panel.key] : 0);
          return (
            <div
              key={panel.key}
              onPointerEnter={() => setPointedAt(panel.key)}
              onFocusCapture={() => setPointedAt(panel.key)}
            >
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: panel.color }}
                  />
                  {panel.label} per day
                </div>
                <div className="text-xs text-zinc-500">
                  {peak && peak[panel.key] > 0
                    ? `Busiest: ${format(parseISO(peak.day), "MMM d")} (${whole.format(peak[panel.key])})`
                    : "None in this range"}
                </div>
              </div>
              <div
                style={{
                  height: PLOT_HEIGHT + (last ? AXIS_BAND : ZERO_LABEL_ROOM),
                }}
                className="w-full"
              >
                {/* The chart sizes itself to this box. The older
                    ResponsiveContainer wrapper logs a size warning on every
                    first render. */}
                <AreaChart
                  responsive
                  style={{ width: "100%", height: "100%" }}
                  data={days}
                  syncId={SYNC_ID}
                  title={`${panel.label} per day`}
                  margin={{
                    top: 8,
                    right: 16,
                    bottom: last ? 0 : ZERO_LABEL_ROOM,
                    left: 0,
                  }}
                >
                  <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
                  <XAxis
                    dataKey="day"
                    hide={!last}
                    height={AXIS_BAND}
                    ticks={ticks}
                    tickFormatter={(day: string) =>
                      format(parseISO(day), "MMM d")
                    }
                    tick={{ fontSize: 11, fill: "var(--viz-label)" }}
                    tickLine={false}
                    tickMargin={6}
                    axisLine={{ stroke: "var(--viz-axis)" }}
                    // If the labels still would not fit (a week on a
                    // narrow phone), drop some but keep both ends.
                    interval="preserveStartEnd"
                    minTickGap={6}
                    padding={{ left: 8, right: 8 }}
                  />
                  <YAxis
                    width={36}
                    domain={[0, top]}
                    ticks={[0, top / 2, top]}
                    // Draw all three: left to itself the axis drops the
                    // "0" on charts that have no date axis under them.
                    interval={0}
                    tickFormatter={(v: number) => compact.format(v)}
                    tick={{ fontSize: 11, fill: "var(--viz-label)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    isAnimationActive={false}
                    cursor={{ stroke: "var(--viz-axis)", strokeWidth: 1 }}
                    allowEscapeViewBox={{ x: false, y: true }}
                    offset={14}
                    wrapperStyle={{ zIndex: 10, outline: "none" }}
                    content={({ active, payload }) => {
                      if (pointedAt !== panel.key || !active) return null;
                      const day = payload?.[0]?.payload as
                        | OverviewDay
                        | undefined;
                      return day ? <Readout day={day} /> : null;
                    }}
                  />
                  <Area
                    type="linear"
                    dataKey={panel.key}
                    stroke={panel.color}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    fill={panel.color}
                    fillOpacity={0.1}
                    dot={
                      showDots
                        ? {
                            r: 4,
                            fill: panel.color,
                            fillOpacity: 1,
                            stroke: "var(--viz-surface)",
                            strokeWidth: 2,
                          }
                        : false
                    }
                    activeDot={{
                      r: 5,
                      fill: panel.color,
                      stroke: "var(--viz-surface)",
                      strokeWidth: 2,
                    }}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </div>
            </div>
          );
        })}
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          Show as a table
        </summary>
        <div className="mt-3 max-h-72 overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
              <tr>
                <th className="px-3 py-2">Day</th>
                <th className="px-3 py-2 text-right">Total views</th>
                <th className="px-3 py-2 text-right">Unique views</th>
                <th className="px-3 py-2 text-right">Total clicks</th>
                <th className="px-3 py-2 text-right">Unique clicks</th>
                <th className="px-3 py-2 text-right">Signups</th>
              </tr>
            </thead>
            <tbody>
              {[...days].reverse().map((d) => (
                <tr
                  key={d.day}
                  className="border-t border-zinc-100 dark:border-zinc-800"
                >
                  <td className="whitespace-nowrap px-3 py-2">
                    {format(parseISO(d.day), "EEE, MMM d, yyyy")}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {whole.format(d.views)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {whole.format(d.unique_views)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {whole.format(d.clicks)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {whole.format(d.unique_clicks)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {whole.format(d.signups)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

// One box for the day under the pointer, listing all three measures, so the
// reader never has to aim at a particular line to get its number.
function Readout({ day }: { day: OverviewDay }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-md dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-1.5 font-medium text-zinc-500">
        {format(parseISO(day.day), "EEEE, MMM d")}
      </div>
      <div className="space-y-1">
        {PANELS.map((panel) => (
          <div key={panel.key} className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-0.5 w-3 rounded-full"
              style={{ backgroundColor: panel.color }}
            />
            <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              {whole.format(day[panel.key])}
            </span>
            <span className="text-zinc-500">
              {panel.label.toLowerCase()}
              {panel.totalKey &&
                ` (${whole.format(day[panel.totalKey])} total)`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

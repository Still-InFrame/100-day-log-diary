"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function MoodTrend({
  data,
}: {
  data: { day: number; mood: number }[];
}) {
  if (data.length === 0) {
    return (
      <div className="text-sm text-zinc-500">
        No mood data yet. Add a mood rating to entries to see the trend.
      </div>
    );
  }
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11 }}
            label={{ value: "Day", position: "insideBottom", fontSize: 11, offset: -2 }}
          />
          <YAxis
            domain={[1, 5]}
            ticks={[1, 2, 3, 4, 5]}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 6 }}
            cursor={{ stroke: "rgba(99,102,241,0.3)" }}
          />
          <Line
            type="monotone"
            dataKey="mood"
            stroke="#a855f7"
            strokeWidth={2}
            dot={{ fill: "#a855f7", r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

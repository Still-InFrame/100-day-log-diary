import { redirect } from "next/navigation";
import { getCurrentUser, getEntries, getProfile } from "@/lib/queries";
import { computeStreaks } from "@/lib/streaks";
import { todayISO } from "@/lib/dates";
import { CalendarHeatmap } from "@/components/CalendarHeatmap";
import { TechHistogram } from "@/components/TechHistogram";
import { MoodTrend } from "@/components/MoodTrend";

export default async function StatsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [profile, entries] = await Promise.all([
    getProfile(user.id),
    getEntries(user.id),
  ]);

  const startDate = profile?.challenge_start_date ?? todayISO();
  const streak = computeStreaks(entries, startDate);
  const totalMinutes = entries.reduce(
    (sum, e) => sum + e.time_spent_minutes,
    0,
  );
  const avgMinutes = entries.length ? Math.round(totalMinutes / entries.length) : 0;

  const techCounts = new Map<string, number>();
  for (const e of entries) {
    for (const t of e.tech_stack) {
      techCounts.set(t, (techCounts.get(t) ?? 0) + 1);
    }
  }
  const techData = [...techCounts.entries()]
    .map(([tech, count]) => ({ tech, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const moodData = entries
    .filter((e) => e.mood != null)
    .sort((a, b) => a.day_number - b.day_number)
    .map((e) => ({ day: e.day_number, mood: e.mood as number }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Stats</h1>
        <p className="text-sm text-zinc-500">
          The 100-day picture so far.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Total time" value={formatHours(totalMinutes)} />
        <Stat label="Avg per app" value={`${avgMinutes} min`} />
        <Stat label="Apps shipped" value={`${entries.length}`} />
        <Stat label="Longest streak" value={`${streak.longest}`} />
      </div>

      <Card title="Calendar — all 100 days">
        <CalendarHeatmap startDate={startDate} entries={entries} />
        <div className="mt-3 flex items-center gap-3 text-xs text-zinc-500">
          <Legend swatch="bg-zinc-100 dark:bg-zinc-800" label="Not logged" />
          <Legend swatch="bg-indigo-200 dark:bg-indigo-900" label="Light" />
          <Legend swatch="bg-indigo-400" label="Solid" />
          <Legend swatch="bg-indigo-600" label="Deep work" />
        </div>
      </Card>

      <Card title="Tech stack frequency">
        <TechHistogram data={techData} />
      </Card>

      <Card title="Mood over time">
        <MoodTrend data={moodData} />
      </Card>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded ${swatch}`} />
      <span>{label}</span>
    </span>
  );
}

function formatHours(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

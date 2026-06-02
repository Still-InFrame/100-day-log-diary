import Link from "next/link";
import { redirect } from "next/navigation";
import { getBadges, getCurrentUser, getEntries, getProfile } from "@/lib/queries";
import { computeStreaks } from "@/lib/streaks";
import { dayNumberFor, todayISO } from "@/lib/dates";
import { ProgressBar } from "@/components/ProgressBar";
import { StreakBanner } from "@/components/StreakBanner";
import { EntryCard } from "@/components/EntryCard";
import { BADGE_META } from "@/lib/types";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [profile, entries, badges] = await Promise.all([
    getProfile(user.id),
    getEntries(user.id),
    getBadges(user.id),
  ]);

  const startDate = profile?.challenge_start_date ?? todayISO();
  const today = todayISO();
  const todayDayNumber = Math.min(100, Math.max(1, dayNumberFor(today, startDate)));
  const streak = computeStreaks(entries, startDate);
  const recent = entries.slice(0, 6);

  const loggedToday = entries.some((e) => e.date === today);
  const todayEntry = entries.find((e) => e.date === today);

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h1 className="text-3xl font-semibold">100 Day AI Build Challenge</h1>
          <p className="mt-1 text-zinc-500">
            Ship one app per day. Log it here. Don&apos;t break the chain.
          </p>
        </div>
        <ProgressBar current={todayDayNumber} />
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        {loggedToday && todayEntry ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-medium text-emerald-600">
                ✓ Logged today — Day {todayEntry.day_number}
              </div>
              <div className="mt-1 text-lg font-semibold">
                {todayEntry.app_name}
              </div>
              <p className="text-sm text-zinc-500">{todayEntry.description}</p>
            </div>
            <Link
              href={`/entries/${todayEntry.day_number}`}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              View / edit
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-lg font-semibold">
                You haven&apos;t logged today.
              </div>
              <p className="text-sm text-zinc-500">
                Today is Day {todayDayNumber} — take 60 seconds to lock it in.
              </p>
            </div>
            <Link
              href="/log"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Log today&apos;s app
            </Link>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Progress</h2>
        <StreakBanner streak={streak} />
      </section>

      {badges.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Recent badges</h2>
          <div className="flex flex-wrap gap-3">
            {badges.slice(-6).map((b) => {
              const meta = BADGE_META[b.badge_type];
              return (
                <div
                  key={b.id}
                  className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                  title={meta.description}
                >
                  <span>{meta.emoji}</span>
                  <span className="font-medium">{meta.label}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Recent entries</h2>
          {entries.length > 6 && (
            <Link href="/entries" className="text-sm text-indigo-500 hover:underline">
              View all →
            </Link>
          )}
        </div>
        {recent.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
            No entries yet. Log your first app to kick off the challenge.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((e) => (
              <EntryCard key={e.id} entry={e} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

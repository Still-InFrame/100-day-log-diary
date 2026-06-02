import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  getBadges,
  getEntries,
  getProfileByHandle,
} from "@/lib/queries";
import { computeStreaks } from "@/lib/streaks";
import { dayNumberFor, formatLongDate, todayISO } from "@/lib/dates";
import { ProgressBar } from "@/components/ProgressBar";
import { StreakBanner } from "@/components/StreakBanner";
import { TrophyCase } from "@/components/TrophyCase";
import { PublicEntryCard } from "@/components/PublicEntryCard";
import type { BadgeType } from "@/lib/types";

type Params = Promise<{ handle: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getProfileByHandle(handle);
  if (!profile) return { title: "Not found · 100 Day Log" };
  const name = profile.display_name ?? handle;
  return {
    title: `${name}'s 100 Day Build Challenge`,
    description: `Follow ${name}'s progress building one app every day for 100 days.`,
  };
}

export default async function SharePage({ params }: { params: Params }) {
  const { handle } = await params;
  const profile = await getProfileByHandle(handle);
  if (!profile) notFound();

  const [entries, badges] = await Promise.all([
    getEntries(profile.user_id),
    getBadges(profile.user_id),
  ]);

  const startDate = profile.challenge_start_date;
  const todayDayNumber = Math.min(
    100,
    Math.max(1, dayNumberFor(todayISO(), startDate)),
  );
  const streak = computeStreaks(entries, startDate);
  const earned = new Set<BadgeType>(badges.map((b) => b.badge_type));
  const name = profile.display_name ?? handle;
  // Chronological story: Day 1 → latest.
  const ordered = [...entries].sort((a, b) => a.day_number - b.day_number);

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-4">
        {profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt=""
            width={64}
            height={64}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-200 text-2xl font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-semibold">
            {name}&apos;s 100 Day Build Challenge
          </h1>
          <p className="text-sm text-zinc-500">
            One app per day · started {formatLongDate(startDate)}
          </p>
        </div>
      </header>

      <ProgressBar current={todayDayNumber} />

      <StreakBanner streak={streak} />

      {badges.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Badges</h2>
          <TrophyCase earned={earned} />
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          The build log ({entries.length})
        </h2>
        {ordered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
            No entries logged yet.
          </div>
        ) : (
          <div className="space-y-4">
            {ordered.map((e) => (
              <PublicEntryCard key={e.id} entry={e} />
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-zinc-200 pt-6 text-center text-xs text-zinc-400 dark:border-zinc-800">
        Public progress page · 100 Day Log Diary
      </footer>
    </div>
  );
}

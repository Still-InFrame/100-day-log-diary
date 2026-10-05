import Image from "next/image";
import { headers } from "next/headers";
import { computeStreaks } from "@/lib/streaks";
import { dayNumberFor, formatLongDate, todayISO } from "@/lib/dates";
import { TOTAL_DAYS } from "@/lib/constants";
import { getCurrentUser, getPopularDays } from "@/lib/queries";
import { seededShuffle, visitorSeed } from "@/lib/shuffle";
import { ProgressBar } from "@/components/ProgressBar";
import { CompletionBanner } from "@/components/CompletionBanner";
import { StreakBanner } from "@/components/StreakBanner";
import { BadgeStrip } from "@/components/BadgeStrip";
import { PublicEntryCard } from "@/components/PublicEntryCard";
import { PopularApps } from "@/components/PopularApps";
import { ViewTracker } from "@/components/ViewTracker";
import type { Badge, BadgeType, Entry, Profile } from "@/lib/types";

// The public, read-only view of one person's challenge. Rendered at "/" for
// anonymous visitors (the lead-magnet front door) and at /share/[handle].
// Deliberately links nowhere into the authenticated app.
export async function Showcase({
  profile,
  entries,
  badges,
  handle,
}: {
  profile: Profile;
  entries: Entry[];
  badges: Badge[];
  handle: string;
}) {
  const startDate = profile.challenge_start_date;
  const today = todayISO();
  const todayDayNumber = Math.min(
    TOTAL_DAYS,
    Math.max(1, dayNumberFor(today, startDate)),
  );
  const streak = computeStreaks(entries, startDate);
  const complete = streak.totalLogged >= TOTAL_DAYS;
  const earned = new Set<BadgeType>(badges.map((b) => b.badge_type));
  const name = profile.display_name ?? handle;
  // The stored handle, not the URL's spelling of it: tracked links and the
  // signup form use it to attribute clicks and leads to this page's owner.
  const ownerHandle = profile.public_handle ?? handle;

  const [requestHeaders, popularDays, viewer] = await Promise.all([
    headers(),
    getPopularDays(profile.user_id),
    getCurrentUser(),
  ]);

  // The page exists to find out which apps people are drawn to, so the list
  // is not in day order: with 100 cards, day order would give the first few
  // nearly all the attention. Each visitor gets their own order, held steady
  // for the day. Every card still shows its day number and build date.
  const shuffled = seededShuffle(
    entries,
    visitorSeed(requestHeaders, today, ownerHandle),
  );

  const byDay = new Map(entries.map((e) => [e.day_number, e]));
  const popular = popularDays
    .map((day) => byDay.get(day))
    .filter((e): e is Entry => e !== undefined);

  // The owner looking at their own page is not a visitor.
  const countViews = viewer?.id !== profile.user_id;

  return (
    <div className="space-y-6">
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

      {/* A finished challenge gets one slim banner: the progress bar and the
          stat cards would only repeat it (100 of 100, none missed), and they
          pushed the apps off the first screen. A challenge still in progress
          keeps them, because there they say something. */}
      {complete ? (
        <CompletionBanner startDate={startDate} celebrate name={name} compact />
      ) : (
        <>
          <ProgressBar current={todayDayNumber} />
          <StreakBanner streak={streak} />
        </>
      )}

      {/* One line tall on purpose: the page is about the apps (see BadgeStrip). */}
      <BadgeStrip earned={earned} />

      <PopularApps entries={popular} handle={ownerHandle} />

      <section>
        <h2 className="mb-1 text-lg font-semibold">
          All {entries.length} {entries.length === 1 ? "app" : "apps"}
        </h2>
        <p className="mb-4 text-sm text-zinc-500">
          Try any of them, and tap &ldquo;Notify me&rdquo; on the ones
          you&apos;d actually use. Shown in no particular order.
        </p>
        {shuffled.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
            No entries logged yet.
          </div>
        ) : (
          // items-start: opening one card's form or details must not stretch
          // the other cards in its row.
          <div className="grid items-start gap-4 sm:grid-cols-2 md:grid-cols-3">
            {shuffled.map((e) => (
              <PublicEntryCard key={e.id} entry={e} handle={ownerHandle} />
            ))}
          </div>
        )}
      </section>

      {countViews && <ViewTracker handle={ownerHandle} />}

      <footer className="border-t border-zinc-200 pt-6 text-center text-xs text-zinc-400 dark:border-zinc-800">
        Public progress page · 100 Day Log Diary
      </footer>
    </div>
  );
}

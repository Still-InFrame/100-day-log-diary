import Image from "next/image";
import { redirect } from "next/navigation";
import {
  getBadges,
  getCurrentUser,
  getEntries,
  getProfile,
} from "@/lib/queries";
import { TrophyCase } from "@/components/TrophyCase";
import { ShareSettings } from "@/components/ShareSettings";
import { computeStreaks } from "@/lib/streaks";
import { formatLongDate, todayISO } from "@/lib/dates";
import type { BadgeType } from "@/lib/types";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [profile, entries, badges] = await Promise.all([
    getProfile(user.id),
    getEntries(user.id),
    getBadges(user.id),
  ]);

  const startDate = profile?.challenge_start_date ?? todayISO();
  const streak = computeStreaks(entries, startDate);
  const earnedSet = new Set<BadgeType>(badges.map((b) => b.badge_type));

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        {profile?.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt=""
            width={64}
            height={64}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-200 text-2xl font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {(profile?.display_name ?? user.email ?? "?").charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-semibold">
            {profile?.display_name ?? user.email}
          </h1>
          <p className="text-sm text-zinc-500">
            Challenge started {formatLongDate(startDate)}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Badges earned" value={`${badges.length} / 9`} />
        <Stat label="Apps shipped" value={`${entries.length}`} />
        <Stat label="Current streak" value={`${streak.current} 🔥`} />
      </div>

      <ShareSettings initialHandle={profile?.public_handle ?? null} />

      <section>
        <h2 className="mb-3 text-lg font-semibold">Trophy case</h2>
        <TrophyCase earned={earnedSet} />
      </section>
    </div>
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

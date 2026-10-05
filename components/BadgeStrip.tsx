import { BADGE_META, type BadgeType } from "@/lib/types";

// One compact row of the badges a user has earned, for public pages. It
// scrolls sideways rather than wrapping, so it never takes more than one
// line: the public page is about the apps, and the full grid of nine cards
// (see TrophyCase, still used on the private profile) pushed them far down.
export function BadgeStrip({ earned }: { earned: Set<BadgeType> }) {
  // BADGE_META's key order is the display order (milestones, then streaks).
  const list = (Object.keys(BADGE_META) as BadgeType[]).filter((b) =>
    earned.has(b),
  );
  if (list.length === 0) return null;

  return (
    <section aria-label="Badges earned">
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Badges
        </span>
        {list.map((b) => {
          const meta = BADGE_META[b];
          return (
            <span
              key={b}
              title={meta.description}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium dark:border-amber-700 dark:bg-amber-950"
            >
              <span aria-hidden>{meta.emoji}</span>
              {meta.label}
            </span>
          );
        })}
      </div>
    </section>
  );
}

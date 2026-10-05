import Image from "next/image";
import type { Entry } from "@/lib/types";
import { formatMediumDate } from "@/lib/dates";
import { NotifyMeForm } from "@/components/NotifyMeForm";

// One app on a public page, as a compact card: picture, name, one line about
// it, and the two things a visitor can do (open it, or ask to be notified).
// Everything else sits behind "Details".
//
// It is compact on purpose. The page exists to learn which apps people are
// drawn to, and that needs visitors to see many apps: the earlier full-height
// cards showed about one app per screen.
//
// Shows every field except the mood rating: it records how the builder felt
// that day, but beside an app it reads as a rating of the app. Deliberately
// links nowhere into the authenticated app. `handle` is the page owner's:
// clicks and signups from this card are recorded against that user.
export function PublicEntryCard({
  entry,
  handle,
  metaAds,
}: {
  entry: Entry;
  handle: string;
  // Whether this page loads the owner's Meta Pixel; the signup form's small
  // print depends on it.
  metaAds: boolean;
}) {
  // Outbound links go through /go so each click is recorded before the
  // visitor is redirected. noopener (not noreferrer) keeps the Referer header
  // so the click can be attributed to the page it came from; nofollow keeps
  // search crawlers from following the link and being counted as interest.
  const liveHref = `/go/${handle}/${entry.day_number}?t=live`;
  const codeHref = `/go/${handle}/${entry.day_number}?t=code`;
  const primaryHref = entry.live_url
    ? liveHref
    : entry.repo_url
      ? codeHref
      : null;
  const primaryLabel = entry.live_url ? "Open app →" : "View code →";

  const picture = entry.screenshot_url ? (
    <Image
      src={entry.screenshot_url}
      alt={`${entry.app_name} screenshot`}
      fill
      sizes="(max-width: 640px) 7rem, (max-width: 768px) 50vw, 20rem"
      className="object-cover object-top"
    />
  ) : (
    <div
      aria-hidden
      className="flex h-full items-center justify-center text-4xl font-semibold text-zinc-400"
    >
      {entry.app_name.charAt(0).toUpperCase()}
    </div>
  );

  // Layout: on phones the picture sits to the left of the text, so a card is
  // short and several fit on a screen. From the `sm` width up, cards sit in a
  // grid and the picture goes on top.
  const pictureClass =
    "relative block h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800 sm:aspect-video sm:h-auto sm:w-full sm:rounded-none";

  return (
    <article className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {/* The block ViewTracker watches to decide the card was seen. */}
      <div
        data-app-day={entry.day_number}
        className="flex gap-3 p-3 sm:block sm:p-0"
      >
        {primaryHref ? (
          <a
            href={primaryHref}
            target="_blank"
            rel="noopener nofollow"
            aria-label={`${primaryLabel.replace(" →", "")}: ${entry.app_name}`}
            className={pictureClass}
          >
            {picture}
          </a>
        ) : (
          <div className={pictureClass}>{picture}</div>
        )}

        <div className="min-w-0 flex-1 sm:px-4 sm:pt-3">
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="font-medium uppercase tracking-wide text-indigo-500">
              Day {entry.day_number}
            </span>
            <span className="text-zinc-500">
              {formatMediumDate(entry.date)}
            </span>
          </div>
          <h3 className="mt-1 line-clamp-2 font-semibold leading-snug">
            {entry.app_name}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
            {entry.description}
          </p>
        </div>
      </div>

      {/* One wrapping row: the buttons, then "Details" pushed to the right.
          The signup form opens over the page (see NotifyMeForm), so only the
          opened details ever add a line here. */}
      <div className="flex flex-wrap items-center gap-2 px-3 pb-3 sm:px-4 sm:pb-4 sm:pt-3">
        {primaryHref && (
          <a
            href={primaryHref}
            target="_blank"
            rel="noopener nofollow"
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            {primaryLabel}
          </a>
        )}
        <NotifyMeForm
          handle={handle}
          dayNumber={entry.day_number}
          appName={entry.app_name}
          metaAds={metaAds}
        />

        <details className="group ml-auto open:ml-0 open:basis-full">
          <summary className="cursor-pointer list-none py-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Details ▾</span>
            <span className="hidden group-open:inline">Hide details ▴</span>
          </summary>

          <div className="mt-2 space-y-3 text-sm">
            <p className="text-zinc-700 dark:text-zinc-300">
              {entry.description}
            </p>

            <div className="flex flex-wrap gap-1">
              {entry.tech_stack.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {t}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
              <span>{entry.time_spent_minutes} min to build</span>
              {/* Shown here only when the picture and button already go to the
                live app; otherwise the button above is this same link. */}
              {entry.live_url && entry.repo_url && (
                <a
                  href={codeHref}
                  target="_blank"
                  rel="noopener nofollow"
                  className="text-indigo-500 hover:underline"
                >
                  View code →
                </a>
              )}
            </div>

            {entry.learnings && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  What I learned
                </div>
                <p className="mt-1 whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
                  {entry.learnings}
                </p>
              </div>
            )}

            {entry.challenges && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Challenges &amp; blockers
                </div>
                <p className="mt-1 whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
                  {entry.challenges}
                </p>
              </div>
            )}
          </div>
        </details>
      </div>
    </article>
  );
}

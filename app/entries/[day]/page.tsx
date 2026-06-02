import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, getEntryByDay } from "@/lib/queries";
import { formatLongDate } from "@/lib/dates";
import { EntryForm } from "@/components/EntryForm";
import { DeleteEntryButton } from "@/components/DeleteEntryButton";

type Params = Promise<{ day: string }>;
type SearchParams = Promise<{ edit?: string }>;

export default async function EntryDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { day } = await params;
  const { edit } = await searchParams;
  const dayNum = Number(day);
  if (!Number.isFinite(dayNum) || dayNum < 1 || dayNum > 100) notFound();

  const entry = await getEntryByDay(user.id, dayNum);
  if (!entry) notFound();

  if (edit === "1") {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href={`/entries/${dayNum}`} className="text-sm text-zinc-500 hover:underline">
          ← Back to Day {dayNum}
        </Link>
        <h1 className="text-2xl font-semibold">Edit Day {dayNum}</h1>
        <EntryForm userId={user.id} existing={entry} />
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/entries" className="text-sm text-zinc-500 hover:underline">
          ← All entries
        </Link>
        <div className="mt-2 flex items-baseline justify-between gap-4">
          <div>
            <div className="text-sm font-medium uppercase tracking-wide text-indigo-500">
              Day {entry.day_number}
            </div>
            <h1 className="mt-1 text-3xl font-semibold">{entry.app_name}</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {formatLongDate(entry.date)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/entries/${dayNum}?edit=1`}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Edit
            </Link>
            <DeleteEntryButton id={entry.id} />
          </div>
        </div>
      </div>

      <p className="text-lg text-zinc-700 dark:text-zinc-300">
        {entry.description}
      </p>

      {entry.screenshot_url && (
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <Image
            src={entry.screenshot_url}
            alt={`${entry.app_name} screenshot`}
            width={1600}
            height={1000}
            sizes="(max-width: 768px) 100vw, 48rem"
            className="h-auto w-full"
          />
        </div>
      )}

      <dl className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-3">
        <Stat label="Time spent" value={`${entry.time_spent_minutes} min`} />
        <Stat
          label="Link"
          value={
            <a
              href={entry.repo_url}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-500 hover:underline"
            >
              View →
            </a>
          }
        />
        <Stat
          label="Mood"
          value={entry.mood ? "★".repeat(entry.mood) + "☆".repeat(5 - entry.mood) : "—"}
        />
        <Stat
          label="Tech stack"
          value={
            <div className="flex flex-wrap gap-1">
              {entry.tech_stack.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800"
                >
                  {t}
                </span>
              ))}
            </div>
          }
          span={3}
        />
      </dl>

      {entry.learnings && (
        <Section title="What I learned">
          <p className="whitespace-pre-wrap">{entry.learnings}</p>
        </Section>
      )}

      {entry.challenges && (
        <Section title="Challenges & blockers">
          <p className="whitespace-pre-wrap">{entry.challenges}</p>
        </Section>
      )}
    </article>
  );
}

function Stat({
  label,
  value,
  span,
}: {
  label: string;
  value: React.ReactNode;
  span?: number;
}) {
  return (
    <div className={span === 3 ? "sm:col-span-3" : undefined}>
      <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </h2>
      <div className="text-zinc-800 dark:text-zinc-200">{children}</div>
    </section>
  );
}

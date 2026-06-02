import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getEntries } from "@/lib/queries";
import { EntryCard } from "@/components/EntryCard";

export default async function EntriesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const entries = await getEntries(user.id);

  const allTech = Array.from(
    new Set(entries.flatMap((e) => e.tech_stack)),
  ).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">All entries</h1>
        <Link
          href="/log"
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          + New entry
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No entries yet. Log your first one to begin the challenge.
        </div>
      ) : (
        <>
          {allTech.length > 0 && (
            <div className="flex flex-wrap gap-1.5 text-xs">
              <span className="self-center text-zinc-500">
                {entries.length} entries •
              </span>
              {allTech.slice(0, 12).map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {t}
                </span>
              ))}
              {allTech.length > 12 && (
                <span className="self-center text-zinc-500">
                  +{allTech.length - 12} more
                </span>
              )}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((e) => (
              <EntryCard key={e.id} entry={e} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

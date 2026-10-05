import Form from "next/form";
import Link from "next/link";
import { PRESETS, presetHref, type OverviewRange } from "@/lib/overview-range";

const FIELD =
  "rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:[color-scheme:dark]";

// Quick ranges on the left, exact dates on the right. Both only change the
// URL (see lib/overview-range.ts); the page does the rest.
export function RangeFilter({
  range,
  basePath,
  today,
}: {
  range: OverviewRange;
  basePath: string;
  today: string;
}) {
  const custom = range.preset === null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <nav
        aria-label="Date range"
        className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-900"
      >
        {PRESETS.map((preset) => {
          const active = preset.id === range.preset;
          return (
            <Link
              key={preset.id}
              href={presetHref(basePath, preset.id)}
              // Switching range should not jump the page back to the top.
              scroll={false}
              aria-current={active ? "true" : undefined}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                active
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              {preset.label}
            </Link>
          );
        })}
      </nav>

      {/* A plain GET form: submitting it puts ?from=&to= in the URL. The key
          makes the fields start again from the new range after a quick
          range is picked; without it they would keep the dates typed
          before. */}
      <Form
        key={`${range.preset}-${range.from}-${range.to}`}
        action={basePath}
        scroll={false}
        className="flex flex-wrap items-center gap-2 text-sm text-zinc-500"
      >
        <label className="flex items-center gap-1.5">
          From
          <input
            type="date"
            name="from"
            defaultValue={range.from ?? ""}
            max={today}
            className={FIELD}
          />
        </label>
        <label className="flex items-center gap-1.5">
          to
          <input
            type="date"
            name="to"
            defaultValue={range.to}
            max={today}
            className={FIELD}
          />
        </label>
        <button
          type="submit"
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            custom
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "border border-zinc-200 bg-white text-zinc-700 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          }`}
        >
          Apply
        </button>
      </Form>
    </div>
  );
}

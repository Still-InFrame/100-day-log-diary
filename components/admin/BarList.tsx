// A ranked list drawn as horizontal bars. Every row prints its name and its
// value as ordinary text, so nothing has to be read off the bar itself and
// the list works as its own table for a screen reader.

export type BarListItem = {
  key: string | number;
  label: string;
  // Small grey text after the label, e.g. "Day 12".
  hint?: string;
  // Sets the bar's length.
  value: number;
  // What is printed for the value, e.g. "19" or "42%".
  display: string;
  // Small grey text before the value, e.g. "8 of 19".
  note?: string;
  // Overrides the list's color for this row.
  color?: string;
  // Makes the row's name a button (the map's lists use it to drill in).
  onSelect?: () => void;
};

export function BarList({
  items,
  color,
  max,
}: {
  items: BarListItem[];
  color: string;
  // The value a full-width bar stands for. Defaults to the largest value in
  // the list; pass 1 for rates so 50% is always half the width.
  max?: number;
}) {
  const top = max ?? Math.max(...items.map((i) => i.value), 0);
  return (
    <ol className="space-y-3">
      {items.map((item) => {
        const share = top > 0 ? Math.min(1, item.value / top) : 0;
        return (
          <li key={item.key} className="group">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate" title={item.label}>
                {item.onSelect ? (
                  <button
                    type="button"
                    onClick={item.onSelect}
                    className="font-medium underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900 dark:decoration-zinc-600 dark:hover:decoration-zinc-100"
                  >
                    {item.label}
                  </button>
                ) : (
                  <span className="font-medium">{item.label}</span>
                )}
                {item.hint && (
                  <span className="text-xs text-zinc-500"> {item.hint}</span>
                )}
              </span>
              {/* Note first, so the values line up down the right edge. */}
              <span className="shrink-0 tabular-nums">
                {item.note && (
                  <span className="text-xs text-zinc-500">{item.note} </span>
                )}
                <span className="font-semibold">{item.display}</span>
              </span>
            </div>
            <div
              aria-hidden
              className="mt-1.5 h-2 border-l border-[var(--viz-axis)]"
            >
              <div
                className="h-full rounded-r-[4px] transition-[filter] group-hover:brightness-110"
                style={{
                  width: `${share * 100}%`,
                  // A non-zero value never rounds down to an invisible bar.
                  minWidth: item.value > 0 ? 3 : 0,
                  backgroundColor: item.color ?? color,
                }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

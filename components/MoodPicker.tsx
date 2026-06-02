"use client";

const MOODS = [
  { value: 1, emoji: "😩", label: "Drained" },
  { value: 2, emoji: "😕", label: "Off" },
  { value: 3, emoji: "😐", label: "OK" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "🤩", label: "Great" },
];

export function MoodPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="flex gap-2">
      {MOODS.map((m) => {
        const active = value === m.value;
        return (
          <button
            key={m.value}
            type="button"
            onClick={() => onChange(active ? null : m.value)}
            className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition ${
              active
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950"
                : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700"
            }`}
            aria-pressed={active}
          >
            <span className="text-2xl">{m.emoji}</span>
            <span>{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}

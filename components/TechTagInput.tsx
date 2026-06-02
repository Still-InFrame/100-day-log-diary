"use client";

import { useState } from "react";
import { COMMON_TECH } from "@/lib/constants";

export function TechTagInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [input, setInput] = useState("");

  function addTag(tag: string) {
    const t = tag.trim();
    if (!t) return;
    if (value.includes(t)) return;
    onChange([...value, t]);
    setInput("");
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  const suggestions = COMMON_TECH.filter(
    (t) => !value.includes(t) && t.toLowerCase().includes(input.toLowerCase()),
  ).slice(0, 5);

  return (
    <div>
      <div className="flex flex-wrap gap-2 rounded-md border border-zinc-300 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-sm text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-0.5 text-indigo-500 hover:text-indigo-900 dark:hover:text-white"
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag(input);
            } else if (e.key === "Backspace" && !input && value.length) {
              removeTag(value[value.length - 1]);
            }
          }}
          placeholder={value.length ? "" : "Type and press Enter (e.g. Next.js)"}
          className="flex-1 min-w-[120px] bg-transparent text-sm outline-none"
        />
      </div>
      {input && suggestions.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

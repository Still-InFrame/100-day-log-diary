"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setMetaPixelId } from "@/app/actions/profile";

// The Settings card's form for a Meta Pixel ID: save one, change it, or
// remove it. What the pixel does once saved is in components/MetaPixel.tsx.
export function MetaPixelSettings({ current }: { current: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(current ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  function save(next: string | null) {
    setError(null);
    setSaved(null);
    startTransition(async () => {
      const result = await setMetaPixelId(next);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setValue(result.pixelId ?? "");
      setSaved(result.pixelId ? "Saved." : "Removed.");
      router.refresh();
    });
  }

  const unchanged = value.trim() === (current ?? "");

  return (
    <form
      className="mt-4 space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!pending) save(value);
      }}
    >
      <label
        htmlFor="meta-pixel-id"
        className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        Pixel ID
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id="meta-pixel-id"
          name="meta-pixel-id"
          inputMode="numeric"
          autoComplete="off"
          placeholder="e.g. 1234567890123456"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(null);
          }}
          className="block w-64 max-w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
        <button
          type="submit"
          disabled={pending || unchanged || value.trim() === ""}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {current && (
          <button
            type="button"
            onClick={() => save(null)}
            disabled={pending}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Remove
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {saved && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          {saved}
        </p>
      )}
    </form>
  );
}

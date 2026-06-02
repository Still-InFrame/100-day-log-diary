"use client";

import { useState, useTransition } from "react";
import { deleteEntry } from "@/app/actions/entries";

export function DeleteEntryButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (confirming) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-zinc-500">Sure?</span>
        <button
          onClick={() => startTransition(() => deleteEntry(id))}
          disabled={pending}
          className="rounded-md bg-red-600 px-2.5 py-1 font-medium text-white hover:bg-red-700"
        >
          {pending ? "Deleting…" : "Delete"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Cancel
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={() => setConfirming(true)}
      className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
    >
      Delete
    </button>
  );
}

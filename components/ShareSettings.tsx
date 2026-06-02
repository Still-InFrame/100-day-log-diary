"use client";

import { useState, useTransition } from "react";
import { setPublicHandle } from "@/app/actions/profile";

export function ShareSettings({ initialHandle }: { initialHandle: string | null }) {
  const [handle, setHandle] = useState<string | null>(initialHandle);
  const [input, setInput] = useState(initialHandle ?? "");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const path = handle ? `/share/${handle}` : null;

  function publish() {
    setError(null);
    startTransition(async () => {
      const res = await setPublicHandle(input);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setHandle(res.handle);
    });
  }

  function makePrivate() {
    setError(null);
    startTransition(async () => {
      const res = await setPublicHandle(null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setHandle(null);
      setInput("");
    });
  }

  function copy() {
    if (!path) return;
    navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold">Share your progress</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Publish a public, read-only page of your challenge. Anyone with the link
        can follow along — no sign-in required.
      </p>

      {handle ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200">
              Public
            </span>
            <code className="rounded bg-zinc-100 px-2 py-1 text-sm dark:bg-zinc-800">
              {path}
            </code>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={path!}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              View page →
            </a>
            <button
              type="button"
              onClick={copy}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              {copied ? "Copied!" : "Copy link"}
            </button>
            <button
              type="button"
              onClick={makePrivate}
              disabled={pending}
              className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:hover:bg-red-950"
            >
              {pending ? "Working…" : "Make private"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-zinc-500">/share/</span>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="your-handle"
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950"
            />
            <button
              type="button"
              onClick={publish}
              disabled={pending || !input.trim()}
              className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {pending ? "Publishing…" : "Publish"}
            </button>
          </div>
          <p className="text-xs text-zinc-500">
            Lowercase letters, numbers, and hyphens. 3–30 characters.
          </p>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
    </section>
  );
}

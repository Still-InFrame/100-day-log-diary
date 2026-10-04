"use client";

import { useState, useTransition } from "react";
import { sendTestContact, type AdminResult } from "@/app/actions/interest";

export function TestContactButton({ disabled }: { disabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AdminResult | null>(null);

  function run() {
    setResult(null);
    startTransition(async () => {
      setResult(await sendTestContact());
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={run}
        disabled={disabled || pending}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {pending ? "Testing…" : "Send test contact"}
      </button>
      {result && result.ok && (
        <p className="text-sm text-emerald-600">
          {result.message}{" "}
          {result.url && (
            <a
              href={result.url}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Open it in HighLevel →
            </a>
          )}
        </p>
      )}
      {result && !result.ok && (
        <p className="text-sm text-red-500">{result.error}</p>
      )}
    </div>
  );
}

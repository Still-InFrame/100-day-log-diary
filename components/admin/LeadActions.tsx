"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { retryLeadSync, sendLeadText } from "@/app/actions/interest";

const MAX_TEXT_LENGTH = 1000;
const buttonClass =
  "rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800";

// Per-lead actions in the admin. Whether an action is offered is decided on
// the server and passed in; the server actions re-check everything anyway.
export function LeadActions({
  leadId,
  firstName,
  appName,
  contactLink,
  canSync,
  syncLabel,
  textBlockedReason,
}: {
  leadId: string;
  firstName: string;
  appName: string;
  // Link to this contact inside HighLevel, when it has been synced.
  contactLink: string | null;
  canSync: boolean;
  syncLabel: string;
  // null means texting is allowed; otherwise the reason it is not.
  textBlockedReason: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [composing, setComposing] = useState(false);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  function sync() {
    setNotice(null);
    startTransition(async () => {
      const res = await retryLeadSync(leadId);
      setNotice({ ok: res.ok, text: res.ok ? res.message : res.error });
      router.refresh();
    });
  }

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setNotice(null);
    startTransition(async () => {
      const res = await sendLeadText(leadId, message);
      setNotice({ ok: res.ok, text: res.ok ? res.message : res.error });
      if (res.ok) {
        setMessage("");
        setComposing(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {contactLink && (
          <a
            href={contactLink}
            target="_blank"
            rel="noreferrer"
            className={buttonClass}
          >
            Open in HighLevel →
          </a>
        )}
        {canSync && (
          <button
            type="button"
            onClick={sync}
            disabled={pending}
            className={buttonClass}
          >
            {pending && !composing ? "Working…" : syncLabel}
          </button>
        )}
        {textBlockedReason === null ? (
          <button
            type="button"
            onClick={() => setComposing((v) => !v)}
            disabled={pending}
            className={buttonClass}
          >
            {composing ? "Cancel text" : "Send text"}
          </button>
        ) : (
          <span className="text-xs text-zinc-500">
            Can&apos;t text: {textBlockedReason}
          </span>
        )}
      </div>

      {composing && textBlockedReason === null && (
        <form onSubmit={send} className="space-y-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={MAX_TEXT_LENGTH}
            required
            placeholder={`Hi ${firstName}, thanks for your interest in ${appName}…`}
            className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950"
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pending || !message.trim()}
              className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {pending ? "Sending…" : `Send to ${firstName}`}
            </button>
            <span className="text-xs text-zinc-500">
              {message.length}/{MAX_TEXT_LENGTH} · sent from your HighLevel
              number
            </span>
          </div>
        </form>
      )}

      {notice && (
        <p
          className={`text-xs ${notice.ok ? "text-emerald-600" : "text-red-500"}`}
        >
          {notice.text}
        </p>
      )}
    </div>
  );
}

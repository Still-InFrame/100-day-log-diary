"use client";

import { useId, useState, useTransition } from "react";
import { submitInterest } from "@/app/actions/interest";
import { smsConsentText } from "@/lib/constants";

const inputClass =
  "block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950";

// Per-app waitlist signup shown on each public card. Collapsed to a single
// button until someone asks for it, so 100 cards do not show 100 forms.
// It renders inside the card's row of actions (a wrapping flex row): the
// button sits beside "Open app", and the form or the confirmation takes the
// full width below (basis-full).
export function NotifyMeForm({
  handle,
  dayNumber,
  appName,
}: {
  // The page owner's handle; the signup is saved as their lead.
  handle: string;
  dayNumber: number;
  appName: string;
}) {
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<null | "new" | "already">(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [smsConsent, setSmsConsent] = useState(false);
  const [trap, setTrap] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await submitInterest({
        handle,
        dayNumber,
        firstName,
        email,
        phone,
        smsConsent: smsConsent && phone.trim() !== "",
        trap,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone(result.already ? "already" : "new");
    });
  }

  if (done) {
    return (
      <p className="basis-full rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
        {done === "already"
          ? `You're already on the list for ${appName}.`
          : `You're on the list for ${appName}.`}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`Notify me when ${appName} launches`}
        className="rounded-md border border-indigo-300 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-950"
      >
        Notify me
      </button>
    );
  }

  const hasPhone = phone.trim() !== "";

  return (
    <form
      onSubmit={handleSubmit}
      className="basis-full space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="text-sm font-medium">
        Get notified when {appName} launches
      </div>

      {/* One column: the form opens inside a narrow card. */}
      <div className="grid gap-3">
        <div>
          <label
            htmlFor={`${formId}-name`}
            className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
          >
            First name
          </label>
          <input
            id={`${formId}-name`}
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            maxLength={80}
            autoComplete="given-name"
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor={`${formId}-email`}
            className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
          >
            Email
          </label>
          <input
            id={`${formId}-email`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={254}
            autoComplete="email"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor={`${formId}-phone`}
          className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
        >
          Mobile number (optional)
        </label>
        <input
          id={`${formId}-phone`}
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={32}
          autoComplete="tel"
          className={inputClass}
        />
      </div>

      {hasPhone && (
        <label className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={smsConsent}
            onChange={(e) => setSmsConsent(e.target.checked)}
            className="mt-0.5"
          />
          <span>{smsConsentText(appName)}</span>
        </label>
      )}

      {/* Honeypot: kept off-screen and out of the tab order. People never
          see it; a value here suggests a bot filled the form.

          It must not look like anything a browser or password manager would
          autofill. It was once labelled "Website", and a phone's contact
          autofill appears to have filled it, which at the time made a real
          signup vanish. Hence the meaningless name, autocomplete off, and the
          ignore hints for password managers. The server no longer discards a
          signup that trips this; it stores it and holds it for review. */}
      <div
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
      >
        <label htmlFor={`${formId}-hp`}>Leave this field empty</label>
        <input
          id={`${formId}-hp`}
          name="hp_confirm"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          data-1p-ignore
          data-lpignore="true"
          data-form-type="other"
          value={trap}
          onChange={(e) => setTrap(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Notify me"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-zinc-500 hover:underline"
        >
          Cancel
        </button>
      </div>
      <p className="text-xs text-zinc-500">
        Your details are only used to contact you about this app.
      </p>
    </form>
  );
}

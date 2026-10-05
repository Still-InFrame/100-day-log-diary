"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { submitInterest } from "@/app/actions/interest";
import { smsConsentText } from "@/lib/constants";
import { currentVisitSource } from "@/lib/traffic-source";
import { trackPixelLead } from "@/components/MetaPixel";
import { PRIVACY_PATH } from "@/lib/legal";

// 16px on phones: iOS Safari zooms the whole page in when a field with
// smaller text is focused, and does not zoom back out.
const inputClass =
  "block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm dark:border-zinc-700 dark:bg-zinc-950";

const labelClass =
  "mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400";

// Per-app waitlist signup. On the card it is only ever one small button (or,
// once signed up, a chip the same size), so opening it never changes the
// card's height or pushes the grid around. The form itself opens over the
// page in a native <dialog>: a sheet rising from the bottom on a phone,
// where it is within reach of a thumb, and a centred box on larger screens.
// A native dialog also brings focus trapping, Escape to close, and focus
// going back to the button afterwards, without any of it being hand-built.
//
// The dialog is only in the page while it is open: there is one of these per
// card, and a hundred hidden forms would be a lot of markup for nothing.
export function NotifyMeForm({
  handle,
  dayNumber,
  appName,
  metaAds,
}: {
  // The page owner's handle; the signup is saved as their lead.
  handle: string;
  dayNumber: number;
  appName: string;
  // True when this page loads the owner's Meta Pixel. The small print under
  // the form has to say so: with "automatic advanced matching" on in the
  // pixel's settings, Meta's script takes a scrambled copy of what is typed
  // here, and the form must not promise otherwise.
  metaAds: boolean;
}) {
  const formId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<null | "new" | "already">(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [smsConsent, setSmsConsent] = useState(false);
  const [trap, setTrap] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog || dialog.open) return;
    dialog.showModal();
    // With a mouse or trackpad, start in the first field. On a touch screen
    // that would throw the keyboard up over the sheet before it has been
    // read, so focus stays where the dialog puts it.
    if (window.matchMedia("(pointer: fine)").matches) {
      firstFieldRef.current?.focus();
    }
  }, [open]);

  // Closing goes through the dialog itself, so the browser hands focus back
  // to the button that opened it; its close event then clears `open`.
  const close = () => dialogRef.current?.close();

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
        source: currentVisitSource(),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // A repeat signup is not a new lead.
      if (!result.already) trackPixelLead(appName);
      setDone(result.already ? "already" : "new");
    });
  }

  const hasPhone = phone.trim() !== "";
  const titleId = `${formId}-title`;

  return (
    <>
      {done ? (
        // Same box as the button it replaces, so the card does not move.
        <span className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          On the list ✓
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title={`Notify me when ${appName} launches`}
          aria-haspopup="dialog"
          className="rounded-md border border-indigo-300 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-950"
        >
          Notify me
        </button>
      )}

      {open && (
        <dialog
          ref={dialogRef}
          aria-labelledby={titleId}
          onClose={() => setOpen(false)}
          // The dialog has no padding of its own, so a click that lands on
          // the element itself can only be a click on the dimmed backdrop.
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
          className="signup-dialog m-0 mt-auto max-h-[90dvh] w-full max-w-full overflow-y-auto rounded-t-2xl border-0 bg-white p-0 text-zinc-900 shadow-2xl backdrop:bg-zinc-950/60 sm:m-auto sm:max-w-md sm:rounded-2xl dark:bg-zinc-900 dark:text-zinc-100"
        >
          <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
            {/* The grab bar says "sheet" on a phone; it is decoration only. */}
            <div
              aria-hidden
              className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-300 sm:hidden dark:bg-zinc-700"
            />

            <div className="flex items-start justify-between gap-4">
              <h2 id={titleId} className="text-base font-semibold leading-snug">
                {done
                  ? done === "already"
                    ? "You're already on the list"
                    : "You're on the list"
                  : `Get notified when ${appName} launches`}
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="-mr-1 -mt-1 rounded-md p-1 text-xl leading-none text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                ×
              </button>
            </div>

            {done ? (
              <div className="mt-3 space-y-4">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {done === "already"
                    ? `These details were already signed up for ${appName}. You'll hear when it launches.`
                    : `You'll hear from us when ${appName} launches.`}
                </p>
                <button
                  type="button"
                  onClick={close}
                  autoFocus
                  className="w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 sm:w-auto sm:py-2"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                <div>
                  <label htmlFor={`${formId}-name`} className={labelClass}>
                    First name
                  </label>
                  <input
                    ref={firstFieldRef}
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
                  <label htmlFor={`${formId}-email`} className={labelClass}>
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
                <div>
                  <label htmlFor={`${formId}-phone`} className={labelClass}>
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

                {/* Honeypot: kept off-screen and out of the tab order. People
                    never see it; a value here suggests a bot filled the form.

                    It must not look like anything a browser or password
                    manager would autofill. It was once labelled "Website",
                    and a phone's contact autofill appears to have filled it,
                    which at the time made a real signup vanish. Hence the
                    meaningless name, autocomplete off, and the ignore hints
                    for password managers. The server no longer discards a
                    signup that trips this; it stores it and holds it for
                    review. */}
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

                <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:gap-3">
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 sm:py-2"
                  >
                    {pending ? "Saving…" : "Notify me"}
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-md px-3 py-2 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-xs text-zinc-500">
                  {metaAds
                    ? "We use your details to contact you about this app. This page also uses Meta's advertising tools, which receive a scrambled copy of your name, email and phone number so we can measure and show ads."
                    : "Your details are only used to contact you about this app."}{" "}
                  {/* New tab, so what has been typed is not lost. */}
                  <a
                    href={PRIVACY_PATH}
                    target="_blank"
                    rel="noopener"
                    className="underline hover:text-zinc-700 dark:hover:text-zinc-300"
                  >
                    Privacy policy and message terms
                  </a>
                  .
                </p>
              </form>
            )}
          </div>
        </dialog>
      )}
    </>
  );
}

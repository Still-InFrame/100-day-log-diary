"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { addDays, format, parseISO } from "date-fns";
import { TOTAL_DAYS } from "@/lib/constants";

// A finished-challenge celebration. Shown in place of the daily "log today"
// prompt once every one of the 100 days is logged. Intentionally louder than
// the standard log card: full-bleed gradient, trophy chip, one-time confetti.
function fireConfetti() {
  const colors = ["#6366f1", "#a855f7", "#ec4899", "#f59e0b", "#fbbf24"];
  // A big central pop...
  confetti({
    particleCount: 160,
    spread: 100,
    startVelocity: 45,
    scalar: 1.1,
    origin: { y: 0.35 },
    colors,
  });
  // ...then side cannons for ~1.5s.
  const end = Date.now() + 1500;
  (function frame() {
    confetti({ particleCount: 5, angle: 60, spread: 75, origin: { x: 0 }, colors });
    confetti({ particleCount: 5, angle: 120, spread: 75, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

export function CompletionBanner({
  startDate,
  celebrate = false,
}: {
  startDate: string;
  celebrate?: boolean;
}) {
  const fired = useRef(false);

  // Day 1 = startDate, Day 100 = startDate + 99. Use date-fns `format` on the
  // Date directly (not toISOString) to avoid a UTC round-trip shifting the day.
  const startLabel = format(parseISO(startDate), "MMMM d, yyyy");
  const endLabel = format(addDays(parseISO(startDate), TOTAL_DAYS - 1), "MMMM d, yyyy");

  useEffect(() => {
    if (!celebrate || fired.current) return;
    // Fire at most once per browser session so it doesn't re-burst on every
    // navigation back to the dashboard/profile/share page.
    const KEY = "completion-confetti-fired";
    try {
      if (sessionStorage.getItem(KEY)) return;
      sessionStorage.setItem(KEY, "1");
    } catch {
      // sessionStorage can throw (private mode, blocked storage) — fall through
      // and just fire once for this mount.
    }
    fired.current = true;
    fireConfetti();
  }, [celebrate]);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-8 text-white shadow-lg ring-1 ring-white/10">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-8 select-none text-8xl opacity-20"
      >
        🎉
      </div>
      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur">
          🏆 Challenge complete
        </div>
        <h2 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
          {TOTAL_DAYS} days. {TOTAL_DAYS} apps. Done.
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-white/85 sm:text-base">
          You shipped one app every single day for {TOTAL_DAYS} straight days —{" "}
          {startLabel} through {endLabel}. The chain never broke.
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-sm font-medium">
          <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">
            {TOTAL_DAYS} apps shipped
          </span>
          <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">
            {TOTAL_DAYS} days straight
          </span>
          <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">
            0 days missed
          </span>
        </div>
      </div>
    </div>
  );
}

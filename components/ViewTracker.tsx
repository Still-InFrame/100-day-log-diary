"use client";

import { useEffect } from "react";

const ENDPOINT = "/api/views";
// A card counts as seen once this much of its heading block has stayed on
// screen for this long. A fast scroll past does not count.
const VISIBLE_RATIO = 0.6;
const DWELL_MS = 1000;
const FLUSH_EVERY_MS = 3000;

// Watches the app cards on a public page (elements marked data-app-day) and
// reports which ones the visitor actually saw. Each card is reported at most
// once per page load. Renders nothing.
export function ViewTracker({ handle }: { handle: string }) {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const pending = new Set<number>();
    const seen = new Set<number>();
    const timers = new Map<Element, number>();

    const flush = () => {
      if (pending.size === 0) return;
      const body = JSON.stringify({ handle, days: [...pending] });
      pending.clear();
      // sendBeacon survives the page being closed; fall back to fetch.
      const sent =
        typeof navigator.sendBeacon === "function" &&
        navigator.sendBeacon(
          ENDPOINT,
          new Blob([body], { type: "application/json" }),
        );
      if (!sent) {
        fetch(ENDPOINT, {
          method: "POST",
          body,
          keepalive: true,
          headers: { "Content-Type": "application/json" },
        }).catch(() => {});
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          const day = Number(el.dataset.appDay);
          if (!Number.isInteger(day) || seen.has(day)) continue;

          const visibleEnough =
            entry.isIntersecting && entry.intersectionRatio >= VISIBLE_RATIO;
          if (visibleEnough && !timers.has(el)) {
            timers.set(
              el,
              window.setTimeout(() => {
                timers.delete(el);
                // A background tab is not a view.
                if (document.visibilityState !== "visible") return;
                seen.add(day);
                pending.add(day);
                observer.unobserve(el);
              }, DWELL_MS),
            );
          } else if (!visibleEnough && timers.has(el)) {
            window.clearTimeout(timers.get(el));
            timers.delete(el);
          }
        }
      },
      { threshold: [0, VISIBLE_RATIO] },
    );

    document
      .querySelectorAll<HTMLElement>("[data-app-day]")
      .forEach((el) => observer.observe(el));

    const interval = window.setInterval(flush, FLUSH_EVERY_MS);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);

    return () => {
      flush();
      observer.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, [handle]);

  return null;
}

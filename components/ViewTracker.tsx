"use client";

import { useEffect } from "react";
import {
  addSourceToLink,
  currentVisitSource,
  linkHasSource,
} from "@/lib/traffic-source";

const ENDPOINT = "/api/views";
const VISITOR_KEY = "visitor-id";
const VISITOR_ID_RE = /^[A-Za-z0-9-]{8,64}$/;
// A card counts as seen once this much of its heading block has stayed on
// screen for this long. A fast scroll past does not count.
const VISIBLE_RATIO = 0.6;
const DWELL_MS = 1000;
const FLUSH_EVERY_MS = 3000;

function randomId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  // Older browsers and non-secure contexts. Not for security, only for
  // telling one visitor from another.
  return `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

// A random ID kept in this browser so that reloading the page or clicking the
// same app twice counts as one person. It is not tied to a name, email or
// address. If storage is blocked (some private modes), the ID lasts for this
// page load only, so the visitor is counted again next time.
function getVisitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing && VISITOR_ID_RE.test(existing)) return existing;
    const created = randomId();
    localStorage.setItem(VISITOR_KEY, created);
    return created;
  } catch {
    return randomId();
  }
}

// Watches the app cards on a public page (elements marked data-app-day) and
// reports which ones the visitor actually saw. Each card is reported at most
// once per page load. It also adds the visitor ID to app links as they are
// about to be used, so clicks can be counted per person, and notes where the
// visit came from (see lib/traffic-source.ts) so views and clicks carry it.
// Renders nothing.
export function ViewTracker({ handle }: { handle: string }) {
  useEffect(() => {
    const visitorId = getVisitorId();
    const source = currentVisitSource();

    // ----- clicks: tag /go links with the visitor ID and the source -----
    // Done when a link is about to be used (pointer down, or keyboard focus)
    // rather than up front, so it also covers links rendered later. The links
    // are plain anchors, so a click works the same with or without the tag.
    const tagLink = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLAnchorElement>('a[href^="/go/"]');
      if (!link) return;
      try {
        const url = new URL(
          link.getAttribute("href") ?? "",
          window.location.origin,
        );
        if (
          url.searchParams.get("v") === visitorId &&
          linkHasSource(url.searchParams)
        ) {
          return;
        }
        url.searchParams.set("v", visitorId);
        addSourceToLink(url.searchParams, source);
        link.setAttribute("href", url.pathname + url.search);
      } catch {
        // leave the link as it is
      }
    };
    document.addEventListener("pointerdown", tagLink, true);
    document.addEventListener("focusin", tagLink, true);

    // ----- views -----
    const pending = new Set<number>();
    const seen = new Set<number>();
    const timers = new Map<Element, number>();

    const flush = () => {
      if (pending.size === 0) return;
      const body = JSON.stringify({
        handle,
        days: [...pending],
        visitor: visitorId,
        source,
      });
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

    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                const el = entry.target as HTMLElement;
                const day = Number(el.dataset.appDay);
                if (!Number.isInteger(day) || seen.has(day)) continue;

                const visibleEnough =
                  entry.isIntersecting &&
                  entry.intersectionRatio >= VISIBLE_RATIO;
                if (visibleEnough && !timers.has(el)) {
                  timers.set(
                    el,
                    window.setTimeout(() => {
                      timers.delete(el);
                      // A background tab is not a view.
                      if (document.visibilityState !== "visible") return;
                      seen.add(day);
                      pending.add(day);
                      observer?.unobserve(el);
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

    if (observer) {
      document
        .querySelectorAll<HTMLElement>("[data-app-day]")
        .forEach((el) => observer.observe(el));
    }

    const interval = window.setInterval(flush, FLUSH_EVERY_MS);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);

    return () => {
      flush();
      observer?.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("pointerdown", tagLink, true);
      document.removeEventListener("focusin", tagLink, true);
    };
  }, [handle]);

  return null;
}

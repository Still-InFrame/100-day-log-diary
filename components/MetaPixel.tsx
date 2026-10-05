"use client";

import { useEffect } from "react";
import { isPixelId } from "@/lib/meta-pixel";

// Loads the page owner's Meta Pixel on their public page and reports a page
// view, so they can build retargeting audiences and measure ads in Meta.
// Only rendered when the owner has saved a pixel ID in Settings, and never
// for the owner looking at their own page. Renders nothing.
//
// This is the one place the site hands visitor activity to a third party.
// It is skipped for a visitor whose browser sends the Global Privacy Control
// signal ("do not sell or share my data").

type Fbq = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: Fbq;
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

const SCRIPT_SRC = "https://connect.facebook.net/en_US/fbevents.js";

// Pixels already initialised in this tab. Coming back to the page reports
// another page view, but must not initialise the same pixel twice.
const started = new Set<string>();

// Meta's standard loader, written out: a stand-in `fbq` that queues calls
// until their script arrives and takes over.
function loadFbq(): Fbq {
  if (window.fbq) return window.fbq;
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  window.fbq = fbq;
  if (!window._fbq) window._fbq = fbq;

  const script = document.createElement("script");
  script.async = true;
  script.src = SCRIPT_SRC;
  document.head.appendChild(script);
  return fbq;
}

export function MetaPixel({ pixelId }: { pixelId: string }) {
  useEffect(() => {
    if (!isPixelId(pixelId)) return;
    // Never from a development build. Local development reads the real
    // database, so the owner's real pixel ID is on the page, and testing
    // there would send made-up visits (from "localhost") into their ad data.
    if (process.env.NODE_ENV !== "production") return;
    const optedOut =
      (navigator as Navigator & { globalPrivacyControl?: boolean })
        .globalPrivacyControl === true;
    if (optedOut) return;

    const fbq = loadFbq();
    if (!started.has(pixelId)) {
      fbq("init", pixelId);
      started.add(pixelId);
    }
    fbq("track", "PageView");
  }, [pixelId]);

  return null;
}

// Reports a signup to the pixel, if one is running on this page. A no-op
// otherwise, so callers do not need to know whether the owner uses a pixel.
// Only the app's name goes along; nothing the visitor typed does.
export function trackPixelLead(appName: string): void {
  if (typeof window === "undefined" || !window.fbq) return;
  window.fbq("track", "Lead", { content_name: appName });
}

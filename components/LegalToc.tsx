"use client";

import { useEffect, useRef, useState } from "react";

export type TocSection = { id: string; title: string };

// The "on this page" list for a long document. From lg up it is the sticky
// left column; below that it is a strip of chips pinned to the top of the
// screen that scrolls sideways. Either way the section being read is marked,
// so a reader always knows where they are in the page.
export function LegalToc({ sections }: { sections: TocSection[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const listRef = useRef<HTMLUListElement>(null);
  // Set by a click on the list. A click on one of the last sections cannot
  // bring it to the top of the screen (the page runs out first), so working
  // out the section from the scroll position would move the marker straight
  // off the section just chosen. While pinned, the click's choice stands.
  // `restY` is where the page came to rest after the click's jump (null
  // while it is still moving); any later scroll away from it is the reader
  // moving on, and unpins.
  const pinned = useRef<{ restY: number | null } | null>(null);
  const restTimer = useRef(0);

  useEffect(() => {
    const elements = sections.flatMap((section) => {
      const element = document.getElementById(section.id);
      return element ? [element] : [];
    });
    let frame = 0;

    const measure = () => {
      frame = 0;
      const pin = pinned.current;
      if (pin) {
        if (pin.restY === null) return;
        if (Math.abs(window.scrollY - pin.restY) <= 2) return;
        pinned.current = null;
      }
      const screen = window.innerHeight;
      const toBottom =
        document.documentElement.scrollHeight - screen - window.scrollY;
      // The section being read is the last one whose top has passed a line a
      // fifth of the way down the screen. The final sections can never be
      // scrolled up that far, so over the last 200px of the page the line
      // slides down to the bottom of the screen and they still get a turn.
      // Kept short on purpose: a longer slide marks a section further down
      // than the one sitting at the top of the screen.
      const slide = Math.max(0, Math.min(1, 1 - toBottom / 200));
      const line = screen * (0.2 + 0.8 * slide);
      let current = elements[0];
      for (const element of elements) {
        if (element.getBoundingClientRect().top <= line) current = element;
      }
      if (current) setActive(current.id);
    };

    const onScroll = () => {
      // While a click's jump is still moving the page, each scroll event
      // pushes back the moment it counts as having come to rest.
      if (pinned.current?.restY === null) markRestSoon();
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.clearTimeout(restTimer.current);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [sections]);

  function markRestSoon() {
    window.clearTimeout(restTimer.current);
    restTimer.current = window.setTimeout(() => {
      if (pinned.current) pinned.current.restY = window.scrollY;
    }, 150);
  }

  // Keep the marked chip in view when the list is the sideways strip. Only
  // the strip itself is scrolled, never the page.
  useEffect(() => {
    const list = listRef.current;
    if (!list || list.scrollWidth <= list.clientWidth) return;
    const chip = list.querySelector<HTMLElement>(`[data-toc="${active}"]`);
    if (chip) list.scrollTo({ left: chip.offsetLeft - 16, behavior: "smooth" });
  }, [active]);

  return (
    <nav aria-label="On this page">
      <div className="mb-3 hidden text-xs font-semibold uppercase tracking-wide text-zinc-500 lg:block">
        On this page
      </div>
      <ul
        ref={listRef}
        className="relative flex gap-1 overflow-x-auto lg:block lg:space-y-0.5 lg:overflow-visible"
      >
        {sections.map((section) => {
          const current = section.id === active;
          return (
            <li key={section.id} className="shrink-0">
              <a
                href={`#${section.id}`}
                data-toc={section.id}
                aria-current={current ? "location" : undefined}
                onClick={() => {
                  pinned.current = { restY: null };
                  markRestSoon();
                  setActive(section.id);
                }}
                className={`block whitespace-nowrap rounded-full px-3 py-1 text-xs lg:whitespace-normal lg:rounded-none lg:border-l-2 lg:px-3 lg:py-1.5 lg:text-sm ${
                  current
                    ? "bg-zinc-900 font-medium text-white lg:border-indigo-500 lg:bg-transparent lg:text-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:lg:bg-transparent dark:lg:text-zinc-100"
                    : "text-zinc-600 hover:text-zinc-900 lg:border-transparent dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
              >
                {section.title}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

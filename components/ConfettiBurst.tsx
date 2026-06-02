"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

export function ConfettiBurst({ trigger }: { trigger: unknown }) {
  useEffect(() => {
    if (!trigger) return;
    const end = Date.now() + 1200;
    const colors = ["#6366f1", "#a855f7", "#ec4899", "#f59e0b"];
    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 70,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 70,
        origin: { x: 1 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, [trigger]);
  return null;
}

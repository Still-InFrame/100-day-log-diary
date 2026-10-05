// Deterministic shuffle: the same seed always gives the same order.
// Public pages use it to show each visitor the apps in a different order (so
// every app gets a fair share of views) while keeping that order steady for
// one visitor, instead of rearranging the page on every reload.

// FNV-1a, 32-bit.
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// mulberry32: a small, fast pseudo-random generator. Not for security.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const out = [...items];
  const rand = mulberry32(hashString(seed));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// A seed that is stable for one visitor for one day on one page. The address
// and browser string are only mixed into a hash here; nothing is stored.
// With neither available, fall back to a random order.
export function visitorSeed(
  requestHeaders: Headers,
  day: string,
  page: string,
): string {
  const ip =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip") ||
    "";
  const userAgent = requestHeaders.get("user-agent") ?? "";
  const who = ip || userAgent ? `${ip}|${userAgent}` : crypto.randomUUID();
  return `${who}|${day}|${page}`;
}

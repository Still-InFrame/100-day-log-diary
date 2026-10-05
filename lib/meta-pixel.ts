// A Meta Pixel ID is a plain number (15 or 16 digits today). The pattern
// matches the CHECK constraint on profiles.meta_pixel_id (migration 0011).
const PIXEL_ID_RE = /^[0-9]{5,20}$/;

export function isPixelId(value: string): boolean {
  return PIXEL_ID_RE.test(value);
}

// What someone pasted into the Settings field, tidied. People copy the ID
// with spaces, or copy the whole "Pixel ID: 123…" line, so anything that is
// not a digit is dropped before checking. Empty means "turn it off".
export function parsePixelId(
  raw: string | null | undefined,
): { ok: true; pixelId: string | null } | { ok: false } {
  const text = (raw ?? "").trim();
  if (text === "") return { ok: true, pixelId: null };
  const digits = text.replace(/[^0-9]/g, "");
  return isPixelId(digits) ? { ok: true, pixelId: digits } : { ok: false };
}

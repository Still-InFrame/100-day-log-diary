"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { OWNER_HANDLE } from "@/lib/constants";
import { parsePixelId } from "@/lib/meta-pixel";

// 3-30 chars, lowercase alphanumeric + hyphens, no leading/trailing hyphen.
// The handle becomes part of a public URL, so keep it URL-safe.
const HANDLE_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;

export type HandleResult =
  | { ok: true; handle: string | null }
  | { ok: false; error: string };

export async function setPublicHandle(
  raw: string | null,
): Promise<HandleResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  // The account holding OWNER_HANDLE is the site owner: the apex front door
  // shows that account's projects. If the handle were released, the main
  // domain would have nothing to show, and any other account could claim the
  // handle and take over the front door. So it cannot be changed or cleared
  // from here.
  const requested = raw === null ? "" : raw.trim().toLowerCase();
  const { data: current } = await supabase
    .from("profiles")
    .select("public_handle")
    .eq("user_id", user.id)
    .maybeSingle();
  if (current?.public_handle === OWNER_HANDLE && requested !== OWNER_HANDLE) {
    return {
      ok: false,
      error:
        "This handle is the site's front page, so it can't be changed or removed here.",
    };
  }

  // Empty/null disables public sharing.
  if (raw === null || raw.trim() === "") {
    const { error } = await supabase
      .from("profiles")
      .update({ public_handle: null })
      .eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/profile");
    return { ok: true, handle: null };
  }

  const handle = raw.trim().toLowerCase();
  if (!HANDLE_RE.test(handle)) {
    return {
      ok: false,
      error:
        "Handle must be 3–30 characters: lowercase letters, numbers, and hyphens (no leading or trailing hyphen).",
    };
  }

  // Friendly pre-check. The DB unique constraint is the real guard (handled below).
  const { data: taken } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("public_handle", handle)
    .neq("user_id", user.id)
    .maybeSingle();
  if (taken) return { ok: false, error: "That handle is already taken." };

  const { error } = await supabase
    .from("profiles")
    .update({ public_handle: handle })
    .eq("user_id", user.id);
  if (error) {
    // 23505 = unique_violation (race between pre-check and update)
    if (error.code === "23505")
      return { ok: false, error: "That handle is already taken." };
    return { ok: false, error: error.message };
  }

  revalidatePath("/profile");
  revalidatePath(`/share/${handle}`);
  return { ok: true, handle };
}

export type PixelResult =
  | { ok: true; pixelId: string | null }
  | { ok: false; error: string };

// Saves or clears the caller's Meta Pixel ID. Empty input turns the pixel
// off. The pixel itself is loaded by components/MetaPixel.tsx on the user's
// public page.
export async function setMetaPixelId(raw: string | null): Promise<PixelResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const parsed = parsePixelId(raw);
  if (!parsed.ok) {
    return {
      ok: false,
      error:
        "That doesn't look like a Pixel ID. It is a number, usually 15 or 16 digits, shown in Meta Events Manager under Data sources.",
    };
  }

  // The row comes back so a save that matched nothing is reported instead of
  // looking like a success, and so the right public page can be refreshed.
  const { data, error } = await supabase
    .from("profiles")
    .update({ meta_pixel_id: parsed.pixelId })
    .eq("user_id", user.id)
    .select("public_handle")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Your profile could not be found." };

  revalidatePath("/admin/settings");
  revalidatePath("/");
  if (data.public_handle) revalidatePath(`/share/${data.public_handle}`);
  return { ok: true, pixelId: parsed.pixelId };
}

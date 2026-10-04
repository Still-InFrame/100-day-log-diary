"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { OWNER_HANDLE } from "@/lib/constants";

// 3-30 chars, lowercase alphanumeric + hyphens, no leading/trailing hyphen.
// The handle becomes part of a public URL, so keep it URL-safe.
const HANDLE_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;

export type HandleResult =
  | { ok: true; handle: string | null }
  | { ok: false; error: string };

export async function setPublicHandle(raw: string | null): Promise<HandleResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  // The account holding OWNER_HANDLE is the site owner: the public front door
  // shows its projects and the admin (leads, texting) is gated on it. If the
  // handle were released, any other account could claim it and become the
  // owner, so it cannot be changed or cleared from here.
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
        "This handle runs the public site and admin access, so it can't be changed or removed here.",
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

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

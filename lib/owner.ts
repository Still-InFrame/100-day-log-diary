import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";
import { OWNER_HANDLE } from "./constants";

// "Owner" = the signed-in account that holds OWNER_HANDLE. Sign-up is open to
// anyone ("Create your own challenge"), so every admin page and admin action
// must check this; being signed in is not enough. The handle cannot be
// released or changed through the app (see setPublicHandle), which is what
// keeps another account from claiming it and becoming the owner.
export type Owner = { user: User; displayName: string | null };

export async function isOwnerUser(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("public_handle")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.public_handle === OWNER_HANDLE;
}

export async function getOwner(): Promise<Owner | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("public_handle, display_name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data || data.public_handle !== OWNER_HANDLE) return null;
  return { user, displayName: data.display_name ?? null };
}

// For pages: anyone who is not the owner is sent home.
export async function requireOwner(): Promise<Owner> {
  const owner = await getOwner();
  if (!owner) redirect("/");
  return owner;
}

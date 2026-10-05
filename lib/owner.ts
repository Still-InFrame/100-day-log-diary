import { createClient } from "./supabase/server";
import { OWNER_HANDLE } from "./constants";

// The "site owner" is the account holding OWNER_HANDLE: the apex front door
// shows that account's projects. Lead capture and the admin are per-user and
// do NOT depend on this; it is only used to decide who is shown site-level
// setup details (which server settings are missing).
export async function isOwnerUser(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("public_handle")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.public_handle === OWNER_HANDLE;
}

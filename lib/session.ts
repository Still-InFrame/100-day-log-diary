import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";

// For signed-in pages: returns the user, or sends the visitor to log in.
// The proxy already redirects anonymous requests, so this is the second
// check, and it is what gives the page the user's id.
export async function requireUser(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

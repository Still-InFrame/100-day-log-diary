"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeEarnedBadges } from "@/lib/badges";
import { dayNumberFor } from "@/lib/dates";
import type { BadgeType, Profile } from "@/lib/types";

export type EntryFormInput = {
  id?: string;
  date: string;
  app_name: string;
  description: string;
  repo_url: string;
  tech_stack: string[];
  time_spent_minutes: number;
  learnings?: string | null;
  challenges?: string | null;
  mood?: number | null;
  screenshot_url?: string | null;
};

export type SaveEntryResult =
  | { ok: true; entryId: string; newBadges: BadgeType[] }
  | { ok: false; error: string };

async function ensureProfile(userId: string): Promise<Profile> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return existing as Profile;

  const { data: created, error } = await supabase
    .from("profiles")
    .insert({ user_id: userId })
    .select("*")
    .single();

  if (error) throw error;
  return created as Profile;
}

async function refreshBadges(userId: string): Promise<BadgeType[]> {
  const supabase = await createClient();
  const profile = await ensureProfile(userId);

  const { data: entries } = await supabase
    .from("entries")
    .select("date, day_number")
    .eq("user_id", userId);

  const earned = computeEarnedBadges(
    entries ?? [],
    profile.challenge_start_date,
  );

  const { data: existing } = await supabase
    .from("badges")
    .select("badge_type")
    .eq("user_id", userId);
  const existingTypes = new Set((existing ?? []).map((b) => b.badge_type));

  const newBadges = earned.filter((b) => !existingTypes.has(b));
  if (newBadges.length > 0) {
    await supabase
      .from("badges")
      .insert(newBadges.map((badge_type) => ({ user_id: userId, badge_type })));
  }
  return newBadges;
}

export async function saveEntry(input: EntryFormInput): Promise<SaveEntryResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  if (!input.app_name.trim()) return { ok: false, error: "App name is required" };
  if (!input.description.trim())
    return { ok: false, error: "Description is required" };
  if (!input.repo_url.trim()) return { ok: false, error: "Repo URL is required" };
  if (!input.tech_stack.length)
    return { ok: false, error: "At least one tech tag is required" };
  if (!Number.isFinite(input.time_spent_minutes) || input.time_spent_minutes < 0)
    return { ok: false, error: "Time spent must be a positive number" };

  const profile = await ensureProfile(user.id);
  const dayNumber = dayNumberFor(input.date, profile.challenge_start_date);
  if (dayNumber < 1 || dayNumber > 100) {
    return {
      ok: false,
      error: `Entry date must fall within Day 1–100 of your challenge (started ${profile.challenge_start_date}).`,
    };
  }

  const payload = {
    user_id: user.id,
    day_number: dayNumber,
    date: input.date,
    app_name: input.app_name.trim(),
    description: input.description.trim(),
    repo_url: input.repo_url.trim(),
    tech_stack: input.tech_stack.map((t) => t.trim()).filter(Boolean),
    time_spent_minutes: Math.round(input.time_spent_minutes),
    learnings: input.learnings?.trim() || null,
    challenges: input.challenges?.trim() || null,
    mood: input.mood ?? null,
    screenshot_url: input.screenshot_url ?? null,
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("entries")
      .update(payload)
      .eq("id", input.id)
      .eq("user_id", user.id)
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    const newBadges = await refreshBadges(user.id);
    revalidatePath("/");
    revalidatePath("/entries");
    revalidatePath(`/entries/${dayNumber}`);
    revalidatePath("/stats");
    revalidatePath("/profile");
    return { ok: true, entryId: data.id, newBadges };
  }

  const { data, error } = await supabase
    .from("entries")
    .insert(payload)
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  const newBadges = await refreshBadges(user.id);
  revalidatePath("/");
  revalidatePath("/entries");
  revalidatePath("/stats");
  revalidatePath("/profile");
  return { ok: true, entryId: data.id, newBadges };
}

export async function deleteEntry(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await supabase.from("entries").delete().eq("id", id).eq("user_id", user.id);
  await refreshBadges(user.id);
  revalidatePath("/");
  revalidatePath("/entries");
  revalidatePath("/stats");
  revalidatePath("/profile");
  redirect("/entries");
}

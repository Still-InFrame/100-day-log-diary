"use server";

import { after } from "next/server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEntryByDay, getLeadById, getProfileByHandle } from "@/lib/queries";
import { OWNER_HANDLE, TOTAL_DAYS, smsConsentText } from "@/lib/constants";
import {
  addContactNote,
  contactUrl,
  getGhlConfig,
  pushLead,
  sendSms,
  upsertContact,
} from "@/lib/ghl";
import { getOwner } from "@/lib/owner";

export type InterestInput = {
  dayNumber: number;
  firstName: string;
  email: string;
  phone?: string;
  smsConsent: boolean;
  // Honeypot. Hidden from people; a value here means a bot filled the form.
  website?: string;
};

export type InterestResult =
  | { ok: true; already?: boolean }
  | { ok: false; error: string };

export type AdminResult =
  | { ok: true; message: string; url?: string }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TEXT_LENGTH = 1000;
const NOT_CONFIGURED =
  "HighLevel is not connected yet. Add the token and location ID on the Settings tab, then redeploy.";

// Returns "+<digits>" or null when the input does not look like a phone
// number. A bare 10-digit number is treated as US/Canada, since that is where
// this audience is; anything else must include its country code with "+".
function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) {
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

// Public: called by anonymous visitors from the "Notify me" form.
export async function submitInterest(
  input: InterestInput,
): Promise<InterestResult> {
  // Report success so a bot learns nothing, but store and send nothing.
  if (input.website?.trim()) return { ok: true };

  const dayNumber = Number(input.dayNumber);
  if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > TOTAL_DAYS) {
    return { ok: false, error: "That app could not be found." };
  }

  const firstName = (input.firstName ?? "").trim();
  if (!firstName) return { ok: false, error: "Please enter your first name." };
  if (firstName.length > 80) {
    return { ok: false, error: "That name is too long." };
  }

  const email = (input.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  let phone: string | null = null;
  if (input.phone?.trim()) {
    phone = normalizePhone(input.phone);
    if (!phone) {
      return {
        ok: false,
        error:
          "That phone number doesn't look right. Use 10 digits, or start with + and your country code.",
      };
    }
  }
  // Consent only means something when there is a number to text.
  const smsConsent = Boolean(input.smsConsent) && phone !== null;

  const profile = await getProfileByHandle(OWNER_HANDLE);
  const entry = profile ? await getEntryByDay(profile.user_id, dayNumber) : null;
  if (!profile || !entry) {
    return { ok: false, error: "That app could not be found." };
  }

  const requestHeaders = await headers();
  // The id is generated here because the anonymous role may insert but not
  // read, so the database cannot hand the new row's id back.
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const supabase = await createClient();

  const { error } = await supabase.from("app_interest").insert({
    id,
    owner_user_id: profile.user_id,
    day_number: dayNumber,
    app_name: entry.app_name.slice(0, 200),
    first_name: firstName,
    email,
    phone,
    sms_consent: smsConsent,
    sms_consent_at: smsConsent ? createdAt : null,
    consent_text: smsConsent ? smsConsentText(entry.app_name).slice(0, 500) : null,
    referrer: requestHeaders.get("referer")?.slice(0, 2000) ?? null,
    user_agent: requestHeaders.get("user-agent")?.slice(0, 1000) ?? null,
    created_at: createdAt,
  });

  if (error) {
    // 23505 = unique_violation: this email is already on this app's list.
    if (error.code === "23505") return { ok: true, already: true };
    console.error("submitInterest: insert failed", error.code, error.message);
    return {
      ok: false,
      error: "Something went wrong saving your details. Please try again.",
    };
  }

  // The lead is saved. Push it to HighLevel after the response is sent so the
  // visitor never waits on a third-party API; the outcome is written back and
  // shown in the admin, where a failed push can be retried.
  after(async () => {
    try {
      const cfg = getGhlConfig();
      if (!cfg) {
        await supabase.rpc("record_interest_sync", {
          p_id: id,
          p_status: "skipped",
          p_contact_id: null,
          p_error: "HighLevel was not connected when this lead signed up",
        });
        return;
      }
      const result = await pushLead(cfg, {
        firstName,
        email,
        phone,
        appName: entry.app_name,
        dayNumber,
        smsConsent,
        createdAt,
      });
      await supabase.rpc("record_interest_sync", {
        p_id: id,
        p_status: result.error ? "failed" : "synced",
        p_contact_id: result.contactId,
        p_error: result.error,
      });
    } catch (e) {
      console.error("submitInterest: HighLevel sync crashed", e);
    }
  });

  return { ok: true };
}

// ---------- owner-only actions ----------

export async function retryLeadSync(leadId: string): Promise<AdminResult> {
  const owner = await getOwner();
  if (!owner) return { ok: false, error: "Not authorized." };
  const cfg = getGhlConfig();
  if (!cfg) return { ok: false, error: NOT_CONFIGURED };

  const lead = await getLeadById(leadId);
  if (!lead) return { ok: false, error: "Lead not found." };

  const result = await pushLead(cfg, {
    firstName: lead.first_name,
    email: lead.email,
    phone: lead.phone,
    appName: lead.app_name,
    dayNumber: lead.day_number,
    smsConsent: lead.sms_consent,
    createdAt: lead.created_at,
  });

  const supabase = await createClient();
  const { error } = await supabase
    .from("app_interest")
    .update({
      ghl_sync_status: result.error ? "failed" : "synced",
      ghl_contact_id: result.contactId ?? lead.ghl_contact_id,
      ghl_sync_error: result.error?.slice(0, 500) ?? null,
      ghl_synced_at: result.error ? lead.ghl_synced_at : new Date().toISOString(),
    })
    .eq("id", leadId);

  revalidatePath("/admin");
  if (result.error) return { ok: false, error: result.error };
  if (error) {
    return {
      ok: false,
      error: `Synced to HighLevel, but saving the result here failed: ${error.message}`,
    };
  }
  return { ok: true, message: "Synced to HighLevel." };
}

export async function sendLeadText(
  leadId: string,
  message: string,
): Promise<AdminResult> {
  const owner = await getOwner();
  if (!owner) return { ok: false, error: "Not authorized." };
  const cfg = getGhlConfig();
  if (!cfg) return { ok: false, error: NOT_CONFIGURED };

  const text = (message ?? "").trim();
  if (!text) return { ok: false, error: "Write a message first." };
  if (text.length > MAX_TEXT_LENGTH) {
    return {
      ok: false,
      error: `Keep it under ${MAX_TEXT_LENGTH} characters.`,
    };
  }

  const lead = await getLeadById(leadId);
  if (!lead) return { ok: false, error: "Lead not found." };
  if (!lead.phone) return { ok: false, error: "This lead gave no phone number." };
  if (!lead.sms_consent) {
    return { ok: false, error: "This lead did not agree to receive texts." };
  }
  if (!lead.ghl_contact_id) {
    return { ok: false, error: "Sync this lead to HighLevel first." };
  }

  try {
    await sendSms(cfg, lead.ghl_contact_id, text);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "HighLevel rejected the message.",
    };
  }

  const supabase = await createClient();
  await supabase
    .from("app_interest")
    .update({ last_texted_at: new Date().toISOString() })
    .eq("id", leadId);

  revalidatePath("/admin");
  // "Handed to HighLevel", not "delivered": delivery is reported there.
  return {
    ok: true,
    message: "Handed to HighLevel for sending.",
    url: contactUrl(cfg, lead.ghl_contact_id),
  };
}

// Proves the token, location and write permission by saving the owner's own
// email as a contact with a note, so no stranger's record is created.
export async function sendTestContact(): Promise<AdminResult> {
  const owner = await getOwner();
  if (!owner) return { ok: false, error: "Not authorized." };
  const cfg = getGhlConfig();
  if (!cfg) return { ok: false, error: NOT_CONFIGURED };
  if (!owner.user.email) {
    return { ok: false, error: "Your account has no email to test with." };
  }

  try {
    const { contactId, isNew } = await upsertContact(cfg, {
      firstName: owner.displayName?.split(" ")[0] || "Test",
      email: owner.user.email,
    });
    await addContactNote(
      cfg,
      contactId,
      `Connection test from the 100 Day Challenge admin on ${new Date().toISOString().slice(0, 10)}. Safe to delete.`,
    );
    return {
      ok: true,
      message: isNew
        ? "Connected. A test contact with your email was created, with a note."
        : "Connected. A note was added to your existing contact.",
      url: contactUrl(cfg, contactId),
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "HighLevel rejected the request.",
    };
  }
}

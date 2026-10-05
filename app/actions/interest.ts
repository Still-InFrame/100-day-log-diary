"use server";

import { after } from "next/server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentUser,
  getEntryByDay,
  getLeadById,
  getProfile,
  getProfileByHandle,
} from "@/lib/queries";
import { TOTAL_DAYS, smsConsentText } from "@/lib/constants";
import {
  addContactNote,
  contactUrl,
  pushLead,
  sendSms,
  upsertContact,
} from "@/lib/ghl";
import { deleteConnection, getGhlAuthFor } from "@/lib/ghl-connection";
import { placeFromHeaders } from "@/lib/geo";

export type InterestInput = {
  // Whose public page the form was submitted on. The lead belongs to them.
  handle: string;
  dayNumber: number;
  firstName: string;
  email: string;
  phone?: string;
  smsConsent: boolean;
  // Honeypot. Hidden from people; a value here suggests a bot filled the
  // form. `website` is the field's old name, still accepted from pages that
  // were open before the rename.
  trap?: string;
  website?: string;
};

export type InterestResult =
  | { ok: true; already?: boolean }
  | { ok: false; error: string };

export type AdminResult =
  | { ok: true; message: string; url?: string }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HANDLE_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;
const MAX_TEXT_LENGTH = 1000;
const HELD_BACK_NOTE =
  "Held back: the form's hidden anti-bot field was filled in";

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
  // A filled honeypot does NOT discard the signup. It used to (returning
  // success and storing nothing), and that silently dropped a real person
  // whose phone autofilled the hidden field. A lost lead is worse than a junk
  // row, so a suspect signup is stored, flagged, and kept out of HighLevel
  // until the owner reviews it in the admin.
  const suspectedAutomated = Boolean(input.trap?.trim() || input.website?.trim());

  const handle = (input.handle ?? "").trim().toLowerCase();
  const dayNumber = Number(input.dayNumber);
  if (
    !HANDLE_RE.test(handle) ||
    !Number.isInteger(dayNumber) ||
    dayNumber < 1 ||
    dayNumber > TOTAL_DAYS
  ) {
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

  const profile = await getProfileByHandle(handle);
  const entry = profile ? await getEntryByDay(profile.user_id, dayNumber) : null;
  if (!profile || !entry) {
    return { ok: false, error: "That app could not be found." };
  }
  const pageOwnerId = profile.user_id;

  const requestHeaders = await headers();
  // Country, state and city only. A signup carries a name, so it does not
  // get the map coordinates that anonymous views and clicks do.
  const { country, region, city } = placeFromHeaders(requestHeaders);
  // The id is generated here because the anonymous role may insert but not
  // read, so the database cannot hand the new row's id back.
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const supabase = await createClient();

  const { error } = await supabase.from("app_interest").insert({
    id,
    owner_user_id: pageOwnerId,
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
    suspected_automated: suspectedAutomated,
    country,
    region,
    city,
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

  // The lead is saved. Push it to the page owner's HighLevel after the
  // response is sent so the visitor never waits on a third-party API; the
  // outcome is written back and shown in the owner's admin, where a failed
  // push can be retried.
  after(async () => {
    const record = (
      status: "synced" | "failed" | "skipped",
      contactId: string | null,
      message: string | null,
    ) =>
      supabase.rpc("record_interest_sync", {
        p_id: id,
        p_status: status,
        p_contact_id: contactId,
        p_error: message,
      });

    try {
      if (suspectedAutomated) {
        await record("skipped", null, HELD_BACK_NOTE);
        return;
      }
      const auth = await getGhlAuthFor(pageOwnerId);
      if (!auth.ok) {
        // Not connected is a normal state, not a failure. A broken or busy
        // connection is a failure the owner can fix and retry.
        const neverTried =
          auth.reason === "not_available" || auth.reason === "not_connected";
        await record(
          neverTried ? "skipped" : "failed",
          null,
          neverTried
            ? "HighLevel was not connected when this lead signed up"
            : auth.message,
        );
        return;
      }
      const result = await pushLead(auth.auth, {
        firstName,
        email,
        phone,
        appName: entry.app_name,
        dayNumber,
        smsConsent,
        createdAt,
      });
      await record(
        result.error ? "failed" : "synced",
        result.contactId,
        result.error,
      );
    } catch (e) {
      console.error("submitInterest: HighLevel sync crashed", e);
    }
  });

  return { ok: true };
}

// ---------- actions for the signed-in user's own leads ----------
// Each one acts only on the caller's own data: leads are read through RLS
// (owner_user_id = auth.uid()) and HighLevel is called with the caller's own
// connection.

export async function retryLeadSync(leadId: string): Promise<AdminResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const lead = await getLeadById(leadId);
  if (!lead) return { ok: false, error: "Lead not found." };

  const auth = await getGhlAuthFor(user.id);
  if (!auth.ok) return { ok: false, error: `${auth.message}.` };

  const result = await pushLead(auth.auth, {
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

  revalidatePath("/admin", "layout");
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
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in again." };

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
    return { ok: false, error: "Send this lead to HighLevel first." };
  }

  const auth = await getGhlAuthFor(user.id);
  if (!auth.ok) return { ok: false, error: `${auth.message}.` };

  try {
    await sendSms(auth.auth, lead.ghl_contact_id, text);
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

  revalidatePath("/admin", "layout");
  // "Handed to HighLevel", not "delivered": delivery is reported there.
  return {
    ok: true,
    message: "Handed to HighLevel for sending.",
    url: contactUrl(auth.auth, lead.ghl_contact_id),
  };
}

// Proves the connection and write permission by saving the caller's own email
// as a contact with a note, so no stranger's record is created.
export async function sendTestContact(): Promise<AdminResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  if (!user.email) {
    return { ok: false, error: "Your account has no email to test with." };
  }

  const auth = await getGhlAuthFor(user.id);
  if (!auth.ok) return { ok: false, error: `${auth.message}.` };

  const profile = await getProfile(user.id);
  try {
    const { contactId, isNew } = await upsertContact(auth.auth, {
      firstName: profile?.display_name?.split(" ")[0] || "Test",
      email: user.email,
    });
    await addContactNote(
      auth.auth,
      contactId,
      `Connection test from the 100 Day Challenge admin on ${new Date().toISOString().slice(0, 10)}. Safe to delete.`,
    );
    return {
      ok: true,
      message: isNew
        ? "It works. A test contact with your email was created, with a note."
        : "It works. A note was added to your existing contact.",
      url: contactUrl(auth.auth, contactId),
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "HighLevel rejected the request.",
    };
  }
}

// Removes the stored tokens for the caller. It does not uninstall the app
// inside HighLevel; that is done from HighLevel's own settings.
export async function disconnectHighLevel(): Promise<AdminResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  const { error } = await deleteConnection(user.id);
  if (error) return { ok: false, error };
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Disconnected." };
}

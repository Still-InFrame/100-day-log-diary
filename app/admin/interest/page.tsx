import Link from "next/link";
import { requireUser } from "@/lib/session";
import {
  getEntries,
  getInterestStats,
  getLeadCount,
  getLeads,
  getProfile,
} from "@/lib/queries";
import { contactUrl, getGhlAppBaseUrl } from "@/lib/ghl";
import { getConnectionInfo } from "@/lib/ghl-connection";
import { formatDateTime } from "@/lib/dates";
import { LeadActions } from "@/components/admin/LeadActions";
import type { GhlSyncStatus, Lead } from "@/lib/types";

const LEADS_SHOWN = 200;

const SYNC_BADGE: Record<GhlSyncStatus, { label: string; className: string }> = {
  synced: {
    label: "In HighLevel",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200",
  },
  pending: {
    label: "Sync pending",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200",
  },
  failed: {
    label: "Sync failed",
    className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200",
  },
  skipped: {
    label: "Not sent to HighLevel",
    className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  },
};

const HELD_BACK_BADGE = {
  label: "Held back for review",
  className: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200",
};

function textBlockedReason(lead: Lead, connected: boolean): string | null {
  if (!lead.phone) return "no phone number given";
  if (!lead.sms_consent) return "they did not agree to texts";
  if (!connected) return "HighLevel is not connected";
  if (!lead.ghl_contact_id) return "not in HighLevel yet — send them there first";
  return null;
}

export default async function AdminInterestPage() {
  const user = await requireUser();
  const [leads, total, stats, entries, profile, connection] = await Promise.all([
    getLeads(LEADS_SHOWN),
    getLeadCount(),
    getInterestStats(),
    getEntries(user.id),
    getProfile(user.id),
    getConnectionInfo(user.id),
  ]);
  const connected = Boolean(connection && !connection.needsReconnect);
  const appBaseUrl = getGhlAppBaseUrl();

  const appNames = new Map(entries.map((e) => [e.day_number, e.app_name]));
  const ranked = [...stats].sort(
    (a, b) => b.leads - a.leads || a.day_number - b.day_number,
  );
  const withPhone = stats.reduce((n, s) => n + s.with_phone, 0);
  const smsOk = stats.reduce((n, s) => n + s.sms_ok, 0);

  return (
    <div className="space-y-8">
      {!profile?.public_handle && (
        <Notice>
          Your page is not public yet, so nobody can sign up or click.{" "}
          <Link href="/profile" className="font-medium underline">
            Publish it from your Profile
          </Link>
          .
        </Notice>
      )}
      {connection?.needsReconnect ? (
        <Notice>
          Your HighLevel connection has expired. New signups are saved here
          but not sent to HighLevel.{" "}
          <Link href="/admin/settings" className="font-medium underline">
            Reconnect in Settings
          </Link>
          .
        </Notice>
      ) : (
        !connection && (
          <Notice>
            HighLevel is not connected. Signups are saved here but not sent to
            HighLevel, and texting is off.{" "}
            <Link href="/admin/settings" className="font-medium underline">
              Connect it in Settings
            </Link>
            .
          </Notice>
        )
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Total signups" value={total} />
        <Tile label="Apps with interest" value={stats.length} />
        <Tile label="Gave a phone" value={withPhone} />
        <Tile label="OK to text" value={smsOk} />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Interest by app</h2>
        {ranked.length === 0 ? (
          <Empty>
            No signups yet. They appear here when someone uses &ldquo;Notify me
            when this launches&rdquo; on your public page.
          </Empty>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3">App</th>
                  <th className="px-4 py-3 text-right">Signups</th>
                  <th className="px-4 py-3 text-right">Gave a phone</th>
                  <th className="px-4 py-3 text-right">OK to text</th>
                  <th className="px-4 py-3">Latest</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((s) => (
                  <tr
                    key={s.day_number}
                    className="border-t border-zinc-100 dark:border-zinc-800"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium">
                        {appNames.get(s.day_number) ?? "Unknown app"}
                      </span>{" "}
                      <span className="text-xs text-zinc-500">
                        Day {s.day_number}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {s.leads}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {s.with_phone}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {s.sms_ok}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {s.last_signup ? formatDateTime(s.last_signup) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Leads</h2>
          {total > leads.length && (
            <span className="text-xs text-zinc-500">
              Showing the latest {leads.length} of {total}
            </span>
          )}
        </div>
        {leads.length === 0 ? (
          <Empty>No leads yet.</Empty>
        ) : (
          <div className="space-y-3">
            {leads.map((lead) => {
              // A flagged signup that has not been sent yet is "held back",
              // whatever its sync status says.
              const heldBack =
                lead.suspected_automated && lead.ghl_sync_status !== "synced";
              const badge = heldBack
                ? HELD_BACK_BADGE
                : SYNC_BADGE[lead.ghl_sync_status];
              return (
                <article
                  key={lead.id}
                  className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{lead.first_name}</div>
                      <div className="text-sm text-zinc-600 dark:text-zinc-400">
                        <a
                          href={`mailto:${lead.email}`}
                          className="hover:underline"
                        >
                          {lead.email}
                        </a>
                        {lead.phone && <span> · {lead.phone}</span>}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <div className="mt-2 text-sm">
                    Interested in{" "}
                    <span className="font-medium">{lead.app_name}</span>{" "}
                    <span className="text-xs text-zinc-500">
                      Day {lead.day_number} ·{" "}
                      {formatDateTime(lead.created_at)}
                    </span>
                  </div>

                  {lead.last_texted_at && (
                    <div className="mt-1 text-xs text-zinc-500">
                      Last texted {formatDateTime(lead.last_texted_at)}
                    </div>
                  )}
                  {heldBack && (
                    <div className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                      Not sent to HighLevel automatically: the form&apos;s
                      hidden anti-bot field was filled in. Bots do that, but
                      so can a phone&apos;s autofill for a real person. If this
                      looks real, send it yourself.
                    </div>
                  )}
                  {lead.ghl_sync_status === "failed" && lead.ghl_sync_error && (
                    <div className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
                      {lead.ghl_sync_error}
                    </div>
                  )}

                  <LeadActions
                    leadId={lead.id}
                    firstName={lead.first_name}
                    appName={lead.app_name}
                    contactLink={
                      connection && lead.ghl_contact_id
                        ? contactUrl(
                            { appBaseUrl, locationId: connection.locationId },
                            lead.ghl_contact_id,
                          )
                        : null
                    }
                    canSync={connected && lead.ghl_sync_status !== "synced"}
                    syncLabel={
                      lead.ghl_sync_status === "failed"
                        ? "Retry sync"
                        : "Send to HighLevel"
                    }
                    textBlockedReason={textBlockedReason(lead, connected)}
                  />
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
      {children}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
      {children}
    </div>
  );
}

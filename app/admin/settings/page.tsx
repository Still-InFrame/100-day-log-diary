import { cookies, headers } from "next/headers";
import { requireUser } from "@/lib/session";
import { isOwnerUser } from "@/lib/owner";
import { GHL_SCOPES, getGhlAppStatus } from "@/lib/ghl";
import { getConnectionInfo } from "@/lib/ghl-connection";
import { hasSupabaseSecretKey } from "@/lib/supabase/admin";
import {
  CALLBACK_PATH,
  CONNECT_PATH,
  NOTICE_COOKIE,
  parseNotice,
} from "@/lib/crm-oauth";
import { formatDateTime } from "@/lib/dates";
import { TestContactButton } from "@/components/admin/TestContactButton";
import { DisconnectButton } from "@/components/admin/DisconnectButton";
import { MetaPixelSettings } from "@/components/admin/MetaPixelSettings";
import { getProfile } from "@/lib/queries";

export default async function AdminSettingsPage() {
  const user = await requireUser();
  const [isOwner, connection, cookieStore, requestHeaders, profile] =
    await Promise.all([
      isOwnerUser(user.id),
      getConnectionInfo(user.id),
      cookies(),
      headers(),
      getProfile(user.id),
    ]);
  const pixelId = profile?.meta_pixel_id ?? null;

  // Presence only. Secret values are never read into a page.
  const app = getGhlAppStatus();
  const hasSecretKey = hasSupabaseSecretKey();
  const available = app.hasClientId && app.hasClientSecret && hasSecretKey;
  const notice = parseNotice(cookieStore.get(NOTICE_COOKIE)?.value);
  const healthy = Boolean(connection && !connection.needsReconnect);

  // Shown to the site owner so the redirect URL registered with HighLevel
  // matches what this deployment will actually send.
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  const redirectUrl = host
    ? `${proto}://${host}${CALLBACK_PATH}`
    : CALLBACK_PATH;

  return (
    <div className="space-y-6">
      {notice && (
        <div
          className={`rounded-lg border p-4 text-sm ${
            notice.ok
              ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
              : "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
          }`}
        >
          {notice.text}
        </div>
      )}

      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">HighLevel</h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              healthy
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200"
            }`}
          >
            {healthy
              ? "Connected"
              : connection
                ? "Needs reconnecting"
                : "Not connected"}
          </span>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Connect your own HighLevel sub-account. Each new signup on your public
          page is then saved there as a contact, with a note naming the app, and
          you can text leads from the Interest tab.
        </p>

        {!available ? (
          <p className="mt-4 rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {isOwner
              ? "The site is not set up for HighLevel connections yet. See “Site setup” below."
              : "HighLevel connections are not available on this site yet."}
          </p>
        ) : connection ? (
          <div className="mt-4 space-y-4">
            <dl className="space-y-1 text-sm">
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-zinc-500">Sub-account ID</dt>
                <dd className="font-mono">{connection.locationId}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-zinc-500">Connected</dt>
                <dd>{formatDateTime(connection.connectedAt)}</dd>
              </div>
            </dl>

            {connection.needsReconnect && (
              <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                HighLevel stopped accepting this connection, so signups are not
                being sent there. Connect again to fix it.
                {connection.lastError && (
                  <div className="mt-1 font-mono text-xs opacity-80">
                    {connection.lastError}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-start gap-3">
              {connection.needsReconnect && (
                <ConnectButton label="Reconnect HighLevel" />
              )}
              {healthy && <TestContactButton disabled={false} />}
              <DisconnectButton />
            </div>
            {healthy && (
              <p className="text-xs text-zinc-500">
                The test saves your own email as a contact with a note, which
                proves the connection and its permissions work. If something is
                wrong, HighLevel&apos;s exact reply is shown.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            <ConnectButton label="Connect HighLevel" />
            <p className="text-xs text-zinc-500">
              You&apos;ll be sent to HighLevel to choose a sub-account and
              approve, then brought back here.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Meta Pixel</h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              pixelId
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            {pixelId ? "On" : "Off"}
          </span>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Optional. Add your own Meta (Facebook) Pixel and your public page
          loads it for visitors, so you can build retargeting audiences and
          measure ads in Meta. It reports a page view when someone opens your
          page and a Lead when someone signs up for an app.
        </p>
        <MetaPixelSettings current={pixelId} />
        <p className="mt-3 text-xs text-zinc-500">
          Find the ID in Meta Events Manager under Data sources. Turning this on
          shares what visitors do on your public page with Meta, so say so in
          your privacy notice. The pixel is not loaded for you while you are
          signed in, or for visitors whose browser asks sites not to share their
          data (Global Privacy Control).
        </p>
      </section>

      {isOwner && (
        <section className="rounded-xl border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold">Site setup</h2>
          <p className="mt-1 text-zinc-500">
            Only you see this section. It is done once for the whole site; after
            that every user can connect their own HighLevel account.
          </p>

          <dl className="mt-4 space-y-2">
            <Row
              name="GHL_CLIENT_ID"
              what="Marketplace app client ID"
              set={app.hasClientId}
            />
            <Row
              name="GHL_CLIENT_SECRET"
              what="Marketplace app client secret"
              set={app.hasClientSecret}
            />
            <Row
              name="SUPABASE_SECRET_KEY"
              what="Supabase secret key (stores each user's connection)"
              set={hasSecretKey}
            />
          </dl>

          <ol className="mt-5 list-decimal space-y-2 pl-5 text-zinc-700 dark:text-zinc-300">
            <li>
              Create a developer account and an app at
              marketplace.gohighlevel.com. Set the target user to Sub-account.
            </li>
            <li>
              In the app&apos;s Auth settings, add this redirect URL exactly:{" "}
              <Code>{redirectUrl}</Code>
            </li>
            <li>
              Select these scopes:{" "}
              {GHL_SCOPES.map((s, i) => (
                <span key={s}>
                  {i > 0 && ", "}
                  <Code>{s}</Code>
                </span>
              ))}
              .
            </li>
            <li>
              Generate the client ID and client secret, and add them in Vercel →
              this project → Settings → Environment Variables (Production) as{" "}
              <Code>GHL_CLIENT_ID</Code> and <Code>GHL_CLIENT_SECRET</Code>.
            </li>
            <li>
              In Supabase → Project Settings → API keys, copy the secret key and
              add it in Vercel as <Code>SUPABASE_SECRET_KEY</Code>.
            </li>
            <li>
              Redeploy (settings only reach a new deployment), then press
              Connect HighLevel above.
            </li>
          </ol>
          <p className="mt-3 text-xs text-zinc-500">
            All three are server-side settings: they are never sent to a
            browser. Optional: <Code>GHL_INSTALL_URL</Code> if the install link
            shown in your app differs from the standard one, and{" "}
            <Code>GHL_APP_BASE_URL</Code> if you log in to HighLevel on a
            white-label domain.
          </p>
        </section>
      )}
    </div>
  );
}

// A plain GET form rather than a link: the route sets a cookie and leaves the
// site, so it must never be prefetched.
function ConnectButton({ label }: { label: string }) {
  return (
    <form action={CONNECT_PATH} method="get">
      <button
        type="submit"
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
      >
        {label}
      </button>
    </form>
  );
}

function Row({
  name,
  what,
  set,
}: {
  name: string;
  what: string;
  set: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800">
      <div>
        <dt className="font-medium">{what}</dt>
        <dd className="font-mono text-xs text-zinc-500">{name}</dd>
      </div>
      <span
        className={`text-xs font-medium ${set ? "text-emerald-600" : "text-amber-600"}`}
      >
        {set ? "Set" : "Missing"}
      </span>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
      {children}
    </code>
  );
}

import { requireOwner } from "@/lib/owner";
import { getGhlStatus } from "@/lib/ghl";
import { TestContactButton } from "@/components/admin/TestContactButton";

export default async function AdminSettingsPage() {
  await requireOwner();
  // Presence only. The token's value is never read into a page.
  const status = getGhlStatus();
  const connected = status.hasToken && status.hasLocationId;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">HighLevel connection</h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              connected
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200"
            }`}
          >
            {connected ? "Configured" : "Not connected"}
          </span>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          When connected, each new signup is saved as a HighLevel contact with
          a note naming the app, and you can text leads from the Interest tab.
        </p>

        <dl className="mt-4 space-y-2 text-sm">
          <Row
            name="GHL_PRIVATE_TOKEN"
            what="Private Integration Token"
            set={status.hasToken}
          />
          <Row
            name="GHL_LOCATION_ID"
            what="Sub-account (location) ID"
            set={status.hasLocationId}
          />
        </dl>

        <div className="mt-5">
          <TestContactButton disabled={!connected} />
          <p className="mt-2 text-xs text-zinc-500">
            Saves your own email as a contact with a note, which proves the
            token, the location and write access all work. If something is
            wrong, the exact reply from HighLevel is shown here.
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold">How to connect</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-zinc-700 dark:text-zinc-300">
          <li>
            In your HighLevel sub-account, open Settings → Private
            Integrations and create a new integration. Give it permission to
            edit contacts and to send conversation messages.
          </li>
          <li>
            In Vercel, open this project → Settings → Environment Variables
            and add <Code>GHL_PRIVATE_TOKEN</Code> (the token) and{" "}
            <Code>GHL_LOCATION_ID</Code> (the sub-account ID) for Production.
          </li>
          <li>
            Redeploy. Environment variables only reach a new deployment.
          </li>
          <li>Come back here and press Send test contact.</li>
        </ol>
        <p className="mt-3 text-xs text-zinc-500">
          The token is kept as a server-side setting on purpose: it is never
          sent to a browser and never stored in the database. If you log in to
          HighLevel on a white-label domain, also set{" "}
          <Code>GHL_APP_BASE_URL</Code> to it so the &ldquo;Open in
          HighLevel&rdquo; links point at the right place.
        </p>
      </section>
    </div>
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

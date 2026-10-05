import { BarList, type BarListItem } from "@/components/admin/BarList";
import type {
  OverviewCampaign,
  OverviewChannel,
  OverviewCounts,
  OverviewSource,
  TrafficChannel,
} from "@/lib/types";

// Where visitors came from, for the overview. The sorting into channels is
// done by the database (traffic_channel(), migration 0010); this only names
// them and draws the lists.

const CHANNELS: Record<TrafficChannel, { label: string; about: string }> = {
  search: {
    label: "Search",
    about: "Google, Bing and other search engines",
  },
  paid: {
    label: "Paid ads",
    about: "Links tagged as paid, or clicked from an ad",
  },
  social: {
    label: "Social",
    about: "Facebook, Instagram, X, LinkedIn, YouTube and the like",
  },
  ai: {
    label: "AI assistants",
    about: "ChatGPT, Perplexity, Gemini and similar",
  },
  email: {
    label: "Email",
    about: "Links tagged as email, or opened in webmail",
  },
  sms: { label: "Text message", about: "Links tagged as sms" },
  referral: { label: "Other websites", about: "Any other site linking here" },
  campaign: {
    label: "Other tagged links",
    about: "Tagged, but not as one of the groups above",
  },
  direct: {
    label: "Direct",
    about:
      "Nothing came with the visit: a typed or saved address, and most links opened from texts and apps",
  },
  unknown: {
    label: "Not recorded",
    about: "Visits from before sources were tracked, or with scripts blocked",
  },
};

const SOURCES_SHOWN = 10;
const whole = new Intl.NumberFormat("en-US");

const byViews = (a: OverviewCounts, b: OverviewCounts) =>
  b.unique_views - a.unique_views ||
  b.unique_clicks - a.unique_clicks ||
  b.signups - a.signups;

// The same side note the map's lists use, so the page reads one way.
const sideNote = (c: OverviewCounts) =>
  c.unique_clicks > 0 || c.signups > 0
    ? `${whole.format(c.unique_clicks)} clicked, ${whole.format(c.signups)} signed up`
    : undefined;

export function TrafficSources({
  channels,
  sources,
  campaigns,
}: {
  channels: OverviewChannel[];
  sources: OverviewSource[];
  campaigns: OverviewCampaign[];
}) {
  // "Not recorded" always goes last: it is not a source, it is the absence
  // of one, and for a while it will be the biggest row.
  const ordered = [...channels].sort(
    (a, b) =>
      Number(a.channel === "unknown") - Number(b.channel === "unknown") ||
      byViews(a, b),
  );
  const channelItems: BarListItem[] = ordered.map((c) => ({
    key: c.channel,
    label: CHANNELS[c.channel]?.label ?? c.channel,
    value: c.unique_views,
    display: whole.format(c.unique_views),
    note: sideNote(c),
  }));

  const sourceItems: BarListItem[] = [...sources]
    .sort(byViews)
    .slice(0, SOURCES_SHOWN)
    .map((s) => {
      const channel = CHANNELS[s.channel]?.label ?? s.channel;
      return {
        key: `${s.channel}/${s.source}`,
        // A direct visit has no source to name.
        label: s.source || channel,
        hint: s.source ? channel : undefined,
        value: s.unique_views,
        display: whole.format(s.unique_views),
        note: sideNote(s),
      };
    });

  const campaignItems: BarListItem[] = [...campaigns]
    .sort(byViews)
    .slice(0, SOURCES_SHOWN)
    .map((c) => ({
      key: c.campaign,
      label: c.campaign,
      value: c.unique_views,
      display: whole.format(c.unique_views),
      note: sideNote(c),
    }));

  const recorded = channels.some((c) => c.channel !== "unknown");
  const present = ordered.filter((c) => c.channel !== "unknown");

  return (
    <div className="space-y-5">
      <div className="grid gap-x-8 gap-y-6 lg:grid-cols-2">
        <div className="min-w-0">
          <ListTitle>Channels by unique views</ListTitle>
          {channelItems.length > 0 ? (
            <BarList items={channelItems} color="var(--viz-views)" />
          ) : (
            <Quiet>No visits in this range.</Quiet>
          )}
        </div>
        <div className="min-w-0">
          <ListTitle>Top sources by unique views</ListTitle>
          {sourceItems.length > 0 ? (
            <BarList items={sourceItems} color="var(--viz-views)" />
          ) : (
            <Quiet>
              No visit in this range has a source yet. Sources have only been
              recorded since this section was added.
            </Quiet>
          )}
        </div>
      </div>

      {campaignItems.length > 0 && (
        <div className="min-w-0">
          <ListTitle>Campaigns by unique views</ListTitle>
          <BarList items={campaignItems} color="var(--viz-views)" />
        </div>
      )}

      <div className="space-y-2 border-t border-zinc-100 pt-4 text-xs text-zinc-500 dark:border-zinc-800">
        {recorded && (
          <p>
            {present.map((c, i) => (
              <span key={c.channel}>
                {i > 0 && " "}
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {CHANNELS[c.channel]?.label ?? c.channel}:
                </span>{" "}
                {CHANNELS[c.channel]?.about}.
              </span>
            ))}
          </p>
        )}
        <p>
          A link you share in an ad, an email or a text shows up as
          &ldquo;Direct&rdquo; unless you tag it. Add this to the end of the
          link, changing the three values:{" "}
          <code className="break-all rounded bg-zinc-100 px-1 py-0.5 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            ?utm_source=facebook&amp;utm_medium=paid&amp;utm_campaign=october
          </code>
          . <span className="font-medium">utm_medium</span> decides the group:
          use <span className="font-medium">paid</span>,{" "}
          <span className="font-medium">email</span>,{" "}
          <span className="font-medium">sms</span> or{" "}
          <span className="font-medium">social</span>.
        </p>
      </div>
    </div>
  );
}

function ListTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 text-xs uppercase tracking-wide text-zinc-500">
      {children}
    </div>
  );
}

function Quiet({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-zinc-500">{children}</p>;
}

// Where a visit came from: the other site that linked here, and the tags on
// the link (utm_source and friends). The page's script notes it when a
// visitor arrives and sends it along with that visit's views, clicks and
// signups; the server cleans it and stores it (migration 0010). Sorting
// visits into channels (search, social, paid, ...) happens in the database
// at read time, in traffic_channel(), so the rules can change later without
// touching what was stored.
//
// This file is shared by the browser and the server, so it must not import
// anything that only works on one side.

// How a source travels: short keys, each present only when it has a value.
// r = referring site (host only), s / m / c = utm_source / medium / campaign,
// a = the ad network whose click marker was on the link.
export type WireSource = {
  r?: string;
  s?: string;
  m?: string;
  c?: string;
  a?: string;
};

// The database columns a source is stored in.
export type SourceColumns = {
  source_known: true;
  ref_host: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  ad_click: string | null;
};

// Ad networks add one of these to a link when it is clicked from an ad, with
// or without utm tags. Only which network it was is kept; the marker's value
// identifies the click and is never stored. Meta's fbclid is left out on
// purpose: it is added to every link clicked on Facebook, paid or not.
const AD_MARKERS: [param: string, network: string][] = [
  ["gclid", "google"],
  ["gbraid", "google"],
  ["wbraid", "google"],
  ["msclkid", "microsoft"],
  ["ttclid", "tiktok"],
  ["twclid", "x"],
  ["li_fat_id", "linkedin"],
];
const AD_NETWORKS = new Set(AD_MARKERS.map(([, network]) => network));

const TAG_MAX = 80;
const HOST_MAX = 100;
const SESSION_KEY = "visit-source";

const bareHost = (host: string) => host.toLowerCase().replace(/^www\./, "");

const hasAny = (source: WireSource) =>
  Boolean(source.r || source.s || source.m || source.c || source.a);

// Reads a source off the page a visitor landed on. `referrer` is the page
// that linked here; this site's own pages do not count as a source.
export function sourceFromArrival(
  search: string,
  referrer: string,
  ownHost: string,
): WireSource {
  const params = new URLSearchParams(search);
  const source: WireSource = {};
  const tag = (name: string) =>
    (params.get(name) ?? "").trim().slice(0, TAG_MAX);

  const utmSource = tag("utm_source");
  const utmMedium = tag("utm_medium");
  const utmCampaign = tag("utm_campaign");
  if (utmSource) source.s = utmSource;
  if (utmMedium) source.m = utmMedium;
  if (utmCampaign) source.c = utmCampaign;

  const marker = AD_MARKERS.find(([param]) => params.get(param));
  if (marker) source.a = marker[1];

  try {
    const host = bareHost(new URL(referrer).host);
    if (host && host !== bareHost(ownHost)) source.r = host.slice(0, HOST_MAX);
  } catch {
    // no referrer, or not a URL
  }
  return source;
}

// BROWSER ONLY. The source of the current visit.
// A visit keeps the source it arrived with while the visitor moves around
// the site (kept in sessionStorage, so per tab). Arriving again with a new
// tagged link or from another site starts a new source; a page load with
// nothing on it (a reload, or a click from one of our own pages) does not
// erase the one already noted.
export function currentVisitSource(): WireSource {
  const arrival = sourceFromArrival(
    window.location.search,
    document.referrer,
    window.location.host,
  );
  try {
    if (hasAny(arrival)) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(arrival));
      return arrival;
    }
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (parsed && typeof parsed === "object") return parsed as WireSource;
    }
    sessionStorage.setItem(SESSION_KEY, "{}");
  } catch {
    // storage blocked: fall back to what this page load shows
  }
  return arrival;
}

// ---------- tracked links ----------
// A click is a plain link, so its source rides on the link as parameters.
// `sk=1` says "a source was noted" even when every field is empty, which is
// what tells a direct visit apart from a click nobody looked at.
const LINK_FLAG = "sk";
const LINK_KEYS: [field: keyof WireSource, param: string][] = [
  ["r", "sr"],
  ["s", "ss"],
  ["m", "sm"],
  ["c", "sc"],
  ["a", "sa"],
];

export function addSourceToLink(
  params: URLSearchParams,
  source: WireSource,
): void {
  params.set(LINK_FLAG, "1");
  for (const [field, param] of LINK_KEYS) {
    const value = source[field];
    if (value) params.set(param, value);
  }
}

export function linkHasSource(params: URLSearchParams): boolean {
  return params.get(LINK_FLAG) === "1";
}

export function sourceFromLink(params: URLSearchParams): WireSource | null {
  if (!linkHasSource(params)) return null;
  const source: WireSource = {};
  for (const [field, param] of LINK_KEYS) {
    const value = params.get(param);
    if (value) source[field] = value;
  }
  return source;
}

// ---------- server side ----------
// Turns whatever the browser sent into safe column values, or null when no
// source was sent at all (the row then keeps source_known = false). Every
// limit here mirrors a CHECK constraint in migration 0010: a value that
// failed one would make the whole insert fail and lose the event.
export function sourceColumns(
  raw: unknown,
  // Every name this request says the site was reached by. A "referring
  // site" equal to one of them is our own page, not a source.
  siteHosts: (string | null | undefined)[],
): SourceColumns | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const wire = raw as Record<string, unknown>;

  // Lower-cased so "Facebook" and "facebook" are one source.
  const tag = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const cleaned = value
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .trim()
      .toLowerCase()
      .slice(0, TAG_MAX);
    return cleaned || null;
  };

  let refHost: string | null = null;
  if (typeof wire.r === "string") {
    const host = bareHost(wire.r.trim()).slice(0, HOST_MAX);
    const ours = siteHosts.flatMap((h) => (h ? [bareHost(h)] : []));
    if (
      /^[a-z0-9.-]{3,100}$/.test(host) &&
      host.includes(".") &&
      !ours.includes(host)
    ) {
      refHost = host;
    }
  }

  return {
    source_known: true,
    ref_host: refHost,
    utm_source: tag(wire.s),
    utm_medium: tag(wire.m),
    utm_campaign: tag(wire.c),
    ad_click:
      typeof wire.a === "string" && AD_NETWORKS.has(wire.a) ? wire.a : null,
  };
}

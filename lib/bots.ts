// Automated clients (crawlers, link previewers, monitors, scripts). Their
// clicks and views are not recorded: the numbers are meant to measure human
// interest. This is a best-effort filter on a self-reported header, not a
// guarantee.
const BOT_UA =
  /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|embedly|headless|lighthouse|pingdom|uptime|curl|wget|python|axios|node-fetch|go-http-client|scrapy|okhttp/i;

// The stock browser string automation tools send when they pose as an iPhone
// (it names iOS 13.2.3, from 2019). On 2026-10-05 it accounted for 22 of the
// 32 clicks on record: one every ten minutes, across 20 apps, never with a
// visitor ID or a referring page. Matched exactly, so a real person on an old
// iPhone with any other build is unaffected. It also means testing with a
// browser's built-in "iPhone" device mode may not be counted.
const EMULATED_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1";

export function looksAutomated(userAgent: string | null | undefined): boolean {
  return (
    !userAgent || BOT_UA.test(userAgent) || userAgent.trim() === EMULATED_IPHONE
  );
}

// Whether a request for a tracked link shows any sign of a person having
// clicked that link on one of this site's pages. Such a click carries at
// least one of two things: the visitor ID the page's script adds to the link,
// or this site as the referring page, which the browser sends by itself even
// with scripts blocked. A request with neither went straight to the link's
// address, which is what a crawler working through URLs does. The browser
// string cannot be trusted for this (the bot above called itself an iPhone);
// these two are much harder to get right by accident.
export function clickCameFromAPage(
  visitorId: string | null,
  referrer: string | null,
  // Every name this request says the site was reached by. Behind a host's
  // proxy the server's own idea of its address is not always the public
  // one, and a wrong guess here would silently drop real clicks.
  siteHosts: (string | null | undefined)[],
): boolean {
  if (visitorId) return true;
  if (!referrer) return false;
  try {
    const from = new URL(referrer).host.toLowerCase();
    return siteHosts.some((host) => host?.toLowerCase() === from);
  } catch {
    return false;
  }
}

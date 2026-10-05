// Automated clients (crawlers, link previewers, monitors, scripts). Their
// clicks and views are not recorded: the numbers are meant to measure human
// interest. This is a best-effort filter on a self-reported header, not a
// guarantee.
const BOT_UA =
  /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|embedly|headless|lighthouse|pingdom|uptime|curl|wget|python|axios|node-fetch|go-http-client|scrapy|okhttp/i;

export function looksAutomated(userAgent: string | null | undefined): boolean {
  return !userAgent || BOT_UA.test(userAgent);
}

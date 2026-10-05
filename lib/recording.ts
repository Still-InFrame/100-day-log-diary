// Whether clicks and views should be written to app_events.
//
// Local development runs against the production database, so by default it
// must not add to the real statistics: view rows carry no detail that would
// let test traffic be told apart and removed afterwards. Deployed builds
// always record. To exercise recording locally, start the dev server with
// RECORD_EVENTS_IN_DEV=1 and clean up what it writes.
export function recordingEnabled(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.RECORD_EVENTS_IN_DEV === "1"
  );
}

# Installation telemetry and privacy

PolyRouter supports two separate, write-only lifecycle telemetry modes. Neither mode collects gateway traffic, prompts, models, providers, token counts, credentials, dashboard passwords, cookies, raw machine IDs, hostnames, operating-system usernames, or raw IP addresses.

## Public anonymous telemetry (official npm release)

The official npm release can include `PUBLIC_INSTALLATION_TELEMETRY_URL`, a public HTTPS ingestion endpoint that is **not a secret**. When available, PolyRouter sends these fields only:

- local random installation UUID
- random event UUID
- protocol version
- event type: `installed`, `startup`, `setup_complete`, or successful local dashboard `dashboard_login`
- client UTC timestamp and application version

This is default-on for the official distribution and measures anonymous lifecycle signals, not verified npm downloads. Users can opt out through **Dashboard → Profile → Anonymous Telemetry** or by setting `POLYROUTER_PUBLIC_TELEMETRY=false` before startup. Opting out removes queued local public events, prevents future sends, and disables dashboard exposure of the installation UUID to GA4/PostHog. Re-enabling applies to future events only.

The public ingestion function accepts a strict, size-bounded schema; rejects invalid IDs, timestamps, and event types; deduplicates event IDs; and applies per-installation and short-lived hashed-IP rate limits. It stores no raw IP. Rate-limit rows are retained no more than 48 hours; anonymous installation/event records are retained no more than 90 days. Schedule the cleanup SQL in `supabase/migrations/003_public_installation_telemetry.sql`.

Public telemetry endpoints are deliberately not authenticated, because a secret distributed in an npm package is not secret. Put the endpoint behind an edge/WAF rate limit. Treat counts as approximate usage signals: copied clients can replay valid public payloads.

## Dashboard GA4 and PostHog analytics

When an official npm release is built with `NEXT_PUBLIC_GA_MEASUREMENT_ID` and `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, opening the local dashboard sends sanitized browser analytics to GA4 and PostHog. Both vendors receive the same opaque local installation UUID used by public lifecycle telemetry. GA4 records sanitized page views and one `polyrouter_dashboard_opened` event per browser session. PostHog records that event, sanitized page views, and masked autocapture interaction metadata; PostHog session recording is disabled, as are visible text and element attributes.

Dashboard analytics never receives `/api/*`, `/v1/*`, `/v1beta/*`, `/codex/*`, or `/responses/*` traffic. It never receives prompts, messages, token counts, models/providers, API keys, credentials, passwords, raw IP addresses, or URL query strings/fragments. The same dashboard/environment opt-out disables the installation ID linkage and explicit dashboard-open event.

## Private/self-hosted telemetry

An administrator can instead configure all three values below:

- `INSTALLATION_TELEMETRY_URL`
- `INSTALLATION_TELEMETRY_INGEST_TOKEN`
- `INSTALLATION_TELEMETRY_IP_SALT`

Private telemetry takes precedence over public mode and preserves the existing authenticated endpoint contract. It sends a persistent local installation UUID, lifecycle event, timestamp, version, and an HMAC-SHA-256 IP fingerprint only for successful dashboard login. It never sends raw IP addresses. The token, IP salt, and Supabase service-role key must remain server-side and must never be included in an npm package.

Apply `supabase/migrations/001_installation_telemetry.sql` and `002_allow_setup_complete.sql`, deploy `supabase/functions/installation-telemetry`, and configure the private function secrets. RLS has no anon/authenticated read policies; only the Edge Function service role writes.

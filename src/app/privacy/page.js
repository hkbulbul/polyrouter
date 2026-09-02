import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | PolyRouter",
  description: "How PolyRouter handles anonymous installation telemetry.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-bg text-text-main px-6 py-12">
      <article className="max-w-3xl mx-auto space-y-8">
        <Link href="/dashboard" className="text-primary hover:underline">← Back to Dashboard</Link>
        <header>
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="text-text-muted mt-2">Last updated: August 1, 2026</p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Anonymous installation telemetry</h2>
          <p>Official npm releases of PolyRouter send minimal anonymous lifecycle telemetry by default to help us understand active installations and release adoption. This is not a count of verified npm downloads.</p>
          <p>Telemetry contains a random installation UUID generated and stored only in PolyRouter&apos;s local database, the event type, event timestamp, and PolyRouter version.</p>
          <p>The only event types are <code>installed</code>, <code>startup</code>, <code>setup_complete</code>, and successful <code>dashboard_login</code>.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">What we do not collect</h2>
          <p>Installation telemetry never includes prompts, messages, gateway API traffic, token counts, model or provider names, API keys, provider credentials, dashboard passwords, cookies, raw IP addresses, machine IDs, hostnames, operating-system usernames, or free-form metadata.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Your controls</h2>
          <p>You can disable or re-enable anonymous telemetry at any time in Dashboard → Profile → Anonymous Telemetry. Disabling stops future delivery and deletes queued local telemetry events. For unattended installations, set <code>POLYROUTER_PUBLIC_TELEMETRY=false</code> before starting PolyRouter.</p>
          <p>Changing this setting cannot delete events that have already been received because they are anonymous and cannot be linked to an account.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Security, retention, and abuse protection</h2>
          <p>The public endpoint accepts only a strict lifecycle-event schema. It has size limits, timestamp validation, duplicate protection, and per-IP/per-installation rate limits. Rate limiting stores a one-way IP hash for no longer than 48 hours; raw IP addresses are never stored.</p>
          <p>Anonymous installation and event records are retained for up to 90 days, then automatically deleted. Access to the telemetry database is restricted to server-side administration; browser and npm clients have no database read credentials.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Dashboard analytics</h2>
          <p>When configured in an official release, GA4 and PostHog measure dashboard browser page visits and the <code>polyrouter_dashboard_opened</code> event. They use the same opaque local installation UUID as anonymous lifecycle telemetry, so dashboard activity can be associated with an installation without identifying a person. PostHog also records masked UI interaction metadata through autocapture; session recording is disabled and dashboard text and attributes are masked.</p>
          <p>They do not receive gateway API traffic such as <code>/v1/*</code>, prompts, messages, model/provider selections, API keys, credentials, passwords, or URL query strings/fragments. Disabling Anonymous Telemetry also prevents the dashboard from exposing the installation UUID to GA4/PostHog or sending the explicit dashboard-open event.</p>
        </section>
      </article>
    </main>
  );
}

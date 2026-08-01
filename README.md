<div align="center">
  <img src="./public/polyrouter-logo.png" alt="PolyRouter local AI gateway logo" width="160"/>

  # PolyRouter — Local AI Gateway & OpenAI-Compatible API Router

  **One local endpoint for 40+ AI providers, AI coding tools, and model fallback workflows.**

  Route, translate, and optimize AI requests locally with OAuth and API-key connections, multi-account failover, token optimization, SQLite persistence, and real-time usage tracking.
</div>

---

## What is PolyRouter?

PolyRouter is a **local AI gateway** and **OpenAI-compatible API router**. It exposes a single `/v1` endpoint on your machine, then routes AI traffic to configured providers while translating request and response formats when needed. Use it to connect AI coding tools and applications to multiple providers without changing endpoint configuration for every provider or account.

It supports OAuth and API-key connections, model combinations with fallback, multi-account routing, token refresh, quota monitoring, and local SQLite-backed settings. PolyRouter is proprietary, closed-source software for authorized users and contributors.

## Quick Start

Install the PolyRouter CLI:

```bash
npm install -g polyrouter
polyrouter
```

Or run the current package without a global installation:

```bash
npx polyrouter
```

After startup:

- **Dashboard:** `http://localhost:20128/dashboard`
- **OpenAI-compatible API:** `http://localhost:20128/v1`

Connect a provider in **Dashboard → Providers**, then configure an AI tool with:

```text
Endpoint: http://localhost:20128/v1
API Key:  Copy an API key from the PolyRouter dashboard
Model:    Select a provider model or a custom fallback combo
```

## Why use a local AI router?

- Use one OpenAI-compatible endpoint across compatible AI coding tools and applications.
- Route requests between subscription, API-key, and free-tier provider accounts.
- Keep provider credentials, settings, and the primary database on the machine running PolyRouter.
- Create model combos that automatically fall back when a provider is unavailable or quota is exhausted.
- Track token usage, costs, quotas, and resets from the local dashboard.

## How It Works

```text
AI coding tool or application
             │
             │  OpenAI-compatible request
             ▼
        PolyRouter local gateway
             ├─ Request/response format translation
             ├─ Account selection and token refresh
             ├─ RTK token optimization
             ├─ Quota and usage tracking
             └─ Provider/model combo fallback
             │
             ▼
      Configured AI provider
```

## Key Features

| Feature | Description |
|---|---|
| **OpenAI-compatible API** | Use a single local `/v1` endpoint with supported AI tools and applications. |
| **AI provider routing** | Route across 40+ OAuth and API-key providers. |
| **Format translation** | Translate supported OpenAI, Claude, Gemini, Cursor, Kiro, and Vertex request/response formats. |
| **Automatic fallback** | Build model combos with ordered provider and account fallback. |
| **Multi-account routing** | Use multiple provider accounts with round-robin or priority behavior. |
| **OAuth management** | Connect supported providers and refresh OAuth tokens automatically. |
| **RTK token saver** | Reduce tool-result token usage before requests reach an LLM. |
| **Usage and quota tracking** | Monitor token usage, cost, provider quotas, and reset times. |
| **Local SQLite persistence** | Store settings and provider configuration in a local SQLite database. |
| **Optional remote features** | Enable cloud sync or remote deployment only when intentionally configured. |

## Compatible AI Coding Tools

PolyRouter works with tools that support an OpenAI-compatible API or configurable AI endpoint, including:

**Claude Code · Codex · Cursor · Cline · OpenClaw · OpenCode · Continue · Roo Code · Kilo Code · GitHub Copilot** and more.

## AI Providers

PolyRouter supports 40+ providers through OAuth, API keys, and compatible endpoints.

- **OAuth providers:** Claude Code, Codex, GitHub Copilot, Cursor, Antigravity, Kimchi, and more.
- **API-key providers:** OpenAI, Anthropic, Gemini, DeepSeek, Groq, xAI, Mistral, Perplexity, Together AI, Fireworks, Cerebras, Cohere, NVIDIA, GLM, Kimi, MiniMax, OpenRouter, SiliconFlow, Nebius, Chutes, Hyperbolic, and more.
- **Free and subscription workflows:** Use configured supported accounts in model combos with ordered fallback.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | Auto-generated | JWT signing secret for dashboard authentication. |
| `INITIAL_PASSWORD` | unset | Deprecated; on a new installation users create a dashboard password locally before signing in. |
| `DATA_DIR` | Platform-specific | Writable application-data directory; SQLite lives at `$DATA_DIR/db/data.sqlite`. |
| `PORT` | `20128` | Local gateway and dashboard port. |
| `NEXT_PUBLIC_BASE_URL` | `http://localhost:20128` | Public base URL used by browser-facing configuration. |
| `REQUIRE_API_KEY` | `false` | Require a Bearer API key for remote `/v1/*` access. |
| `ENABLE_REQUEST_LOGS` | `false` | Enable sensitive request/response logs only for troubleshooting. |
| `PUBLIC_INSTALLATION_TELEMETRY_URL` | unset | Non-secret anonymous lifecycle endpoint embedded only in the official npm release. |
| `POLYROUTER_PUBLIC_TELEMETRY` | `true` | Set to `false` before startup to opt out of public anonymous lifecycle telemetry. |
| `INSTALLATION_TELEMETRY_URL` | unset | Optional private/self-hosted Supabase Edge Function URL for write-only lifecycle telemetry. |
| `INSTALLATION_TELEMETRY_INGEST_TOKEN` | unset | Opaque private-mode token shared only with that Edge Function. |
| `INSTALLATION_TELEMETRY_IP_SALT` | unset | Private-mode salt used to HMAC-hash successful-login IPs before delivery.

See [`.env.example`](./.env.example) for the current environment contract.

### Installation telemetry

Official npm releases can send minimal anonymous lifecycle telemetry through a public HTTPS endpoint. It sends a random local installation UUID, lifecycle event (`installed`, `startup`, `setup_complete`, or successful `dashboard_login`), timestamp, and app version. It never sends prompts, gateway requests, token counts, models, providers, credentials, passwords, cookies, raw IPs, machine IDs, hostnames, or usernames.

This measurement describes anonymous lifecycle signals—not verified npm downloads. It is enabled by default for the official npm distribution. Disable it in **Dashboard → Profile → Anonymous Telemetry**, or set `POLYROUTER_PUBLIC_TELEMETRY=false` before startup. When GA4/PostHog are configured in an official release, a dashboard browser session uses that same opaque installation UUID for sanitized page views, one `polyrouter_dashboard_opened` event, and PostHog's masked UI interaction analytics. It never tracks gateway `/v1/*` traffic. See the in-app [Privacy Policy](/privacy) for retention and abuse-protection details.

The legacy `INSTALLATION_TELEMETRY_*` variables remain a separate private/self-hosted telemetry mode. When all three are configured, private mode takes precedence over public telemetry and sends its original authenticated payload, including an HMAC-hashed IP only for successful dashboard logins.

To deploy both Supabase modes:

1. Apply `supabase/migrations/001_installation_telemetry.sql`, `002_allow_setup_complete.sql`, and `003_public_installation_telemetry.sql`.
2. Deploy `installation-telemetry` for private authenticated telemetry and `public-installation-telemetry` for anonymous official-release telemetry, both with `--no-verify-jwt`.
3. Configure `INSTALLATION_TELEMETRY_INGEST_TOKEN`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` only in the private function environment. Never ship a service-role key or ingest token in the npm package.
4. Put the public function behind an edge/WAF rate limit and schedule the SQL retention statements documented in migration 003.

The telemetry tables have RLS enabled and no browser-read policies. Inspect them only through Supabase SQL/Table Editor with privileged access.

---

## API Examples

### Chat completions

```bash
curl http://localhost:20128/v1/chat/completions \
  -H "Authorization: Bearer YOUR_POLYROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "your-provider-model-or-combo",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### List available models

```bash
curl http://localhost:20128/v1/models \
  -H "Authorization: Bearer YOUR_POLYROUTER_API_KEY"
```

---

## Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [Docker deployment and persistence](./DOCKER.md)
- [Environment configuration](./.env.example)
- [CLI package README](./cli/README.md)

---

## FAQ

### Does PolyRouter send provider credentials to a central service?

No. Provider credentials, settings, and the primary SQLite database remain local unless you intentionally configure a remote feature or remote deployment.

### Which API format does PolyRouter expose?

PolyRouter exposes an OpenAI-compatible `/v1` API and translates supported provider formats as required by the selected provider and model.

### Where is the SQLite database stored?

The primary database is `$DATA_DIR/db/data.sqlite`. Without `DATA_DIR`, PolyRouter uses `~/.polyrouter/` on macOS/Linux and `%APPDATA%\polyrouter\` on Windows.

---

## Support

For installation, configuration, or licensing assistance, contact the PolyRouter owner through your authorized distribution channel.

---

## Self-Hosted Setup

### Development

```bash
cp .env.example .env
npm install
PORT=20128 NEXT_PUBLIC_BASE_URL=http://localhost:20128 npm run dev
```

### Production

```bash
npm run build
PORT=20128 HOSTNAME=0.0.0.0 NEXT_PUBLIC_BASE_URL=http://localhost:20128 npm run start
```

### Docker

```bash
docker run -d \
  --name polyrouter \
  -p 20128:20128 \
  -v "$HOME/.polyrouter:/app/data" \
  -e DATA_DIR=/app/data \
  polyrouter:latest
```

For container persistence and operational detail, see [DOCKER.md](./DOCKER.md).

## Updating

Stop PolyRouter first, including its tray/background process, then run:

```bash
npm install -g polyrouter@latest --prefer-online
polyrouter
```

`--prefer-online` asks npm to revalidate registry metadata instead of relying on a stale cache when possible. It does not bypass permissions, file locks, or registry/network failures. On Windows, an `EBUSY` or `EPERM` error means PolyRouter, Node, a terminal, or security software still has files open in npm's global package directory—close the locking process and retry rather than deleting the installation manually.

## Security Notes

- Create a strong dashboard password during first-run setup.
- Keep PolyRouter bound to localhost unless remote access is intentionally configured.
- Do not share OAuth tokens, API keys, SQLite databases, logs, or the local application-data directory.
- Use HTTPS and a secure reverse proxy for intentional remote deployments.
- Enable request logging only when required for troubleshooting, because request data can be sensitive.

## License

PolyRouter is **proprietary, closed-source software**. All rights reserved.

Unauthorized copying, redistribution, modification, sublicensing, or commercial use is prohibited except where expressly authorized by the owner.
